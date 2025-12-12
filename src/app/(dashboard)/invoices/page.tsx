"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit, Eye, Download, CreditCard, Banknote, Landmark, CheckCircle } from "lucide-react";
import { formatDate, roundToCFP } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import axios from "axios";
import { useLanguage } from "@/lib/i18n";
import { Pagination } from "@/components/ui/pagination";
import { InvoiceModal } from "@/components/invoices/invoice-modal";

const ITEMS_PER_PAGE_DEFAULT = 20;

export default function InvoicesPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "debit">("card");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const isClient = session?.user?.role === "CLIENT";
  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  // Handle Stripe payment callback
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      customToast.success("Paiement effectué avec succès!");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedInvoices([]);
      // Clear URL parameters
      window.history.replaceState({}, "", "/invoices");
    } else if (payment === "cancelled") {
      customToast.warning("Paiement annulé");
      // Clear URL parameters
      window.history.replaceState({}, "", "/invoices");
    }
  }, [searchParams, queryClient]);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["invoices", filter],
    queryFn: async () => {
      const res = await fetch("/api/invoices?type=invoice");
      if (!res.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return res.json();
    },
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success("Facture supprimée avec succès");
    },
    onError: () => {
      customToast.error("Erreur lors de la suppression");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      await axios.put(`/api/invoices/${id}`, {
        paid: true,
        paymentDate: new Date().toISOString(),
        lastPaymentMethod: method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success("Facture marquée comme payée");
      setSelectedInvoices([]);
      setShowPaymentDialog(false);
    },
    onError: () => {
      customToast.error("Erreur lors du paiement");
    },
  });

  const batchPaymentMutation = useMutation({
    mutationFn: async ({ ids, method }: { ids: string[]; method: string }) => {
      await Promise.all(
        ids.map((id) =>
          axios.put(`/api/invoices/${id}`, {
            paid: true,
            paymentDate: new Date().toISOString(),
            lastPaymentMethod: method,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success("Factures payées avec succès");
      setSelectedInvoices([]);
      setShowPaymentDialog(false);
    },
    onError: () => {
      customToast.error("Erreur lors du paiement groupé");
    },
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    
    return invoices.filter((inv: any) => {
      const matchesSearch =
        inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" && inv.paid) ||
        (filter === "pending" && !inv.paid);
      return matchesSearch && matchesFilter;
    });
  }, [invoices, search, filter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, startIndex, itemsPerPage]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  // Refetch data when coming back to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleInvoiceSelection = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePayment = async (method: "card" | "transfer" | "debit") => {
    if (method === "card") {
      // Stripe integration
      if (selectedInvoices.length === 0) {
        customToast.error("Veuillez sélectionner au moins une facture");
        return;
      }

      try {
        customToast.info("Création de la session de paiement...");

        const response = await axios.post("/api/stripe/create-checkout", {
          invoiceIds: selectedInvoices,
        });

        if (response.data.url) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.url;
        } else {
          customToast.error("Erreur lors de la création de la session Stripe");
        }
      } catch (error) {
        console.error("Error creating Stripe checkout:", error);
        customToast.error("Erreur lors de la redirection vers Stripe");
      }
    } else if (method === "transfer") {
      if (selectedInvoices.length > 0) {
        batchPaymentMutation.mutate({ ids: selectedInvoices, method: "Virement" });
      }
    } else if (method === "debit") {
      if (selectedInvoices.length > 0) {
        batchPaymentMutation.mutate({ ids: selectedInvoices, method: "Prélèvement" });
      }
    }
  };

  const calculateSelectedTotal = () => {
    return selectedInvoices.reduce((sum, id) => {
      const invoice = invoices.find((inv: any) => inv.id === id);
      return sum + (invoice?.total || 0);
    }, 0);
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      customToast.info("Génération du PDF en cours...");

      // Fetch full invoice details with company info
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      const invoiceData = response.data;

      // Generate and download PDF with current language
      downloadInvoicePDF(invoiceData, invoiceData.company, language);

      customToast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      customToast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleEdit = async (invoiceId: string) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      setEditingInvoice(response.data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      customToast.error("Erreur lors du chargement de la facture");
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("invoices")}</h1>
        </div>
        {isOwnerOrAdmin && (
          <Button
            className="btn-angular bg-primary text-white hover:bg-primary/90"
            onClick={() => setShowNewInvoiceModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> {t("newInvoice")}
          </Button>
        )}
      </div>

      {/* Payment Bar for Clients */}
      {isClient && selectedInvoices.length > 0 && (
        <Card className="card-angular mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-foreground">
                  {selectedInvoices.length} {t("invoicesSelected")}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {roundToCFP(calculateSelectedTotal()).toLocaleString('fr-FR')} CFP
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="btn-angular bg-primary text-white hover:bg-primary/90"
                  onClick={() => handlePayment("card")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("cardPayment")}
                </Button>
                <Button
                  className="btn-angular bg-secondary text-white hover:bg-secondary/90"
                  onClick={() => handlePayment("transfer")}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  {t("transferPayment")}
                </Button>
                <Button
                  className="btn-angular bg-info text-white hover:bg-info/90"
                  onClick={() => handlePayment("debit")}
                >
                  <Landmark className="mr-2 h-4 w-4" />
                  {t("debitPayment")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchByRefOrClient")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("all")}
              >
                {t("all")}
              </Button>
              <Button
                variant={filter === "paid" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("paid")}
              >
                {t("paid")}
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("pending")}
              >
                {t("pending")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={isClient ? 7 : 8} />
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{t("noInvoiceFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    {isClient && <th>{t("paymentMethod")}</th>}
                    <th>#</th>
                    <th>{t("clients")}</th>
                    <th>{t("reference")}</th>
                    <th>{t("creationDate")}</th>
                    <th>{t("totalHT")}</th>
                    <th>{t("totalTTC")}</th>
                    <th>{t("status")}</th>
                    <th>{t("paymentDate")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice: any, index: number) => (
                    <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                      {isClient && (
                        <td>
                          {!invoice.paid && (
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => handleInvoiceSelection(invoice.id)}
                              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                          )}
                        </td>
                      )}
                      <td className="font-medium">{startIndex + index + 1}</td>
                      <td>{invoice.client?.name || "-"}</td>
                      <td className="font-semibold text-primary">{invoice.ref}</td>
                      <td>{formatDate(invoice.createdAt)}</td>
                      <td className="font-medium">{roundToCFP(invoice.totalHT || 0).toLocaleString('fr-FR')} CFP</td>
                      <td className="font-bold text-primary">
                        {roundToCFP(invoice.total || 0).toLocaleString('fr-FR')} CFP
                      </td>
                      <td>
                        {invoice.paid ? (
                          <Badge variant="success" className="cursor-default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("paid")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            className={isOwnerOrAdmin ? "cursor-pointer hover:opacity-80" : ""}
                            onClick={() =>
                              isOwnerOrAdmin &&
                              markPaidMutation.mutate({ id: invoice.id, method: "Manuel" })
                            }
                          >
                            {t("pending")}
                          </Badge>
                        )}
                      </td>
                      <td>
                        {invoice.paymentDate ? formatDate(invoice.paymentDate) : "-"}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {isOwnerOrAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("edit")}
                                onClick={() => handleEdit(invoice.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("downloadPDF")}
                                onClick={() => handleDownloadPDF(invoice.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("delete")}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  if (
                                    await confirm({
                                      title: t("delete"),
                                      message: t("deleteClientConfirm"),
                                      type: "danger",
                                    })
                                  ) {
                                    deleteMutation.mutate(invoice.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {isClient && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t("downloadPDF")}
                              onClick={() => handleDownloadPDF(invoice.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredInvoices.length > ITEMS_PER_PAGE_DEFAULT && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredInvoices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* New Invoice Modal */}
      <InvoiceModal
        open={showNewInvoiceModal}
        onOpenChange={setShowNewInvoiceModal}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })}
        type="invoice"
      />

      {/* Edit Invoice Modal */}
      <InvoiceModal
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })}
        type="invoice"
        invoice={editingInvoice}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  const [isImportingInvoices, setIsImportingInvoices] = useState(false);
  const importInvoicesInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingClientsDbf, setIsImportingClientsDbf] = useState(false);
  const importClientsDbfInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const isClient = session?.user?.role === "CLIENT";
  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  // Handle Stripe payment callback
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    
    if (payment === "success" && sessionId) {
      // Verify and process the payment
      const processPayment = async () => {
        try {
          const response = await axios.post("/api/stripe/verify-payment", {
            sessionId,
          });
          
          if (response.data.success) {
            customToast.success("paymentSuccessful");
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            setSelectedInvoices([]);
          } else {
            customToast.warning("paymentCancelled");
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          customToast.error("errorPayment");
        } finally {
          // Clear URL parameters
          window.history.replaceState({}, "", "/invoices");
        }
      };
      
      processPayment();
    } else if (payment === "cancelled") {
      customToast.warning("paymentCancelled");
      // Clear URL parameters
      window.history.replaceState({}, "", "/invoices");
    }
  }, [searchParams, queryClient]);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["invoices", filter],
    queryFn: async () => {
      const res = await fetch("/api/invoices?type=invoice");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
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
      customToast.success("invoiceDeleted");
    },
    onError: () => {
      customToast.error("errorDeleting");
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
      customToast.success("invoicePaidSuccess");
      setSelectedInvoices([]);
      setShowPaymentDialog(false);
    },
    onError: () => {
      customToast.error("errorPayment");
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
      customToast.success("invoicesPaidSuccess");
      setSelectedInvoices([]);
      setShowPaymentDialog(false);
    },
    onError: () => {
      customToast.error("errorBatchPayment");
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
        customToast.error("selectAtLeastOneInvoice");
        return;
      }

      try {
        customToast.info("creatingPaymentSession");

        const response = await axios.post("/api/stripe/create-checkout", {
          invoiceIds: selectedInvoices,
        });

        if (response.data.url) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.url;
        } else {
          customToast.error("errorCreatingStripeSession");
        }
      } catch (error) {
        console.error("Error creating Stripe checkout:", error);
        customToast.error("errorRedirectingStripe");
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
      customToast.info("generatingPDF");

      // Fetch full invoice details with company info
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      const invoiceData = response.data;

      // Generate and download PDF with current language
      downloadInvoicePDF(invoiceData, invoiceData.company, language);

      customToast.success("pdfGenerated");
    } catch (error) {
      console.error("Error generating PDF:", error);
      customToast.error("errorGeneratingPDF");
    }
  };

  const handleEdit = async (invoiceId: string) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      setEditingInvoice(response.data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      customToast.error("errorLoadingInvoice");
    }
  };

  const handleExportInvoicesCsv = async () => {
    try {
      const res = await fetch("/api/exports/ebatch-csv");
      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      customToast.error(language === "en" ? "Invoice CSV export failed" : "Export CSV des factures échoué");
    }
  };

  const handleExportInvoicesDbf = async () => {
    try {
      const res = await fetch("/api/exports/clients-dbf");
      if (!res.ok) throw new Error("Failed to export DBF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices.dbf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      customToast.error(language === "en" ? "Invoice DBF export failed" : "Export DBF des factures échoué");
    }
  };

  const handleImportInvoicesCsv = async (file: File) => {
    setIsImportingInvoices(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/imports/invoices", {
        method: "POST",
        body: form,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Import failed");

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(
        language === "en"
          ? `Invoices imported. Created: ${payload.created ?? 0}, Skipped: ${payload.skipped ?? 0}`
          : `Factures importées. Créées : ${payload.created ?? 0}, Ignorées : ${payload.skipped ?? 0}`
      );
    } catch (e: any) {
      customToast.error(e?.message || (language === "en" ? "CSV import failed" : "Import CSV échoué"));
    } finally {
      setIsImportingInvoices(false);
      if (importInvoicesInputRef.current) importInvoicesInputRef.current.value = "";
    }
  };

  const handleImportClientsDbf = async (file: File) => {
    setIsImportingClientsDbf(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/imports/clients", {
        method: "POST",
        body: form,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Import failed");

      queryClient.invalidateQueries({ queryKey: ["users"] });
      customToast.success(
        language === "en"
          ? `Clients imported. Created: ${payload.created ?? 0}, Updated: ${payload.updated ?? 0}`
          : `Clients importés. Créés : ${payload.created ?? 0}, Mis à jour : ${payload.updated ?? 0}`
      );
    } catch (e: any) {
      customToast.error(e?.message || (language === "en" ? "DBF import failed" : "Import DBF échoué"));
    } finally {
      setIsImportingClientsDbf(false);
      if (importClientsDbfInputRef.current) importClientsDbfInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("invoices")}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isOwnerOrAdmin && (
            <>
              <input
                ref={importInvoicesInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportInvoicesCsv(file);
                }}
              />
              <input
                ref={importClientsDbfInputRef}
                type="file"
                accept=".dbf,application/octet-stream"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportClientsDbf(file);
                }}
              />

              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => importInvoicesInputRef.current?.click()}
                disabled={isImportingInvoices}
              >
                {isImportingInvoices
                  ? language === "en"
                    ? "Importing..."
                    : "Import en cours..."
                  : language === "en"
                  ? "Import Invoices CSV"
                  : "Importer Factures CSV"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => importClientsDbfInputRef.current?.click()}
                disabled={isImportingClientsDbf}
              >
                {isImportingClientsDbf
                  ? language === "en"
                    ? "Importing..."
                    : "Import en cours..."
                  : language === "en"
                  ? "Import Invoices DBF"
                  : "Importer Factures DBF"}
              </Button>

              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportInvoicesCsv}>
                <Download className="w-4 h-4 mr-2" />
                {language === "en" ? "Export Invoices CSV" : "Exporter Factures CSV"}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportInvoicesDbf}>
                <Download className="w-4 h-4 mr-2" />
                {language === "en" ? "Export Invoices DBF" : "Exporter Factures DBF"}
              </Button>
            </>
          )}
          <Button onClick={() => setShowNewInvoiceModal(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {language === "en" ? "New invoice" : "Nouvelle facture"}
          </Button>
        </div>
      </div>

      {/* Payment Bar for Clients */}
      {isClient && selectedInvoices.length > 0 && (
        <Card className="card-angular mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="font-semibold text-foreground text-sm sm:text-base">
                  {selectedInvoices.length} {t("invoicesSelected")}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  {roundToCFP(calculateSelectedTotal()).toLocaleString("fr-FR")} CFP
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="btn-angular bg-primary text-white hover:bg-primary/90 w-full sm:w-auto text-sm"
                  onClick={() => handlePayment("card")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("cardPayment")}
                </Button>
                <Button
                  className="btn-angular bg-secondary text-white hover:bg-secondary/90 w-full sm:w-auto text-sm"
                  onClick={() => handlePayment("transfer")}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  {t("transferPayment")}
                </Button>
                <Button
                  className="btn-angular bg-info text-white hover:bg-info/90 w-full sm:w-auto text-sm"
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
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchByRefOrClient")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={isClient ? 7 : 8} />
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{t("noInvoiceFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular w-full text-xs sm:text-sm">
                <thead>
                  <tr>
                    {isClient && (
                      <th className="px-2 sm:px-4 py-2 whitespace-nowrap">{t("paymentMethod")}</th>
                    )}
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap">#</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap min-w-[100px]">{t("clients")}</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap">{t("reference")}</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap hidden md:table-cell">{t("creationDate")}</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap hidden lg:table-cell">{t("totalHT")}</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap">{t("totalTTC")}</th>
                    <th className="px-2 sm:px-4 py-2 whitespace-nowrap">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice: any, index: number) => (
                    <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                      {isClient && (
                        <td className="px-2 sm:px-4 py-2">
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
                      <td className="px-2 sm:px-4 py-2 font-medium">{startIndex + index + 1}</td>
                      <td
                        className="px-2 sm:px-4 py-2 truncate max-w-[120px]"
                        title={invoice.client?.name || "-"}
                      >
                        {invoice.client?.name || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-semibold text-primary whitespace-nowrap">{invoice.ref}</td>
                      <td className="px-2 sm:px-4 py-2 hidden md:table-cell whitespace-nowrap">
                        {formatDate(invoice.createdAt, language === "en" ? "en-US" : "fr-FR")}
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-medium hidden lg:table-cell whitespace-nowrap">
                        {roundToCFP(invoice.totalHT || 0).toLocaleString("fr-FR")} CFP
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-bold text-primary whitespace-nowrap">
                        {roundToCFP(invoice.total || 0).toLocaleString("fr-FR")} CFP
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          {isOwnerOrAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("edit")}
                                onClick={() => handleEdit(invoice.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("downloadPDF")}
                                onClick={() => handleDownloadPDF(invoice.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("delete")}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
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
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </>
                          )}
                          {isClient && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t("downloadPDF")}
                              onClick={() => handleDownloadPDF(invoice.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

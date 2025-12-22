"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Clock, Banknote } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import axios from "axios";
import { roundToCFP } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE_DEFAULT = 20;

export default function TransfersPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: session } = useSession();

  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  // Fetch invoices with transfer payment method
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const res = await fetch("/api/invoices?type=invoice");
      const invoices = await res.json();
      // Filter invoices with Virement payment method
      return invoices.filter(
        (inv: any) => inv.lastPaymentMethod === "Virement" || !inv.paid
      );
    },
  });

  const confirmTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/invoices/${id}`, {
        paid: true,
        paymentDate: new Date().toISOString(),
        lastPaymentMethod: "Virement",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      customToast.success("Virement confirmé avec succès");
    },
    onError: () => {
      customToast.error("Erreur lors de la confirmation");
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/invoices/${id}`, {
        paid: false,
        paymentDate: null,
        lastPaymentMethod: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      customToast.success("Virement rejeté");
    },
    onError: () => {
      customToast.error("Erreur lors du rejet");
    },
  });

  const filteredTransfers = transfers.filter((inv: any) => {
    const matchesSearch =
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "confirmed" && inv.paid && inv.lastPaymentMethod === "Virement") ||
      (filter === "pending" && !inv.paid);
    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransfers = filteredTransfers.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const calculateStats = () => {
    const pending = transfers.filter((inv: any) => !inv.paid).length;
    const confirmed = transfers.filter(
      (inv: any) => inv.paid && inv.lastPaymentMethod === "Virement"
    ).length;
    const total = transfers.reduce(
      (sum: number, inv: any) => sum + (inv.total || 0),
      0
    );
    const confirmedAmount = transfers
      .filter((inv: any) => inv.paid && inv.lastPaymentMethod === "Virement")
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

    return { pending, confirmed, total, confirmedAmount };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("transferManagement")}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {t("confirmOrRejectTransfers")}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <Card className="card-angular">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t("pending")}</p>
                <p className="text-2xl sm:text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t("confirmed")}</p>
                <p className="text-2xl sm:text-3xl font-bold text-success">{stats.confirmed}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t("total")}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary break-words">
                  {roundToCFP(stats.total).toLocaleString('fr-FR')} <span className="text-sm sm:text-base">CFP</span>
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t("confirmedAmount")}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-success break-words">
                  {roundToCFP(stats.confirmedAmount).toLocaleString('fr-FR')} <span className="text-sm sm:text-base">CFP</span>
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 ml-2">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchByRefOrClient")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                className="btn-angular flex-1 sm:flex-none"
                size="sm"
                onClick={() => setFilter("all")}
              >
                {t("all")}
              </Button>
              <Button
                variant={filter === "confirmed" ? "default" : "outline"}
                className="btn-angular flex-1 sm:flex-none"
                size="sm"
                onClick={() => setFilter("confirmed")}
              >
                {t("confirmed")}
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                className="btn-angular flex-1 sm:flex-none"
                size="sm"
                onClick={() => setFilter("pending")}
              >
                {t("pending")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{t("noTransferFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="table-angular min-w-full">
                  <thead>
                    <tr>
                      <th className="px-2 sm:px-4">#</th>
                      <th className="px-2 sm:px-4">{t("clients")}</th>
                      <th className="px-2 sm:px-4">{t("reference")}</th>
                      <th className="px-2 sm:px-4 hidden lg:table-cell">{t("creationDate")}</th>
                      <th className="px-2 sm:px-4">{t("totalTTC")}</th>
                      <th className="px-2 sm:px-4">{t("status")}</th>
                      <th className="px-2 sm:px-4 hidden xl:table-cell">{t("paymentDate")}</th>
                      <th className="px-2 sm:px-4">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransfers.map((transfer: any, index: number) => (
                      <tr key={transfer.id} className="hover:bg-muted/20 transition-colors">
                        <td className="font-medium px-2 sm:px-4">{startIndex + index + 1}</td>
                        <td className="px-2 sm:px-4">
                          <div className="min-w-[100px]">{transfer.client?.name || "-"}</div>
                        </td>
                        <td className="font-semibold text-primary px-2 sm:px-4">
                          <div className="min-w-[100px]">{transfer.ref}</div>
                        </td>
                        <td className="px-2 sm:px-4 hidden lg:table-cell">{formatDate(transfer.createdAt, language === "en" ? "en-US" : "fr-FR")}</td>
                        <td className="font-bold text-primary px-2 sm:px-4">
                          <div className="whitespace-nowrap text-sm sm:text-base">
                            {roundToCFP(transfer.total || 0).toLocaleString('fr-FR')} <span className="text-xs sm:text-sm">CFP</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4">
                          {transfer.paid && transfer.lastPaymentMethod === "Virement" ? (
                            <Badge variant="success" className="cursor-default text-xs whitespace-nowrap">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">{t("confirmed")}</span>
                              <span className="sm:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs whitespace-nowrap">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">{t("pending")}</span>
                              <span className="sm:hidden">⏱</span>
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 hidden xl:table-cell">
                          {transfer.paymentDate ? formatDate(transfer.paymentDate, language === "en" ? "en-US" : "fr-FR") : "-"}
                        </td>
                        <td className="px-2 sm:px-4">
                          <div className="flex items-center justify-center gap-1">
                            {isOwnerOrAdmin && !transfer.paid && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={t("confirmTransfer")}
                                  className="text-success hover:text-success hover:bg-success/10 h-8 w-8 p-0"
                                  onClick={async () => {
                                    if (
                                      await confirm({
                                        title: t("confirmTransfer"),
                                        message: t("confirmTransferQuestion"),
                                        type: "info",
                                      })
                                    ) {
                                      confirmTransferMutation.mutate(transfer.id);
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={t("rejectTransfer")}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                  onClick={async () => {
                                    if (
                                      await confirm({
                                        title: t("rejectTransfer"),
                                        message: t("rejectTransferConfirm"),
                                        type: "danger",
                                      })
                                    ) {
                                      rejectTransferMutation.mutate(transfer.id);
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {transfer.paid && transfer.lastPaymentMethod === "Virement" && (
                              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{t("confirmed")}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredTransfers.length > ITEMS_PER_PAGE_DEFAULT && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTransfers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  const { t } = useLanguage();
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
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("transferManagement")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("confirmOrRejectTransfers")}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("pending")}</p>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("confirmed")}</p>
                <p className="text-3xl font-bold text-success">{stats.confirmed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("total")}</p>
                <p className="text-3xl font-bold text-primary">
                  {roundToCFP(stats.total).toLocaleString('fr-FR')} CFP
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("confirmedAmount")}</p>
                <p className="text-3xl font-bold text-success">
                  {roundToCFP(stats.confirmedAmount).toLocaleString('fr-FR')} CFP
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                variant={filter === "confirmed" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("confirmed")}
              >
                {t("confirmed")}
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
            <TableSkeleton rows={5} cols={8} />
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{t("noTransferFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("clients")}</th>
                    <th>{t("reference")}</th>
                    <th>{t("creationDate")}</th>
                    <th>{t("totalTTC")}</th>
                    <th>{t("status")}</th>
                    <th>{t("paymentDate")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransfers.map((transfer: any, index: number) => (
                    <tr key={transfer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{startIndex + index + 1}</td>
                      <td>{transfer.client?.name || "-"}</td>
                      <td className="font-semibold text-primary">{transfer.ref}</td>
                      <td>{formatDate(transfer.createdAt)}</td>
                      <td className="font-bold text-primary">
                        {roundToCFP(transfer.total || 0).toLocaleString('fr-FR')} CFP
                      </td>
                      <td>
                        {transfer.paid && transfer.lastPaymentMethod === "Virement" ? (
                          <Badge variant="success" className="cursor-default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("confirmed")}
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <Clock className="h-3 w-3 mr-1" />
                            {t("pending")}
                          </Badge>
                        )}
                      </td>
                      <td>
                        {transfer.paymentDate ? formatDate(transfer.paymentDate) : "-"}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {isOwnerOrAdmin && !transfer.paid && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t("confirmTransfer")}
                                className="text-success hover:text-success hover:bg-success/10"
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
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                            <span className="text-sm text-muted-foreground">{t("confirmed")}</span>
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

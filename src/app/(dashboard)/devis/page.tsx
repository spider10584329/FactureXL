"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Eye, FileDown, ArrowRight, X, CalendarClock, CalendarDays } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import { InvoiceModal } from "@/components/invoices/invoice-modal";
import axios from "axios";

export default function DevisPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDevis, setEditingDevis] = useState<any>(null);
  const [viewingDevis, setViewingDevis] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionDevis, setSubscriptionDevis] = useState<any>(null);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [renewalFrequency, setRenewalFrequency] = useState<"monthly" | "bimonthly" | "quarterly" | "semiannual" | "yearly" | "custom">("monthly");
  const [customRenewalMonth, setCustomRenewalMonth] = useState(12); // December by default for yearly/custom
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      return res.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "devis" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Quote created successfully" : "Devis créé avec succès");
      setShowForm(false);
    },
    onError: () => {
      customToast.error(language === "en" ? "Error creating quote" : "Erreur lors de la création");
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invoice" }),
      });
      if (!res.ok) throw new Error("Failed to convert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Quote converted to invoice" : "Devis converti en facture");
    },
    onError: () => {
      customToast.error(language === "en" ? "Error converting" : "Erreur lors de la conversion");
    },
  });

  const convertToSubscriptionMutation = useMutation({
    mutationFn: async ({ 
      id, 
      startDate, 
      endDate,
      frequency,
      customMonth
    }: { 
      id: string; 
      startDate: string; 
      endDate: string;
      frequency: "monthly" | "bimonthly" | "quarterly" | "semiannual" | "yearly" | "custom";
      customMonth?: number;
    }) => {
      // Calculate renewal dates based on frequency
      const start = new Date(startDate);
      const end = new Date(endDate);
      const renewalDates: string[] = [];
      
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        if (frequency === "monthly") {
          // Every month
          renewalDates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (frequency === "bimonthly") {
          // Every 2 months
          renewalDates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setMonth(currentDate.getMonth() + 2);
        } else if (frequency === "quarterly") {
          // Every 3 months (trimester)
          renewalDates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setMonth(currentDate.getMonth() + 3);
        } else if (frequency === "semiannual") {
          // Every 6 months (semiannual)
          renewalDates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setMonth(currentDate.getMonth() + 6);
        } else if (frequency === "yearly" || frequency === "custom") {
          // Only in specific month (default December)
          const targetMonth = customMonth ? customMonth - 1 : 11; // 0-indexed, December = 11
          if (currentDate.getMonth() === targetMonth) {
            renewalDates.push(currentDate.toISOString().split("T")[0]);
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscription",
          subscription: true,
          startDate: startDate,
          endDate: endDate,
          frequency: frequency,
          month: (frequency === "custom" || frequency === "yearly") ? customMonth : null, // Store the custom month
          subscriptionMonths: renewalDates, // Store renewal dates for tracking
        }),
      });
      if (!res.ok) throw new Error("Failed to convert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Quote converted to subscription" : "Devis converti en abonnement");
      setShowSubscriptionModal(false);
      setSubscriptionDevis(null);
      setSubscriptionEndDate("");
      setRenewalFrequency("monthly");
      setCustomRenewalMonth(12);
    },
    onError: () => {
      customToast.error(language === "en" ? "Error converting" : "Erreur lors de la conversion");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Quote deleted" : "Devis supprimé");
    },
    onError: () => {
      customToast.error(language === "en" ? "Error deleting" : "Erreur lors de la suppression");
    },
  });

  const handleDownloadPDF = async (devisId: string) => {
    try {
      customToast.info(language === "en" ? "Generating PDF..." : "Génération du PDF en cours...");
      const response = await axios.get(`/api/invoices/${devisId}`);
      const devisData = response.data;
      downloadInvoicePDF(devisData, devisData.company);
      customToast.success(language === "en" ? "PDF generated successfully" : "PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      customToast.error(language === "en" ? "Error generating PDF" : "Erreur lors de la génération du PDF");
    }
  };

  const handleView = async (devisId: string) => {
    try {
      const response = await axios.get(`/api/invoices/${devisId}`);
      setViewingDevis(response.data);
    } catch (error) {
      console.error("Error fetching quote details:", error);
      customToast.error(language === "en" ? "Error loading details" : "Erreur lors du chargement des détails");
    }
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");
  const devisList = invoices.filter((inv: any) => inv.type === "devis");
  const filteredDevis = devisList
    .filter(
      (inv: any) =>
        inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => {
      // Sort by validUntil date (ascending - earliest expiration first)
      // Quotes without validUntil go to the end
      if (!a.validUntil && !b.validUntil) return 0;
      if (!a.validUntil) return 1;
      if (!b.validUntil) return -1;
      return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
    });

  // Check if quote is expired
  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("quotes")}</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-angular bg-primary text-white hover:bg-primary/90 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> 
          <span className="whitespace-nowrap">{language === "en" ? "New Quote" : "Nouveau devis"}</span>
        </Button>
      </div>

      {/* Invoice Modal for creating/editing quotes */}
      <InvoiceModal
        open={showForm}
        onOpenChange={setShowForm}
        type="devis"
        invoice={editingDevis}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          setShowForm(false);
          setEditingDevis(null);
        }}
      />

      {/* View Modal */}
      <Dialog open={!!viewingDevis} onOpenChange={(open: boolean) => !open && setViewingDevis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 -mx-6 -mt-6 px-6 py-4 border-b">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2 flex-wrap">
              <Eye className="h-5 w-5 flex-shrink-0" />
              <span className="break-all">
                {language === "en" ? "Quote Details" : "Détails du devis"} - {viewingDevis?.ref}
              </span>
            </DialogTitle>
          </DialogHeader>

          {viewingDevis && (
            <div className="space-y-6 mt-4">
              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">{t("client")}</Label>
                  <p className="font-semibold">{viewingDevis.client?.name || "-"}</p>
                  <p className="text-sm text-muted-foreground">{viewingDevis.client?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("creationDate")}</Label>
                  <p className="font-semibold">{formatDate(viewingDevis.createdAt, language === "en" ? "en-US" : "fr-FR")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{language === "en" ? "Valid until" : "Valide jusqu'au"}</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{viewingDevis.validUntil ? formatDate(viewingDevis.validUntil, language === "en" ? "en-US" : "fr-FR") : "-"}</p>
                    {viewingDevis.validUntil && isExpired(viewingDevis.validUntil) && (
                      <Badge variant="danger" className="text-xs">
                        {language === "en" ? "Expired" : "Expiré"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              {viewingDevis.items && viewingDevis.items.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-sm mb-2 block">{t("articles")}</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-2 px-3">{t("description")}</th>
                            <th className="text-center py-2 px-3 whitespace-nowrap">{language === "en" ? "Qty" : "Qté"}</th>
                            <th className="text-right py-2 px-3 whitespace-nowrap">{language === "en" ? "Price" : "Prix"}</th>
                            <th className="text-right py-2 px-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingDevis.items.map((item: any, index: number) => (
                            <tr key={index} className="border-t">
                              <td className="py-2 px-3">{item.product || item.description}</td>
                              <td className="text-center py-2 px-3">{item.quantity}</td>
                              <td className="text-right py-2 px-3 whitespace-nowrap">{formatCurrency(item.price)}</td>
                              <td className="text-right py-2 px-3 font-medium whitespace-nowrap">
                                {formatCurrency(item.quantity * item.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>{t("totalHT")}:</span>
                    <span className="font-medium">{formatCurrency(viewingDevis.totalHT || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">{t("totalTTC")}:</span>
                    <span className="font-bold text-primary">{formatCurrency(viewingDevis.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingDevis.notes && (
                <div>
                  <Label className="text-muted-foreground text-sm">{language === "en" ? "Notes" : "Notes"}</Label>
                  <p className="mt-1 text-sm bg-muted/30 p-3 rounded">{viewingDevis.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingDevis(null)}
                  className="btn-angular"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("close")}
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(viewingDevis.id)}
                  className="btn-angular bg-primary text-white hover:bg-primary/90"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {t("downloadPDF")}
                </Button>
                <Button
                  onClick={async () => {
                    if (await confirm({
                      title: t("convertToInvoice"),
                      message: language === "en"
                        ? "Are you sure you want to convert this quote to an invoice?"
                        : "Voulez-vous vraiment convertir ce devis en facture?",
                      confirmText: t("convert"),
                      type: "info"
                    })) {
                      convertToInvoiceMutation.mutate(viewingDevis.id);
                      setViewingDevis(null);
                    }
                  }}
                  className="btn-angular bg-green-600 text-white hover:bg-green-700"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span className="truncate">{t("convertToInvoice")}</span>
                </Button>
                <Button
                  onClick={() => {
                    setSubscriptionDevis(viewingDevis);
                    setShowSubscriptionModal(true);
                    setViewingDevis(null);
                  }}
                  className="btn-angular bg-blue-600 text-white hover:bg-blue-700"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <span className="truncate">{language === "en" ? "Subscription" : "Abonnement"}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Devis List */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchByRefOrClient")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filteredDevis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{language === "en" ? "No quote found" : "Aucun devis trouvé"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="table-angular min-w-full">
                  <thead>
                    <tr>
                      <th className="px-2 sm:px-4">#</th>
                      <th className="px-2 sm:px-4">{t("reference")}</th>
                      <th className="px-2 sm:px-4 hidden sm:table-cell">{t("client")}</th>
                      <th className="px-2 sm:px-4 hidden lg:table-cell">{t("creationDate")}</th>
                      <th className="px-2 sm:px-4 hidden xl:table-cell">{language === "en" ? "Valid until" : "Valide jusqu'au"}</th>
                      <th className="px-2 sm:px-4">{t("totalTTC")}</th>
                      <th className="px-2 sm:px-4">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevis.map((devis: any, index: number) => (
                      <tr key={devis.id} className="hover:bg-muted/20 transition-colors">
                        <td className="font-medium px-2 sm:px-4">{index + 1}</td>
                        <td className="font-semibold text-primary px-2 sm:px-4">
                          <div className="min-w-[100px]">{devis.ref}</div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-1">
                            {devis.client?.name || "-"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 hidden sm:table-cell">{devis.client?.name || "-"}</td>
                        <td className="px-2 sm:px-4 hidden lg:table-cell">{formatDate(devis.createdAt, language === "en" ? "en-US" : "fr-FR")}</td>
                        <td className="px-2 sm:px-4 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            {devis.validUntil ? formatDate(devis.validUntil, language === "en" ? "en-US" : "fr-FR") : "-"}
                            {devis.validUntil && isExpired(devis.validUntil) && (
                              <Badge variant="danger" className="text-xs">
                                {language === "en" ? "Expired" : "Expiré"}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="font-bold text-primary px-2 sm:px-4">
                          <div className="whitespace-nowrap">{formatCurrency(devis.total || 0)}</div>
                        </td>
                        <td className="px-2 sm:px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={language === "en" ? "View" : "Voir"}
                              onClick={() => handleView(devis.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t("downloadPDF")}
                              onClick={() => handleDownloadPDF(devis.id)}
                              className="h-8 w-8 p-0 hidden sm:inline-flex"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t("convertToInvoice")}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0 hidden md:inline-flex"
                              onClick={async () => {
                                if (await confirm({
                                  title: t("convertToInvoice"),
                                  message: language === "en"
                                    ? "Are you sure you want to convert this quote to an invoice?"
                                    : "Voulez-vous vraiment convertir ce devis en facture?",
                                  confirmText: t("convert"),
                                  type: "info"
                                })) {
                                  convertToInvoiceMutation.mutate(devis.id);
                                }
                              }}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={language === "en" ? "Convert to Subscription" : "Convertir en abonnement"}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 hidden md:inline-flex"
                              onClick={() => {
                                setSubscriptionDevis(devis);
                                setShowSubscriptionModal(true);
                              }}
                            >
                              <CalendarDays className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t("delete")}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              onClick={async () => {
                                if (await confirm({
                                  title: t("delete"),
                                  message: language === "en"
                                    ? "Are you sure you want to delete this quote?"
                                    : "Voulez-vous vraiment supprimer ce devis?",
                                  type: "danger"
                                })) {
                                  deleteMutation.mutate(devis.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Conversion Modal */}
      <Dialog open={showSubscriptionModal} onOpenChange={(open) => {
        if (!open) {
          setShowSubscriptionModal(false);
          setSubscriptionDevis(null);
          setSubscriptionEndDate("");
          setRenewalFrequency("monthly");
          setCustomRenewalMonth(12);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? "Convert to Subscription" : "Convertir en abonnement"}
            </DialogTitle>
          </DialogHeader>
          {subscriptionDevis && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded border">
                <p className="font-semibold text-primary">{subscriptionDevis.ref}</p>
                <p className="text-sm text-muted-foreground">{subscriptionDevis.client?.name}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(subscriptionDevis.total || 0)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === "en" ? "Start Date" : "Date de début"}</Label>
                  <Input
                    type="date"
                    value={subscriptionStartDate}
                    onChange={(e) => setSubscriptionStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === "en" ? "End Date" : "Date de fin"}</Label>
                  <Input
                    type="date"
                    value={subscriptionEndDate}
                    onChange={(e) => setSubscriptionEndDate(e.target.value)}
                    min={subscriptionStartDate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === "en" ? "Renewal Frequency" : "Fréquence de renouvellement"}</Label>
                <select
                  value={renewalFrequency}
                  onChange={(e) => setRenewalFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                >
                  <option value="monthly">{language === "en" ? "Monthly (every month)" : "Mensuel (chaque mois)"}</option>
                  <option value="bimonthly">{language === "en" ? "Bimonthly (every 2 months)" : "Bimestriel (tous les 2 mois)"}</option>
                  <option value="quarterly">{language === "en" ? "Quarterly (every 3 months)" : "Trimestriel (tous les 3 mois)"}</option>
                  <option value="semiannual">{language === "en" ? "Semiannual (every 6 months)" : "Semestriel (tous les 6 mois)"}</option>
                  <option value="yearly">{language === "en" ? "Yearly (once per year)" : "Annuel (une fois par an)"}</option>
                  <option value="custom">{language === "en" ? "Custom (specific month only)" : "Personnalisé (mois spécifique)"}</option>
                </select>
              </div>

              {(renewalFrequency === "yearly" || renewalFrequency === "custom") && (
                <div className="space-y-2">
                  <Label>{language === "en" ? "Renewal Month" : "Mois de renouvellement"}</Label>
                  <select
                    value={customRenewalMonth}
                    onChange={(e) => setCustomRenewalMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                  >
                    <option value={1}>{language === "en" ? "January" : "Janvier"}</option>
                    <option value={2}>{language === "en" ? "February" : "Février"}</option>
                    <option value={3}>{language === "en" ? "March" : "Mars"}</option>
                    <option value={4}>{language === "en" ? "April" : "Avril"}</option>
                    <option value={5}>{language === "en" ? "May" : "Mai"}</option>
                    <option value={6}>{language === "en" ? "June" : "Juin"}</option>
                    <option value={7}>{language === "en" ? "July" : "Juillet"}</option>
                    <option value={8}>{language === "en" ? "August" : "Août"}</option>
                    <option value={9}>{language === "en" ? "September" : "Septembre"}</option>
                    <option value={10}>{language === "en" ? "October" : "Octobre"}</option>
                    <option value={11}>{language === "en" ? "November" : "Novembre"}</option>
                    <option value={12}>{language === "en" ? "December" : "Décembre"}</option>
                  </select>
                </div>
              )}

              {subscriptionEndDate && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">
                      {language === "en" ? "Subscription Summary:" : "Résumé de l'abonnement:"}
                    </span>
                    <br />
                    <span className="block mt-1">
                      {language === "en" ? "Period:" : "Période:"} {formatDate(subscriptionStartDate, language === "en" ? "en-US" : "fr-FR")} → {formatDate(subscriptionEndDate, language === "en" ? "en-US" : "fr-FR")}
                    </span>
                    <span className="block">
                      {language === "en" ? "Renewal:" : "Renouvellement:"} {
                        renewalFrequency === "monthly" ? (language === "en" ? "Every month" : "Chaque mois") :
                        renewalFrequency === "bimonthly" ? (language === "en" ? "Every 2 months" : "Tous les 2 mois") :
                        renewalFrequency === "quarterly" ? (language === "en" ? "Every 3 months" : "Tous les 3 mois") :
                        (language === "en" ? `Only in ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][customRenewalMonth - 1]}` : `Uniquement en ${["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][customRenewalMonth - 1]}`)
                      }
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setSubscriptionDevis(null);
                    setSubscriptionEndDate("");
                    setRenewalFrequency("monthly");
                    setCustomRenewalMonth(12);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    if (!subscriptionEndDate) {
                      customToast.error(language === "en" ? "Please select an end date" : "Veuillez sélectionner une date de fin");
                      return;
                    }
                    convertToSubscriptionMutation.mutate({
                      id: subscriptionDevis.id,
                      startDate: subscriptionStartDate,
                      endDate: subscriptionEndDate,
                      frequency: renewalFrequency,
                      customMonth: customRenewalMonth,
                    });
                  }}
                  disabled={convertToSubscriptionMutation.isPending || !subscriptionEndDate}
                >
                  {convertToSubscriptionMutation.isPending ? (
                    language === "en" ? "Converting..." : "Conversion..."
                  ) : (
                    language === "en" ? "Convert" : "Convertir"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Plus, Search, Trash2, Eye, FileDown, ArrowRight, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import axios from "axios";

export default function DevisPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDevis, setEditingDevis] = useState<any>(null);
  const [viewingDevis, setViewingDevis] = useState<any>(null);
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

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      ref: formData.get("ref"),
      clientId: formData.get("clientId"),
      groupId: formData.get("groupId"),
      notes: formData.get("notes"),
      validUntil: formData.get("validUntil"),
      type: "devis",
    };
    createMutation.mutate(data);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingDevis(null);
  };

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
  const filteredDevis = devisList.filter(
    (inv: any) =>
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if quote is expired
  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("quotes")}</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-angular bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {language === "en" ? "New Quote" : "Nouveau devis"}
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDevis
                ? (language === "en" ? "Edit Quote" : "Modifier le devis")
                : (language === "en" ? "New Quote" : "Nouveau devis")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">{t("reference")} *</Label>
                <Input id="ref" name="ref" defaultValue={editingDevis?.ref} required className="form-field-angular" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">{t("client")} *</Label>
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue={editingDevis?.clientId}
                  required
                  className="form-field-angular w-full"
                >
                  <option value="">{language === "en" ? "Select a client" : "Sélectionner un client"}</option>
                  {clients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupId">{t("group")}</Label>
                <select
                  id="groupId"
                  name="groupId"
                  defaultValue={editingDevis?.groupId}
                  className="form-field-angular w-full"
                >
                  <option value="">{language === "en" ? "Select a group" : "Sélectionner un groupe"}</option>
                  {groups.map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">{language === "en" ? "Valid until" : "Valide jusqu'au"}</Label>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  defaultValue={editingDevis?.validUntil?.split("T")[0]}
                  className="form-field-angular"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{language === "en" ? "Notes" : "Notes"}</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingDevis?.notes}
                  className="form-field-angular w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="btn-angular">
                {t("cancel")}
              </Button>
              <Button type="submit" className="btn-angular bg-primary text-white hover:bg-primary/90">
                {editingDevis ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingDevis} onOpenChange={(open) => !open && setViewingDevis(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold text-primary flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {language === "en" ? "Quote Details" : "Détails du devis"} - {viewingDevis?.ref}
            </DialogTitle>
          </DialogHeader>

          {viewingDevis && (
            <div className="space-y-6 mt-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">{t("client")}</Label>
                  <p className="font-semibold">{viewingDevis.client?.name || "-"}</p>
                  <p className="text-sm text-muted-foreground">{viewingDevis.client?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("creationDate")}</Label>
                  <p className="font-semibold">{formatDate(viewingDevis.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{language === "en" ? "Valid until" : "Valide jusqu'au"}</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{viewingDevis.validUntil ? formatDate(viewingDevis.validUntil) : "-"}</p>
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
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2 px-3">{t("description")}</th>
                          <th className="text-center py-2 px-3">{language === "en" ? "Qty" : "Qté"}</th>
                          <th className="text-right py-2 px-3">{language === "en" ? "Price" : "Prix"}</th>
                          <th className="text-right py-2 px-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingDevis.items.map((item: any, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{item.product || item.description}</td>
                            <td className="text-center py-2 px-3">{item.quantity}</td>
                            <td className="text-right py-2 px-3">{formatCurrency(item.price)}</td>
                            <td className="text-right py-2 px-3 font-medium">
                              {formatCurrency(item.quantity * item.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
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
              <div className="flex justify-end gap-2 pt-4 border-t">
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
                      title: language === "en" ? "Convert to Invoice" : "Convertir en facture",
                      message: language === "en"
                        ? "Are you sure you want to convert this quote to an invoice?"
                        : "Voulez-vous vraiment convertir ce devis en facture?",
                      type: "info"
                    })) {
                      convertToInvoiceMutation.mutate(viewingDevis.id);
                      setViewingDevis(null);
                    }
                  }}
                  className="btn-angular bg-green-600 text-white hover:bg-green-700"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {language === "en" ? "Convert to Invoice" : "Convertir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Devis List */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchByRefOrClient")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filteredDevis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{language === "en" ? "No quote found" : "Aucun devis trouvé"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("reference")}</th>
                    <th>{t("client")}</th>
                    <th>{t("group")}</th>
                    <th>{t("creationDate")}</th>
                    <th>{language === "en" ? "Valid until" : "Valide jusqu'au"}</th>
                    <th>{t("totalTTC")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevis.map((devis: any, index: number) => (
                    <tr key={devis.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{index + 1}</td>
                      <td className="font-semibold text-primary">{devis.ref}</td>
                      <td>{devis.client?.name || "-"}</td>
                      <td>{devis.group?.name || "-"}</td>
                      <td>{formatDate(devis.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {devis.validUntil ? formatDate(devis.validUntil) : "-"}
                          {devis.validUntil && isExpired(devis.validUntil) && (
                            <Badge variant="danger" className="text-xs">
                              {language === "en" ? "Expired" : "Expiré"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="font-bold text-primary">{formatCurrency(devis.total || 0)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={language === "en" ? "View" : "Voir"}
                            onClick={() => handleView(devis.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("downloadPDF")}
                            onClick={() => handleDownloadPDF(devis.id)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={language === "en" ? "Convert to invoice" : "Convertir en facture"}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              if (await confirm({
                                title: language === "en" ? "Convert to Invoice" : "Convertir en facture",
                                message: language === "en"
                                  ? "Are you sure you want to convert this quote to an invoice?"
                                  : "Voulez-vous vraiment convertir ce devis en facture?",
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
                            title={t("delete")}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Plus, Search, Trash2, Eye, FileDown, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import axios from "axios";

export default function AvoirsPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAvoir, setEditingAvoir] = useState<any>(null);
  const [viewingAvoir, setViewingAvoir] = useState<any>(null);
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
        body: JSON.stringify({ ...data, type: "avoir" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Credit note created successfully" : "Avoir créé avec succès");
      setShowForm(false);
    },
    onError: () => {
      customToast.error(language === "en" ? "Error creating credit note" : "Erreur lors de la création");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      customToast.success(language === "en" ? "Credit note deleted" : "Avoir supprimé");
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
      type: "avoir",
    };
    createMutation.mutate(data);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingAvoir(null);
  };

  const handleDownloadPDF = async (avoirId: string) => {
    try {
      customToast.info(language === "en" ? "Generating PDF..." : "Génération du PDF en cours...");
      const response = await axios.get(`/api/invoices/${avoirId}`);
      const avoirData = response.data;
      downloadInvoicePDF(avoirData, avoirData.company);
      customToast.success(language === "en" ? "PDF generated successfully" : "PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      customToast.error(language === "en" ? "Error generating PDF" : "Erreur lors de la génération du PDF");
    }
  };

  const handleView = async (avoirId: string) => {
    try {
      const response = await axios.get(`/api/invoices/${avoirId}`);
      setViewingAvoir(response.data);
    } catch (error) {
      console.error("Error fetching credit note details:", error);
      customToast.error(language === "en" ? "Error loading details" : "Erreur lors du chargement des détails");
    }
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");
  const avoirs = invoices.filter((inv: any) => inv.type === "avoir");
  const filteredAvoirs = avoirs.filter(
    (inv: any) =>
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("creditNotes")}</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-angular bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {language === "en" ? "New Credit Note" : "Nouvel avoir"}
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAvoir
                ? (language === "en" ? "Edit Credit Note" : "Modifier l'avoir")
                : (language === "en" ? "New Credit Note" : "Nouvel avoir")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">{t("reference")} *</Label>
                <Input id="ref" name="ref" defaultValue={editingAvoir?.ref} required className="form-field-angular" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">{t("client")} *</Label>
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue={editingAvoir?.clientId}
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
                  defaultValue={editingAvoir?.groupId}
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{language === "en" ? "Notes" : "Notes"}</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingAvoir?.notes}
                  className="form-field-angular w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="btn-angular">
                {t("cancel")}
              </Button>
              <Button type="submit" className="btn-angular bg-primary text-white hover:bg-primary/90">
                {editingAvoir ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingAvoir} onOpenChange={(open) => !open && setViewingAvoir(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-red-50 to-orange-50 -mx-6 -mt-6 px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold text-red-600 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {language === "en" ? "Credit Note Details" : "Détails de l'avoir"} - {viewingAvoir?.ref}
            </DialogTitle>
          </DialogHeader>

          {viewingAvoir && (
            <div className="space-y-6 mt-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">{t("client")}</Label>
                  <p className="font-semibold">{viewingAvoir.client?.name || "-"}</p>
                  <p className="text-sm text-muted-foreground">{viewingAvoir.client?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("creationDate")}</Label>
                  <p className="font-semibold">{formatDate(viewingAvoir.createdAt)}</p>
                </div>
              </div>

              {/* Items */}
              {viewingAvoir.items && viewingAvoir.items.length > 0 && (
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
                        {viewingAvoir.items.map((item: any, index: number) => (
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
                    <span className="font-medium text-red-600">-{formatCurrency(viewingAvoir.totalHT || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">{t("totalTTC")}:</span>
                    <span className="font-bold text-red-600">-{formatCurrency(viewingAvoir.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingAvoir.notes && (
                <div>
                  <Label className="text-muted-foreground text-sm">{language === "en" ? "Notes" : "Notes"}</Label>
                  <p className="mt-1 text-sm bg-muted/30 p-3 rounded">{viewingAvoir.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingAvoir(null)}
                  className="btn-angular"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("close")}
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(viewingAvoir.id)}
                  className="btn-angular bg-primary text-white hover:bg-primary/90"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {t("downloadPDF")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avoirs List */}
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
            <TableSkeleton rows={5} cols={6} />
          ) : filteredAvoirs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{language === "en" ? "No credit note found" : "Aucun avoir trouvé"}</p>
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
                    <th>{t("totalTTC")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvoirs.map((avoir: any, index: number) => (
                    <tr key={avoir.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{index + 1}</td>
                      <td className="font-semibold text-red-600">{avoir.ref}</td>
                      <td>{avoir.client?.name || "-"}</td>
                      <td>{avoir.group?.name || "-"}</td>
                      <td>{formatDate(avoir.createdAt)}</td>
                      <td className="font-bold text-red-600">-{formatCurrency(avoir.total || 0)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={language === "en" ? "View" : "Voir"}
                            onClick={() => handleView(avoir.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("downloadPDF")}
                            onClick={() => handleDownloadPDF(avoir.id)}
                          >
                            <FileDown className="h-4 w-4" />
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
                                  ? "Are you sure you want to delete this credit note?"
                                  : "Voulez-vous vraiment supprimer cet avoir?",
                                type: "danger"
                              })) {
                                deleteMutation.mutate(avoir.id);
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

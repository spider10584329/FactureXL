"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Edit, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TableSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import { InvoiceModal } from "@/components/invoices/invoice-modal";
import { useEffect } from "react";

export default function SubscriptionInvoicesPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [viewingSubscription, setViewingSubscription] = useState<any>(null);
  const [selectedFrequency, setSelectedFrequency] = useState("monthly");
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Initialize frequency when editing
  useEffect(() => {
    if (editingSubscription) {
      setSelectedFrequency(editingSubscription.frequency || "monthly");
    } else {
      setSelectedFrequency("monthly");
    }
  }, [editingSubscription]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "subscription" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("subscriptionCreated"));
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log("Sending update request with data:", data);
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Update failed:", errorText);
        throw new Error("Failed to update");
      }
      const result = await res.json();
      console.log("Update successful, result:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("subscriptionUpdated"));
      setEditingSubscription(null);
      setShowForm(false);
    },
    onError: (error: any) => {
      console.error("Update mutation error:", error);
      toast.error(language === "en" ? "Failed to update subscription" : "Échec de la mise à jour de l'abonnement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("subscriptionDeleted"));
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (subscription: any) => {
      // Validate that subscription has items
      if (!subscription.items || subscription.items.length === 0) {
        throw new Error("NO_ITEMS");
      }

      // Validate that items have required fields
      const validItems = subscription.items.filter((item: any) => 
        item.product && (item.price !== undefined && item.price !== null) && (item.quantity !== undefined && item.quantity !== null)
      );

      if (validItems.length === 0) {
        throw new Error("INVALID_ITEMS");
      }

      // Create a new invoice from the subscription template
      const invoiceData = {
        ref: `INV-${Date.now()}`,
        clientId: subscription.clientId,
        employeeId: subscription.employeeId,
        type: "invoice" as const,
        commentary: subscription.commentary || subscription.notes || "",
        wording: subscription.wording || "",
        items: validItems.map((item: any) => ({
          internRef: item.internRef || "",
          product: item.product,
          price: Number(item.price),
          quantity: Number(item.quantity),
          description: item.description || "",
          discount: Number(item.discount) || 0,
          unite: item.unite || "",
          tax: Number(item.tax) || 0,
        })),
      };

      console.log("Generating invoice with data:", invoiceData);

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("API Error Response:", errorData);
        throw new Error("API_ERROR");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(language === "en" ? "Invoice generated from subscription" : "Facture générée à partir de l'abonnement");
    },
    onError: (error: any) => {
      console.error("Generation error:", error);
      if (error.message === "NO_ITEMS") {
        toast.error(language === "en" 
          ? "Cannot generate invoice: subscription has no items. Please view and edit the template first." 
          : "Impossible de générer la facture: l'abonnement n'a pas d'articles. Veuillez d'abord voir et modifier le modèle.");
      } else if (error.message === "INVALID_ITEMS") {
        toast.error(language === "en"
          ? "Cannot generate invoice: items are missing required fields (product, price, quantity)."
          : "Impossible de générer la facture: les articles manquent de champs requis (produit, prix, quantité).");
      } else {
        toast.error(language === "en" ? "Error generating invoice. Check console for details." : "Erreur lors de la génération de la facture. Vérifiez la console pour plus de détails.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const frequency = formData.get("frequency") as string;
    
    const data = {
      ref: formData.get("ref"),
      clientId: formData.get("clientId"),
      commentary: formData.get("notes"), // Map notes to commentary for database
      frequency: frequency,
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      // Only include month if frequency is "custom"
      month: frequency === "custom" && formData.get("month") ? Number(formData.get("month")) : null,
      type: "subscription",
      subscription: true,
    };

    console.log("Submitting subscription data:", data);

    if (editingSubscription) {
      updateMutation.mutate({ id: editingSubscription.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingSubscription(null);
    setSelectedFrequency("monthly");
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");
  const subscriptions = invoices.filter((inv: any) => inv.type === "subscription" || inv.subscription === true);
  const filteredSubscriptions = subscriptions.filter(
    (inv: any) =>
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Helper function to get the next renewal date based on frequency
  const getNextRenewalDate = (startDate: Date, frequency: string, now: Date, endDate: Date, customMonth?: number): Date | null => {
    let currentDate = new Date(startDate);
    
    // For custom frequency, find the next occurrence of the specified month
    if (frequency === "custom" && customMonth) {
      // Start from the current year
      const currentYear = now.getFullYear();
      const startYear = startDate.getFullYear();
      
      // Try the custom month in the current year first
      let renewalDate = new Date(currentYear, customMonth - 1, startDate.getDate());
      
      // If it's already passed this year, try next year
      if (renewalDate <= now) {
        renewalDate = new Date(currentYear + 1, customMonth - 1, startDate.getDate());
      }
      
      // Make sure it's within the subscription period and after start date
      if (renewalDate >= startDate && renewalDate <= endDate) {
        return renewalDate;
      }
      
      return null;
    }
    
    // Keep adding intervals until we find the next renewal date after today
    while (currentDate <= now && currentDate <= endDate) {
      switch (frequency) {
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "bimonthly":
          currentDate.setMonth(currentDate.getMonth() + 2);
          break;
        case "quarterly":
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case "semiannual":
          currentDate.setMonth(currentDate.getMonth() + 6);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          return null;
      }
    }
    
    // Return the next renewal date if it's within the subscription period
    return currentDate <= endDate ? currentDate : null;
  };

  // Helper function to check if renewal date is approaching or needs attention
  const isRenewalApproaching = (endDate: string | null | undefined, startDate: string | null | undefined, frequency: string | null | undefined, customMonth?: number) => {
    if (!endDate) return false;
    
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    // Calculate days until end date
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Always highlight if end date is within 7 days
    if (diffDays <= 7 && diffDays >= 0) {
      console.log(`End date within 7 days: ${endDate}, days remaining: ${diffDays}`);
      return true;
    }
    
    // For subscriptions with frequency and start date, find the next renewal date
    if (frequency && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const nextRenewal = getNextRenewalDate(start, frequency, now, end, customMonth);
      
      if (nextRenewal) {
        const daysToRenewal = Math.ceil((nextRenewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Subscription - Start: ${startDate}, Frequency: ${frequency}${frequency === 'custom' ? ` (Month: ${customMonth})` : ''}, Next Renewal: ${nextRenewal.toISOString().split('T')[0]}, Days to renewal: ${daysToRenewal}`);
        
        // Highlight if:
        // 1. Next renewal is within 7 days before (daysToRenewal between 0 and 7)
        // 2. OR renewal date has passed but not more than 30 days ago (giving time to create invoice)
        if (daysToRenewal >= -30 && daysToRenewal <= 7) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Helper function to get row background color class
  const getRowClassName = (endDate: string | null | undefined, startDate: string | null | undefined, frequency: string | null | undefined, customMonth?: number) => {
    const baseClass = "border-b hover:bg-muted/10 transition-colors";
    if (isRenewalApproaching(endDate, startDate, frequency, customMonth)) {
      return `${baseClass} bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30`;
    }
    return baseClass;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("subscriptionInvoices")}</h1>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {t("newSubscriptionInvoice")}
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? t("editSubscriptionInvoice") : t("newSubscriptionInvoice")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">{t("reference")} *</Label>
                <Input id="ref" name="ref" defaultValue={editingSubscription?.ref} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">{t("client")} *</Label>
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue={editingSubscription?.clientId}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background text-foreground"
                >
                  <option value="">{t("selectClient")}</option>
                  {clients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">{t("frequency")} *</Label>
                <select
                  id="frequency"
                  name="frequency"
                  defaultValue={editingSubscription?.frequency || "monthly"}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background text-foreground"
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  value={selectedFrequency}
                >
                  <option value="monthly">{language === "en" ? "Monthly (every month)" : "Mensuel (chaque mois)"}</option>
                  <option value="bimonthly">{language === "en" ? "Bimonthly (every 2 months)" : "Bimestriel (tous les 2 mois)"}</option>
                  <option value="quarterly">{language === "en" ? "Quarterly (every 3 months)" : "Trimestriel (tous les 3 mois)"}</option>
                  <option value="semiannual">{language === "en" ? "Semiannual (every 6 months)" : "Semestriel (tous les 6 mois)"}</option>
                  <option value="yearly">{language === "en" ? "Yearly (once per year)" : "Annuel (une fois par an)"}</option>
                  <option value="custom">{language === "en" ? "Custom (specific month only)" : "Personnalisé (mois spécifique)"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">{t("startDate")} *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={editingSubscription?.startDate?.split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={editingSubscription?.endDate?.split("T")[0]}
                />
              </div>
              {selectedFrequency === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="month">{language === "en" ? "Renewal Month" : "Mois de renouvellement"} *</Label>
                  <select
                    id="month"
                    name="month"
                    defaultValue={editingSubscription?.month || new Date().getMonth() + 1}
                    required
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background text-foreground"
                  >
                    <option value="1">{language === "en" ? "January" : "Janvier"}</option>
                    <option value="2">{language === "en" ? "February" : "Février"}</option>
                    <option value="3">{language === "en" ? "March" : "Mars"}</option>
                    <option value="4">{language === "en" ? "April" : "Avril"}</option>
                    <option value="5">{language === "en" ? "May" : "Mai"}</option>
                    <option value="6">{language === "en" ? "June" : "Juin"}</option>
                    <option value="7">{language === "en" ? "July" : "Juillet"}</option>
                    <option value="8">{language === "en" ? "August" : "Août"}</option>
                    <option value="9">{language === "en" ? "September" : "Septembre"}</option>
                    <option value="10">{language === "en" ? "October" : "Octobre"}</option>
                    <option value="11">{language === "en" ? "November" : "Novembre"}</option>
                    <option value="12">{language === "en" ? "December" : "Décembre"}</option>
                  </select>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{t("notes")}</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingSubscription?.commentary || editingSubscription?.notes || ""}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background text-foreground resize-none"
                  placeholder={language === "en" ? "Add notes about this subscription..." : "Ajouter des notes sur cet abonnement..."}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSubscription ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noSubscriptionFound")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t("reference")}</th>
                    <th className="text-left py-3 px-4">{t("client")}</th>
                    <th className="text-left py-3 px-4">{t("frequency")}</th>
                    <th className="text-left py-3 px-4">{t("startDate")}</th>
                    <th className="text-left py-3 px-4">{t("endDate")}</th>
                    <th className="text-right py-3 px-4">{t("total")}</th>
                    <th className="text-right py-3 px-4">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub: any) => (
                    <tr key={sub.id} className={getRowClassName(sub.endDate, sub.startDate, sub.frequency, sub.month)}>
                      <td className="py-1 px-4 font-medium">{sub.ref}</td>
                      <td className="py-1 px-4">{sub.client?.name || "-"}</td>
                      <td className="py-1 px-4">
                        <div className="flex flex-col">
                          <span>
                            {sub.frequency === "weekly" && t("weekly")}
                            {sub.frequency === "monthly" && t("monthly")}
                            {sub.frequency === "bimonthly" && (language === "en" ? "Bimonthly" : "Bimestriel")}
                            {sub.frequency === "quarterly" && t("quarterly")}
                            {sub.frequency === "semiannual" && (language === "en" ? "Semiannual" : "Semestriel")}
                            {sub.frequency === "yearly" && t("yearly")}
                            {sub.frequency === "custom" && (language === "en" ? "Custom" : "Personnalisé")}
                            {!sub.frequency && "-"}
                          </span>
                          {sub.frequency === "custom" && sub.month && (
                            <span className="text-xs text-muted-foreground">
                              ({["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][sub.month - 1]})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-4">{sub.startDate ? formatDate(sub.startDate, language === "en" ? "en-US" : "fr-FR") : "-"}</td>
                      <td className="py-1 px-4">
                        <div className="flex items-center gap-2">
                          <span>{sub.endDate ? formatDate(sub.endDate, language === "en" ? "en-US" : "fr-FR") : "-"}</span>
                          {isRenewalApproaching(sub.endDate, sub.startDate, sub.frequency, sub.month) && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white"
                              title={language === "en" ? "Renewal approaching!" : "Renouvellement proche!"}
                            >
                              ⚠
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-4 text-right">{formatCurrency(sub.total || 0)}</td>
                      <td className="py-1 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={language === "en" ? "View and Edit Template" : "Voir et modifier le modèle"}
                            onClick={() => setViewingSubscription(sub)}
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={language === "en" ? "Generate Invoice" : "Générer une facture"}
                            onClick={async () => {
                              if (await confirm({
                                title: language === "en" ? "Generate Invoice" : "Générer une facture",
                                message: language === "en"
                                  ? "Create a new invoice from this subscription template?"
                                  : "Créer une nouvelle facture à partir de ce modèle d'abonnement?",
                                confirmText: language === "en" ? "Generate" : "Générer",
                                type: "info"
                              })) {
                                generateInvoiceMutation.mutate(sub);
                              }
                            }}
                          >
                            <FileText className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingSubscription(sub); setShowForm(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => { if (await confirm({ title: t("deleteSubscription"), message: t("deleteSubscriptionConfirm"), type: "danger" })) deleteMutation.mutate(sub.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Invoice Modal for viewing/editing subscription template */}
      <InvoiceModal
        open={!!viewingSubscription}
        onOpenChange={(open) => !open && setViewingSubscription(null)}
        invoice={viewingSubscription}
        type="invoice"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          setViewingSubscription(null);
        }}
      />
    </div>
  );
}

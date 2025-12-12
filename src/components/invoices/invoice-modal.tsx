"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { roundToCFP } from "@/lib/utils";
import { Plus, Trash2, Save, X } from "lucide-react";
import axios from "axios";
import { useLanguage } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InvoiceItem {
  id: string;
  groupId: string;
  product: string;
  internRef: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  unite: string;
  tax: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  articles: Article[];
}

interface Article {
  id: string;
  title: string;
  price: number;
  code: string;
  internRef: string;
  unite: string;
  tax: string;
}

interface InvoiceData {
  id: string;
  clientId: string;
  employeeId?: string;
  wording?: string;
  commentary?: string;
  items: any[];
}

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  type?: "invoice" | "avoir" | "devis";
  invoice?: InvoiceData | null;
}

export function InvoiceModal({ open, onOpenChange, onSuccess, type = "invoice", invoice = null }: InvoiceModalProps) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Form data
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [commentary, setCommentary] = useState("");
  const [wording, setWording] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: Math.random().toString(),
      groupId: "",
      product: "",
      internRef: "",
      description: "",
      quantity: 1,
      price: 0,
      discount: 0,
      unite: "",
      tax: 0,
    },
  ]);

  // Data from API
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const isEditMode = !!invoice;

  // Load initial data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Load invoice data when editing
  useEffect(() => {
    if (open && invoice) {
      setClientId(invoice.clientId || "");
      setEmployeeId(invoice.employeeId || "");
      setWording(invoice.wording || "");
      setCommentary(invoice.commentary || "");
      if (invoice.items && invoice.items.length > 0) {
        setItems(
          invoice.items.map((item: any) => ({
            id: item.id || Math.random().toString(),
            groupId: item.groupId || "",
            product: item.product || "",
            internRef: item.internRef || "",
            description: item.description || "",
            quantity: item.quantity || 1,
            price: item.price || 0,
            discount: item.discount || 0,
            unite: item.unite || "",
            tax: item.tax || 0,
          }))
        );
      }
    }
  }, [open, invoice]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setClientId("");
    setEmployeeId("");
    setCommentary("");
    setWording("");
    setItems([
      {
        id: Math.random().toString(),
        groupId: "",
        product: "",
        internRef: "",
        description: "",
        quantity: 1,
        price: 0,
        discount: 0,
        unite: "",
        tax: 0,
      },
    ]);
  };

  const loadData = async () => {
    try {
      const [clientsRes, employeesRes, groupsRes] = await Promise.all([
        axios.get("/api/users?role=CLIENT"),
        axios.get("/api/users?role=EMPLOYEE"),
        axios.get("/api/groups"),
      ]);

      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      toast.error(language === "en" ? "Error loading data" : "Erreur lors du chargement des données");
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        groupId: "",
        product: "",
        internRef: "",
        description: "",
        quantity: 1,
        price: 0,
        discount: 0,
        unite: "",
        tax: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleGroupChange = (itemId: string, groupId: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              groupId,
              product: "",
              price: 0,
              internRef: "",
              unite: "",
              tax: 0,
            }
          : item
      )
    );
  };

  const handleArticleChange = (itemId: string, articleId: string) => {
    const item = items.find((i) => i.id === itemId);
    const group = groups.find((g) => g.id === item?.groupId);
    const article = group?.articles.find((a) => a.id === articleId);

    if (article) {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                product: article.title,
                price: article.price,
                internRef: article.internRef || "",
                unite: article.unite || "",
                tax: parseFloat(article.tax || "0"),
              }
            : item
        )
      );
    }
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.price;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax / 100);
    return afterDiscount + taxAmount;
  };

  const calculateTotalHT = () => {
    return items.reduce((total, item) => {
      const subtotal = item.quantity * item.price;
      const discountAmount = subtotal * (item.discount / 100);
      return total + (subtotal - discountAmount);
    }, 0);
  };

  const calculateTotalTaxes = () => {
    return items.reduce((total, item) => {
      const subtotal = item.quantity * item.price;
      const discountAmount = subtotal * (item.discount / 100);
      const afterDiscount = subtotal - discountAmount;
      return total + afterDiscount * (item.tax / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateTotalHT() + calculateTotalTaxes();
  };

  const getTitle = () => {
    if (isEditMode) {
      switch (type) {
        case "avoir":
          return language === "en" ? "Edit Credit Note" : "Modifier l'avoir";
        case "devis":
          return language === "en" ? "Edit Quote" : "Modifier le devis";
        default:
          return language === "en" ? "Edit Invoice" : "Modifier la facture";
      }
    }
    switch (type) {
      case "avoir":
        return language === "en" ? "New Credit Note" : "Nouvel Avoir";
      case "devis":
        return language === "en" ? "New Quote" : "Nouveau Devis";
      default:
        return language === "en" ? "New Invoice" : "Nouvelle Facture";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error(language === "en" ? "Please select a client" : "Veuillez sélectionner un client");
      return;
    }

    if (items.some((item) => !item.product || item.quantity <= 0)) {
      toast.error(language === "en" ? "Please fill in all articles" : "Veuillez remplir tous les articles");
      return;
    }

    setLoading(true);

    try {
      const totalHT = calculateTotalHT();
      const total = calculateTotal();

      const invoiceData = {
        clientId,
        employeeId: employeeId || undefined,
        wording,
        commentary,
        type,
        totalHT,
        total,
        items: items.map((item) => ({
          groupId: item.groupId,
          product: item.product,
          internRef: item.internRef,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          unite: item.unite,
          tax: item.tax,
        })),
      };

      if (isEditMode && invoice) {
        await axios.put(`/api/invoices/${invoice.id}`, invoiceData);
        const successMessage = type === "avoir"
          ? (language === "en" ? "Credit note updated successfully" : "Avoir modifié avec succès")
          : type === "devis"
          ? (language === "en" ? "Quote updated successfully" : "Devis modifié avec succès")
          : (language === "en" ? "Invoice updated successfully" : "Facture modifiée avec succès");
        toast.success(successMessage);
      } else {
        await axios.post("/api/invoices", invoiceData);
        const successMessage = type === "avoir"
          ? (language === "en" ? "Credit note created successfully" : "Avoir créé avec succès")
          : type === "devis"
          ? (language === "en" ? "Quote created successfully" : "Devis créé avec succès")
          : (language === "en" ? "Invoice created successfully" : "Facture créée avec succès");
        toast.success(successMessage);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(language === "en" ? "Error saving document" : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Client and Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="label-angular">{t("client")} *</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="form-field-angular w-full mt-1"
                required
              >
                <option value="">{language === "en" ? "Select a client" : "Sélectionner un client"}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="label-angular">{t("employee")}</Label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="form-field-angular w-full mt-1"
              >
                <option value="">{language === "en" ? "Select an employee" : "Sélectionner un employé"}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wording */}
          <div className="mb-6">
            <Label className="label-angular">{language === "en" ? "Title" : "Intitulé"}</Label>
            <Input
              value={wording}
              onChange={(e) => setWording(e.target.value)}
              className="form-field-angular mt-1"
              placeholder={language === "en" ? "Invoice title" : "Intitulé de la facture"}
            />
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <Label className="label-title">{t("articles")}</Label>
              <Button
                type="button"
                onClick={addItem}
                className="btn-angular bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === "en" ? "Add article" : "Ajouter un article"}
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>{language === "en" ? "Group" : "Groupe"}</th>
                    <th>{language === "en" ? "Article" : "Article"}</th>
                    <th>{language === "en" ? "Int. Ref" : "Réf. Interne"}</th>
                    <th>{t("description")}</th>
                    <th>{language === "en" ? "Qty" : "Qté"}</th>
                    <th>{language === "en" ? "Price (CFP)" : "Prix (CFP)"}</th>
                    <th>{language === "en" ? "Discount (%)" : "Remise (%)"}</th>
                    <th>{language === "en" ? "Unit" : "Unité"}</th>
                    <th>{language === "en" ? "Tax (%)" : "Taxe (%)"}</th>
                    <th>{language === "en" ? "Total (CFP)" : "Total (CFP)"}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <select
                          value={item.groupId}
                          onChange={(e) => handleGroupChange(item.id, e.target.value)}
                          className="form-field-angular w-full"
                          required
                        >
                          <option value="">{language === "en" ? "Group" : "Groupe"}</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={item.product}
                          onChange={(e) => {
                            const selectedArticleTitle = e.target.value;
                            if (selectedArticleTitle) {
                              const group = groups.find((g) => g.id === item.groupId);
                              const article = group?.articles.find(
                                (a) => a.title === selectedArticleTitle
                              );
                              if (article) {
                                handleArticleChange(item.id, article.id);
                              }
                            } else {
                              // Clear article selection
                              updateItem(item.id, "product", "");
                              updateItem(item.id, "price", 0);
                              updateItem(item.id, "internRef", "");
                              updateItem(item.id, "unite", "");
                              updateItem(item.id, "tax", 0);
                            }
                          }}
                          className="form-field-angular w-full"
                          disabled={!item.groupId}
                          required
                        >
                          <option value="">Article</option>
                          {groups
                            .find((g) => g.id === item.groupId)
                            ?.articles.map((article) => (
                              <option key={article.id} value={article.title}>
                                {article.title}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <Input
                          value={item.internRef}
                          onChange={(e) =>
                            updateItem(item.id, "internRef", e.target.value)
                          }
                          className="form-field-angular w-24"
                        />
                      </td>
                      <td>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          className="form-field-angular w-32"
                          placeholder={t("description")}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", parseInt(e.target.value) || 0)
                          }
                          className="form-field-angular w-20"
                          min="1"
                          required
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, "price", parseFloat(e.target.value) || 0)
                          }
                          className="form-field-angular w-24"
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(item.id, "discount", parseFloat(e.target.value) || 0)
                          }
                          className="form-field-angular w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <Input
                          value={item.unite}
                          onChange={(e) => updateItem(item.id, "unite", e.target.value)}
                          className="form-field-angular w-20"
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={item.tax}
                          onChange={(e) =>
                            updateItem(item.id, "tax", parseFloat(e.target.value) || 0)
                          }
                          className="form-field-angular w-20"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="font-semibold">
                        {roundToCFP(calculateItemTotal(item)).toLocaleString('fr-FR')}
                      </td>
                      <td>
                        <Button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="sm"
                          disabled={items.length === 1}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t("totalHT")}:</span>
                <span className="font-semibold">{roundToCFP(calculateTotalHT()).toLocaleString('fr-FR')} CFP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{language === "en" ? "Total Taxes" : "Total Taxes"}:</span>
                <span className="font-semibold">{roundToCFP(calculateTotalTaxes()).toLocaleString('fr-FR')} CFP</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-bold">{t("totalTTC")}:</span>
                <span className="font-bold text-primary">
                  {roundToCFP(calculateTotal()).toLocaleString('fr-FR')} CFP
                </span>
              </div>
            </div>
          </div>

          {/* Commentary */}
          <div className="mb-6">
            <Label className="label-angular">{language === "en" ? "Comment" : "Commentaire"}</Label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              className="form-field-angular w-full mt-1"
              rows={3}
              placeholder={language === "en" ? "Comment on the invoice..." : "Commentaire sur la facture..."}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="btn-angular"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="btn-angular bg-primary text-white hover:bg-primary/90"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? (language === "en" ? "Saving..." : "Enregistrement...") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

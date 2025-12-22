"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { roundToCFP } from "@/lib/utils";
import { Plus, Trash2, Save, X } from "lucide-react";
import axios from "axios";

interface InvoiceItem {
  id: string;
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

interface Tax {
  id: string;
  name: string;
  percent: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // Form data
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [commentary, setCommentary] = useState("");
  const [wording, setWording] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: Math.random().toString(),
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
  const [taxes, setTaxes] = useState<Tax[]>([]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, employeesRes, taxesRes] = await Promise.all([
        axios.get("/api/users?role=CLIENT"),
        axios.get("/api/users?role=EMPLOYEE,ADMIN,OWNER"),
        axios.get("/api/tax"),
      ]);

      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
      setTaxes(taxesRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
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
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    if (items.some((item) => !item.product || item.quantity <= 0)) {
      toast.error("Veuillez remplir tous les articles");
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
        type: "invoice",
        totalHT,
        total,
        items: items.map((item) => ({
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

      await axios.post("/api/invoices", invoiceData);
      toast.success("Facture créée avec succès");
      router.push("/invoices");
    } catch (error) {
      toast.error("Erreur lors de la création de la facture");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 relative z-0">
      <Card className="card-angular overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
          <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Nouvelle Facture
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Client and Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="label-angular">Client *</Label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="form-field-angular w-full mt-1"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="label-angular">Employé</Label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="form-field-angular w-full mt-1"
                >
                  <option value="">Sélectionner un employé</option>
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
              <Label className="label-angular">Intitulé</Label>
              <Input
                value={wording}
                onChange={(e) => setWording(e.target.value)}
                className="form-field-angular mt-1"
                placeholder="Intitulé de la facture"
              />
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="label-title">Articles</Label>
                <Button
                  type="button"
                  onClick={addItem}
                  className="btn-angular bg-primary text-white hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="table-angular">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Réf. Interne</th>
                      <th>Description</th>
                      <th>Qté</th>
                      <th>Prix (CFP)</th>
                      <th>Remise (%)</th>
                      <th>Unité</th>
                      <th>Taxe (%)</th>
                      <th>Total (CFP)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <Input
                            value={item.product}
                            onChange={(e) => updateItem(item.id, "product", e.target.value)}
                            className="form-field-angular w-full"
                            placeholder="Nom de l'article"
                            required
                          />
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
                            placeholder="Description"
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
                  <span className="font-medium">Total HT:</span>
                  <span className="font-semibold">{roundToCFP(calculateTotalHT()).toLocaleString('fr-FR')} CFP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Taxes:</span>
                  <span className="font-semibold">{roundToCFP(calculateTotalTaxes()).toLocaleString('fr-FR')} CFP</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-bold">Total TTC:</span>
                  <span className="font-bold text-primary">
                    {roundToCFP(calculateTotal()).toLocaleString('fr-FR')} CFP
                  </span>
                </div>
              </div>
            </div>

            {/* Commentary */}
            <div className="mb-6">
              <Label className="label-angular">Commentaire</Label>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                className="form-field-angular w-full mt-1"
                rows={3}
                placeholder="Commentaire sur la facture..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="btn-angular"
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                type="submit"
                className="btn-angular bg-primary text-white hover:bg-primary/90"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

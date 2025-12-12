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
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";

export default function TaxesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTax, setEditingTax] = useState<any>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ["taxes"],
    queryFn: async () => {
      const res = await fetch("/api/tax");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success(t("taxCreated"));
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/tax/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success(t("taxUpdated"));
      setEditingTax(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tax/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success(t("taxDeleted"));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      rate: parseFloat(formData.get("rate") as string),
      description: formData.get("description"),
      isDefault: formData.get("isDefault") === "on",
    };

    if (editingTax) {
      updateMutation.mutate({ id: editingTax.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingTax(null);
  };

  const filteredTaxes = taxes.filter(
    (tax: any) =>
      tax.name?.toLowerCase().includes(search.toLowerCase()) ||
      tax.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("taxes")}</h1>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {t("newTax")}
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTax ? t("editTax") : t("newTax")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")} *</Label>
                <Input id="name" name="name" defaultValue={editingTax?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">{t("taxRate")} *</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={editingTax?.rate || 0}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t("description")}</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={editingTax?.description}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="isDefault"
                  name="isDefault"
                  type="checkbox"
                  defaultChecked={editingTax?.isDefault}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isDefault">{t("default")} {t("tax")}</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingTax ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Taxes List */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filteredTaxes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noTaxFound")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t("name")}</th>
                    <th className="text-left py-3 px-4">{t("tax")}</th>
                    <th className="text-left py-3 px-4">{t("description")}</th>
                    <th className="text-left py-3 px-4">{t("default")}</th>
                    <th className="text-right py-3 px-4">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaxes.map((tax: any) => (
                    <tr key={tax.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-1 px-4 font-medium">{tax.name}</td>
                      <td className="py-1 px-4">{tax.rate}%</td>
                      <td className="py-1 px-4">{tax.description || "-"}</td>
                      <td className="py-1 px-4">
                        {tax.isDefault ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t("yes")}</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{t("no")}</span>
                        )}
                      </td>
                      <td className="py-1 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingTax(tax); setShowForm(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => { if (await confirm({ title: t("deleteTax"), message: t("deleteTaxConfirm"), type: "danger" })) deleteMutation.mutate(tax.id); }}>
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
    </div>
  );
}

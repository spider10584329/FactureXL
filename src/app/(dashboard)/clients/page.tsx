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

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isActive, setIsActive] = useState(true);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { t } = useLanguage();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("clientCreated"));
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("clientUpdated"));
      setEditingUser(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("clientDeleted"));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password") || "password123",
      role: "CLIENT",
      phone: formData.get("phone"),
      address: formData.get("address"),
      city: formData.get("city"),
      zipCode: formData.get("zipCode"),
      code: formData.get("code"),
      paymentMethod: formData.get("paymentMethod"),
      discount: parseFloat(formData.get("discount") as string) || 0,
      isActive: isActive,
    };

    if (editingUser) {
      const { password, ...updateData } = data;
      updateMutation.mutate({
        id: editingUser.id,
        data: updateData,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingUser(null);
    setIsActive(true);
  };

  const handleOpenForm = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setIsActive(user.isActive !== false);
    } else {
      setEditingUser(null);
      setIsActive(true);
    }
    setShowForm(true);
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");
  const filteredClients = clients.filter(
    (u: any) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("clients")}</h1>
        <Button onClick={() => handleOpenForm()} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {t("newClient")}
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("editClient") : t("newClient")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom de client */}
              <div className="space-y-2">
                <Label htmlFor="name">{t("clientName")}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingUser?.name}
                  required
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")} *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email}
                  required
                />
              </div>

              {/* Toggle Actif */}
              <div className="space-y-2">
                <Label>{t("status")}</Label>
                <div className="flex items-center gap-3 pt-1">
                  <span className={`text-sm ${!isActive ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{t("inactive")}</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{t("active")}</span>
                </div>
              </div>

              {/* Mode de paiement */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">{t("paymentMethod")} *</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  defaultValue={editingUser?.paymentMethod || "card"}
                  required
                  className="flex h-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="card">{t("creditCard")}</option>
                  <option value="transfer">{t("transfer")}</option>
                  <option value="check">{t("check")}</option>
                  <option value="cash">{t("cash")}</option>
                </select>
              </div>

              {/* Telephone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingUser?.phone}
                />
              </div>

              {/* Remise */}
              <div className="space-y-2">
                <Label htmlFor="discount">{t("discount")}</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingUser?.discount || "0"}
                />
              </div>

              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={editingUser?.city}
                />
              </div>

              {/* Code Postal */}
              <div className="space-y-2">
                <Label htmlFor="zipCode">{t("zipCode")}</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  defaultValue={editingUser?.zipCode}
                />
              </div>

              {/* Code client (hidden) */}
              <input type="hidden" name="code" defaultValue={editingUser?.code} />
            </div>

            {/* Adresse - Full width */}
            <div className="space-y-2">
              <Label htmlFor="address">{t("address")}</Label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={editingUser?.address}
                className="flex min-h-[80px] w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">{t("saving")}</span>
                  </>
                ) : (
                  editingUser ? t("update") : t("create")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noClientFound")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t("name")}</th>
                    <th className="text-left py-3 px-4">{t("email")}</th>
                    <th className="text-left py-3 px-4">{t("phone")}</th>
                    <th className="text-left py-3 px-4">{t("city")}</th>
                    <th className="text-center py-3 px-4">{t("status")}</th>
                    <th className="text-right py-3 px-4">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-10 transition-colors">
                      <td className="py-1 px-4 font-medium">{user.name}</td>
                      <td className="py-1 px-4">{user.email}</td>
                      <td className="py-1 px-4">{user.phone || "-"}</td>
                      <td className="py-1 px-4">{user.city || "-"}</td>
                      <td className="py-1 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isActive !== false ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="py-1 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => { if (await confirm({ title: t("deleteClient"), message: t("deleteClientConfirm"), type: "danger" })) deleteMutation.mutate(user.id); }}>
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

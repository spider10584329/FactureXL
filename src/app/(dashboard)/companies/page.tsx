"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit, Building2, Users, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CompaniesPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    codePostal: "",
    description: "",
    bank: "",
    account: "",
    iban: "",
  });

  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: session } = useSession();

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await axios.get("/api/companies");
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      return await axios.post("/api/companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      customToast.success(t("companyCreated"));
      resetForm();
      setShowDialog(false);
    },
    onError: () => {
      customToast.error(t("errorCreating"));
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await axios.put(`/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      customToast.success(t("companyUpdated"));
      resetForm();
      setShowDialog(false);
    },
    onError: () => {
      customToast.error(t("errorUpdating"));
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await axios.delete(`/api/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      customToast.success(t("companyDeleted"));
    },
    onError: () => {
      customToast.error(t("errorDeleting"));
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      codePostal: "",
      description: "",
      bank: "",
      account: "",
      iban: "",
    });
    setEditingCompany(null);
  };

  const handleOpenDialog = (company?: any) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        codePostal: company.codePostal || "",
        description: company.description || "",
        bank: company.bank || "",
        account: company.account || "",
        iban: company.iban || "",
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      customToast.error(t("required"));
      return;
    }

    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, data: formData });
    } else {
      createCompanyMutation.mutate(formData);
    }
  };

  const filteredCompanies = companies.filter((company: any) =>
    company.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="card-angular">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">
              {t("error")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("companiesManagement")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("manageCompanies")}
          </p>
        </div>
        <Button
          className="btn-angular bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="mr-2 h-4 w-4" /> {t("newCompany")}
        </Button>
      </div>

      {/* Main Card */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-lg font-semibold text-primary">
              {t("companies")} ({filteredCompanies.length})
            </CardTitle>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg">{t("noDataFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("name")}</th>
                    <th>{t("email")}</th>
                    <th>{t("phone")}</th>
                    <th>{t("city")}</th>
                    <th>{t("totalUsers")}</th>
                    <th>{t("creationDate")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company: any, index: number) => (
                    <tr key={company.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{index + 1}</td>
                      <td className="font-semibold text-primary">{company.name}</td>
                      <td>{company.email || "-"}</td>
                      <td>{company.phone || "-"}</td>
                      <td>{company.city || "-"}</td>
                      <td>
                        <Badge variant="default">
                          <Users className="h-3 w-3 mr-1" />
                          {company._count?.users || 0}
                        </Badge>
                      </td>
                      <td>{formatDate(company.createdAt, language === "en" ? "en-US" : "fr-FR")}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("edit")}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleOpenDialog(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("delete")}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: t("deleteCompany"),
                                  message: t("deleteCompanyConfirm"),
                                  type: "danger",
                                })
                              ) {
                                deleteCompanyMutation.mutate(company.id);
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {editingCompany ? t("editCompany") : t("newCompany")}
            </DialogTitle>
            <DialogDescription>
              {editingCompany
                ? t("editCompany")
                : t("newCompany")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("companyName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-field-angular"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codePostal">{t("zipCode")}</Label>
                <Input
                  id="codePostal"
                  value={formData.codePostal}
                  onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("address")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">{t("bankName")}</Label>
                <Input
                  id="bank"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">{t("accountNumber")}</Label>
                <Input
                  id="account"
                  value={formData.account}
                  onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  className="form-field-angular"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="iban">{t("iban")}</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  className="form-field-angular"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="btn-angular"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="btn-angular bg-primary text-white hover:bg-primary/90"
                disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
              >
                {editingCompany ? t("update") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { Plus, Search, Trash2, Edit, Download, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isActive, setIsActive] = useState(true);
  const [autoCode, setAutoCode] = useState<string>("");
  const [isImportingClients, setIsImportingClients] = useState(false);
  const importClientsInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingInvoicesCsv, setIsImportingInvoicesCsv] = useState(false);
  const importInvoicesCsvInputRef = useRef<HTMLInputElement | null>(null);
  const contractInputRef = useRef<HTMLInputElement | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { t, language } = useLanguage();
  const { data: session } = useSession();

  const isOwner = session?.user?.role === "OWNER";
  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  const { data: users = [], isLoading } = useQuery({
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

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(language === "en" ? "Client status updated" : "Statut du client mis à jour");
    },
    onError: () => {
      toast.error(language === "en" ? "Error updating status" : "Erreur lors de la mise à jour du statut");
    },
  });

  const uploadContractMutation = useMutation({
    mutationFn: async ({ file, clientId }: { file: File; clientId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);

      const res = await fetch("/api/uploads/contract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload contract");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get("code") as string;

    // Check for duplicate code
    if (code && code.trim() !== "") {
      const isDuplicate = clients.some(
        (client: any) => 
          client.code === code && 
          (!editingUser || client.id !== editingUser.id)
      );

      if (isDuplicate) {
        toast.error(
          language === "en" 
            ? `Code ${code} is already assigned to another client. Please use a unique code.` 
            : `Le code ${code} est déjà attribué à un autre client. Veuillez utiliser un code unique.`
        );
        return;
      }
    }

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password") || "password123",
      role: "CLIENT",
      phone: formData.get("phone"),
      address: formData.get("address"),
      city: formData.get("city"),
      zipCode: formData.get("zipCode"),
      code: code || null,
      paymentMethod: formData.get("paymentMethod"),
      discount: parseFloat(formData.get("discount") as string) || 0,
      isActive: isActive,
    };

    try {
      if (editingUser) {
        // Update existing user
        const { password, ...updateData } = data;
        updateMutation.mutate({
          id: editingUser.id,
          data: updateData,
        });

        // Upload contract if a file is selected
        if (contractFile) {
          setIsUploadingContract(true);
          await uploadContractMutation.mutateAsync({
            file: contractFile,
            clientId: editingUser.id,
          });
          setIsUploadingContract(false);
        }
      } else {
        // Create new user, then upload contract
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create client");
        }
        
        const newUser = await res.json();

        // Upload contract if a file is selected
        if (contractFile) {
          setIsUploadingContract(true);
          await uploadContractMutation.mutateAsync({
            file: contractFile,
            clientId: newUser.id,
          });
          setIsUploadingContract(false);
        }

        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast.success(t("clientCreated"));
        setShowForm(false);
      }

      // Reset contract file state
      setContractFile(null);
      if (contractInputRef.current) contractInputRef.current.value = "";
    } catch (error: any) {
      setIsUploadingContract(false);
      toast.error(error.message || (language === "en" ? "Failed to save client" : "Échec de l'enregistrement du client"));
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingUser(null);
    setIsActive(true);
    setContractFile(null);
    if (contractInputRef.current) contractInputRef.current.value = "";
  };

  const handleOpenForm = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setIsActive(user.isActive !== false);
      
      // Check if this is a temporary client without a code
      const isTemporaryClient = user.email?.includes('@temporary.local');
      const hasNoCode = !user.code || user.code.trim() === '';
      
      if (isTemporaryClient && hasNoCode) {
        // Auto-fill code for temporary clients without a code
        const existingCodes = clients
          .map((c: any) => c.code)
          .filter((code: string) => code && !isNaN(parseInt(code)))
          .map((code: string) => parseInt(code));
        
        if (existingCodes.length > 0) {
          const maxCode = Math.max(...existingCodes);
          setAutoCode((maxCode + 1).toString());
        } else {
          setAutoCode("1");
        }
      } else {
        setAutoCode(""); // Don't auto-fill for regular clients
      }
    } else {
      setEditingUser(null);
      setIsActive(true);
      
      // Calculate next code for new client
      const existingCodes = clients
        .map((c: any) => c.code)
        .filter((code: string) => code && !isNaN(parseInt(code)))
        .map((code: string) => parseInt(code));
      
      if (existingCodes.length > 0) {
        const maxCode = Math.max(...existingCodes);
        setAutoCode((maxCode + 1).toString());
      } else {
        setAutoCode("1"); // Start at 1 if no codes exist
      }
    }
    setShowForm(true);
  };

  const handleExportClientsDbf = async () => {
    try {
      const res = await fetch("/api/exports/clients-dbf");
      if (!res.ok) throw new Error("Failed to export DBF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clients.dbf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(language === "en" ? "Client DBF export failed" : "Export DBF des clients échoué");
    }
  };

  const handleExportClientsCsv = async () => {
    try {
      const res = await fetch("/api/exports/ebatch-csv");
      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clients.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(language === "en" ? "Client CSV export failed" : "Export CSV des clients échoué");
    }
  };

  const handleImportClientsDbf = async (file: File) => {
    setIsImportingClients(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/imports/clients", {
        method: "POST",
        body: form,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Import failed");

      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        language === "en"
          ? `Clients imported. Created: ${payload.created ?? 0}, Updated: ${payload.updated ?? 0}`
          : `Clients importés. Créés : ${payload.created ?? 0}, Mis à jour : ${payload.updated ?? 0}`
      );
    } catch (e: any) {
      toast.error(e?.message || (language === "en" ? "DBF import failed" : "Import DBF échoué"));
    } finally {
      setIsImportingClients(false);
      if (importClientsInputRef.current) importClientsInputRef.current.value = "";
    }
  };

  const handleImportInvoicesCsv = async (file: File) => {
    setIsImportingInvoicesCsv(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/imports/invoices", {
        method: "POST",
        body: form,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Import failed");

      toast.success(
        language === "en"
          ? `Invoices imported. Created: ${payload.created ?? 0}, Skipped: ${payload.skipped ?? 0}`
          : `Factures importées. Créées : ${payload.created ?? 0}, Ignorées : ${payload.skipped ?? 0}`
      );
    } catch (e: any) {
      toast.error(e?.message || (language === "en" ? "CSV import failed" : "Import CSV échoué"));
    } finally {
      setIsImportingInvoicesCsv(false);
      // Keep resetting the DBF input in its own handler; reset CSV input here.
      if (importInvoicesCsvInputRef.current) importInvoicesCsvInputRef.current.value = "";
    }
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");

  const filteredClients = clients
    .filter(
      (u: any) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )
    .slice()
    .sort((a: any, b: any) => {
      const isTempNoCode = (u: any) => {
        const isTemporary = typeof u.email === "string" && u.email.includes("@temporary.local");
        const hasNoCode = !u.code || String(u.code).trim() === "";
        return isTemporary && hasNoCode;
      };

      const aTemp = isTempNoCode(a);
      const bTemp = isTempNoCode(b);
      if (aTemp !== bTemp) return aTemp ? -1 : 1;

      const aHasCode = a.code !== null && a.code !== undefined && String(a.code).trim() !== "";
      const bHasCode = b.code !== null && b.code !== undefined && String(b.code).trim() !== "";

      // Coded clients first (after temp-no-code)
      if (aHasCode !== bHasCode) return aHasCode ? -1 : 1;

      // Both coded: sort by numeric code
      if (aHasCode && bHasCode) {
        const aNum = Number(String(a.code).trim());
        const bNum = Number(String(b.code).trim());

        // If one code isn't a number, push it to the bottom of the coded block
        const aValid = Number.isFinite(aNum);
        const bValid = Number.isFinite(bNum);
        if (aValid !== bValid) return aValid ? -1 : 1;
        if (aValid && bValid && aNum !== bNum) return aNum - bNum;
      }

      // Stable-ish fallback: name then createdAt if present
      const nameCmp = String(a.name || "").localeCompare(String(b.name || ""));
      if (nameCmp !== 0) return nameCmp;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("clients")}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isOwnerOrAdmin && (
            <>
              <input
                ref={importClientsInputRef}
                type="file"
                accept=".dbf,application/octet-stream"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportClientsDbf(file);
                }}
              />
              <input
                ref={importInvoicesCsvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportInvoicesCsv(file);
                }}
              />

              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => importClientsInputRef.current?.click()}
                disabled={isImportingClients}
              >
                {isImportingClients
                  ? language === "en"
                    ? "Importing..."
                    : "Import en cours..."
                  : language === "en"
                  ? "Import Clients DBF"
                  : "Importer Clients DBF"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => importInvoicesCsvInputRef.current?.click()}
                disabled={isImportingInvoicesCsv}
              >
                {isImportingInvoicesCsv
                  ? language === "en"
                    ? "Importing..."
                    : "Import en cours..."
                  : language === "en"
                  ? "Import Clients CSV"
                  : "Importer Clients CSV"}
              </Button>

              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportClientsDbf}>
                <Download className="w-4 h-4 mr-2" />
                {language === "en" ? "Export Clients DBF" : "Exporter Clients DBF"}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportClientsCsv}>
                <Download className="w-4 h-4 mr-2" />
                {language === "en" ? "Export Clients CSV" : "Exporter Clients CSV"}
              </Button>
            </>
          )}

          <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {language === "en" ? "New client" : "Nouveau client"}
          </Button>
        </div>
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

              {/* Code client */}
              <div className="space-y-2">
                <Label htmlFor="code">{t("clientCode")}</Label>
                <Input
                  id="code"
                  name="code"
                  type="number"
                  placeholder={language === "en" ? "Numeric code" : "Code numérique"}
                  defaultValue={editingUser?.code || autoCode}
                  key={editingUser?.id || autoCode} // Force re-render when autoCode changes
                />
                <p className="text-xs text-muted-foreground">
                  {language === "en" 
                    ? "Must be unique for each client" 
                    : "Doit être unique pour chaque client"}
                </p>
              </div>
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

            {/* Contract Upload */}
            <div className="space-y-2">
              <Label>{language === "en" ? "Contract (PDF)" : "Contrat (PDF)"}</Label>
              <input
                ref={contractInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setContractFile(file);
                }}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => contractInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {language === "en" ? "Upload Contract" : "Télécharger Contrat"}
                </Button>
                {(contractFile || (editingUser?.contracts && editingUser.contracts.length > 0)) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="truncate max-w-[200px]">
                      {contractFile?.name || editingUser?.contracts?.[0]?.name || (language === "en" ? "Contract uploaded" : "Contrat téléchargé")}
                    </span>
                    {contractFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setContractFile(null);
                          if (contractInputRef.current) contractInputRef.current.value = "";
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {editingUser?.contracts?.[0] && !contractFile && (
                      <a
                        href={editingUser.contracts[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 underline"
                      >
                        {language === "en" ? "View" : "Voir"}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "en" 
                  ? "Upload a PDF contract for this client" 
                  : "Téléchargez un contrat PDF pour ce client"}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || isUploadingContract}
                className="bg-primary hover:bg-primary/90"
              >
                {(createMutation.isPending || updateMutation.isPending || isUploadingContract) ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">{isUploadingContract ? (language === "en" ? "Uploading..." : "Téléchargement...") : t("saving")}</span>
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
      <Card className="card-angular">
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t("search")} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 w-full" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{t("noClientFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular w-full text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left whitespace-nowrap">{t("code")}</th>
                    <th className="px-2 sm:px-4 py-2 text-left whitespace-nowrap min-w-[120px]">{t("name")}</th>
                    <th className="px-2 sm:px-4 py-2 text-left whitespace-nowrap hidden md:table-cell">{t("email")}</th>
                    <th className="px-2 sm:px-4 py-2 text-left whitespace-nowrap hidden lg:table-cell">{t("phone")}</th>
                    <th className="px-2 sm:px-4 py-2 text-left whitespace-nowrap hidden xl:table-cell">{t("city")}</th>
                    <th className="px-2 sm:px-4 py-2 text-center whitespace-nowrap hidden sm:table-cell">{language === "en" ? "Contract" : "Contrat"}</th>
                    <th className="px-2 sm:px-4 py-2 text-center whitespace-nowrap">{t("status")}</th>
                    <th className="px-2 sm:px-4 py-2 text-right whitespace-nowrap">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((user: any) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-2 sm:px-4 py-2 font-mono text-xs sm:text-sm text-gray-600">
                        {user.code || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-medium truncate max-w-[150px]" title={user.name}>
                        {user.name}
                      </td>
                      <td className="px-2 sm:px-4 py-2 hidden md:table-cell truncate max-w-[200px]" title={user.email}>
                        {user.email}
                      </td>
                      <td className="px-2 sm:px-4 py-2 hidden lg:table-cell whitespace-nowrap">
                        {user.phone || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 hidden xl:table-cell">
                        {user.city || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-center hidden sm:table-cell">
                        {user.contracts && user.contracts.length > 0 ? (
                          <a
                            href={user.contracts[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:underline"
                            title={language === "en" ? "View Contract" : "Voir le contrat"}
                          >
                            <FileText className="w-4 h-4" />
                            <span className="truncate max-w-[100px] text-xs">
                              {user.contracts[0].name.slice(0, 20)}
                            </span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-center">
                        {isOwner ? (
                          <button
                            onClick={async () => {
                              const newStatus = user.isActive === false ? true : false;
                              if (await confirm({
                                title: language === "en" ? "Change Status" : "Changer le statut",
                                message: language === "en" 
                                  ? `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this client's subscription?`
                                  : `Voulez-vous vraiment ${newStatus ? 'activer' : 'désactiver'} l'abonnement de ce client?`,
                                confirmText: language === "en" ? "Confirm" : "Confirmer",
                                type: newStatus ? "info" : "danger"
                              })) {
                                toggleStatusMutation.mutate({ id: user.id, isActive: newStatus });
                              }
                            }}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                              user.isActive !== false
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                            title={language === "en" ? "Click to toggle status" : "Cliquez pour changer le statut"}
                          >
                            {user.isActive !== false ? t("active") : t("inactive")}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive !== false
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {user.isActive !== false ? t("active") : t("inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenForm(user)}
                            className="h-8 w-8 p-0"
                            title={t("edit")}
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => { 
                              if (await confirm({ 
                                title: t("deleteClient"), 
                                message: t("deleteClientConfirm"), 
                                type: "danger" 
                              })) deleteMutation.mutate(user.id); 
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={t("delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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


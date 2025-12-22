"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Percent, Download, CheckCircle } from "lucide-react";
import { formatDate, roundToCFP } from "@/lib/utils";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/loading";
import axios from "axios";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { toast as customToast } from "@/lib/toast";
import { useLanguage } from "@/lib/i18n";

export default function ClientInvoicesPage() {
  const { language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  // Fetch client details
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const res = await axios.get(`/api/users/${clientId}`);
      return res.data;
    },
  });

  // Fetch client's invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["client-invoices", clientId],
    queryFn: async () => {
      const res = await axios.get(`/api/invoices?clientId=${clientId}`);
      return res.data;
    },
  });

  const calculateTotals = () => {
    const total = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const paid = invoices.filter((inv: any) => inv.paid).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const pending = total - paid;
    return { total, paid, pending };
  };

  const totals = calculateTotals();

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      customToast.info("Génération du PDF en cours...");

      // Fetch full invoice details with company info
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      const invoiceData = response.data;

      // Generate and download PDF
      downloadInvoicePDF(invoiceData, invoiceData.company);

      customToast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      customToast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="btn-angular"
          onClick={() => router.push("/clients")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux clients
        </Button>
      </div>

      {/* Client Info Card */}
      {clientLoading ? (
        <Card className="card-angular mb-6">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ) : client ? (
        <Card className="card-angular mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2">
              <User className="h-6 w-6" />
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nom</p>
                  <p className="font-semibold text-lg">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {client.email}
                  </p>
                </div>
                {client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">T�l�phone</p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {client.phone}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {client.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Adresse</p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        {client.address}
                        {client.city && `, ${client.city}`}
                        {client.zipCode && ` ${client.zipCode}`}
                      </span>
                    </p>
                  </div>
                )}
                {client.code && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Code Client</p>
                    <p className="font-mono font-semibold">{client.code}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {client.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">M�thode de paiement</p>
                    <p className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {client.paymentMethod}
                    </p>
                  </div>
                )}
                {client.discount > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remise</p>
                    <p className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      {client.discount}%
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Statut</p>
                  <Badge variant={client.isActive ? "success" : "danger"}>
                    {client.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Factures</p>
                <p className="text-3xl font-bold text-primary">
                  {roundToCFP(totals.total).toLocaleString('fr-FR')} CFP
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Montant Pay�</p>
                <p className="text-3xl font-bold text-success">
                  {roundToCFP(totals.paid).toLocaleString('fr-FR')} CFP
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">En Attente</p>
                <p className="text-3xl font-bold text-warning">
                  {roundToCFP(totals.pending).toLocaleString('fr-FR')} CFP
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="card-angular">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
          <CardTitle className="text-xl font-semibold text-primary">
            Historique des Factures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {invoicesLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Aucune facture pour ce client</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>R�f�rence</th>
                    <th>Type</th>
                    <th>Date de cr�ation</th>
                    <th>Total HT</th>
                    <th>Total TTC</th>
                    <th>Statut</th>
                    <th>Date de paiement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: any, index: number) => (
                    <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{index + 1}</td>
                      <td className="font-semibold text-primary">{invoice.ref}</td>
                      <td>
                        <Badge variant={
                          invoice.type === "invoice" ? "default" :
                          invoice.type === "avoir" ? "danger" :
                          "info"
                        }>
                          {invoice.type === "invoice" ? "Facture" :
                           invoice.type === "avoir" ? "Avoir" :
                           "Devis"}
                        </Badge>
                      </td>
                      <td>{formatDate(invoice.createdAt, language === "en" ? "en-US" : "fr-FR")}</td>
                      <td className="font-medium">
                        {roundToCFP(invoice.totalHT || 0).toLocaleString('fr-FR')} CFP
                      </td>
                      <td className="font-bold text-primary">
                        {roundToCFP(invoice.total || 0).toLocaleString('fr-FR')} CFP
                      </td>
                      <td>
                        {invoice.paid ? (
                          <Badge variant="success" className="cursor-default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pay�e
                          </Badge>
                        ) : (
                          <Badge variant="warning">En attente</Badge>
                        )}
                      </td>
                      <td>
                        {invoice.paymentDate ? formatDate(invoice.paymentDate, language === "en" ? "en-US" : "fr-FR") : "-"}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Télécharger PDF"
                            onClick={() => handleDownloadPDF(invoice.id)}
                          >
                            <Download className="h-4 w-4" />
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

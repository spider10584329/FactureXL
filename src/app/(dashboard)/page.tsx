"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, FolderOpen, Download } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate, roundToCFP } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardSkeleton } from "@/components/ui/loading";
import * as XLSX from "xlsx";
import { toast as customToast } from "@/lib/toast";
import { useLanguage } from "@/lib/i18n";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// Modern color palette with better contrast and accessibility
const COLORS = [
  "#6366f1", // Indigo
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#f97316", // Orange
];

const DASHBOARD_ITEMS_PER_PAGE = 10;

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const MONTHS = language === "en" ? MONTHS_EN : MONTHS_FR;
  const currentMonth = new Date().toLocaleString(language === "en" ? "en-US" : "fr-FR", { month: "long" });
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]
  );
  const [invoicePage, setInvoicePage] = useState(1);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const isLoading = invoicesLoading || usersLoading;

  // Calculate statistics (must be before any conditional returns to respect hooks rules)
  const totalRevenue = useMemo(() =>
    invoices
      .filter((inv: any) => inv.type === "invoice")
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0),
    [invoices]
  );

  const clients = useMemo(() =>
    users.filter((u: any) => u.role === "CLIENT").length,
    [users]
  );

  const invoiceCount = useMemo(() =>
    invoices.filter((inv: any) => inv.type === "invoice").length,
    [invoices]
  );

  // Current month invoices
  const currentMonthInvoices = useMemo(() =>
    invoices.filter((inv: any) => {
      const invDate = new Date(inv.createdAt);
      const now = new Date();
      return (
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear() &&
        inv.type === "invoice"
      );
    }),
    [invoices]
  );

  // Pagination for current month invoices
  const invoiceTotalPages = Math.ceil(currentMonthInvoices.length / DASHBOARD_ITEMS_PER_PAGE);
  const invoiceStartIndex = (invoicePage - 1) * DASHBOARD_ITEMS_PER_PAGE;
  const paginatedCurrentMonthInvoices = currentMonthInvoices.slice(
    invoiceStartIndex,
    invoiceStartIndex + DASHBOARD_ITEMS_PER_PAGE
  );

  // Reset invoice page when month changes (invoices data changes)
  useEffect(() => {
    setInvoicePage(1);
  }, [currentMonthInvoices.length]);

  // Calculate monthly data for employees
  const employeeMonthlyData = useMemo(() => {
    const employees = users.filter((u: any) => u.role === "EMPLOYEE" || u.role === "ADMIN" || u.role === "OWNER");
    const data: any = {};

    employees.forEach((employee: any) => {
      data[employee.id] = {
        name: employee.name,
        months: new Array(12).fill(0)
      };

      MONTHS.forEach((_, monthIndex) => {
        const monthInvoices = invoices.filter((inv: any) => {
          const invDate = new Date(inv.createdAt);
          return (
            inv.type === "invoice" &&
            inv.employeeId === employee.id &&
            invDate.getMonth() === monthIndex &&
            invDate.getFullYear() === currentYear
          );
        });

        const total = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
        data[employee.id].months[monthIndex] = total;
      });
    });

    return data;
  }, [invoices, users, currentYear]);

  // Excel export function
  const handleExportExcel = () => {
    try {
      const filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return invDate >= start && invDate <= end && inv.type === "invoice";
      });

      if (filteredInvoices.length === 0) {
        customToast.warning(t("noInvoiceToExport"));
        return;
      }

      // Column headers based on language
      const headers = {
        reference: language === "en" ? "Reference" : "Référence",
        client: language === "en" ? "Client" : "Client",
        creationDate: language === "en" ? "Creation date" : "Date de création",
        paymentDate: language === "en" ? "Payment date" : "Date de paiement",
        totalHT: language === "en" ? "Total excl. tax" : "Total HT",
        totalTTC: language === "en" ? "Total incl. tax" : "Total TTC",
        employee: language === "en" ? "Employee" : "Employé",
      };

      // Prepare data for Excel
      const excelData = filteredInvoices.map((inv: any) => ({
        [headers.reference]: inv.ref,
        [headers.client]: inv.client?.name || "-",
        [headers.creationDate]: formatDate(inv.createdAt, language === "en" ? "en-US" : "fr-FR"),
        [headers.paymentDate]: inv.paymentDate ? formatDate(inv.paymentDate, language === "en" ? "en-US" : "fr-FR") : "-",
        [headers.totalHT]: inv.totalHT || 0,
        [headers.totalTTC]: inv.total || 0,
        [headers.employee]: inv.employee?.name || "-",
      }));

      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      const sheetName = language === "en" ? "Accounting Entries" : "Écritures comptables";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Set column widths
      const wscols = [
        { wch: 15 }, // Reference
        { wch: 25 }, // Client
        { wch: 15 }, // Creation date
        { wch: 15 }, // Payment date
        { wch: 12 }, // Total HT
        { wch: 12 }, // Total TTC
        { wch: 20 }, // Employee
      ];
      worksheet['!cols'] = wscols;

      // Generate filename with date range
      const filenamePrefix = language === "en" ? "accounting_entries" : "ecritures_comptables";
      const filename = `${filenamePrefix}_${startDate}_${endDate}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
      customToast.success(t("excelExportSuccess"));
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      customToast.error(t("errorExcelExport"));
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="card-angular bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border-blue-100 dark:border-gray-700">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-primary rounded-full flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-400 uppercase font-medium truncate">{t("totalInvoices")}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-gray-100 truncate">{roundToCFP(totalRevenue).toLocaleString('fr-FR')} CFP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular bg-gradient-to-br from-primary/10 to-white dark:from-gray-800 dark:to-gray-900 border-primary/20 dark:border-gray-700">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-primary rounded-full flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-400 uppercase font-medium truncate">{t("clients")}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-gray-100">{clients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 border-indigo-100 dark:border-gray-700">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-info rounded-full flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-400 uppercase font-medium truncate">{t("invoices")}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-gray-100">{invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Factures Table */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">{t("invoices")} ({currentMonthInvoices.length})</CardTitle>
              <span className="px-3 py-1 bg-primary text-white text-sm rounded-md capitalize font-medium">
                {currentMonth}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto">
              <table className="table-angular w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 whitespace-nowrap">#</th>
                    <th className="text-left py-2 px-2 whitespace-nowrap min-w-[120px]">{language === "en" ? "Client" : "Client"}</th>
                    <th className="text-left py-2 px-2 whitespace-nowrap">{t("reference")}</th>
                    <th className="text-left py-2 px-2 whitespace-nowrap hidden sm:table-cell">{t("creationDate")}</th>
                    <th className="text-right py-2 px-2 whitespace-nowrap">{t("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("noInvoiceThisMonth")}
                      </td>
                    </tr>
                  ) : (
                    paginatedCurrentMonthInvoices.map((invoice: any, index: number) => (
                      <tr key={invoice.id}>
                        <td className="py-2 px-2 font-medium">{invoiceStartIndex + index + 1}</td>
                        <td className="py-2 px-2 truncate max-w-[150px]" title={invoice.client?.name || "-"}>{invoice.client?.name || "-"}</td>
                        <td className="py-2 px-2 font-semibold text-primary whitespace-nowrap">{invoice.ref}</td>
                        <td className="py-2 px-2 hidden sm:table-cell whitespace-nowrap">{formatDate(invoice.createdAt, language === "en" ? "en-US" : "fr-FR")}</td>
                        <td className="py-2 px-2 text-right font-bold whitespace-nowrap">{roundToCFP(invoice.total || 0).toLocaleString('fr-FR')} CFP</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {currentMonthInvoices.length > DASHBOARD_ITEMS_PER_PAGE && (
              <Pagination
                currentPage={invoicePage}
                totalPages={invoiceTotalPages}
                totalItems={currentMonthInvoices.length}
                itemsPerPage={DASHBOARD_ITEMS_PER_PAGE}
                onPageChange={setInvoicePage}
                showItemsPerPage={false}
              />
            )}
            {currentMonthInvoices.length > 0 && currentMonthInvoices.length <= DASHBOARD_ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <span>{t("displayingXofY", { x: currentMonthInvoices.length, y: currentMonthInvoices.length })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ecritures comptables */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold text-primary">{t("accountingEntries")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground font-medium">{t("startDate")}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-field-angular w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medium">{t("endDate")}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-field-angular w-full mt-1"
                />
              </div>
            </div>
            <Button
              className="btn-angular w-full bg-primary text-white hover:bg-primary/90"
              onClick={handleExportExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="truncate">{t("exportAccountingEntries")}</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Tables */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1">
        {/* Employe Statistiques */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold text-primary">{t("employeeStats")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 py-2 px-2 text-left font-semibold text-muted-foreground border-r border-gray-200 dark:border-gray-700 min-w-[80px] sm:min-w-[120px]">
                        {language === "en" ? "Employee" : "Employé"}
                      </th>
                      {MONTHS.map((month) => (
                        <th key={month} className="py-2 px-1 text-center font-semibold text-muted-foreground whitespace-nowrap min-w-[40px] sm:min-w-[50px]">
                          {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(employeeMonthlyData).length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-8 text-muted-foreground">
                          {t("noEmployee")}
                        </td>
                      </tr>
                    ) : (
                      Object.values(employeeMonthlyData).map((employee: any) => (
                        <tr key={employee.name} className="border-b border-dashed hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 py-2 px-2 font-medium text-primary border-r border-gray-200 dark:border-gray-700 truncate max-w-[80px] sm:max-w-none" title={employee.name}>
                            {employee.name}
                          </td>
                          {employee.months.map((value: number, index: number) => (
                            <td key={index} className="py-2 px-1 text-center font-medium whitespace-nowrap">
                              {value > 0 ? value.toFixed(0) : "-"}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface InvoiceItem {
  product: string;
  description?: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  unite?: string;
}

// Round to nearest 5 CFP (minimum denomination)
function roundToCFP(amount: number): number {
  const rounded = Math.round(amount);
  const unitsDigit = rounded % 10;
  
  if (unitsDigit === 0 || unitsDigit === 5) {
    return rounded;
  } else if (unitsDigit === 1 || unitsDigit === 2) {
    return rounded - unitsDigit;
  } else if (unitsDigit === 3 || unitsDigit === 4) {
    return rounded + (5 - unitsDigit);
  } else if (unitsDigit === 6 || unitsDigit === 7) {
    return rounded - (unitsDigit - 5);
  } else {
    return rounded + (10 - unitsDigit);
  }
}

interface Company {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  codePostal?: string;
  bank?: string;
  account?: string;
  iban?: string;
  photo?: string;
}

interface Client {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  code?: string;
}

interface Invoice {
  ref: string;
  type: "invoice" | "avoir" | "devis";
  createdAt: string;
  paymentDate?: string;
  paid: boolean;
  total: number;
  totalHT: number;
  commentary?: string;
  wording?: string;
  items: InvoiceItem[];
  client: Client;
  employee?: { name: string };
  company?: Company;
}

// PDF Translations
const pdfTranslations = {
  en: {
    invoice: "INVOICE",
    avoir: "CREDIT NOTE",
    devis: "QUOTE",
    invoiceNumber: "Invoice No.",
    date: "Date",
    billedTo: "Billed to:",
    code: "Code",
    designation: "Description",
    qty: "Qty",
    unit: "Unit",
    unitPriceHT: "Unit Price",
    discount: "Disc.",
    vat: "VAT",
    totalTTC: "Total",
    totalHT: "Subtotal excl. tax:",
    totalVAT: "Total VAT:",
    totalIncl: "Total incl. tax:",
    paidOn: "Paid on",
    comments: "Comments:",
    issuedBy: "Issued by:",
    bankDetails: "Bank details:",
    bank: "Bank",
    account: "Account",
  },
  fr: {
    invoice: "FACTURE",
    avoir: "AVOIR",
    devis: "DEVIS",
    invoiceNumber: "N°",
    date: "Date",
    billedTo: "Facturé à:",
    code: "Code",
    designation: "Désignation",
    qty: "Qté",
    unit: "Unité",
    unitPriceHT: "P.U. HT",
    discount: "Rem. %",
    vat: "TVA %",
    totalTTC: "Total TTC",
    totalHT: "Total HT:",
    totalVAT: "Total TVA:",
    totalIncl: "Total TTC:",
    paidOn: "Payé le",
    comments: "Commentaires:",
    issuedBy: "Émis par:",
    bankDetails: "Coordonnées bancaires:",
    bank: "Banque",
    account: "Compte",
  },
};

export function generateInvoicePDF(invoice: Invoice, company?: Company, language: "en" | "fr" = "fr") {
  const {
    ref,
    type,
    createdAt,
    paymentDate,
    paid,
    total,
    totalHT,
    commentary,
    wording,
    items,
    client,
    employee,
  } = invoice;

  const t = pdfTranslations[language];

  // Calculate tax total
  const totalTax = total - totalHT;

  // Document title
  const docTitle =
    type === "invoice"
      ? t.invoice
      : type === "avoir"
      ? t.avoir
      : t.devis;

  // Define document
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    info: {
      title: `${docTitle} ${ref}`,
      author: company?.name || "FactureXL",
      subject: `${docTitle} ${ref}`,
    },
    content: [
      // Header with company info
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: company?.name || "FactureXL",
                style: "companyName",
              },
              company?.address && {
                text: company.address,
                style: "companyInfo",
              },
              company?.city && company?.codePostal && {
                text: `${company.codePostal} ${company.city}`,
                style: "companyInfo",
              },
              company?.email && {
                text: company.email,
                style: "companyInfo",
              },
              company?.phone && {
                text: company.phone,
                style: "companyInfo",
              },
            ].filter(Boolean),
          },
          {
            width: "auto",
            stack: [
              {
                text: docTitle,
                style: "docTitle",
                alignment: "right",
              },
              {
                text: `${t.invoiceNumber} ${ref}`,
                style: "docRef",
                alignment: "right",
              },
              {
                text: `${t.date}: ${new Date(createdAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}`,
                style: "docDate",
                alignment: "right",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Client info
      {
        text: t.billedTo,
        style: "sectionHeader",
        margin: [0, 0, 0, 5],
      },
      {
        stack: [
          { text: client.name, style: "clientName" },
          client.code && { text: `${t.code}: ${client.code}`, style: "clientInfo" },
          client.address && { text: client.address, style: "clientInfo" },
          client.city && client.zipCode && {
            text: `${client.zipCode} ${client.city}`,
            style: "clientInfo",
          },
          client.email && { text: client.email, style: "clientInfo" },
          client.phone && { text: client.phone, style: "clientInfo" },
        ].filter(Boolean),
        margin: [0, 0, 0, 30],
      },

      // Wording if exists
      wording && {
        text: wording,
        style: "wording",
        margin: [0, 0, 0, 20],
      },

      // Items table
      {
        table: {
          headerRows: 1,
          widths: ["*", 50, 50, 60, 40, 60, 70],
          body: [
            // Header
            [
              { text: t.designation, style: "tableHeader" },
              { text: t.qty, style: "tableHeader", alignment: "center" },
              { text: t.unit, style: "tableHeader", alignment: "center" },
              { text: t.unitPriceHT, style: "tableHeader", alignment: "right" },
              { text: t.discount, style: "tableHeader", alignment: "right" },
              { text: t.vat, style: "tableHeader", alignment: "right" },
              { text: t.totalTTC, style: "tableHeader", alignment: "right" },
            ],
            // Items
            ...items.map((item) => {
              const subtotal = item.quantity * item.price;
              const discountAmount = subtotal * (item.discount / 100);
              const afterDiscount = subtotal - discountAmount;
              const taxAmount = afterDiscount * (item.tax / 100);
              const itemTotal = afterDiscount + taxAmount;

              return [
                {
                  stack: [
                    { text: item.product, style: "itemProduct" },
                    item.description && {
                      text: item.description,
                      style: "itemDescription",
                    },
                  ].filter(Boolean),
                },
                {
                  text: item.quantity.toString(),
                  style: "tableCell",
                  alignment: "center",
                },
                {
                  text: item.unite || "-",
                  style: "tableCell",
                  alignment: "center",
                },
                {
                  text: `${roundToCFP(item.price)} CFP`,
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: item.discount > 0 ? `${item.discount}%` : "-",
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: item.tax > 0 ? `${item.tax}%` : "-",
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: `${roundToCFP(itemTotal)} CFP`,
                  style: "tableCell",
                  alignment: "right",
                  bold: true,
                },
              ];
            }),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#CCCCCC",
          vLineColor: () => "#CCCCCC",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20],
      },

      // Totals
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: t.totalHT, style: "totalLabel" },
                  {
                    text: `${roundToCFP(totalHT)} CFP`,
                    style: "totalValue",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 5],
              },
              {
                columns: [
                  { text: t.totalVAT, style: "totalLabel" },
                  {
                    text: `${roundToCFP(totalTax)} CFP`,
                    style: "totalValue",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 5],
              },
              {
                columns: [
                  { text: t.totalIncl, style: "totalLabelBold" },
                  {
                    text: `${roundToCFP(total)} CFP`,
                    style: "totalValueBold",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 10],
              },
              paid && paymentDate && {
                text: `${t.paidOn} ${new Date(paymentDate).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}`,
                style: "paidStatus",
                alignment: "right",
                color: "#32bbed",
              },
            ].filter(Boolean),
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Commentary
      commentary && {
        stack: [
          { text: t.comments, style: "sectionHeader" },
          { text: commentary, style: "commentary" },
        ],
        margin: [0, 0, 0, 20],
      },

      // Employee info if exists
      employee && {
        text: `${t.issuedBy} ${employee.name}`,
        style: "employeeInfo",
        margin: [0, 20, 0, 0],
      },

      // Footer - Bank info
      company?.bank &&
        company?.account && {
          stack: [
            { text: t.bankDetails, style: "sectionHeader" },
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    { text: `${t.bank}: ${company.bank}`, style: "bankInfo" },
                    company.account && {
                      text: `${t.account}: ${company.account}`,
                      style: "bankInfo",
                    },
                    company.iban && { text: `IBAN: ${company.iban}`, style: "bankInfo" },
                  ].filter(Boolean),
                },
              ],
            },
          ],
          margin: [0, 30, 0, 0],
        },
    ].filter(Boolean),

    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: "#199ef7",
        margin: [0, 0, 0, 5],
      },
      companyInfo: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 2, 0, 0],
      },
      docTitle: {
        fontSize: 24,
        bold: true,
        color: "#199ef7",
      },
      docRef: {
        fontSize: 12,
        bold: true,
        color: "#333333",
        margin: [0, 5, 0, 0],
      },
      docDate: {
        fontSize: 10,
        color: "#666666",
        margin: [0, 5, 0, 0],
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: "#199ef7",
        margin: [0, 0, 0, 5],
      },
      clientName: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 3],
      },
      clientInfo: {
        fontSize: 10,
        color: "#666666",
        margin: [0, 2, 0, 0],
      },
      wording: {
        fontSize: 11,
        italics: true,
        color: "#555555",
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: "#ffffff",
        fillColor: "#199ef7",
      },
      tableCell: {
        fontSize: 9,
      },
      itemProduct: {
        fontSize: 10,
        bold: true,
      },
      itemDescription: {
        fontSize: 8,
        color: "#666666",
        italics: true,
        margin: [0, 2, 0, 0],
      },
      totalLabel: {
        fontSize: 11,
        bold: false,
      },
      totalValue: {
        fontSize: 11,
      },
      totalLabelBold: {
        fontSize: 13,
        bold: true,
        color: "#199ef7",
      },
      totalValueBold: {
        fontSize: 13,
        bold: true,
        color: "#199ef7",
      },
      paidStatus: {
        fontSize: 10,
        bold: true,
        italics: true,
      },
      commentary: {
        fontSize: 9,
        color: "#555555",
        margin: [0, 5, 0, 0],
      },
      employeeInfo: {
        fontSize: 9,
        color: "#666666",
        italics: true,
      },
      bankInfo: {
        fontSize: 9,
        color: "#555555",
        margin: [0, 2, 0, 0],
      },
    },

    defaultStyle: {
      font: "Roboto",
    },
  };

  return docDefinition;
}

async function getPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = (pdfFontsModule as any).default || pdfFontsModule;

  (pdfMake as any).vfs = vfs.pdfMake?.vfs || vfs;

  return pdfMake as any;
}

export async function downloadInvoicePDF(invoice: Invoice, company?: Company, language: "en" | "fr" = "fr") {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company, language);
  
  const t = pdfTranslations[language];
  const docTitle =
    invoice.type === "invoice"
      ? t.invoice
      : invoice.type === "avoir"
      ? t.avoir
      : t.devis;

  pdfMake.createPdf(docDefinition).download(`${docTitle}_${invoice.ref}.pdf`);
}

export async function openInvoicePDF(invoice: Invoice, company?: Company, language: "en" | "fr" = "fr") {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company, language);
  pdfMake.createPdf(docDefinition).open();
}

export async function getInvoicePDFBlob(
  invoice: Invoice,
  company?: Company,
  language: "en" | "fr" = "fr"
): Promise<Blob> {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company, language);

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to generate PDF blob"));
      }
    });
  });
}

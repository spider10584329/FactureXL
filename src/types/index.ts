export type Role =
  | "SUPER_ADMIN"
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "CLIENT";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  photo: string | null;
  contract: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  phone: string | null;
  discount: number;
  activeInvoice: boolean;
  code: string | null;
  turnover: number | null;
  paymentMethod: string | null;
  companyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  email: string | null;
  codePostal: string | null;
  city: string | null;
  phone: string | null;
  description: string | null;
  address: string | null;
  photo: string | null;
  bank: string | null;
  account: string | null;
  iban: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  ref: string;
  startDate: Date | null;
  endDate: Date | null;
  total: number | null;
  totalHT: number | null;
  wording: string | null;
  type: "invoice" | "avoir" | "devis";
  commentary: string | null;
  subscription: boolean;
  subscriptionMonths: string | null;
  month: number | null;
  archived: boolean;
  paid: boolean;
  paymentDate: Date | null;
  lastPaymentMethod: string | null;
  clientId: string;
  client?: User;
  employeeId: string | null;
  employee?: User | null;
  companyId: string;
  items?: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  internRef: string | null;
  product: string;
  price: number;
  quantity: number;
  description: string | null;
  discount: number;
  unite: string | null;
  tax: number;
  invoiceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tax {
  id: string;
  name: string;
  percent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transfer {
  id: string;
  ref: string;
  amount: number;
  paymentDate: Date | null;
  invoices?: Invoice[];
  createdAt: Date;
  updatedAt: Date;
}

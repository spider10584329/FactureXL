import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Round to nearest 5 CFP (minimum denomination)
export function roundToCFP(amount: number): number {
  const rounded = Math.round(amount);
  const unitsDigit = rounded % 10;
  
  if (unitsDigit === 0 || unitsDigit === 5) {
    return rounded;
  } else if (unitsDigit === 1 || unitsDigit === 2) {
    return rounded - unitsDigit; // Round down to 0
  } else if (unitsDigit === 3 || unitsDigit === 4) {
    return rounded + (5 - unitsDigit); // Round to 5
  } else if (unitsDigit === 6 || unitsDigit === 7) {
    return rounded - (unitsDigit - 5); // Round down to 5
  } else { // 8 or 9
    return rounded + (10 - unitsDigit); // Round up to next 10
  }
}

export function formatCurrency(amount: number): string {
  const roundedAmount = roundToCFP(amount);
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount) + " CFP";
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function generateRef(prefix: string = "INV"): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${year}${month}-${random}`;
}

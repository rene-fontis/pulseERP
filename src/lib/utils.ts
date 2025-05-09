src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount?: number | null, currency = 'CHF', locale = 'de-CH'): string {
  if (amount === undefined || amount === null) {
    // Consider if you want to return an empty string or a placeholder like 'N/A' or '0.00'
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(0);
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount);
}

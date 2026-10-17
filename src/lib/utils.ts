import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee (INR ₹)
 * Example: 154500 -> ₹1,54,500.00
 */
export function formatINR(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format date to Indian standard: dd-MM-yyyy
 * Example: "17-10-2026"
 */
export function formatDateIST(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd-MM-yyyy");
  } catch {
    return "-";
  }
}

export const formatDate = formatDateIST;

/**
 * Format date and time: dd-MM-yyyy hh:mm a
 */
export function formatDateTimeIST(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd-MM-yyyy hh:mm a");
  } catch {
    return "-";
  }
}

/**
 * Normalize an Indian phone number for wa.me links
 * Strips spaces, dashes, +91 or 0 prefix, and ensures clean 10-digit or 91XXXXXXXXXX
 */
export function cleanIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Generate a wa.me click-to-chat URL with pre-filled message
 */
export function getWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = cleanIndianPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Replace placeholders in template text:
 * {name}, {product}, {date}, {ds_code}, {amount}, {order_number}
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(placeholder, val ? String(val) : "");
  }
  return result;
}

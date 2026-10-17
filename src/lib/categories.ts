/**
 * Standard Product Categories for Direct Selling Business
 * Extracted directly from business catalog hierarchy
 */

export const PRODUCT_CATEGORIES = [
  "WELLNESS",
  "WELLROOT",
  "AGRICULTURE",
  "JEEVEDA",
  "SNISS COSMETIC",
  "SNISS HERBAL",
  "BABY CARE",
  "SNISS FRAGRANCES",
  "FOOD",
  "HOME CARE",
  "ORAL CARE",
  "SNISS ELITE",
  "VETERINARY",
  "APPARELS",
  "OTHERS",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Visual styling token (color classes) for category badges
 */
export const CATEGORY_COLORS: Record<ProductCategory, { bg: string; text: string; border: string }> = {
  WELLNESS: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  WELLROOT: {
    bg: "bg-teal-50 dark:bg-teal-950/60",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  AGRICULTURE: {
    bg: "bg-lime-50 dark:bg-lime-950/60",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-200 dark:border-lime-800",
  },
  JEEVEDA: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  "SNISS COSMETIC": {
    bg: "bg-pink-50 dark:bg-pink-950/60",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  "SNISS HERBAL": {
    bg: "bg-green-50 dark:bg-green-950/60",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  "BABY CARE": {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  "SNISS FRAGRANCES": {
    bg: "bg-purple-50 dark:bg-purple-950/60",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  FOOD: {
    bg: "bg-orange-50 dark:bg-orange-950/60",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  "HOME CARE": {
    bg: "bg-cyan-50 dark:bg-cyan-950/60",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  "ORAL CARE": {
    bg: "bg-blue-50 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  "SNISS ELITE": {
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  VETERINARY: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  APPARELS: {
    bg: "bg-violet-50 dark:bg-violet-950/60",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
  OTHERS: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export function getCategoryBadgeStyle(category?: string | null) {
  if (!category) return CATEGORY_COLORS.OTHERS;
  const upper = category.toUpperCase().trim() as ProductCategory;
  return CATEGORY_COLORS[upper] || CATEGORY_COLORS.OTHERS;
}

"use client";

import React, { useState, useEffect } from "react";
import { X, Package, Save, Sparkles, AlertCircle, Layers } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

interface Product {
  id?: string;
  name: string;
  sku: string;
  category?: string;
  mrp: number;
  dp: number;
  currentStock: number;
  reorderLevel: number;
  batchNumber?: string | null;
  expiryDate?: string | Date | null;
}

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

export function AddEditProductModal({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}: AddEditProductModalProps) {
  const { success, error } = useToast();
  const isEditing = Boolean(productToEdit?.id);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "WELLNESS",
    mrp: "",
    dp: "",
    currentStock: "0",
    reorderLevel: "5",
    batchNumber: "",
    expiryDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        sku: productToEdit.sku,
        category: productToEdit.category || "WELLNESS",
        mrp: productToEdit.mrp.toString(),
        dp: productToEdit.dp.toString(),
        currentStock: productToEdit.currentStock.toString(),
        reorderLevel: productToEdit.reorderLevel.toString(),
        batchNumber: productToEdit.batchNumber || "",
        expiryDate: productToEdit.expiryDate
          ? new Date(productToEdit.expiryDate).toISOString().slice(0, 10)
          : "",
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        category: "WELLNESS",
        mrp: "",
        dp: "",
        currentStock: "0",
        reorderLevel: "5",
        batchNumber: "",
        expiryDate: "",
      });
    }
    setFormError("");
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const mrpNum = parseFloat(formData.mrp) || 0;
  const dpNum = parseFloat(formData.dp) || 0;
  const profitMarginPerUnit = mrpNum - dpNum;
  const marginPercent = mrpNum > 0 ? ((profitMarginPerUnit / mrpNum) * 100).toFixed(1) : "0";

  const handleGenerateSku = () => {
    if (!formData.name.trim()) {
      setFormData((prev) => ({ ...prev, sku: `PROD-${Math.floor(100 + Math.random() * 900)}` }));
      return;
    }
    const words = formData.name.trim().split(" ");
    const prefix = words.map((w) => w[0]?.toUpperCase()).join("").slice(0, 4);
    const random = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.sku.trim()) {
      setFormError("Product Name and SKU are required.");
      return;
    }

    if (mrpNum <= 0 || dpNum <= 0) {
      setFormError("MRP and DP must be greater than zero.");
      return;
    }

    if (dpNum > mrpNum) {
      setFormError("Distributor Price (DP) cannot exceed Maximum Retail Price (MRP).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category,
        mrp: mrpNum,
        dp: dpNum,
        currentStock: parseInt(formData.currentStock, 10) || 0,
        reorderLevel: parseInt(formData.reorderLevel, 10) || 5,
        batchNumber: formData.batchNumber.trim() || null,
        expiryDate: formData.expiryDate || null,
      };

      const url = isEditing ? `/api/stock/${productToEdit!.id}` : "/api/stock";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save product.");
        setLoading(false);
        return;
      }

      success(isEditing ? "Product updated successfully!" : "Product added to catalog!");
      onSuccess();
      onClose();
    } catch {
      setFormError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? "Edit Product" : "Add Product to Master"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Update details for ${productToEdit?.name}` : "Define product, prices, and stock threshold"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Aloe Vera Health Juice 1L"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* SKU and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SKU / Item Code <span className="text-rose-500">*</span>
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Suggest
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. HL-ALOE-1L"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Product Category</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing: MRP & DP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="550"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                DP / Distributor Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.dp}
                onChange={(e) => setFormData({ ...formData, dp: e.target.value })}
                placeholder="440"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Margin Calculation Banner */}
          {mrpNum > 0 && dpNum > 0 && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">
                DS Profit Margin: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(profitMarginPerUnit)}</strong> / unit
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300">
                {marginPercent}% Margin
              </span>
            </div>
          )}

          {/* Stock & Reorder Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isEditing ? "Current Stock (Units)" : "Initial Stock Quantity"}
              </label>
              <input
                type="number"
                min="0"
                disabled={isEditing}
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {isEditing && (
                <p className="text-[10px] text-slate-500 mt-0.5">Use "Adjust Stock" on table to modify inventory.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="5"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Batch Number & Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Number (Optional)
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="B2601"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm uppercase text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving..." : isEditing ? "Save Changes" : "Save Product"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

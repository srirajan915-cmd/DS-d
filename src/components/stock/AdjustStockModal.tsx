"use client";

import React, { useState } from "react";
import { X, ArrowUpDown, Plus, Minus, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: {
    id: string;
    sku: string;
    name: string;
    currentStock: number;
  } | null;
}

export function AdjustStockModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: AdjustStockModalProps) {
  const { success, error } = useToast();

  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "SET">("IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  if (!isOpen || !product) return null;

  const current = product.currentStock;
  const qtyNum = parseInt(quantity, 10) || 0;

  let projected = current;
  if (adjustType === "IN") projected = current + qtyNum;
  else if (adjustType === "OUT") projected = Math.max(0, current - qtyNum);
  else if (adjustType === "SET") projected = qtyNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (qtyNum <= 0 && adjustType !== "SET") {
      setModalError("Quantity must be greater than 0.");
      return;
    }

    if (adjustType === "OUT" && qtyNum > current) {
      setModalError(`Cannot deduct ${qtyNum} units. Current stock is only ${current}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stock/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustType,
          adjustQuantity: qtyNum,
          reason: reason.trim() || `${adjustType} stock adjustment`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to update stock");
        setLoading(false);
        return;
      }

      success(`Stock updated! New balance: ${projected} units`);
      onSuccess();
      onClose();
    } catch {
      setModalError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Adjust Inventory Stock
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                {product.name} ({product.sku})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-300 text-xs">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Current Stock Banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-500">Current Stock Balance:</span>
            <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
              {current} Units
            </span>
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "IN", label: "Add (+IN)", icon: Plus, color: "text-emerald-600" },
                { type: "OUT", label: "Deduct (-OUT)", icon: Minus, color: "text-rose-600" },
                { type: "SET", label: "Set Exact", icon: RefreshCw, color: "text-blue-600" },
              ].map((act) => {
                const Icon = act.icon;
                const active = adjustType === act.type;
                return (
                  <button
                    key={act.type}
                    type="button"
                    onClick={() => setAdjustType(act.type as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      active
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${act.color}`} />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {adjustType === "SET" ? "New Total Count" : "Quantity to Adjust"}
            </label>
            <input
              type="number"
              min={adjustType === "SET" ? 0 : 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Projected Result */}
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-800 dark:text-emerald-300">Projected New Stock:</span>
            <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
              {projected} Units
            </span>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Movement Reference <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Received shipment from warehouse / Physical count correction"
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Updating..." : "Confirm Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

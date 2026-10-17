"use client";

import React, { useState, useEffect } from "react";
import { X, History, ArrowDownRight, ArrowUpRight, RefreshCw, AlertCircle } from "lucide-react";
import { formatDateTimeIST } from "@/lib/utils";

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string;
  notes: string | null;
  createdAt: string;
  product?: {
    name: string;
    sku: string;
  };
}

interface StockMovementLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string | null;
  productName?: string | null;
}

export function StockMovementLedgerModal({
  isOpen,
  onClose,
  productId,
  productName,
}: StockMovementLedgerModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const url = productId
      ? `/api/stock/movements?productId=${productId}&limit=50`
      : `/api/stock/movements?limit=50`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movements) setMovements(data.movements);
      })
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
      case "SALE":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
      case "OUT":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
      case "CANCEL_REVERSAL":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Stock Movement Ledger
              </h2>
              <p className="text-xs text-slate-500">
                {productName ? `Audit trail for ${productName}` : "Recent stock changes across catalog"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 mx-auto mb-2 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading ledger logs...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-96 overflow-y-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Date & Time</th>
                    {!productId && <th className="p-2.5">Product</th>}
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Balance</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {formatDateTimeIST(m.createdAt)}
                      </td>
                      {!productId && (
                        <td className="p-2.5 font-medium truncate max-w-[140px]">
                          {m.product?.name}
                        </td>
                      )}
                      <td className="p-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getTypeBadge(m.type)}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {m.type === "OUT" || m.type === "SALE" ? (
                          <span className="text-rose-500">-{m.quantity}</span>
                        ) : (
                          <span className="text-emerald-500">+{m.quantity}</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {m.previousStock} → <strong className="text-slate-900 dark:text-white">{m.newStock}</strong>
                      </td>
                      <td className="p-2.5 text-slate-500 truncate max-w-[180px]">
                        {m.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

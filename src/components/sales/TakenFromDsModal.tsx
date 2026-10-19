"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  ArrowDownLeft,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  mrp: number;
  dp: number;
  currentStock: number;
}

interface DirectSeller {
  id: string;
  dsCode: string;
  name: string;
  phone: string;
  category: string;
  city?: string | null;
}

interface ProductLineItem {
  productId: string;
  quantity: number;
  unitRate: number;
}

interface TakenFromDsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: any) => void;
}

export function TakenFromDsModal({ isOpen, onClose, onSuccess }: TakenFromDsModalProps) {
  const { success, error } = useToast();

  // Master data
  const [directSellers, setDirectSellers] = useState<DirectSeller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [selectedDsId, setSelectedDsId] = useState("");
  const [dsSearch, setDsSearch] = useState("");
  const [dateOfTaken, setDateOfTaken] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"BALANCE" | "CLOSED">("BALANCE");
  const [addToInventory, setAddToInventory] = useState(true);
  const [notes, setNotes] = useState("");

  // Product items
  const [items, setItems] = useState<ProductLineItem[]>([
    { productId: "", quantity: 1, unitRate: 0 },
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch DS and products
  useEffect(() => {
    if (!isOpen) return;

    setLoadingData(true);
    Promise.all([
      fetch("/api/direct-sellers?pageSize=200").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/stock").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([dsData, stockData]) => {
        if (dsData?.items) setDirectSellers(dsData.items);
        if (stockData?.items) setProducts(stockData.items);
      })
      .catch(() => {
        error("Failed to load catalog or direct sellers list.");
      })
      .finally(() => {
        setLoadingData(false);
      });

    // Reset fields on modal open
    setSelectedDsId("");
    setDsSearch("");
    setDateOfTaken(new Date().toISOString().slice(0, 10));
    setStatus("BALANCE");
    setAddToInventory(true);
    setNotes("");
    setItems([{ productId: "", quantity: 1, unitRate: 0 }]);
    setFormError("");
  }, [isOpen, error]);

  // Filtered direct sellers
  const filteredDs = useMemo(() => {
    if (!dsSearch.trim()) return directSellers.slice(0, 10);
    const q = dsSearch.toLowerCase().trim();
    return directSellers.filter(
      (ds) =>
        ds.name.toLowerCase().includes(q) ||
        ds.dsCode.toLowerCase().includes(q) ||
        ds.phone.includes(q)
    );
  }, [directSellers, dsSearch]);

  const selectedDs = directSellers.find((d) => d.id === selectedDsId);

  // Handle line item changes
  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId,
      unitRate: selectedProd ? selectedProd.dp : 0,
    };
    setItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty || 1) };
    setItems(updated);
  };

  const handleRateChange = (index: number, rate: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unitRate: Math.max(0, rate) };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const totalProductsCount = items.filter((i) => i.productId).length;
  const totalUnitsCount = items.reduce((sum, i) => (i.productId ? sum + (i.quantity || 0) : sum), 0);
  const totalAmount = items.reduce(
    (sum, i) => (i.productId ? sum + (i.quantity || 0) * (i.unitRate || 0) : sum),
    0
  );

  // Group products by category for convenient selection
  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const prod of products) {
      const cat = prod.category || "GENERAL";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(prod);
    }
    return Array.from(map.entries());
  }, [products]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedDsId) {
      setFormError("Please select the Direct Seller from whom products were taken.");
      return;
    }

    const validItems = items.filter((it) => it.productId);
    if (validItems.length === 0) {
      setFormError("Please add at least one product with its quantity.");
      return;
    }

    for (const it of validItems) {
      if (it.quantity <= 0) {
        setFormError("Product quantity must be at least 1 unit.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        orderType: "TAKEN_FROM_DS",
        directSellerId: selectedDsId,
        orderDate: dateOfTaken,
        rateType: "DP",
        paymentStatus: status, // "BALANCE" or "CLOSED"
        amountPaid: status === "CLOSED" ? totalAmount : 0,
        discount: 0,
        addStockToInventory: addToInventory,
        notes: notes.trim() || null,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitRate: it.unitRate,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        success(
          `Voucher #${data.order?.orderNumber} created! Products taken recorded as ${status}.`
        );
        onSuccess(data.order);
        onClose();
      } else {
        setFormError(data.error || "Failed to record products taken from DS.");
      }
    } catch {
      setFormError("Network error occurred while submitting.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between border-b border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-indigo-200 shadow-inner">
              <ArrowDownLeft className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Taken from DS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold uppercase tracking-wider">
                  Stock Voucher
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                Record products borrowed or received from a Direct Seller with settlement tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-indigo-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Top Section: DS Selection & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DS Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Direct Seller (DS) *</span>
              </label>

              {selectedDs ? (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedDs.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {selectedDs.dsCode}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      +91 {selectedDs.phone} • {selectedDs.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDsId("")}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-2 py-1 rounded-lg hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={dsSearch}
                      onChange={(e) => setDsSearch(e.target.value)}
                      placeholder="Search DS name, code, or phone..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {loadingData ? (
                      <p className="p-3 text-center text-xs text-slate-400">Loading Direct Sellers...</p>
                    ) : filteredDs.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400">No Direct Seller found</p>
                    ) : (
                      filteredDs.map((ds) => (
                        <button
                          key={ds.id}
                          type="button"
                          onClick={() => {
                            setSelectedDsId(ds.id);
                            setDsSearch("");
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 flex items-center justify-between transition cursor-pointer text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{ds.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">
                              {ds.dsCode}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">+91 {ds.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date of Taken & Settlement Status */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Date of Taken *</span>
                </label>
                <input
                  type="date"
                  value={dateOfTaken}
                  onChange={(e) => setDateOfTaken(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Closed or Balance Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Settlement Status (Closed or Balance) *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("BALANCE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      status === "BALANCE"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>BALANCE (Open)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("CLOSED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      status === "CLOSED"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>CLOSED (Settled)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: How Many Products & Product Details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Product Details & Quantities Taken</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select products, how many units taken, and Distributor Price (DP)
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Line Items List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {items.map((item, index) => {
                const selectedProd = products.find((p) => p.id === item.productId);
                const lineTotal = (item.quantity || 0) * (item.unitRate || 0);

                return (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition"
                  >
                    <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0 w-5">
                      #{index + 1}
                    </span>

                    {/* Product Selector */}
                    <div className="flex-1 w-full sm:w-auto">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      >
                        <option value="">-- Choose Product Taken --</option>
                        {groupedProducts.map(([cat, prods]) => (
                          <optgroup key={cat} label={`📦 ${cat}`}>
                            {prods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (SKU: {p.sku}) — DP: ₹{p.dp}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {selectedProd && (
                        <p className="text-[10px] text-slate-500 mt-1 pl-1">
                          Category: <span className="font-semibold">{selectedProd.category}</span> • Store stock:{" "}
                          <span className="font-mono">{selectedProd.currentStock} units</span>
                        </p>
                      )}
                    </div>

                    {/* How Many Product (Qty) */}
                    <div className="w-28 shrink-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        How Many Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(index, parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Unit DP Rate */}
                    <div className="w-28 shrink-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Rate (DP ₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(e) => handleRateChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-24 text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Line Total
                      </span>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {formatINR(lineTotal)}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Real-time Summary Card */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Product Types
                  </span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {totalProductsCount} {totalProductsCount === 1 ? "Product" : "Products"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total Units Taken
                  </span>
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {totalUnitsCount} Units
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Valuation
                </span>
                <span className="font-mono font-extrabold text-lg sm:text-xl text-indigo-600 dark:text-indigo-300">
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Warehouse Inventory Toggle & Notes */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            {/* Inventory Toggle */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={addToInventory}
                onChange={(e) => setAddToInventory(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">
                  Automatically add taken products to store inventory
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  When enabled, current stock in your inventory increases immediately and logs an &quot;IN&quot; stock movement with voucher reference.
                </p>
              </div>
            </label>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                Notes / Reason for Borrowing (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Borrowed for urgent customer delivery; to be replenished or settled soon."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !selectedDsId || totalProductsCount === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Voucher..." : "Record Taken from DS"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

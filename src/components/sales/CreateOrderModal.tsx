"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Users,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
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
}

interface LineItem {
  productId: string;
  quantity: number;
  unitRate: number;
  maxStock: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdOrder: any) => void;
  initialOrderType?: "CUSTOMER" | "DS";
  preselectedDsId?: string;
}

export function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  initialOrderType = "CUSTOMER",
  preselectedDsId,
}: CreateOrderModalProps) {
  const { success, error } = useToast();

  const [orderType, setOrderType] = useState<"CUSTOMER" | "DS">(initialOrderType);
  const [rateType, setRateType] = useState<"MRP" | "DP">(initialOrderType === "DS" ? "DP" : "MRP");

  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);

  // DS fields
  const [directSellers, setDirectSellers] = useState<DirectSeller[]>([]);
  const [selectedDsId, setSelectedDsId] = useState(preselectedDsId || "");
  const [dsSearch, setDsSearch] = useState("");

  // Product catalog & line items
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", quantity: 1, unitRate: 0, maxStock: 0 },
  ]);

  // Pricing & Payment
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PARTIAL" | "PENDING">("PAID");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Load products & DS on open
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/stock")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setProducts(data.items);
        }
      });

    fetch("/api/direct-sellers?pageSize=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setDirectSellers(data.items);
        }
      });

    setOrderType(initialOrderType);
    setRateType(initialOrderType === "DS" ? "DP" : "MRP");
    if (preselectedDsId) setSelectedDsId(preselectedDsId);
  }, [isOpen, initialOrderType, preselectedDsId]);

  if (!isOpen) return null;

  // Handle product selection in line item
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const rate = rateType === "MRP" ? prod.mrp : prod.dp;
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        productId,
        quantity: 1,
        unitRate: rate,
        maxStock: prod.currentStock,
      };
      return copy;
    });
  };

  const handleRateTypeChange = (newRateType: "MRP" | "DP") => {
    setRateType(newRateType);
    // Update rates for existing line items
    setItems((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return item;
        return {
          ...item,
          unitRate: newRateType === "MRP" ? prod.mrp : prod.dp,
        };
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1, unitRate: 0, maxStock: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitRate, 0);
  const discountNum = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (orderType === "CUSTOMER") {
      if (!customerName.trim() || !customerPhone.trim()) {
        setFormError("Customer Name and Phone number are required.");
        return;
      }
      if (customerPhone.replace(/\D/g, "").length < 10) {
        setFormError("Please enter a valid 10-digit phone number.");
        return;
      }
    } else if (orderType === "DS") {
      if (!selectedDsId) {
        setFormError("Please select a Direct Seller for this order.");
        return;
      }
    }

    // Validate line items
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError("Please select at least one product with quantity > 0.");
      return;
    }

    for (const itm of validItems) {
      const p = products.find((pr) => pr.id === itm.productId);
      if (p && p.currentStock < itm.quantity) {
        setFormError(
          `Insufficient stock for '${p.name}'. Requested ${itm.quantity}, but only ${p.currentStock} in stock.`
        );
        return;
      }
    }

    let finalAmountPaid = parseFloat(amountPaid) || 0;
    if (paymentStatus === "PAID") finalAmountPaid = grandTotal;
    else if (paymentStatus === "PENDING") finalAmountPaid = 0;

    setLoading(true);
    try {
      const payload = {
        orderType,
        orderDate,
        rateType,
        discount: discountNum,
        paymentStatus,
        amountPaid: finalAmountPaid,
        notes: notes.trim() || null,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitRate: i.unitRate,
        })),
        ...(orderType === "CUSTOMER"
          ? {
              customerData: {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                address: customerAddress.trim() || null,
                city: customerCity.trim() || null,
              },
            }
          : { directSellerId: selectedDsId }),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save order");
        setLoading(false);
        return;
      }

      success(`Sale recorded! Order #${data.order.orderNumber}`);
      onSuccess(data.order);
      onClose();
    } catch {
      setFormError("Network error while recording sale.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDS = directSellers.filter(
    (ds) =>
      ds.name.toLowerCase().includes(dsSearch.toLowerCase()) ||
      ds.dsCode.toLowerCase().includes(dsSearch.toLowerCase()) ||
      ds.phone.includes(dsSearch)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Record New Sale
              </h2>
              <p className="text-xs text-slate-500">
                Generate invoice, deduct stock automatically, and track payment
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer">
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
          {/* Sale Category: Customer vs DS */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sales Category
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setOrderType("CUSTOMER");
                  handleRateTypeChange("MRP");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  orderType === "CUSTOMER"
                    ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer Sale</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("DS");
                  handleRateTypeChange("DP");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  orderType === "DS"
                    ? "bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Direct Seller (DS) Sale</span>
              </button>
            </div>
          </div>

          {/* Customer Input Fields */}
          {orderType === "CUSTOMER" ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Rao"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    WhatsApp Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[11px] font-bold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="City (optional)"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Address / Area (optional)"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* DS Selection Fields */
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Direct Seller <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={dsSearch}
                onChange={(e) => setDsSearch(e.target.value)}
                placeholder="Search DS by code or name..."
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs mb-2"
              />
              <select
                value={selectedDsId}
                onChange={(e) => setSelectedDsId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Direct Seller --</option>
                {filteredDS.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    [{ds.dsCode}] {ds.name} - {ds.category} ({ds.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rate Type & Date */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rate Type Applied
              </label>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => handleRateTypeChange("MRP")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    rateType === "MRP"
                      ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  MRP
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeChange("DP")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    rateType === "DP"
                      ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  DP (Distributor)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Products & Quantities
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-2 text-xs"
                >
                  {/* Product Dropdown */}
                  <div className="flex-1 w-full">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                    >
                      <option value="">-- Select Product --</option>
                      {Array.from(new Set(products.map((p) => p.category || "WELLNESS"))).map((cat) => (
                        <optgroup key={cat} label={`📁 ${cat}`}>
                          {products
                            .filter((p) => (p.category || "WELLNESS") === cat)
                            .map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={p.currentStock <= 0}
                              >
                                {p.name} ({p.currentStock} in stock) - MRP: ₹{p.mrp} / DP: ₹{p.dp}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      max={item.maxStock > 0 ? item.maxStock : 9999}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setItems((prev) => {
                          const copy = [...prev];
                          copy[idx].quantity = val;
                          return copy;
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-center"
                      title="Quantity"
                    />
                  </div>

                  {/* Rate with manual override */}
                  <div className="w-28 relative">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setItems((prev) => {
                          const copy = [...prev];
                          copy[idx].unitRate = val;
                          return copy;
                        });
                      }}
                      className="w-full pl-6 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                      title="Rate per unit"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="w-28 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {formatINR(item.quantity * item.unitRate)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatINR(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 py-1 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                {formatINR(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Status & Amount Paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="PAID">PAID (Full Payment)</option>
                <option value="PARTIAL">PARTIAL PAYMENT</option>
                <option value="PENDING">PENDING (Unpaid)</option>
              </select>
            </div>

            {paymentStatus === "PARTIAL" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Order Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Notes / Delivery details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via UPI, delivered at doorstep"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving Order & Stock..." : "Confirm & Save Order"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

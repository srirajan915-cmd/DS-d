"use client";

import React, { useState, useEffect } from "react";
import { X, CalendarCheck2, Save, User, Users, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface FollowUp {
  id?: string;
  type: "PRODUCT" | "DS";
  personType: "CUSTOMER" | "DS";
  directSellerId?: string | null;
  customerId?: string | null;
  productId?: string | null;
  followUpDate: string;
  notes?: string | null;
  status: "PENDING" | "FOLLOWED_UP" | "RESCHEDULED";
}

interface AddEditFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  followUpToEdit?: FollowUp | null;
}

export function AddEditFollowUpModal({
  isOpen,
  onClose,
  onSuccess,
  followUpToEdit,
}: AddEditFollowUpModalProps) {
  const { success, error } = useToast();
  const isEditing = Boolean(followUpToEdit?.id);

  const [type, setType] = useState<"PRODUCT" | "DS">("PRODUCT");
  const [personType, setPersonType] = useState<"CUSTOMER" | "DS">("CUSTOMER");

  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");

  // DS selector
  const [directSellers, setDirectSellers] = useState<any[]>([]);
  const [selectedDsId, setSelectedDsId] = useState("");

  // Product selector
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  // Details
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"PENDING" | "FOLLOWED_UP" | "RESCHEDULED">("PENDING");

  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Load DS and Products
    fetch("/api/direct-sellers?pageSize=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) setDirectSellers(data.items);
      });

    fetch("/api/stock")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) setProducts(data.items);
      });

    if (followUpToEdit) {
      setType(followUpToEdit.type);
      setPersonType(followUpToEdit.personType);
      setSelectedDsId(followUpToEdit.directSellerId || "");
      setSelectedProductId(followUpToEdit.productId || "");
      setFollowUpDate(
        followUpToEdit.followUpDate
          ? new Date(followUpToEdit.followUpDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setNotes(followUpToEdit.notes || "");
      setStatus(followUpToEdit.status || "PENDING");
    } else {
      setType("PRODUCT");
      setPersonType("CUSTOMER");
      setCustomerName("");
      setCustomerPhone("");
      setSelectedDsId("");
      setSelectedProductId("");
      setFollowUpDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setStatus("PENDING");
    }
    setModalError("");
  }, [isOpen, followUpToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (personType === "CUSTOMER") {
      if (!customerName.trim() || !customerPhone.trim()) {
        setModalError("Customer name and phone number are required.");
        return;
      }
    } else {
      if (!selectedDsId) {
        setModalError("Please select a Direct Seller.");
        return;
      }
    }

    if (!followUpDate) {
      setModalError("Follow-up date is required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        personType,
        directSellerId: personType === "DS" ? selectedDsId : null,
        productId: type === "PRODUCT" && selectedProductId ? selectedProductId : null,
        followUpDate,
        notes: notes.trim() || null,
        status,
        ...(personType === "CUSTOMER"
          ? {
              customerData: {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                city: customerCity.trim() || null,
              },
            }
          : {}),
      };

      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to schedule follow-up");
        setLoading(false);
        return;
      }

      success("Follow-up scheduled successfully!");
      onSuccess();
      onClose();
    } catch {
      setModalError("Network error occurred.");
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
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? "Edit Follow-up" : "Schedule New Follow-up"}
              </h2>
              <p className="text-xs text-slate-500">
                Set customer product check-in or DS milestone review
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Follow-up Type Selector: Product vs DS */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Follow-up Category
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType("PRODUCT");
                  setPersonType("CUSTOMER");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  type === "PRODUCT"
                    ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Product Follow-up</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("DS");
                  setPersonType("DS");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  type === "DS"
                    ? "bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>DS Team Follow-up</span>
              </button>
            </div>
          </div>

          {/* Recipient Details */}
          {personType === "CUSTOMER" ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Customer Details
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    WhatsApp Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Direct Seller <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDsId}
                onChange={(e) => setSelectedDsId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="">-- Choose Direct Seller --</option>
                {directSellers.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    [{ds.dsCode}] {ds.name} - {ds.category} ({ds.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Related Product (for Product follow-up) */}
          {type === "PRODUCT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Related Product (Optional)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="">-- No specific product / General --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Follow-up Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="PENDING">PENDING</option>
                <option value="FOLLOWED_UP">FOLLOWED UP</option>
                <option value="RESCHEDULED">RESCHEDULED</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Follow-up Notes / Objectives
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Check skin improvement after 2 weeks of face wash, recommend toner."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Scheduling..." : "Save Follow-up"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Save, Sparkles, Phone, MapPin, Building, Calendar, FileText } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { saveDSEdit, saveDSCreated } from "@/lib/clientStore";

interface DirectSeller {
  id?: string;
  dsCode: string;
  name: string;
  phone: string;
  category: "SAO" | "SGO";
  city?: string | null;
  address?: string | null;
  uplineCode?: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes?: string | null;
  joiningDate?: string | Date;
}

interface AddEditDSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sellerToEdit?: DirectSeller | null;
}

export function AddEditDSModal({
  isOpen,
  onClose,
  onSuccess,
  sellerToEdit,
}: AddEditDSModalProps) {
  const { success, error } = useToast();
  const isEditing = Boolean(sellerToEdit?.id);

  const [formData, setFormData] = useState<DirectSeller>({
    dsCode: "",
    name: "",
    phone: "",
    category: "SAO",
    city: "",
    address: "",
    uplineCode: "",
    status: "ACTIVE",
    notes: "",
    joiningDate: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (sellerToEdit) {
      setFormData({
        id: sellerToEdit.id,
        dsCode: sellerToEdit.dsCode,
        name: sellerToEdit.name,
        phone: sellerToEdit.phone,
        category: sellerToEdit.category || "SAO",
        city: sellerToEdit.city || "",
        address: sellerToEdit.address || "",
        uplineCode: sellerToEdit.uplineCode || "",
        status: sellerToEdit.status || "ACTIVE",
        notes: sellerToEdit.notes || "",
        joiningDate: sellerToEdit.joiningDate
          ? new Date(sellerToEdit.joiningDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      });
    } else {
      setFormData({
        dsCode: "",
        name: "",
        phone: "",
        category: "SAO",
        city: "",
        address: "",
        uplineCode: "",
        status: "ACTIVE",
        notes: "",
        joiningDate: new Date().toISOString().slice(0, 10),
      });
    }
    setFormError("");
  }, [sellerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGenerateCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = formData.category === "SAO" ? "SAO" : "SGO";
    setFormData((prev) => ({ ...prev, dsCode: `${prefix}${randomNum}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.dsCode.trim() || !formData.name.trim() || !formData.phone.trim()) {
      setFormError("DS Code, Name, and Phone number are required.");
      return;
    }

    if (formData.phone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `/api/direct-sellers/${sellerToEdit!.id}`
        : "/api/direct-sellers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to save Direct Seller");
        setLoading(false);
        return;
      }

      const savedItem = data.item || {
        ...formData,
        id: sellerToEdit?.id || `ds_${Date.now()}`,
        joiningDate: typeof formData.joiningDate === "string" ? formData.joiningDate : new Date().toISOString(),
      };
      if (isEditing) {
        saveDSEdit(savedItem as any);
      } else {
        saveDSCreated(savedItem as any);
      }

      success(isEditing ? "Direct Seller updated successfully!" : "Direct Seller registered successfully!");
      onSuccess();
      onClose();
    } catch {
      setFormError("Network error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? "Edit Direct Seller" : "Register Direct Seller"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying profile for ${sellerToEdit?.name}` : "Add a new distributor under SAO or SGO"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-300 text-xs">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, category: "SAO" }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  formData.category === "SAO"
                    ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>SAO Member</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, category: "SGO" }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  formData.category === "SGO"
                    ? "bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>SGO Member</span>
              </button>
            </div>
          </div>

          {/* DS Code with Auto Generate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                DS Code <span className="text-rose-500">*</span>
              </label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-generate
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.dsCode}
              onChange={(e) => setFormData({ ...formData, dsCode: e.target.value.toUpperCase() })}
              placeholder="e.g. SAO1001 or DS2001"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rajesh Kumar"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210"
                  required
                  className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* City & Upline Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai, Pune, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Upline DS Code (Optional)
              </label>
              <input
                type="text"
                value={formData.uplineCode || ""}
                onChange={(e) => setFormData({ ...formData, uplineCode: e.target.value.toUpperCase() })}
                placeholder="e.g. SAO1001"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm uppercase text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Joining Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={typeof formData.joiningDate === "string" ? formData.joiningDate : ""}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Flat/House, Street, Area"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Key strengths, customer network, product preferences..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving..." : isEditing ? "Save Changes" : "Create Seller"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

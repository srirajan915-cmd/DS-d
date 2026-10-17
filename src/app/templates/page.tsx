"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  MessageCircle,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { interpolateTemplate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  isDefault: boolean;
}

export default function TemplatesPage() {
  const { success, error } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("PRODUCT_FOLLOWUP");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Live test preview
  const [testName, setTestName] = useState("Priya Sharma");
  const [testProduct, setTestProduct] = useState("Aloe Vera Health Juice 1L");
  const [testDsCode, setTestDsCode] = useState("SAO1002");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      } else {
        error(data.error || "Failed to load templates");
      }
    } catch {
      error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setName("");
    setType("PRODUCT_FOLLOWUP");
    setContent("");
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setType(t.type);
    setContent(t.content);
    setIsDefault(t.isDefault);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      error("Name and message content are required.");
      return;
    }

    setModalLoading(true);
    try {
      const isEdit = Boolean(editingTemplate?.id);
      const url = isEdit ? `/api/templates/${editingTemplate!.id}` : "/api/templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, content, isDefault }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to save template");
        setModalLoading(false);
        return;
      }

      success(isEdit ? "Template updated!" : "New template created!");
      setIsModalOpen(false);
      fetchTemplates();
    } catch {
      error("Failed to save template");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        success("Template removed");
        fetchTemplates();
      }
    } catch {
      error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-500" />
            <span>WhatsApp Message Templates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standardize your customer and team messages with smart placeholders
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Placeholder Legend Banner */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Supported Dynamic Placeholders:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{name}"} : Contact Name
          </span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{product}"} : Product Name
          </span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{ds_code}"} : Direct Seller Code
          </span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{date}"} : Scheduled Date
          </span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{amount}"} : Bill Amount (₹)
          </span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {"{order_number}"} : Order / Invoice Number
          </span>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading templates...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const preview = interpolateTemplate(tpl.content, {
              name: testName,
              product: testProduct,
              ds_code: testDsCode,
              date: "17-10-2026",
              amount: "1,650",
              order_number: "ORD-2026-0001",
            });

            return (
              <div
                key={tpl.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {tpl.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(tpl)}
                        className="p-1 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5">
                    {tpl.name}
                  </h3>

                  {/* Template raw code */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 font-sans leading-relaxed">
                    {tpl.content}
                  </p>
                </div>

                {/* Sample Preview */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Rendered WhatsApp Preview:
                  </span>
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-snug">
                    {preview}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingTemplate ? "Edit Template" : "Create Message Template"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Health Refill Reminder"
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="PRODUCT_FOLLOWUP">PRODUCT_FOLLOWUP</option>
                  <option value="DS_FOLLOWUP">DS_FOLLOWUP</option>
                  <option value="ORDER_RECEIPT">ORDER_RECEIPT</option>
                  <option value="STOCK_ALERT">STOCK_ALERT</option>
                  <option value="GENERAL">GENERAL</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Message Content (use {"{name}"}, {"{product}"}, etc.)
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Namaste {name} ji! Hope you are doing well..."
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
                >
                  {modalLoading ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

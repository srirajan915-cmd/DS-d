"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Plus,
  MessageCircle,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Users,
  Package,
  Search,
  Filter,
  Trash2,
  Edit,
  ExternalLink,
  Send,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { formatDateIST, getWhatsAppUrl } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { AddEditFollowUpModal } from "@/components/follow-ups/AddEditFollowUpModal";
import { BulkMessageModal } from "@/components/follow-ups/BulkMessageModal";

interface FollowUp {
  id: string;
  type: "PRODUCT" | "DS";
  personType: "CUSTOMER" | "DS";
  followUpDate: string;
  notes: string | null;
  status: "PENDING" | "FOLLOWED_UP" | "RESCHEDULED";
  followedUpAt: string | null;
  customer?: { name: string; phone: string } | null;
  directSeller?: { name: string; dsCode: string; phone: string } | null;
  product?: { name: string; sku: string } | null;
}

export default function FollowUpsPage() {
  const { success, error } = useToast();

  const [categoryTab, setCategoryTab] = useState<"ALL" | "PRODUCT" | "DS">("ALL");
  const [timingFilter, setTimingFilter] = useState<"ALL" | "TODAY" | "OVERDUE" | "UPCOMING">("TODAY");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [items, setItems] = useState<FollowUp[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, today: 0, overdue: 0, product: 0, ds: 0 });
  const [loading, setLoading] = useState(true);

  // Selection for bulk messaging
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [followUpToEdit, setFollowUpToEdit] = useState<FollowUp | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Next follow-up scheduling prompt modal
  const [promptNextForId, setPromptNextForId] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: categoryTab,
        timing: timingFilter,
        search: searchQuery,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/follow-ups?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setPagination(data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
        if (data.counts) setCounts(data.counts);
      } else {
        error(data.error || "Failed to load follow-ups");
      }
    } catch {
      error("Network error while loading follow-ups");
    } finally {
      setLoading(false);
    }
  }, [categoryTab, timingFilter, searchQuery, page, pageSize, error]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Handle select all / single select
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Toggle status done vs pending
  const handleToggleStatus = async (item: FollowUp) => {
    const newStatus = item.status === "FOLLOWED_UP" ? "PENDING" : "FOLLOWED_UP";
    try {
      const res = await fetch(`/api/follow-ups/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        if (newStatus === "FOLLOWED_UP") {
          success("Marked as followed up!");
          setPromptNextForId(item.id);
        } else {
          success("Status restored to pending");
        }
        fetchFollowUps();
      }
    } catch {
      error("Failed to update status");
    }
  };

  const handleScheduleNextDays = async (days: number) => {
    if (!promptNextForId) return;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    try {
      await fetch(`/api/follow-ups/${promptNextForId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FOLLOWED_UP",
          nextFollowUpDate: nextDate.toISOString(),
        }),
      });
      success(`Next follow-up scheduled in ${days} days!`);
      setPromptNextForId(null);
      fetchFollowUps();
    } catch {
      error("Failed to auto-schedule next date");
    }
  };

  const selectedList = items.filter((i) => selectedIds.has(i.id));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarCheck2 className="w-7 h-7 text-emerald-500" />
            <span>Follow-up Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track customer product check-ins, team milestone reviews, and bulk WhatsApp follow-ups
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setFollowUpToEdit(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Follow-up</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBulkOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer animate-in zoom-in-95"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp ({selectedIds.size})</span>
            </button>
          )}

          <Link
            href="/templates"
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Templates</span>
          </Link>
        </div>
      </div>

      {/* Timing Quick Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "TODAY", label: "Today's Follow-ups", count: counts.today, color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/40" },
          { key: "OVERDUE", label: "Overdue Follow-ups", count: counts.overdue, color: "text-rose-600 dark:text-rose-400", border: "border-rose-500/40" },
          { key: "UPCOMING", label: "Upcoming (Later)", count: Math.max(0, counts.all - counts.today - counts.overdue), color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/40" },
          { key: "ALL", label: "Total All Records", count: counts.all, color: "text-slate-900 dark:text-white", border: "border-slate-200 dark:border-slate-800" },
        ].map((t) => (
          <div
            key={t.key}
            onClick={() => {
              setTimingFilter(t.key as any);
              setPage(1);
            }}
            className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition ${
              timingFilter === t.key
                ? `bg-slate-100 dark:bg-slate-800/90 ring-2 ring-emerald-500/30 ${t.border}`
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50/60"
            }`}
          >
            <span className="text-xs font-medium text-slate-500">{t.label}</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold tracking-tight ${t.color}`}>
                {t.count}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to filter</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Tabs: ALL, PRODUCT, DS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl w-full sm:w-auto">
          {[
            { key: "ALL", label: "All Types" },
            { key: "PRODUCT", label: "Product Follow-ups" },
            { key: "DS", label: "DS Team Follow-ups" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setCategoryTab(tab.key as any);
                setPage(1);
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                categoryTab === tab.key
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search person, product, notes..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Follow-up Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading follow-up tasks...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <CalendarCheck2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No Follow-ups Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Schedule your first check-in with a customer or team direct seller to maintain regular contact.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsAddEditOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Schedule Follow-up
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onChange={(e) => handleSelectAllVisible(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                      />
                    </th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4">Follow-up Date</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Subject / Product</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {items.map((fu) => {
                    const isCust = fu.personType === "CUSTOMER";
                    const recipientName = isCust
                      ? fu.customer?.name
                      : `${fu.directSeller?.name} (${fu.directSeller?.dsCode})`;
                    const recipientPhone = isCust ? fu.customer?.phone : fu.directSeller?.phone;
                    const isDone = fu.status === "FOLLOWED_UP";

                    return (
                      <tr
                        key={fu.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                          isDone ? "bg-slate-50/40 dark:bg-slate-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(fu.id)}
                            onChange={() => toggleSelect(fu.id)}
                            className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                        </td>

                        {/* Status Toggle Button */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleToggleStatus(fu)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                              isDone
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 hover:bg-emerald-100"
                            }`}
                            title="Click to toggle status"
                          >
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${isDone ? "text-emerald-600" : "text-amber-500"}`}
                            />
                            <span>{isDone ? "Done" : "Pending"}</span>
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                          {formatDateIST(fu.followUpDate)}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                              fu.type === "PRODUCT"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            }`}
                          >
                            {fu.type === "PRODUCT" ? "Product" : "DS Team"}
                          </span>
                        </td>

                        {/* Recipient */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            {recipientName}
                          </p>
                          {recipientPhone && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              +91 {recipientPhone}
                            </span>
                          )}
                        </td>

                        {/* Product / Subject */}
                        <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                          {fu.product ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {fu.product.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">General Check-in</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {fu.notes || "-"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {recipientPhone && (
                              <a
                                href={getWhatsAppUrl(
                                  recipientPhone,
                                  `Namaste ${recipientName} ji! Hope you are having a wonderful week. Checking in regarding our follow-up note: ${fu.notes || "how is your experience?"}`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 hover:bg-emerald-100 text-xs font-bold rounded-lg flex items-center gap-1 transition"
                                title="One-click WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            <button
                              onClick={() => {
                                setFollowUpToEdit(fu);
                                setIsAddEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((fu) => {
                const isCust = fu.personType === "CUSTOMER";
                const recipientName = isCust
                  ? fu.customer?.name
                  : `${fu.directSeller?.name} (${fu.directSeller?.dsCode})`;
                const recipientPhone = isCust ? fu.customer?.phone : fu.directSeller?.phone;
                const isDone = fu.status === "FOLLOWED_UP";

                return (
                  <div key={fu.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(fu.id)}
                          onChange={() => toggleSelect(fu.id)}
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <button
                          onClick={() => handleToggleStatus(fu)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            isDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isDone ? "Done" : "Pending"}</span>
                        </button>
                      </div>

                      <span className="text-xs text-slate-500 font-semibold">
                        {formatDateIST(fu.followUpDate)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {recipientName}
                      </h3>
                      {fu.product && (
                        <p className="text-xs text-emerald-600 font-medium">{fu.product.name}</p>
                      )}
                      {fu.notes && <p className="text-xs text-slate-500 mt-1">{fu.notes}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">+91 {recipientPhone}</span>
                      {recipientPhone && (
                        <a
                          href={getWhatsAppUrl(
                            recipientPhone,
                            `Namaste ${recipientName} ji! Following up on ${fu.product?.name || "our recent discussion"}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} records
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Auto-schedule Next Follow-up Prompt */}
      {promptNextForId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Great! Follow-up Completed 🎉
            </h3>
            <p className="text-xs text-slate-500 mt-1.5">
              Would you like to automatically schedule the next follow-up date for this contact?
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleScheduleNextDays(15)}
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              >
                In 15 Days
              </button>
              <button
                onClick={() => handleScheduleNextDays(30)}
                className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-100"
              >
                In 30 Days (1 Month)
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPromptNextForId(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                No, thanks (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Follow-up Modal */}
      <AddEditFollowUpModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setFollowUpToEdit(null);
        }}
        onSuccess={fetchFollowUps}
        followUpToEdit={followUpToEdit}
      />

      {/* Bulk Message Modal */}
      <BulkMessageModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        selectedFollowUps={selectedList}
        onMessagesLogged={() => {
          setSelectedIds(new Set());
          fetchFollowUps();
        }}
      />
    </div>
  );
}

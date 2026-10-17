"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { AddEditDSModal } from "@/components/direct-sellers/AddEditDSModal";
import { ImportDSModal } from "@/components/direct-sellers/ImportDSModal";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDateIST, getWhatsAppUrl } from "@/lib/utils";

interface DirectSeller {
  id: string;
  dsCode: string;
  name: string;
  phone: string;
  category: "SAO" | "SGO";
  city: string | null;
  address: string | null;
  uplineCode: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  joiningDate: string;
}

export default function DirectSellersPage() {
  const { success, error } = useToast();

  const [categoryTab, setCategoryTab] = useState<"ALL" | "SAO" | "SGO">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [items, setItems] = useState<DirectSeller[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, sao: 0, sgo: 0 });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [sellerToEdit, setSellerToEdit] = useState<DirectSeller | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchDirectSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryTab,
        status: statusFilter,
        search: searchQuery,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/direct-sellers?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setPagination(data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
        setCounts(data.counts || { all: 0, sao: 0, sgo: 0 });
      } else {
        error(data.error || "Failed to load Direct Sellers");
      }
    } catch {
      error("Network error while fetching Direct Sellers");
    } finally {
      setLoading(false);
    }
  }, [categoryTab, statusFilter, searchQuery, page, pageSize, error]);

  useEffect(() => {
    fetchDirectSellers();
  }, [fetchDirectSellers]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/direct-sellers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        success("Direct Seller removed successfully");
        setDeleteConfirmId(null);
        fetchDirectSellers();
      } else {
        error(data.error || "Failed to delete");
      }
    } catch {
      error("Network error while deleting");
    }
  };

  const handleExportExcel = () => {
    window.location.href = `/api/direct-sellers/export?category=${categoryTab}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-500" />
            <span>Direct Sellers Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your network of SAO & SGO distributors, upline mappings, and contacts
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSellerToEdit(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register DS</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Tabs: ALL, SAO, SGO */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl max-w-md">
        {[
          { key: "ALL", label: "All Members", count: counts.all },
          { key: "SAO", label: "SAO", count: counts.sao, color: "text-emerald-500" },
          { key: "SGO", label: "SGO", count: counts.sgo, color: "text-teal-500" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setCategoryTab(tab.key as any);
              setPage(1);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              categoryTab === tab.key
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                categoryTab === tab.key
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-300/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
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
            placeholder="Search by name, phone, DS code, or city..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full sm:w-36 py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <button
            onClick={() => fetchDirectSellers()}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table / Card Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Direct Sellers...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No Direct Sellers Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No direct sellers matched "${searchQuery}". Try clearing search filters.`
                : "Get started by registering a new seller or importing from your Excel file."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsAddEditOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Register First DS
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Import Excel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5">DS Code</th>
                    <th className="py-3.5 px-4">Direct Seller</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Contact & WhatsApp</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Joining Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {items.map((ds) => (
                    <tr
                      key={ds.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-5 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        <Link
                          href={`/direct-sellers/${ds.id}`}
                          className="hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>{ds.dsCode}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      </td>

                      {/* Name & Upline */}
                      <td className="py-3.5 px-4">
                        <Link href={`/direct-sellers/${ds.id}`} className="hover:underline">
                          <p className="font-bold text-slate-900 dark:text-white">{ds.name}</p>
                          {ds.uplineCode && (
                            <p className="text-[11px] text-slate-500">
                              Upline: <span className="font-mono text-emerald-600">{ds.uplineCode}</span>
                            </p>
                          )}
                        </Link>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 ${
                            ds.category === "SAO"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300"
                          }`}
                        >
                          {ds.category}
                        </span>
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {ds.phone}
                          </span>
                          <a
                            href={getWhatsAppUrl(
                              ds.phone,
                              `Namaste ${ds.name} ji (${ds.dsCode}), hope you are having a productive week!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition"
                            title="Open WhatsApp chat"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {ds.city || "-"}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {formatDateIST(ds.joiningDate)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            ds.status === "ACTIVE"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {ds.status === "ACTIVE" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{ds.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/direct-sellers/${ds.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="View Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSellerToEdit(ds);
                              setIsAddEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(ds.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((ds) => (
                <div key={ds.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {ds.dsCode}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            ds.category === "SAO"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                          }`}
                        >
                          {ds.category}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            ds.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {ds.status}
                        </span>
                      </div>
                      <Link href={`/direct-sellers/${ds.id}`}>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                          {ds.name}
                        </h3>
                      </Link>
                      {ds.city && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{ds.city}</span>
                        </p>
                      )}
                    </div>

                    <a
                      href={getWhatsAppUrl(
                        ds.phone,
                        `Namaste ${ds.name} ji (${ds.dsCode}), hope you are having a productive week!`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition shrink-0"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 font-mono">{ds.phone}</span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/direct-sellers/${ds.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Details
                      </Link>
                      <button
                        onClick={() => {
                          setSellerToEdit(ds);
                          setIsAddEditOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(ds.id)}
                        className="p-1 text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} sellers
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Confirm Soft Delete
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to remove this Direct Seller? Their past sales and follow-up
              history will be safely preserved in your records.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Delete Seller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddEditDSModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setSellerToEdit(null);
        }}
        onSuccess={fetchDirectSellers}
        sellerToEdit={sellerToEdit}
      />

      {/* Import Modal */}
      <ImportDSModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchDirectSellers}
      />
    </div>
  );
}

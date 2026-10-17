"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  AlertTriangle,
  History,
  ArrowUpDown,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Layers,
} from "lucide-react";
import { formatINR, formatDateIST } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { AddEditProductModal } from "@/components/stock/AddEditProductModal";
import { AdjustStockModal } from "@/components/stock/AdjustStockModal";
import { ImportStockModal } from "@/components/stock/ImportStockModal";
import { StockMovementLedgerModal } from "@/components/stock/StockMovementLedgerModal";
import { PRODUCT_CATEGORIES, getCategoryBadgeStyle } from "@/lib/categories";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  mrp: number;
  dp: number;
  currentStock: number;
  reorderLevel: number;
  batchNumber: string | null;
  expiryDate: string | null;
}

interface StockMetrics {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValueDP: number;
  totalInventoryValueMRP: number;
  categoryCounts?: Record<string, number>;
}

export default function StockPage() {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [items, setItems] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [metrics, setMetrics] = useState<StockMetrics>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValueDP: 0,
    totalInventoryValueMRP: 0,
    categoryCounts: {},
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerProductId, setLedgerProductId] = useState<string | null>(null);
  const [ledgerProductName, setLedgerProductName] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: activeTab,
        category: selectedCategory,
        search: searchQuery,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/stock?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setPagination(data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
        if (data.metrics) setMetrics(data.metrics);
      } else {
        error(data.error || "Failed to load stock");
      }
    } catch {
      error("Network error while fetching stock inventory");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, searchQuery, page, pageSize, error]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/stock/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        success("Product removed from inventory");
        setDeleteConfirmId(null);
        fetchStock();
      } else {
        error(data.error || "Failed to delete product");
      }
    } catch {
      error("Network error while deleting");
    }
  };

  const handleExportExcel = () => {
    window.location.href = "/api/stock/export";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-500" />
            <span>Product Stock & Inventory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time distributor stock ledger, reorder levels, and bulk Excel synchronization
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setProductToEdit(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Upload Stock Excel</span>
          </button>

          <button
            onClick={() => {
              setLedgerProductId(null);
              setLedgerProductName(null);
              setIsLedgerOpen(true);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Ledger</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Export Inventory to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Total Products</span>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {metrics.totalProducts}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Active catalog items</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => {
            setActiveTab("LOW_STOCK");
            setPage(1);
          }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition ${
            activeTab === "LOW_STOCK"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {metrics.lowStockCount}
            </span>
            <p className="text-[11px] text-amber-600/80 mt-0.5">Below reorder threshold</p>
          </div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => {
            setActiveTab("OUT_OF_STOCK");
            setPage(1);
          }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition ${
            activeTab === "OUT_OF_STOCK"
              ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {metrics.outOfStockCount}
            </span>
            <p className="text-[11px] text-rose-600/80 mt-0.5">Zero inventory</p>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Inventory Valuation</span>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatINR(metrics.totalInventoryValueDP, false)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              MRP: <span className="font-mono">{formatINR(metrics.totalInventoryValueMRP, false)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl w-full sm:w-auto">
          {[
            { key: "ALL", label: "All Products" },
            { key: "LOW_STOCK", label: "Low Stock Alerts", badge: metrics.lowStockCount },
            { key: "OUT_OF_STOCK", label: "Out of Stock", badge: metrics.outOfStockCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setPage(1);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
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
            placeholder="Search SKU, product, batch..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Product Categories Filter Bar */}
      <div className="bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Product Categories ({PRODUCT_CATEGORIES.length})</span>
          </div>
          {selectedCategory !== "ALL" && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setPage(1);
              }}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Reset Category
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setPage(1);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>All Categories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                selectedCategory === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {metrics.totalProducts}
            </span>
          </button>

          {PRODUCT_CATEGORIES.map((cat) => {
            const count = metrics.categoryCounts?.[cat] || 0;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-500/20"
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-500/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading inventory...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No Products Found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add your first product or upload an Excel inventory list.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsAddEditOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Add Product
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Upload Excel
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
                    <th className="py-3.5 px-5">SKU</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-4">MRP / DP</th>
                    <th className="py-3.5 px-4">Margin</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4">Reorder Level</th>
                    <th className="py-3.5 px-4">Batch / Expiry</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {items.map((prod) => {
                    const isOut = prod.currentStock <= 0;
                    const isLow = !isOut && prod.currentStock <= prod.reorderLevel;
                    const margin =
                      prod.mrp > 0
                        ? (((prod.mrp - prod.dp) / prod.mrp) * 100).toFixed(1) + "%"
                        : "0%";

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* SKU */}
                        <td className="py-3.5 px-5 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {prod.sku}
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {prod.name}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          {(() => {
                            const badge = getCategoryBadgeStyle(prod.category);
                            return (
                              <span
                                className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold border tracking-wide whitespace-nowrap ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {prod.category || "WELLNESS"}
                              </span>
                            );
                          })()}
                        </td>

                        {/* MRP / DP */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                            {formatINR(prod.mrp)}
                          </span>
                          <span className="text-[11px] text-slate-500 block font-mono">
                            DP: {formatINR(prod.dp)}
                          </span>
                        </td>

                        {/* Margin */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {margin}
                          </span>
                        </td>

                        {/* Stock Balance & Alerts */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-sm font-extrabold ${
                                isOut
                                  ? "text-rose-600"
                                  : isLow
                                  ? "text-amber-600"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {prod.currentStock}
                            </span>
                            {isOut ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                OUT OF STOCK
                              </span>
                            ) : isLow ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                OK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Reorder Level */}
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                          {prod.reorderLevel} units
                        </td>

                        {/* Batch & Expiry */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {prod.batchNumber && (
                            <span className="font-mono text-[11px] block">{prod.batchNumber}</span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {formatDateIST(prod.expiryDate)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setProductToAdjust(prod);
                                setIsAdjustOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Adjust Stock (+/-)"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                              <span>Adjust</span>
                            </button>

                            <button
                              onClick={() => {
                                setLedgerProductId(prod.id);
                                setLedgerProductName(prod.name);
                                setIsLedgerOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Stock History Ledger"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setProductToEdit(prod);
                                setIsAddEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Product Master"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmId(prod.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((prod) => {
                const isOut = prod.currentStock <= 0;
                const isLow = !isOut && prod.currentStock <= prod.reorderLevel;

                return (
                  <div key={prod.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {prod.sku}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${getCategoryBadgeStyle(prod.category).bg} ${getCategoryBadgeStyle(prod.category).text} ${getCategoryBadgeStyle(prod.category).border}`}
                          >
                            {prod.category || "WELLNESS"}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                          {prod.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-mono font-semibold">MRP: {formatINR(prod.mrp)}</span>
                          <span className="text-slate-500 font-mono">DP: {formatINR(prod.dp)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono text-lg font-extrabold ${
                            isOut
                              ? "text-rose-600"
                              : isLow
                              ? "text-amber-600"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {prod.currentStock}
                        </span>
                        <span className="text-[10px] text-slate-500 block">units in stock</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {isOut ? (
                        <span className="text-[10px] font-bold text-rose-600">OUT OF STOCK</span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold text-amber-600">LOW STOCK</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600">IN STOCK</span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setProductToAdjust(prod);
                            setIsAdjustOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => {
                            setLedgerProductId(prod.id);
                            setLedgerProductName(prod.name);
                            setIsLedgerOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setProductToEdit(prod);
                            setIsAddEditOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(prod.id)}
                          className="p-1 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                {pagination.total} products
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Confirm Remove Product
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to remove this product from the active catalog? All past sales
              and stock movement logs will be retained.
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Remove Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <AddEditProductModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setProductToEdit(null);
        }}
        onSuccess={fetchStock}
        productToEdit={productToEdit}
      />

      {/* Fast Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={isAdjustOpen}
        onClose={() => {
          setIsAdjustOpen(false);
          setProductToAdjust(null);
        }}
        onSuccess={fetchStock}
        product={productToAdjust}
      />

      {/* Bulk Stock Import Modal */}
      <ImportStockModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchStock}
      />

      {/* Stock Movement Ledger Modal */}
      <StockMovementLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => {
          setIsLedgerOpen(false);
          setLedgerProductId(null);
          setLedgerProductName(null);
        }}
        productId={ledgerProductId}
        productName={ledgerProductName}
      />
    </div>
  );
}

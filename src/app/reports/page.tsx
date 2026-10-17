"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Database,
  IndianRupee,
  TrendingUp,
  Package,
  Users,
  ShieldCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Trophy,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { formatINR, formatDateIST } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

interface FinancialSummary {
  lifetimeRevenue: number;
  grossProfit: number;
  totalReceivables: number;
  totalOrders: number;
  customerOrdersCount: number;
  dsOrdersCount: number;
}

interface InventoryValuation {
  totalStockUnits: number;
  stockDpValuation: number;
  stockMrpValuation: number;
  potentialProfit: number;
}

interface DSLeaderboardItem {
  id: string;
  name: string;
  dsCode: string;
  category: string;
  phone: string;
  totalOrders: number;
  totalVolume: number;
  downlinesCount: number;
}

interface Counts {
  directSellers: number;
  products: number;
  customers: number;
  orders: number;
  followUps: number;
}

export default function ReportsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);

  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [inventoryValuation, setInventoryValuation] = useState<InventoryValuation | null>(null);
  const [leaderboard, setLeaderboard] = useState<DSLeaderboardItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup?format=summary");
      const data = await res.json();
      if (res.ok) {
        setFinancials(data.financials);
        setInventoryValuation(data.inventoryValuation);
        setLeaderboard(data.dsLeaderboard || []);
        setCounts(data.counts);
      } else {
        error("Failed to load business summary");
      }
    } catch {
      error("Error loading financial reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleDownload = async (format: "json" | "xlsx") => {
    if (format === "json") setDownloadingJson(true);
    else setDownloadingXlsx(true);

    try {
      const res = await fetch(`/api/backup?format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = format === "json" ? `directsell_backup_${dateStr}.json` : `DirectSell_Master_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success(`Downloaded ${format.toUpperCase()} backup successfully!`);
    } catch {
      error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      if (format === "json") setDownloadingJson(false);
      else setDownloadingXlsx(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Database className="w-3.5 h-3.5" />
              <span>Full Data Ownership & Financial Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Reports & Database Backup
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Export complete business snapshots into multi-tab Excel workbooks or raw JSON,
              and review lifetime financial margins and DS team rankings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleDownload("xlsx")}
              disabled={downloadingXlsx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <FileSpreadsheet className={`w-4 h-4 ${downloadingXlsx ? "animate-spin" : ""}`} />
              <span>{downloadingXlsx ? "Exporting..." : "Export Master Excel (5 Sheets)"}</span>
            </button>

            <button
              onClick={() => handleDownload("json")}
              disabled={downloadingJson}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur border border-white/20 transition disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${downloadingJson ? "animate-spin" : ""}`} />
              <span>{downloadingJson ? "Backing up..." : "Full JSON Backup"}</span>
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Financial Health Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lifetime Gross Sales */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Lifetime Gross Sales</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {loading ? "..." : formatINR(financials?.lifetimeRevenue || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Across {financials?.totalOrders || 0} completed orders
            </p>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated Gross Margin</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {loading ? "..." : formatINR(financials?.grossProfit || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Revenue minus product DP purchase costs
            </p>
          </div>
        </div>

        {/* Total Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Receivables</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 truncate">
              {loading ? "..." : formatINR(financials?.totalReceivables || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Unpaid customer & DS balance
            </p>
          </div>
        </div>

        {/* Order Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sales Channels</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? "..." : `${financials?.customerOrdersCount || 0} / ${financials?.dsOrdersCount || 0}`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Retail Customer vs DS Wholesale orders
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Valuation Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Current Inventory Valuation
              </h2>
              <p className="text-xs text-slate-500">
                Total commercial value of warehouse stock currently on hand
              </p>
            </div>
          </div>
          <a
            href="/stock"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Manage Stock</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">Total Units in Stock</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {inventoryValuation?.totalStockUnits || 0} units
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">Stock Cost (DP Basis)</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatINR(inventoryValuation?.stockDpValuation || 0)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">Retail Worth (MRP Basis)</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(inventoryValuation?.stockMrpValuation || 0)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">Potential Gross Margin</span>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
              {formatINR(inventoryValuation?.potentialProfit || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Direct Seller Leaderboard */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Direct Seller Team Ranking
              </h2>
              <p className="text-xs text-slate-500">
                Performance by cumulative sales volume and downline network strength
              </p>
            </div>
          </div>
          <a
            href="/direct-sellers"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View DS Tree</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Direct Seller</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3 text-center">Orders Placed</th>
                <th className="py-3 px-3 text-center">Downline Team</th>
                <th className="py-3 px-3 text-right">Total Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No Direct Seller orders recorded yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium"
                  >
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] ${
                          index === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : index === 1
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : index === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                            : "text-slate-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <a
                        href={`/direct-sellers/${item.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 transition"
                      >
                        {item.name}
                      </a>
                      <p className="text-[10px] text-slate-400 font-mono">{item.dsCode}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.category === "SAO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-400"
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500">+91 {item.phone}</td>
                    <td className="py-3.5 px-3 text-center">{item.totalOrders}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-semibold">{item.downlinesCount}</span> direct
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(item.totalVolume)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Health & Privacy Assurance */}
      <div className="p-6 rounded-3xl bg-slate-900 text-slate-200 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-white">100% Private Business Architecture</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your database holds {counts?.directSellers || 0} direct sellers, {counts?.products || 0} inventory SKUs, {counts?.orders || 0} sales transactions, and {counts?.followUps || 0} follow-up logs. No third-party data tracking.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 shrink-0">
          Recommended: Download an Excel backup weekly.
        </div>
      </div>
    </div>
  );
}

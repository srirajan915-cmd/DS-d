"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  Calendar,
  Package,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  IndianRupee,
  CheckCircle2,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatINR, formatDate } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

interface StatsData {
  totalDS: number;
  saoCount: number;
  sgoCount: number;
  pendingFollowUpsToday: number;
  overdueFollowUps: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesThisMonth: number;
  customerSalesThisMonth: number;
  dsSalesThisMonth: number;
  pendingReceivables: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  customer: number;
  ds: number;
}

interface TopProduct {
  name: string;
  sku: string;
  units: number;
  revenue: number;
}

interface FollowUpItem {
  id: string;
  type: string;
  targetName: string;
  targetPhone: string;
  followUpDate: string;
  notes?: string;
  customer?: { name: string; phone: string };
  directSeller?: { name: string; dsCode: string; phone: string };
  product?: { name: string; sku: string };
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  mrp: number;
  dp: number;
}

export default function DashboardPage() {
  const { success, error } = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUpItem[]>([]);
  const [lowStockList, setLowStockList] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setMonthlyTrend(data.monthlySalesTrend || []);
        setCategoryDistribution(data.categoryDistribution || []);
        setTopProducts(data.topProducts || []);
        setTodayFollowUps(data.todayFollowUpsList || []);
        setLowStockList(data.lowStockList || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  const handleMarkFollowUpDone = async (id: string) => {
    try {
      const res = await fetch(`/api/follow-ups/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        success("Follow-up marked as completed");
        setTodayFollowUps((prev) => prev.filter((item) => item.id !== id));
        if (stats) {
          setStats({
            ...stats,
            pendingFollowUpsToday: Math.max(0, stats.pendingFollowUpsToday - 1),
          });
        }
      } else {
        error("Failed to update follow-up");
      }
    } catch {
      error("Error updating status");
    }
  };

  const getRecipientInfo = (item: FollowUpItem) => {
    if (item.type === "DS" && item.directSeller) {
      return {
        name: item.directSeller.name,
        phone: item.directSeller.phone,
        badge: item.directSeller.dsCode,
        isDS: true,
      };
    }
    return {
      name: item.customer?.name || item.targetName,
      phone: item.customer?.phone || item.targetPhone,
      badge: "Customer",
      isDS: false,
    };
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(`Hello ${name}, following up from our recent conversation regarding your direct selling updates.`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 border border-emerald-800/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Selling Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Executive Business Overview
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Real-time monitoring of your SAO/SGO team network, stock inventory, retail & DS
              sales, and scheduled WhatsApp follow-ups.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur transition border border-white/10 shadow-sm"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              {formatDate(new Date())}
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total DS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Direct Sellers</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? "..." : stats?.totalDS || 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats?.saoCount || 0} SAO</span>
              <span>•</span>
              <span className="text-teal-600 dark:text-teal-400 font-semibold">{stats?.sgoCount || 0} SGO</span>
            </div>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sales (This Month)</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {loading ? "..." : formatINR(stats?.salesThisMonth || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {stats?.customerSalesThisMonth ? `${formatINR(stats.customerSalesThisMonth)} retail` : "Active revenue"}
            </div>
          </div>
        </div>

        {/* Follow-ups Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Today</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {loading ? "..." : stats?.pendingFollowUpsToday || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-500" />
              <span>Pending action</span>
            </div>
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Follow-ups</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {loading ? "..." : stats?.overdueFollowUps || 0}
            </div>
            <div className="text-[11px] text-rose-500/90 mt-1 font-medium">
              <span>Requires immediate outreach</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {loading ? "..." : (stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.outOfStockCount ? (
                <span className="text-rose-500 font-semibold">{stats.outOfStockCount} out of stock</span>
              ) : (
                <span>At or below reorder level</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (Past 6 Months) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Revenue Performance (6 Months)</h2>
              <p className="text-xs text-slate-500">Gross sales broken down by Customer Retail and DS Distribution</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Customer
              </span>
              <span className="flex items-center gap-1.5 font-medium text-teal-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                Direct Seller
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {mounted && monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="dsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "0.75rem",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    formatter={(value: any) => [formatINR(Number(value)), ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="customer"
                    name="Customer Retail"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#customerGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ds"
                    name="DS Distribution"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#dsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading sales trend...
              </div>
            )}
          </div>
        </div>

        {/* Revenue Channel Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Sales Channel Mix</h2>
            <p className="text-xs text-slate-500">Retail customer sales vs DS downline billing</p>
          </div>

          <div className="h-52 w-full my-auto">
            {mounted && categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatINR(Number(value)), "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading distribution...
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-around text-xs">
            {categoryDistribution.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Best-Selling Products */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Top 5 Products by Revenue</h2>
            <p className="text-xs text-slate-500">High-demand items driving current business volume</p>
          </div>
          <Link
            href="/stock"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-56 w-full">
          {mounted && topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Loading top products...
            </div>
          )}
        </div>
      </div>

      {/* Action Required: Urgent Follow-ups & Critical Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-ups List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Today's Urgent Follow-ups
                </h3>
              </div>
              <Link
                href="/follow-ups"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({stats?.pendingFollowUpsToday || 0})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {todayFollowUps.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    All caught up! No pending follow-ups due today.
                  </p>
                </div>
              ) : (
                todayFollowUps.map((item) => {
                  const recipient = getRecipientInfo(item);
                  const isOverdue = new Date(item.followUpDate) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {recipient.name}
                          </p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              recipient.isDS
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {recipient.badge}
                          </span>
                          {isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.notes || (item.product ? `Regarding: ${item.product.name}` : `Follow-up on ${formatDate(item.followUpDate)}`)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openWhatsApp(recipient.phone, recipient.name)}
                          className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                          title="Send WhatsApp message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMarkFollowUpDone(item.id)}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition"
                          title="Mark Done"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Critical Low Stock Alert */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Inventory Alerts (Reorder Needed)
                </h3>
              </div>
              <Link
                href="/stock"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Stock Master</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {lowStockList.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Stock levels are healthy across all catalog products.
                  </p>
                </div>
              ) : (
                lowStockList.map((prod) => {
                  const isOut = prod.currentStock <= 0;
                  return (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {prod.name}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            {prod.sku}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Reorder threshold: <span className="font-semibold">{prod.reorderLevel} units</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                            isOut
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {isOut ? "OUT OF STOCK" : `${prod.currentStock} left`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          MRP: {formatINR(prod.mrp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Navigation */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Quick Business Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/direct-sellers"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition">
                Direct Sellers
              </p>
              <p className="text-xs text-slate-500 mt-0.5">SAO & SGO code tree</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/stock"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition">
                Stock & Excel
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Inventory & Ledger</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/sales"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition">
                Sales & Billing
              </p>
              <p className="text-xs text-slate-500 mt-0.5">MRP / DP invoices</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/follow-ups"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition flex items-center justify-between group"
          >
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition">
                WhatsApp Follow-ups
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Click-to-chat automation</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}

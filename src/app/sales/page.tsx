"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  User,
  Users,
  Eye,
  Printer,
  MessageCircle,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowDownLeft,
  Check,
} from "lucide-react";
import { formatINR, formatDateIST, getWhatsAppUrl } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { CreateOrderModal } from "@/components/sales/CreateOrderModal";
import { InvoiceModal } from "@/components/sales/InvoiceModal";
import { TakenFromDsModal } from "@/components/sales/TakenFromDsModal";

interface OrderItem {
  id: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  product: {
    name: string;
    sku: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  orderType: "CUSTOMER" | "DS" | "TAKEN_FROM_DS";
  rateType: "MRP" | "DP";
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING" | "BALANCE" | "CLOSED";
  amountPaid: number;
  isCancelled: boolean;
  closedAt?: string | null;
  notes: string | null;
  customer?: { name: string; phone: string; address: string | null } | null;
  directSeller?: { name: string; dsCode: string; phone: string } | null;
  items: OrderItem[];
}

export default function SalesPage() {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMER" | "DS" | "TAKEN_FROM_DS">("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    customerRevenue: 0,
    dsRevenue: 0,
    pendingReceivables: 0,
    takenFromDsCount: 0,
    takenFromDsBalanceCount: 0,
    takenFromDsBalanceValue: 0,
    orderCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createOrderType, setCreateOrderType] = useState<"CUSTOMER" | "DS">("CUSTOMER");
  const [isTakenFromDsOpen, setIsTakenFromDsOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        orderType: activeTab,
        paymentStatus: paymentStatusFilter,
        search: searchQuery,
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setOrders(data.items || []);
        setPagination(data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
        if (data.metrics) setMetrics(data.metrics);
      } else {
        error(data.error || "Failed to load sales");
      }
    } catch {
      error("Network error while loading sales orders");
    } finally {
      setLoading(false);
    }
  }, [activeTab, paymentStatusFilter, searchQuery, startDate, endDate, page, pageSize, error]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenCreate = (type: "CUSTOMER" | "DS") => {
    setCreateOrderType(type);
    setIsCreateOpen(true);
  };

  const handleOrderCreated = (newOrder: Order) => {
    fetchOrders();
    // Prompt invoice open for immediate print or share
    setSelectedInvoiceOrder(newOrder);
    setIsInvoiceOpen(true);
  };

  const handleToggleStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === "BALANCE" ? "CLOSED" : "BALANCE";
    setStatusUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        success(
          newStatus === "CLOSED"
            ? "Voucher marked as CLOSED (Settled)!"
            : "Voucher marked as BALANCE (Open)!"
        );
        fetchOrders();
      } else {
        error(data.error || "Failed to update status");
      }
    } catch {
      error("Network error while updating status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        success(data.message || "Order cancelled and stock restored!");
        setCancelConfirmId(null);
        fetchOrders();
      } else {
        error(data.error || "Failed to cancel order");
      }
    } catch {
      error("Network error while cancelling order");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExportExcel = () => {
    window.location.href = `/api/orders/export?orderType=${activeTab}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-emerald-500" />
            <span>Sales & Order Billing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record customer retail sales, direct seller distribution, and products taken from DS
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenCreate("CUSTOMER")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Customer Sale (MRP)</span>
          </button>

          <button
            onClick={() => handleOpenCreate("DS")}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-600/30 transition cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>DS Sale (DP)</span>
          </button>

          {/* New "Taken from DS" Button */}
          <button
            onClick={() => setIsTakenFromDsOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition cursor-pointer"
            title="Record products borrowed or received from a Direct Seller"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Taken from DS</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Export Sales Register to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Total Revenue</span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatINR(metrics.totalRevenue, false)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{metrics.orderCount} total orders</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Customer Sales</span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatINR(metrics.customerRevenue, false)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Retail sales (MRP)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">DS Distribution</span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              {formatINR(metrics.dsRevenue, false)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Team orders (DP)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {formatINR(metrics.pendingReceivables, false)}
            </span>
            <p className="text-[11px] text-amber-600/80 mt-0.5">Uncollected payments</p>
          </div>
        </div>

        {/* Taken from DS KPI Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Taken from DS</span>
            {metrics.takenFromDsBalanceCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {metrics.takenFromDsBalanceCount} Open
              </span>
            )}
          </span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {formatINR(metrics.takenFromDsBalanceValue, false)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {metrics.takenFromDsCount} vouchers ({metrics.takenFromDsBalanceCount} balance)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl max-w-xl overflow-x-auto">
        {[
          { key: "ALL", label: "All Records" },
          { key: "CUSTOMER", label: "Customer Sales" },
          { key: "DS", label: "DS Sales" },
          {
            key: "TAKEN_FROM_DS",
            label: "Taken from DS",
            badge: metrics.takenFromDsBalanceCount > 0 ? `${metrics.takenFromDsBalanceCount} Balance` : undefined,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setPage(1);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === tab.key
                ? tab.key === "TAKEN_FROM_DS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.key
                    ? "bg-amber-400 text-slate-950"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {tab.badge}
              </span>
            )}
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
            placeholder="Search order number, customer, DS code, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Payment / Status</option>
            <option value="PAID">Paid Only</option>
            <option value="BALANCE">Balance (Open) Only</option>
            <option value="CLOSED">Closed (Settled) Only</option>
            <option value="PARTIAL">Partial Only</option>
            <option value="PENDING">Pending Only</option>
          </select>

          <button
            onClick={() => fetchOrders()}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sales & Taken from DS Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading sales orders & vouchers...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              {activeTab === "TAKEN_FROM_DS"
                ? "No Products Taken from DS Yet"
                : "No Orders Recorded Yet"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === "TAKEN_FROM_DS"
                ? "Record products borrowed from direct sellers with open balance or closed settlement."
                : "Start recording sales for retail customers or direct sellers to track income and stock deduction."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenCreate("CUSTOMER")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Record Customer Sale
              </button>
              <button
                onClick={() => handleOpenCreate("DS")}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                Record DS Sale
              </button>
              <button
                onClick={() => setIsTakenFromDsOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Taken from DS</span>
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
                    <th className="py-3.5 px-5">Voucher / Order #</th>
                    <th className="py-3.5 px-4">Date of Taken / Sale</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Customer / DS</th>
                    <th className="py-3.5 px-4">Product Details & Qty</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {orders.map((o) => {
                    const isCust = o.orderType === "CUSTOMER";
                    const isTaken = o.orderType === "TAKEN_FROM_DS";

                    const recipientName = isCust
                      ? o.customer?.name
                      : `${o.directSeller?.name} (${o.directSeller?.dsCode})`;
                    const recipientPhone = isCust ? o.customer?.phone : o.directSeller?.phone;

                    return (
                      <tr
                        key={o.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                          o.isCancelled ? "opacity-50 line-through" : ""
                        }`}
                      >
                        {/* Order / Voucher # */}
                        <td
                          className={`py-3.5 px-5 font-mono font-bold text-xs ${
                            isTaken
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {o.orderNumber}
                        </td>

                        {/* Date of Taken / Sale */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          <span>{formatDateIST(o.orderDate)}</span>
                          {isTaken && o.closedAt && (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Closed: {formatDateIST(o.closedAt)}
                            </span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                              isTaken
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                : isCust
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            }`}
                          >
                            {isTaken ? "Taken from DS" : isCust ? "Customer" : "DS"}
                          </span>
                        </td>

                        {/* Recipient Name & Phone */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {recipientName}
                          </p>
                          {recipientPhone && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              +91 {recipientPhone}
                            </span>
                          )}
                        </td>

                        {/* Product Details & Qty */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {o.items?.map((it) => `${it.product?.name} × ${it.quantity}`).join(", ")}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {formatINR(o.totalAmount)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Rate: {o.rateType}
                          </span>
                        </td>

                        {/* Payment / Settlement Status */}
                        <td className="py-3.5 px-4">
                          {o.isCancelled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                                o.paymentStatus === "CLOSED" || o.paymentStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : o.paymentStatus === "BALANCE"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : o.paymentStatus === "PARTIAL"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {o.paymentStatus === "BALANCE" && <Clock className="w-2.5 h-2.5" />}
                              {o.paymentStatus === "CLOSED" && <CheckCircle2 className="w-2.5 h-2.5" />}
                              <span>{o.paymentStatus}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Status Settlement for Taken from DS */}
                            {isTaken && !o.isCancelled && (
                              o.paymentStatus === "BALANCE" ? (
                                <button
                                  onClick={() => handleToggleStatus(o.id, "BALANCE")}
                                  disabled={statusUpdatingId === o.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                                  title="Mark products taken as CLOSED (Settled)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{statusUpdatingId === o.id ? "..." : "Mark Closed"}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(o.id, "CLOSED")}
                                  disabled={statusUpdatingId === o.id}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                  title="Reopen as Balance"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reopen</span>
                                </button>
                              )
                            )}

                            {/* View Bill / Voucher */}
                            <button
                              onClick={() => {
                                setSelectedInvoiceOrder(o);
                                setIsInvoiceOpen(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                isTaken
                                  ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 hover:bg-indigo-100"
                                  : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 hover:bg-emerald-100"
                              }`}
                              title={isTaken ? "View & Print Taken from DS Voucher" : "View & Print Invoice"}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isTaken ? "Voucher" : "Bill"}</span>
                            </button>

                            {/* WhatsApp Share */}
                            {recipientPhone && (
                              <a
                                href={getWhatsAppUrl(
                                  recipientPhone,
                                  isTaken
                                    ? `Namaste ${recipientName} ji! Products taken voucher #${o.orderNumber} summary: Total value ₹${formatINR(o.totalAmount)}. Status: ${o.paymentStatus}.`
                                    : `Namaste ${recipientName} ji! Thank you for your order #${o.orderNumber} of ${formatINR(o.totalAmount)}. Status: ${o.paymentStatus}.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                                title="Share via WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}

                            {/* Cancel Order */}
                            {!o.isCancelled && (
                              <button
                                onClick={() => setCancelConfirmId(o.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Cancel Order & Adjust Stock"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
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
              {orders.map((o) => {
                const isCust = o.orderType === "CUSTOMER";
                const isTaken = o.orderType === "TAKEN_FROM_DS";

                const recipientName = isCust
                  ? o.customer?.name
                  : `${o.directSeller?.name} (${o.directSeller?.dsCode})`;
                const recipientPhone = isCust ? o.customer?.phone : o.directSeller?.phone;

                return (
                  <div key={o.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isTaken ? "text-indigo-600" : "text-emerald-600"
                            }`}
                          >
                            #{o.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isTaken
                                ? "bg-indigo-100 text-indigo-800"
                                : isCust
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {isTaken ? "Taken from DS" : isCust ? "Customer" : "DS"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatDateIST(o.orderDate)}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {recipientName}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {formatINR(o.totalAmount)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full block mt-0.5 ${
                            o.paymentStatus === "CLOSED" || o.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.paymentStatus === "BALANCE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 truncate">
                      {o.items?.map((it) => `${it.product?.name} × ${it.quantity}`).join(", ")}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        {isTaken && !o.isCancelled && o.paymentStatus === "BALANCE" && (
                          <button
                            onClick={() => handleToggleStatus(o.id, "BALANCE")}
                            disabled={statusUpdatingId === o.id}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Closed</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedInvoiceOrder(o);
                            setIsInvoiceOpen(true);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isTaken
                              ? "bg-indigo-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isTaken ? "Voucher" : "Invoice"}</span>
                        </button>
                      </div>

                      {recipientPhone && (
                        <a
                          href={getWhatsAppUrl(
                            recipientPhone,
                            `Namaste ${recipientName} ji! Order #${o.orderNumber} summary: ${formatINR(o.totalAmount)}. Status: ${o.paymentStatus}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"
                        >
                          <MessageCircle className="w-4 h-4" />
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

      {/* Cancellation & Stock Reversal Modal */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Cancel Order & Adjust Stock?
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Cancelling will adjust the inventory accordingly and write a stock reversal movement to your ledger.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCancelConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Keep Record
              </button>
              <button
                onClick={() => handleCancelOrder(cancelConfirmId)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                {isCancelling ? "Adjusting Stock..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Order Modal */}
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleOrderCreated}
        initialOrderType={createOrderType}
      />

      {/* Taken from DS Modal */}
      <TakenFromDsModal
        isOpen={isTakenFromDsOpen}
        onClose={() => setIsTakenFromDsOpen(false)}
        onSuccess={handleOrderCreated}
      />

      {/* Invoice / Voucher View Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        order={selectedInvoiceOrder}
      />
    </div>
  );
}

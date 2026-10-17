"use client";

import React from "react";
import { X, Printer, MessageCircle, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { formatINR, formatDateIST, getWhatsAppUrl } from "@/lib/utils";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
}

export function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  const isCustomer = order.orderType === "CUSTOMER";
  const recipientName = isCustomer
    ? order.customer?.name
    : `${order.directSeller?.name} (${order.directSeller?.dsCode})`;
  const recipientPhone = isCustomer ? order.customer?.phone : order.directSeller?.phone;
  const balanceDue = Math.max(0, order.totalAmount - order.amountPaid);

  const handlePrint = () => {
    window.print();
  };

  // Prepare WhatsApp receipt text
  const itemsText = order.items
    ?.map(
      (item: any, i: number) =>
        `${i + 1}. ${item.product?.name} (Qty: ${item.quantity}) - ₹${item.lineTotal}`
    )
    .join("%0A");

  const whatsAppMessage = `Namaste ${recipientName} ji! 🙏%0AHere is your invoice summary for Order #${order.orderNumber}:%0A%0A*Items:*%0A${itemsText}%0A%0A*Total Amount:* ₹${order.totalAmount}%0A*Status:* ${order.paymentStatus}%0A*Amount Paid:* ₹${order.amountPaid}%0A${balanceDue > 0 ? `*Balance Due:* ₹${balanceDue}%0A` : ""}Thank you for your business! ✨`;

  const waUrl = recipientPhone
    ? `https://wa.me/91${recipientPhone.replace(/\D/g, "").slice(-10)}?text=${whatsAppMessage}`
    : "#";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative my-8 animate-in zoom-in-95 print:p-0 print:border-none print:shadow-none print:w-full">
        {/* Modal Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Invoice #{order.orderNumber}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                order.paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {recipientPhone && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="mt-5 space-y-6 text-slate-900 dark:text-slate-100 print:text-black">
          {/* Business Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  DS
                </div>
                <h1 className="text-lg font-extrabold tracking-tight">DirectSell Pro</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Direct Selling Record & Invoicing</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Tax Invoice / Bill
              </span>
              <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {order.orderNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {formatDateIST(order.orderDate)}
              </p>
            </div>
          </div>

          {/* Billed To Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">
                Billed To:
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{recipientName}</p>
              {recipientPhone && <p className="text-slate-500 font-mono mt-0.5">+91 {recipientPhone}</p>}
              {isCustomer && order.customer?.address && (
                <p className="text-slate-500 mt-0.5">{order.customer.address}</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">
                Order Information:
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Category: <strong>{isCustomer ? "Customer Retail" : "Direct Seller Distribution"}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Rate Type: <strong>{order.rateType}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items?.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold">{item.product?.name}</p>
                      <span className="text-[10px] font-mono text-slate-400">{item.product?.sku}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(item.unitRate)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {formatINR(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Payment Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">{formatINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono font-bold">- {formatINR(order.discount)}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-600">{formatINR(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatINR(order.amountPaid)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatINR(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
            Thank you for being our valued partner. For inquiries or refills, please WhatsApp +91 {recipientPhone || "us"}.
          </div>
        </div>
      </div>
    </div>
  );
}

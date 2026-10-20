"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  ShoppingCart,
  CalendarCheck2,
  Package,
  Plus,
  Edit,
  ExternalLink,
} from "lucide-react";
import { formatDateIST, formatINR, getWhatsAppUrl } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { AddEditDSModal } from "@/components/direct-sellers/AddEditDSModal";
import { getStoredDSEdits } from "@/lib/clientStore";

export default function DirectSellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { success, error } = useToast();

  const [ds, setDs] = useState<any>(null);
  const [downlines, setDownlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"FOLLOW_UPS" | "PURCHASES" | "DOWNLINES">("FOLLOW_UPS");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/direct-sellers/${id}`);
      const data = await res.json();
      if (res.ok) {
        const edits = getStoredDSEdits();
        const mergedDs = edits[id] ? { ...data.ds, ...edits[id] } : data.ds;
        setDs(mergedDs);
        setDownlines(data.downlines || []);
      } else {
        error(data.error || "Failed to load Direct Seller");
      }
    } catch {
      error("Network error while loading Direct Seller");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const toggleFollowUpStatus = async (followUpId: string, currentStatus: string) => {
    const newStatus = currentStatus === "FOLLOWED_UP" ? "PENDING" : "FOLLOWED_UP";
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        success(newStatus === "FOLLOWED_UP" ? "Marked as followed up!" : "Marked as pending");
        fetchDetail();
      }
    } catch {
      error("Failed to update follow-up");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading Direct Seller profile...</span>
      </div>
    );
  }

  if (!ds) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Direct Seller not found or deleted.</p>
        <Link
          href="/direct-sellers"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/direct-sellers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to DS Directory</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-600/20 shrink-0">
              {ds.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {ds.name}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                    ds.category === "SAO"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                  }`}
                >
                  {ds.category} Member
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    ds.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {ds.status}
                </span>
              </div>

              <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                DS Code: {ds.dsCode}
              </p>

              <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>+91 {ds.phone}</span>
                </div>
                {ds.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ds.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined {formatDateIST(ds.joiningDate)}</span>
                </div>
              </div>

              {ds.uplineCode && (
                <p className="text-xs text-slate-500 mt-2">
                  Upline Sponsor:{" "}
                  <span className="font-mono font-bold text-emerald-600">{ds.uplineCode}</span>
                </p>
              )}

              {ds.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  {ds.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:self-start">
            <a
              href={getWhatsAppUrl(
                ds.phone,
                `Namaste ${ds.name} ji (${ds.dsCode}), checking in to see how your direct selling targets are going this week!`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/25 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Chat</span>
            </a>

            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-xl transition"
              title="Edit Profile"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("FOLLOW_UPS")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "FOLLOW_UPS"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>Follow-up History ({ds.followUps?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("PURCHASES")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "PURCHASES"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase History ({ds.orders?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("DOWNLINES")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "DOWNLINES"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Downlines ({downlines.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: Follow-ups */}
      {activeTab === "FOLLOW_UPS" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Direct Seller Follow-up Log
            </h2>
            <Link
              href="/follow-ups"
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Follow-up</span>
            </Link>
          </div>

          {ds.followUps?.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No follow-ups recorded for {ds.name} yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {ds.followUps.map((fu: any) => (
                <div
                  key={fu.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          fu.status === "FOLLOWED_UP"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {fu.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Date: {formatDateIST(fu.followUpDate)}
                      </span>
                      {fu.product && (
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                          Product: {fu.product.name}
                        </span>
                      )}
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{fu.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFollowUpStatus(fu.id, fu.status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        fu.status === "FOLLOWED_UP"
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }`}
                    >
                      {fu.status === "FOLLOWED_UP" ? "Mark Pending" : "Mark Followed Up"}
                    </button>
                    <a
                      href={getWhatsAppUrl(
                        ds.phone,
                        `Namaste ${ds.name} ji (${ds.dsCode}), checking in regarding our follow-up note: ${fu.notes || "how are things going?"}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition"
                      title="Send WhatsApp Follow-up"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Purchase History */}
      {activeTab === "PURCHASES" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Orders Placed by {ds.name}
            </h2>
            <Link
              href={`/sales?dsId=${ds.id}`}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New DS Sale</span>
            </Link>
          </div>

          {ds.orders?.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No orders have been recorded for this Direct Seller yet.
            </div>
          ) : (
            <div className="space-y-3">
              {ds.orders.map((ord: any) => (
                <div
                  key={ord.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-600">
                        #{ord.orderNumber}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateIST(ord.orderDate)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Rate: {ord.rateType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatINR(ord.totalAmount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 ${
                          ord.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Line items preview */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1">
                    {ord.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>
                          {item.product?.name} × {item.quantity}
                        </span>
                        <span className="font-mono">{formatINR(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Downlines */}
      {activeTab === "DOWNLINES" && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Team Members with Sponsor {ds.dsCode}
          </h2>

          {downlines.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No downlines registered with upline code {ds.dsCode} yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {downlines.map((dl) => (
                <Link
                  key={dl.id}
                  href={`/direct-sellers/${dl.id}`}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/50 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-600">{dl.dsCode}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                        {dl.category}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {dl.name}
                    </p>
                    {dl.city && <p className="text-xs text-slate-500">{dl.city}</p>}
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit DS Modal */}
      <AddEditDSModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={fetchDetail}
        sellerToEdit={ds}
      />
    </div>
  );
}

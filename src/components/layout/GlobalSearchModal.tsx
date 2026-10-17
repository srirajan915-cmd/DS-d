"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  User,
  Package,
  ShoppingCart,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    directSellers: any[];
    customers: any[];
    products: any[];
    orders: any[];
    totalCount: number;
  }>({
    directSellers: [],
    customers: [],
    products: [],
    orders: [],
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ directSellers: [], customers: [], products: [], orders: [], totalCount: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ directSellers: [], customers: [], products: [], orders: [], totalCount: 0 });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-5 relative animate-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Direct Sellers, products, customers, order numbers..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={onClose}
            className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="mt-3 max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <div className="w-5 h-5 mx-auto mb-2 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching across business records...</span>
            </div>
          ) : query.trim().length >= 2 && results.totalCount === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching Direct Sellers, products, or orders found for "{query}".
            </div>
          ) : null}

          {/* Direct Sellers results */}
          {results.directSellers.length > 0 && (
            <div className="py-2.5 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 block">
                Direct Sellers
              </span>
              {results.directSellers.map((ds) => (
                <div
                  key={ds.id}
                  onClick={() => handleNavigate(`/direct-sellers/${ds.id}`)}
                  className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500">
                        {ds.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {ds.dsCode} • {ds.category} • +91 {ds.phone}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>
          )}

          {/* Products results */}
          {results.products.length > 0 && (
            <div className="py-2.5 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 block">
                Products & Inventory
              </span>
              {results.products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleNavigate("/stock")}
                  className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500">
                          {p.name}
                        </p>
                        {p.category && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        SKU: {p.sku} • Stock: {p.currentStock} units • MRP: {formatINR(p.mrp)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>
          )}

          {/* Orders results */}
          {results.orders.length > 0 && (
            <div className="py-2.5 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 block">
                Sales & Invoices
              </span>
              {results.orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => handleNavigate("/sales")}
                  className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500">
                        Order #{o.orderNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {o.orderType} • {formatINR(o.totalAmount)} • {o.paymentStatus}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>
          )}

          {/* Customers results */}
          {results.customers.length > 0 && (
            <div className="py-2.5 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 block">
                Retail Customers
              </span>
              {results.customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleNavigate("/sales")}
                  className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">+91 {c.phone}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between px-1">
          <span>Search anywhere in your business</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}

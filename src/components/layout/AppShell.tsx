"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  CalendarCheck2,
  FileSpreadsheet,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Bell,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { GlobalSearchModal } from "@/components/layout/GlobalSearchModal";
import { Search } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, setTheme, theme } = useTheme();
  const { success, error } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [statsBadge, setStatsBadge] = useState<{ followUpsToday: number; lowStock: number }>({
    followUpsToday: 0,
    lowStock: 0,
  });

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check user session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Quick badge count fetch
    fetch("/api/dashboard/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) {
          setStatsBadge({
            followUpsToday: data.stats.pendingFollowUpsToday || 0,
            lowStock: data.stats.lowStockCount || 0,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        success("Logged out successfully");
        router.push("/login");
        router.refresh();
      }
    } catch {
      error("Failed to log out");
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "DS Code List",
      href: "/direct-sellers",
      icon: Users,
    },
    {
      label: "Product Stock",
      href: "/stock",
      icon: Package,
      badge: statsBadge.lowStock > 0 ? statsBadge.lowStock : undefined,
      badgeColor: "bg-amber-500",
    },
    {
      label: "Sales & Orders",
      href: "/sales",
      icon: ShoppingCart,
    },
    {
      label: "Follow-ups",
      href: "/follow-ups",
      icon: CalendarCheck2,
      badge: statsBadge.followUpsToday > 0 ? statsBadge.followUpsToday : undefined,
      badgeColor: "bg-emerald-500",
    },
    {
      label: "Reports & Backups",
      href: "/reports",
      icon: FileSpreadsheet,
    },
    {
      label: "Message Templates",
      href: "/templates",
      icon: TrendingUp,
    },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // If on login page, render children directly without app shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 h-screen z-30 shrink-0">
        {/* Brand header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold text-lg">
              DS
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DirectSell <span className="text-emerald-600 dark:text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 font-semibold">PRO</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct Selling System</p>
            </div>
          </div>
        </div>

        {/* Global Search Shortcut Trigger */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition border border-slate-200/60 dark:border-slate-700/60"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Omnisearch...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono shadow-xs text-slate-400">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item.href);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white shadow-xs ${
                      active ? "bg-white/20" : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* User profile & footer actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-semibold text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : "A"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                  {user?.role?.toLowerCase() || "Owner"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            DS
          </div>
          <span className="font-bold text-base text-slate-900 dark:text-white">DirectSell Pro</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                    DS
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">DirectSell Pro</h2>
                    <p className="text-xs text-slate-500">Menu & More</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-1">
                {navItems.map((item) => {
                  const active = isNavActive(item.href);
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                        active
                          ? "bg-emerald-600 text-white"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold text-white ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name[0].toUpperCase() : "A"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold">{user?.name || "Admin"}</p>
                  <p className="text-[10px] text-slate-500">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (PWA UX) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-1.5 px-2 flex justify-around items-center shadow-lg safe-bottom">
        {[
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "DS List", href: "/direct-sellers", icon: Users },
          { label: "Stock", href: "/stock", icon: Package, badge: statsBadge.lowStock > 0 },
          { label: "Sales", href: "/sales", icon: ShoppingCart },
          {
            label: "Follow-ups",
            href: "/follow-ups",
            icon: CalendarCheck2,
            badge: statsBadge.followUpsToday > 0,
          },
        ].map((item) => {
          const active = isNavActive(item.href);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                active
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "scale-110" : ""}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Global Omnisearch Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

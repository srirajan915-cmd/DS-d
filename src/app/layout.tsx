import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PwaRegister } from "@/components/providers/PwaRegister";

export const metadata: Metadata = {
  title: "DirectSell Pro - Private Record-Keeping & Follow-ups",
  description:
    "Mobile-first private management system for direct sellers, team follow-ups, inventory, and sales in India.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DirectSell Pro",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
        <ThemeProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
            <PwaRegister />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

# DirectSell Pro - Private Direct-Selling Business Management System

> **Production-ready, mobile-first Progressive Web Application (PWA) tailored for Indian Direct-Selling business owners.**  
> Built for managing Direct Sellers (SAO / SGO), upline/downline genealogy, stock inventory, sales orders (MRP vs DP), customer follow-ups, automated WhatsApp messaging, and comprehensive financial reports.

---

## 🌟 Key Highlights & Architecture

- **100% Private Business Database**: No third-party data tracking. Single admin owner with role-ready schema (`ADMIN`, `STAFF`).
- **India-Specific Localization**:
  - Currency: Indian Rupee (`₹`) with Indian numbering system (e.g. `₹1,50,000.00`).
  - Dates: Standard `dd-MM-yyyy` (`Asia/Kolkata` time zone).
  - WhatsApp Integration: Dynamic `wa.me` click-to-chat links with normalized `+91` phone numbers.
- **Progressive Web Application (PWA)**:
  - Installable on iOS (Safari Add to Home Screen) and Android (Chrome Install App).
  - Offline asset caching with Service Worker (`sw.js`) and Web Manifest (`manifest.json`).
  - Mobile bottom navigation bar + responsive desktop sidebar.
- **Enterprise-Grade Security**:
  - JOSE JWT authentication stored in HTTP-only, SameSite session cookies.
  - Salted password hashing with `bcryptjs`.
  - Brute-force lockout defense (5 failed login attempts triggers an automatic 15-minute account lockout).
- **Two-Way Excel Integration**:
  - Bulk import and export for Direct Sellers (`.xlsx`) with duplicate code detection.
  - Bulk import for Product Stock (`.xlsx`) with automatic stock movement ledger logging.
  - Master Multi-Sheet Workbook export across all 5 business entities.
- **Pluggable WhatsApp Messaging Architecture**:
  - `WhatsAppLinkProvider` (default: zero-cost `wa.me` click-to-chat).
  - `WhatsAppCloudApiProvider` (official Meta WhatsApp Business Cloud API).
  - `MSG91Provider` (SMS fallback for Indian mobile numbers).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + Lucide Icons + Dark/Light Theme System |
| **Database & ORM** | Prisma ORM 6.4.0 (SQLite for local dev; Supabase PostgreSQL ready) |
| **Authentication** | JOSE JWT + bcryptjs + Server-side Route Proxy Middleware |
| **Data Visualization** | Recharts (AreaChart, Donut PieChart, Horizontal BarChart) |
| **Spreadsheet Engine** | SheetJS (`xlsx`) for multi-sheet workbooks and parsing |
| **Form Validation** | React Hook Form + Zod Schema Validation |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "C:\Users\Sri rajan\.gemini\antigravity-ide\scratch\direct-sell-pwa"
npm install
```

### 3. Environment Configuration
Create or verify `.env` file in the project root:
```env
# Database URL (SQLite dev.db for local development)
DATABASE_URL="file:./dev.db"

# JWT Secret for Session Security
JWT_SECRET="directsell_pwa_jwt_secret_key_2026_super_secure"

# Default Admin Credentials for First Run
ADMIN_EMAIL="admin@directsell.com"
ADMIN_PASSWORD="admin123"

# Messaging Provider: "WHATSAPP_LINK" | "WHATSAPP_API" | "MSG91"
MESSAGING_PROVIDER="WHATSAPP_LINK"
```

### 4. Database Setup & Seeding
Push the schema to SQLite and run the comprehensive seed script:
```bash
npx prisma db push
node prisma/seed.mjs
```

The seed script initializes:
- **Admin Account**: `admin@directsell.com` / `admin123`
- **6 Direct Sellers**: SAO and SGO categories with upline/downline genealogy links.
- **6 Products**: Health supplements and wellness catalog with MRP, DP, and reorder levels.
- **3 Retail Customers**: With phone numbers and addresses.
- **4 WhatsApp Templates**: Dynamic templates with `{name}`, `{product}`, `{date}`, `{amount}` tags.
- **Sample Follow-ups & Sales Orders**: Ready for immediate testing.

### 5. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 6. Run Automated Test Suite
Verify that all 18 business logic and database invariant tests pass:
```bash
npm test
```

---

## 📱 Modules Walkthrough

### 1. Executive Dashboard (`/dashboard`)
- **Key Metrics**: Direct Sellers count (SAO/SGO split), Today's & Overdue Follow-ups, Low Stock Warnings, and Monthly Revenue.
- **Charts**:
  - **Revenue Performance**: 6-month sales trend with Customer Retail vs DS Wholesale area graphs.
  - **Channel Mix**: Donut chart tracking retail vs downline distribution share.
  - **Top 5 Products**: Horizontal bar chart ranked by sales revenue.
- **Quick Action Cards**: 1-click WhatsApp buttons and instant "Mark Done" for today's follow-ups.

### 2. Direct Seller Code List (`/direct-sellers`)
- **List & Search**: Real-time filtering by name, DS code, phone, or category (`SAO` / `SGO`).
- **Genealogy & Detail Page (`/direct-sellers/[id]`)**: Shows upline leader, list of direct downline sellers, total lifetime purchase volume, and purchase history.
- **Excel Bulk Import**: Upload `.xlsx` spreadsheets with duplicate code detection and sample template download.

### 3. Product Stock & Ledger (`/stock`)
- **Catalog Management**: SKU, Name, MRP, DP, Stock on hand, and Reorder thresholds.
- **Profit Margins**: Automatic calculation of Absolute Margin (₹) and Margin Percentage (%).
- **Low Stock Highlights**: Visual badges when `currentStock <= reorderLevel`.
- **Audit Ledger**: Complete audit trail of stock adjustments (`IN`, `OUT`, `SALE`, `CANCEL_REVERSAL`, `ADJUSTMENT`).
- **Bulk Excel Import**: Update warehouse quantities via Excel uploads.

### 4. Sales & Billing Engine (`/sales`)
- **Dual Order Types**:
  - **Customer Orders**: Billed at Maximum Retail Price (MRP).
  - **Direct Seller Orders**: Billed at Distributor Price (DP).
- **Stock Automation**: Real-time deduction of warehouse stock on order creation, with automatic stock restoration if an order is cancelled.
- **GST / Payment Handling**: Tracks `PAID`, `PARTIAL`, and `PENDING` payment statuses.
- **Printable Invoices & WhatsApp Share**: Generate clean printable receipts and 1-click WhatsApp formatted bill summaries.

### 5. Follow-ups & Messaging Hub (`/follow-ups` & `/templates`)
- **Daily Follow-up Board**: Categorized tabs for **Today**, **Upcoming**, **Overdue**, and **Completed**.
- **1-Click WhatsApp Trigger**: Automatically generates `wa.me` links with customizable template text and dynamic tag replacement (`{name}`, `{product}`, `{date}`).
- **Auto-Rescheduling**: Completing a follow-up automatically prompts to schedule the next touchpoint.
- **Message Log**: Tracks history of all outbound communications.

### 6. Omnisearch Hub (`Ctrl + K`)
- Press **`Ctrl + K`** (or click Omnisearch in the sidebar) from any screen to search across Direct Sellers, Products, Orders, and Customers with immediate keyboard navigation.

### 7. Reports & Master Backup (`/reports`)
- **1-Click Master Excel Export**: Downloads a multi-sheet `.xlsx` workbook containing:
  - Tab 1: *Direct Sellers*
  - Tab 2: *Inventory*
  - Tab 3: *Orders*
  - Tab 4: *Customers*
  - Tab 5: *Follow-ups*
- **1-Click JSON Backup**: Raw JSON export of all database tables for off-site backup.
- **Financial Ledger**: Lifetime gross sales, estimated gross margins, and outstanding receivables.
- **DS Team Leaderboard**: Downline sellers ranked by order volume and downline size.

---

## ☁️ Supabase PostgreSQL Deployment Guide

To deploy DirectSell Pro to production with Supabase PostgreSQL:

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Under **Project Settings -> Database**, copy the **Transaction Connection Pooler URL** (port `6543`) or Direct Connection URL (port `5432`).

2. **Update Environment Variables**:
   In your production deployment (e.g. Vercel, Railway, Render, or VPS):
   ```env
   DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   JWT_SECRET="generate-a-strong-32-byte-hex-string-for-prod"
   ADMIN_EMAIL="owner@yourdomain.com"
   ADMIN_PASSWORD="YourStrongOwnerPassword123!"
   ```

3. **Update Prisma Schema**:
   In `prisma/schema.prisma`, update the datasource provider:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```

4. **Deploy Schema & Seed**:
   ```bash
   npx prisma db push
   node prisma/seed.mjs
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📲 How to Install as a PWA on Mobile

1. **Android (Chrome)**:
   - Open `http://your-app-domain.com` in Google Chrome.
   - Tap the three dots menu (⋮) -> Tap **"Add to Home screen"** or **"Install app"**.
   - DirectSell Pro will launch in full-screen standalone mode with native app performance.

2. **iOS (Safari)**:
   - Open `http://your-app-domain.com` in Apple Safari.
   - Tap the Share button (square with arrow pointing up).
   - Scroll down and tap **"Add to Home Screen"**.
   - DirectSell Pro icon will appear on your iPhone/iPad home screen.

---

## 🔒 Backup & Disaster Recovery Runbook

1. **Weekly Operational Backup**:
   - Go to `/reports` in the app.
   - Click **"Export Master Excel (5 Sheets)"** to save your formatted spreadsheets.
2. **Cold Storage JSON Backup**:
   - Click **"Full JSON Backup"** to download the complete raw database snapshot.
   - Store this file in a secure encrypted folder (e.g. Google Drive / encrypted local drive).

---

## 🛡️ License
Private and confidential. Developed specifically for the business owner.

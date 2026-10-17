"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ArrowRight,
  RefreshCw,
  Plus,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/providers/ToastProvider";

interface ImportStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedStockRow {
  sku: string;
  name: string;
  mrp: number;
  dp: number;
  quantity: number;
  reorderLevel: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface ImportError {
  row: number;
  sku?: string;
  error: string;
}

export function ImportStockModal({ isOpen, onClose, onSuccess }: ImportStockModalProps) {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStockRow[]>([]);
  const [mode, setMode] = useState<"ADD" | "SET">("ADD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    updatedCount: number;
    insertedCount: number;
    errorCount: number;
    errors: ImportError[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

        const mapped: ParsedStockRow[] = data.map((item) => {
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(item).find(
                (col) => col.trim().toLowerCase() === k.toLowerCase()
              );
              if (matchedKey && item[matchedKey] !== undefined) {
                return String(item[matchedKey]).trim();
              }
            }
            return "";
          };

          return {
            sku: getVal("SKU", "Item Code", "Product Code", "Code"),
            name: getVal("Product Name", "Name", "Item Name"),
            mrp: parseFloat(getVal("MRP", "Max Retail Price")) || 0,
            dp: parseFloat(getVal("DP", "Distributor Price", "Cost")) || 0,
            quantity: parseInt(getVal("Quantity", "Stock", "Qty"), 10) || 0,
            reorderLevel: parseInt(getVal("Reorder Level", "Min Stock"), 10) || 5,
            batchNumber: getVal("Batch Number", "Batch", "Batch No"),
            expiryDate: getVal("Expiry Date", "Expiry", "Exp Date"),
          };
        });

        setParsedRows(mapped);
      } catch (err) {
        console.error("Excel parse error:", err);
        error("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv");
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/stock/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, mode }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Stock upload failed");
        setIsProcessing(false);
        return;
      }

      setImportSummary({
        updatedCount: data.updatedCount,
        insertedCount: data.insertedCount,
        errorCount: data.errorCount,
        errors: data.errors || [],
      });

      success(
        `Stock processed! Updated ${data.updatedCount} items, added ${data.insertedCount} new products.`
      );
      onSuccess();
    } catch {
      error("Network error during stock upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Bulk Upload Stock & Products
              </h2>
              <p className="text-xs text-slate-500">
                Update existing quantities and add new products from spreadsheet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template banner */}
        <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Download official stock spreadsheet template</span>
          </div>
          <a
            href="/api/stock/template"
            className="px-3 py-1.5 bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition"
            download
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </a>
        </div>

        {/* Upload Mode Selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            How should existing product stock be updated?
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("ADD")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === "ADD"
                  ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Add to Current Stock (+Shipment)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("SET")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === "SET"
                  ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Replace Current Stock (=Audit)</span>
            </button>
          </div>
        </div>

        {/* Dropzone */}
        {!file && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Click to browse or drop your inventory Excel/CSV
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports SKU, Product Name, MRP, DP, Quantity, Batch, Expiry
            </p>
          </div>
        )}

        {/* Preview */}
        {file && !importSummary && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">{file.name} ({parsedRows.length} rows)</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Change
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">MRP / DP</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono font-bold text-emerald-600">{r.sku}</td>
                      <td className="p-2.5 font-medium">{r.name}</td>
                      <td className="p-2.5 font-mono">₹{r.mrp} / ₹{r.dp}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-600">+{r.quantity}</td>
                      <td className="p-2.5 text-slate-500">{r.batchNumber || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Process Stock Upload</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {importSummary && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Stock Upload Summary
              </h3>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-base font-bold text-emerald-600">{importSummary.updatedCount}</span>
                  <p className="text-[10px] text-slate-500">Stock Updated</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                  <span className="text-base font-bold text-blue-600">{importSummary.insertedCount}</span>
                  <p className="text-[10px] text-slate-500">New Items Added</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                  <span className="text-base font-bold text-rose-600">{importSummary.errorCount}</span>
                  <p className="text-[10px] text-slate-500">Errors</p>
                </div>
              </div>
            </div>

            {importSummary.errors.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-1">
                {importSummary.errors.map((err, i) => (
                  <div key={i} className="text-rose-700 dark:text-rose-300">
                    Row {err.row}: {err.sku ? `[${err.sku}] ` : ""}{err.error}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

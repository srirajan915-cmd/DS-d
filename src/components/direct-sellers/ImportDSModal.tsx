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
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/providers/ToastProvider";

interface ImportDSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  dsCode: string;
  name: string;
  phone: string;
  category: string;
  city?: string;
  address?: string;
  uplineCode?: string;
  status?: string;
  notes?: string;
}

interface ImportError {
  row: number;
  dsCode?: string;
  error: string;
}

export function ImportDSModal({ isOpen, onClose, onSuccess }: ImportDSModalProps) {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    errorCount: number;
    errors: ImportError[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

        const mapped: ParsedRow[] = data.map((item) => {
          // Normalize column headers
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
            dsCode: getVal("DS Code", "dsCode", "Code", "ID"),
            name: getVal("Name", "Full Name", "Seller Name"),
            phone: getVal("Phone", "Phone Number", "Mobile", "Contact"),
            category: getVal("Category", "Type") || "SAO",
            city: getVal("City", "Location"),
            address: getVal("Address"),
            uplineCode: getVal("Upline Code", "Upline", "Sponsor"),
            status: getVal("Status") || "ACTIVE",
            notes: getVal("Notes", "Remarks"),
          };
        });

        setParsedRows(mapped);
      } catch (err) {
        console.error("Excel parse error:", err);
        error("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv");
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/direct-sellers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Import failed.");
        setIsProcessing(false);
        return;
      }

      setImportSummary({
        successCount: data.successCount,
        errorCount: data.errorCount,
        errors: data.errors || [],
      });

      if (data.successCount > 0) {
        success(`Successfully imported ${data.successCount} Direct Sellers!`);
        onSuccess();
      }
    } catch {
      error("Network error during import.");
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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Bulk Import Direct Sellers
              </h2>
              <p className="text-xs text-slate-500">
                Upload your Excel (.xlsx, .xls) or CSV spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template download banner */}
        <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Need the official column format?</span>
          </div>
          <a
            href="/api/direct-sellers/template"
            className="px-3 py-1.5 bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-50 dark:hover:bg-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition"
            download
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </a>
        </div>

        {/* Upload Dropzone */}
        {!file && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Click to browse or drag and drop your spreadsheet
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and standard CSV
            </p>
          </div>
        )}

        {/* Preview of Parsed Rows */}
        {file && !importSummary && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {parsedRows.length} total rows identified
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Change file
              </button>
            </div>

            {/* Quick preview table (first 4 rows) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-2.5">DS Code</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">City</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono font-bold text-emerald-600">{row.dsCode || "-"}</td>
                      <td className="p-2.5 font-medium">{row.name || "-"}</td>
                      <td className="p-2.5">{row.phone || "-"}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {row.category || "SAO"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{row.city || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isProcessing || parsedRows.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Import {parsedRows.length} Records</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Import Results Summary Report */}
        {importSummary && (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Import Report Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {importSummary.successCount}
                    </span>
                    <p className="text-[11px] text-slate-500">Successfully Imported</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {importSummary.errorCount}
                    </span>
                    <p className="text-[11px] text-slate-500">Skipped (Errors/Duplicates)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Report List */}
            {importSummary.errors.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <FileWarning className="w-4 h-4" />
                  <span>Skipped Row Details:</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-1">
                  {importSummary.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                      <span className="font-mono font-bold shrink-0">Row {err.row}:</span>
                      {err.dsCode && <span className="font-mono font-semibold">[{err.dsCode}]</span>}
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition"
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

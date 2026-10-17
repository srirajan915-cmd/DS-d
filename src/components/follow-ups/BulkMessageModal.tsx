"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Send,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Copy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { interpolateTemplate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
}

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFollowUps: any[];
  onMessagesLogged: () => void;
}

export function BulkMessageModal({
  isOpen,
  onClose,
  selectedFollowUps,
  onMessagesLogged,
}: BulkMessageModalProps) {
  const { success, error } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);

  const [generatedResults, setGeneratedResults] = useState<any[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.templates) {
          setTemplates(data.templates);
          if (data.templates.length > 0) {
            setSelectedTemplateId(data.templates[0].id);
            setMessageText(data.templates[0].content);
          }
        }
      });

    setGeneratedResults(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) setMessageText(tpl.content);
  };

  // Preview for first recipient
  const firstRecipient = selectedFollowUps[0];
  const firstIsCust = firstRecipient?.personType === "CUSTOMER";
  const previewName = firstIsCust
    ? firstRecipient?.customer?.name
    : firstRecipient?.directSeller?.name || "Rajesh";
  const previewProduct = firstRecipient?.product?.name || "Aloe Vera Health Juice 1L";
  const previewDsCode = firstIsCust ? "" : firstRecipient?.directSeller?.dsCode || "SAO1001";

  const livePreview = interpolateTemplate(messageText, {
    name: previewName,
    product: previewProduct,
    ds_code: previewDsCode,
    date: new Date().toLocaleDateString("en-IN"),
  });

  const handleProcessMessages = async () => {
    if (!messageText.trim()) {
      error("Message text cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      const followUpIds = selectedFollowUps.map((f) => f.id);
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpIds,
          templateId: selectedTemplateId || undefined,
          customText: messageText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to generate messages.");
        setLoading(false);
        return;
      }

      setGeneratedResults(data.messages || []);
      success(`Logged ${data.processedCount} messages and generated WhatsApp links!`);
      onMessagesLogged();
    } catch {
      error("Network error while generating messages.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Send WhatsApp Follow-up Message
              </h2>
              <p className="text-xs text-slate-500">
                To {selectedFollowUps.length} selected recipient(s)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!generatedResults ? (
          <div className="mt-5 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Choose Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Content (Edit as needed)
                </label>
                <span className="text-[10px] text-slate-400">
                  Placeholders: <code className="text-emerald-500">{"{name}"}</code>, <code className="text-emerald-500">{"{product}"}</code>, <code className="text-emerald-500">{"{date}"}</code>, <code className="text-emerald-500">{"{ds_code}"}</code>
                </span>
              </div>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Live Preview Card */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Live Preview (Example for {previewName}):
              </span>
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-xs">
                {livePreview}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessMessages}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? "Preparing Links..." : `Generate WhatsApp Links (${selectedFollowUps.length})`}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Results View: Clickable WhatsApp Buttons */
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                All {generatedResults.length} messages have been recorded in your Message Log. Click
                each recipient below to launch WhatsApp with their pre-filled message!
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-800">
              {generatedResults.map((res, i) => (
                <div key={i} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{res.recipientName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">+91 {res.recipientPhone}</p>
                  </div>

                  <a
                    href={res.whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition"
              >
                Finished
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { api } from "../api/client";
import { EmailDetail } from "../types";

interface Props {
  emailId: string | null;
  onClose: () => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: "bg-[#ffe228]", text: "text-[#130e30]", dot: "bg-[#130e30]" },
  QUEUED: { bg: "bg-white", text: "text-deep-ink", dot: "bg-[#59e25d]" },
  PROCESSING: { bg: "bg-[#130e30]", text: "text-white", dot: "bg-[#ffe228]" },
  SENT: { bg: "bg-white", text: "text-deep-ink", dot: "bg-[#59e25d]" },
  FAILED: { bg: "bg-[#130e30]", text: "text-[#e261e5]", dot: "bg-[#e261e5]" },
};

export default function EmailDetailModal({ emailId, onClose }: Props) {
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!emailId) return;
    setLoading(true);
    api
      .get<EmailDetail>(`/api/emails/${emailId}`)
      .then((res) => setDetail(res.data))
      .catch((err) => console.error("Error fetching email detail:", err))
      .finally(() => setLoading(false));
  }, [emailId]);

  if (!emailId) return null;

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const badge = detail ? (STATUS_BADGES[detail.status.toUpperCase()] ?? STATUS_BADGES.QUEUED) : STATUS_BADGES.QUEUED;

  return (
    <div className="fixed inset-0 bg-[#130e30]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-meadow border border-[#130e30]/15 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_20px_50px_rgba(19,14,48,0.2)] !rounded-[36px] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#130e30]/10 bg-[#eff2e5] shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Sendora"
              className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-[#130e30]/10 shrink-0"
            />
            <div>
              <div className="small-caps-label text-slate mb-0.5">Email Job Details</div>
              <h2 className="text-xl font-serif font-bold text-deep-ink">
                {loading ? "Loading Job..." : detail?.subject || "Email Inspector"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-pill bg-white/70 hover:bg-[#130e30] hover:text-white transition-colors flex items-center justify-center text-slate border border-[#130e30]/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#eff2e5] border-t-[#130e30] rounded-pill animate-spin" />
              <div className="text-xs text-slate mt-3 font-medium">Fetching delivery metadata...</div>
            </div>
          ) : detail ? (
            <>
              {/* Status Banner */}
              <div className="bg-white rounded-[24px] p-5 border border-[#130e30]/10 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="small-caps-label text-slate mb-1">Delivery Status</div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-pill shadow-xs border border-[#130e30]/10 ${badge.bg} ${badge.text}`}
                  >
                    <span className={`w-2 h-2 rounded-pill ${badge.dot} ${detail.status === "PROCESSING" ? "animate-ping" : ""}`} />
                    {detail.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="small-caps-label text-slate mb-1">
                    {detail.sentAt ? "Delivered At" : "Scheduled For"}
                  </div>
                  <div className="text-xs font-mono font-medium text-deep-ink">
                    {detail.sentAt
                      ? new Date(detail.sentAt).toLocaleString()
                      : new Date(detail.scheduledAt).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => copyText(detail.id)}
                  className="btn-meadow-pill !py-1.5 !px-3.5 !text-xs border border-[#130e30]/10 cursor-pointer"
                  title="Copy Job UUID"
                >
                  {copied ? "✓ Copied UUID" : "📋 Copy ID"}
                </button>
              </div>

              {/* Recipient & Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[24px] p-4 border border-[#130e30]/10">
                  <div className="small-caps-label text-slate mb-1">To Recipient</div>
                  <div className="text-sm font-semibold text-deep-ink select-all break-all">
                    {detail.recipient}
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-4 border border-[#130e30]/10">
                  <div className="small-caps-label text-slate mb-1">From Sender / Channel</div>
                  <div className="text-sm font-medium text-deep-ink truncate">
                    {detail.sender?.email || "Ethereal Test Mailbox"}
                  </div>
                </div>
              </div>

              {/* Error Message if Failed */}
              {detail.errorMessage && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-[20px] text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wider text-[10px]">Error Report</div>
                  <div>{detail.errorMessage}</div>
                </div>
              )}

              {/* Email Content Body Box */}
              <div className="space-y-2">
                <div className="small-caps-label text-slate">Email Message Body</div>
                <div className="bg-white rounded-[28px] p-6 border border-[#130e30]/10 text-sm text-deep-ink font-sans leading-relaxed whitespace-pre-wrap shadow-inner min-h-[120px]">
                  {detail.body}
                </div>
              </div>

              {/* Rate Limit & Timing Specs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/60 rounded-pill py-2.5 px-3 border border-[#130e30]/5 text-xs text-slate">
                  <span className="font-semibold text-deep-ink">{detail.delaySeconds}s</span> Delay
                </div>
                <div className="bg-white/60 rounded-pill py-2.5 px-3 border border-[#130e30]/5 text-xs text-slate">
                  <span className="font-semibold text-deep-ink">{detail.hourlyLimit}/hr</span> Limit
                </div>
                <div className="bg-white/60 rounded-pill py-2.5 px-3 border border-[#130e30]/5 text-xs text-slate">
                  BullMQ Queue
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate text-sm">
              Email job details could not be found.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-8 py-4 border-t border-[#130e30]/10 bg-[#eff2e5] shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary-dark !py-2.5 !px-6 text-xs font-semibold cursor-pointer rounded-pill"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

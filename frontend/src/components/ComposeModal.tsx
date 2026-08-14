import { useState, useRef } from "react";
import { api } from "../api/client";

interface Props {
  onClose: () => void;
  onScheduled: (count: number) => void;
}

function extractEmailsFromText(text: string): string[] {
  // Matches any valid email address format in CSV, TXT, comma-separated, or multi-line files
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = text.match(emailRegex) || [];
  const unique = new Set<string>();
  for (const m of matches) {
    const clean = m.trim().toLowerCase();
    if (clean) unique.add(clean);
  }
  return Array.from(unique);
}

export default function ComposeModal({ onClose, onScheduled }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    try {
      const text = await file.text();
      const extracted = extractEmailsFromText(text);
      setRecipients(extracted);
      if (extracted.length === 0) {
        setError(`No valid email addresses found in "${file.name}". Please ensure it contains at least one valid email.`);
      }
    } catch {
      setError("Could not read file. Please upload a standard .csv or .txt file.");
    }
  }

  function downloadSampleCsv() {
    const csvContent = "data:text/csv;charset=utf-8,email,name,company\nsarah.connor@example.com,Sarah Connor,Cyberdyne\njohn.wick@example.com,John Wick,Continental\ntony.stark@example.com,Tony Stark,Stark Industries\nbruce.wayne@example.com,Bruce Wayne,Wayne Enterprises\nclark.kent@example.com,Clark Kent,Daily Planet\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample-recipients.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSubmit() {
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    if (recipients.length === 0) {
      setError("Upload a CSV/TXT file with at least one valid recipient email.");
      return;
    }
    if (!startTime) {
      setError("Please select a scheduled start time.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/emails/schedule", {
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delaySeconds,
        hourlyLimit,
      });
      onScheduled(recipients.length);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.error
          ? JSON.stringify(err.response.data.error)
          : "Failed to schedule emails."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-[#130e30]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-meadow border border-[#130e30]/15 w-full max-w-xl max-h-[92vh] flex flex-col shadow-[0_20px_50px_rgba(19,14,48,0.2)] !rounded-[36px] overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#130e30]/10 bg-[#eff2e5] shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Sendora"
              className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-[#130e30]/10 shrink-0"
            />
            <div>
              <div className="small-caps-label text-slate mb-0.5">Campaign Composer</div>
              <h2 className="text-xl font-serif font-bold text-deep-ink">
                Compose New Email
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

        {/* Scrollable Form Body */}
        <div className="p-8 overflow-y-auto space-y-5 flex-1">
          <div>
            <label className="small-caps-label text-deep-ink block mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekly Product Update & Outreach..."
              className="w-full input-ditto text-sm bg-white rounded-pill"
            />
          </div>

          <div>
            <label className="small-caps-label text-deep-ink block mb-1.5">
              Email Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content or campaign message here..."
              rows={4}
              className="w-full bg-white border border-[#130e30] rounded-[28px] p-4 text-sm text-deep-ink outline-none focus:ring-2 focus:ring-[#ffe228] transition-all placeholder:text-slate"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="small-caps-label text-deep-ink">
                Recipient List (CSV / TXT)
              </label>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-[11px] font-semibold text-slate hover:text-deep-ink hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                📥 Download sample CSV
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#130e30]/20 bg-white/60 hover:bg-white rounded-[28px] p-6 text-center cursor-pointer hover:border-[#130e30] transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {fileName ? (
                <div className="flex flex-col items-center">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#eff2e5] border border-[#130e30]/20 text-deep-ink font-semibold rounded-pill text-xs">
                    <span className="w-2 h-2 rounded-pill bg-[#59e25d]" />
                    {fileName}
                  </span>
                  <div className="text-xs mt-2 font-medium">
                    {recipients.length > 0 ? (
                      <span className="text-emerald-700 font-semibold">
                        ✓ {recipients.length} valid email(s) detected
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">
                        0 emails detected — please check file content
                      </span>
                    )}
                  </div>

                  {recipients.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-h-20 overflow-y-auto">
                      {recipients.slice(0, 4).map((em, i) => (
                        <span key={i} className="px-2.5 py-0.5 bg-white border border-[#130e30]/10 rounded-pill text-[10px] text-slate font-mono">
                          {em}
                        </span>
                      ))}
                      {recipients.length > 4 && (
                        <span className="px-2.5 py-0.5 bg-[#130e30] text-[#ffe228] rounded-pill text-[10px] font-bold">
                          +{recipients.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate space-y-1">
                  <div className="text-xl mb-1">📁</div>
                  <div className="font-medium text-deep-ink">
                    Drag &amp; drop your file here or click to browse
                  </div>
                  <div>Supports CSV or TXT with email addresses (comma, line, or space separated)</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="small-caps-label !text-[10px] text-deep-ink block mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-[#130e30] rounded-pill px-4 py-2.5 text-xs text-deep-ink focus:outline-none focus:ring-2 focus:ring-[#ffe228]"
              />
            </div>
            <div>
              <label className="small-caps-label !text-[10px] text-deep-ink block mb-1">
                Delay (seconds)
              </label>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full bg-white border border-[#130e30] rounded-pill px-4 py-2.5 text-xs text-deep-ink focus:outline-none focus:ring-2 focus:ring-[#ffe228]"
              />
            </div>
            <div>
              <label className="small-caps-label !text-[10px] text-deep-ink block mb-1">
                Hourly Limit
              </label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-white border border-[#130e30] rounded-pill px-4 py-2.5 text-xs text-deep-ink focus:outline-none focus:ring-2 focus:ring-[#ffe228]"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs rounded-pill text-center font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Fixed Footer with Actions */}
        <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-[#130e30]/10 bg-[#eff2e5] shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary-dark !py-2.5 !px-5 text-xs font-semibold cursor-pointer rounded-pill"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary-yellow !py-2.5 !px-6 text-xs font-semibold disabled:opacity-50 cursor-pointer rounded-pill shadow-sm"
          >
            {submitting ? "Scheduling…" : "Schedule Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

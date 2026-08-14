import { useState, useMemo } from "react";
import { ScheduledEmailRow } from "../types";
import { EmptyState, Loader } from "./EmptyState";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot?: string }> = {
  SCHEDULED: { bg: "bg-[#ffe228]", text: "text-[#130e30]", dot: "bg-[#130e30]" },
  QUEUED: { bg: "bg-white", text: "text-deep-ink", dot: "bg-[#59e25d]" },
  PROCESSING: { bg: "bg-[#130e30]", text: "text-white", dot: "bg-[#ffe228]" },
};

export default function ScheduledTable({
  rows,
  loading,
  onViewAll,
  onSelectEmail,
}: {
  rows: ScheduledEmailRow[];
  loading: boolean;
  onViewAll?: () => void;
  onSelectEmail?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        search.trim() === "" ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.subject.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filterStatus === "ALL" || r.status.toUpperCase() === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, filterStatus]);

  return (
    <div className="card-meadow border border-[#130e30]/10 !rounded-[32px] overflow-hidden flex flex-col justify-between shadow-[0_4px_24px_rgba(19,14,48,0.04)]">
      <div>
        {/* Table Top Bar */}
        <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#130e30]/10 bg-[#eff2e5]">
          <div>
            <div className="small-caps-label text-slate mb-0.5">Upcoming Queue</div>
            <h3 className="font-serif font-bold text-xl text-deep-ink">Scheduled Emails</h3>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-[#130e30]/15 rounded-full px-4 py-2 text-xs text-deep-ink outline-none focus:ring-2 focus:ring-[#ffe228] w-52 md:w-64 placeholder:text-slate transition-all shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate text-xs hover:text-deep-ink"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center bg-white/80 p-1 rounded-full border border-[#130e30]/10 text-xs shadow-xs">
              {["ALL", "SCHEDULED", "QUEUED", "PROCESSING"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    filterStatus === s
                      ? "bg-[#130e30] text-white shadow-xs"
                      : "text-slate hover:text-deep-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <span className="small-caps-label !text-[10px] bg-white/90 px-4 py-1.5 rounded-full border border-[#130e30]/10 font-bold shadow-xs">
              {filteredRows.length} {filteredRows.length === 1 ? "Job" : "Jobs"}
            </span>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon="◷"
            title={search || filterStatus !== "ALL" ? "No matching scheduled emails" : "No emails currently scheduled"}
            subtitle={
              search || filterStatus !== "ALL"
                ? "Try adjusting your search query or status filter."
                : "Compose an email and set a start time to see queued jobs here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#130e30]/5 bg-white/40">
                  <th className="px-6 py-3.5 text-left small-caps-label text-slate">Recipient</th>
                  <th className="px-6 py-3.5 text-left small-caps-label text-slate">Subject</th>
                  <th className="px-6 py-3.5 text-left small-caps-label text-slate">Scheduled For</th>
                  <th className="px-6 py-3.5 text-left small-caps-label text-slate">Status</th>
                  <th className="px-6 py-3.5 text-right small-caps-label text-slate">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#130e30]/5 bg-white/20">
                {filteredRows.map((r) => {
                  const statusStyle = STATUS_STYLES[r.status] ?? {
                    bg: "bg-white",
                    text: "text-slate",
                    dot: "bg-slate",
                  };
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectEmail?.(r.id)}
                      className="hover:bg-white/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5 font-medium text-deep-ink font-sans flex items-center gap-2">
                        <span>{r.email}</span>
                      </td>
                      <td className="px-6 py-3.5 text-deep-ink/80 max-w-[220px] truncate font-medium">
                        {r.subject}
                      </td>
                      <td className="px-6 py-3.5 text-slate text-xs font-mono">
                        {new Date(r.scheduledTime).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1 rounded-full shadow-xs border border-[#130e30]/10 ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.dot && (
                            <span
                              className={`w-2 h-2 rounded-full ${statusStyle.dot} ${
                                r.status === "PROCESSING" ? "animate-ping" : ""
                              }`}
                            />
                          )}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="text-xs font-medium text-slate group-hover:text-deep-ink group-hover:underline">
                          View details →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {onViewAll && rows.length > 0 && (
        <div className="p-3.5 px-8 bg-white/40 border-t border-[#130e30]/10 text-right">
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-deep-ink hover:text-[#130e30] inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            View all scheduled emails →
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import EmailOverviewChart, {
  OverviewPoint,
} from "../components/EmailOverviewChart";
import ScheduledTable from "../components/ScheduledTable";
import SentTable from "../components/SentTable";
import ComposeModal from "../components/ComposeModal";
import EmailDetailModal from "../components/EmailDetailModal";
import Toast from "../components/Toast";
import { api } from "../api/client";
import { ScheduledEmailRow, SentEmailRow, StatsResponse } from "../types";

type Tab = "dashboard" | "scheduled" | "sent";

function buildOverview(
  scheduled: ScheduledEmailRow[],
  sent: SentEmailRow[]
): OverviewPoint[] {
  const byDay = new Map<string, { scheduled: number; sent: number }>();
  const dayKey = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  for (const row of scheduled) {
    const key = dayKey(row.scheduledTime);
    const entry = byDay.get(key) ?? { scheduled: 0, sent: 0 };
    entry.scheduled += 1;
    byDay.set(key, entry);
  }
  for (const row of sent) {
    if (!row.sentTime) continue;
    const key = dayKey(row.sentTime);
    const entry = byDay.get(key) ?? { scheduled: 0, sent: 0 };
    entry.sent += 1;
    byDay.set(key, entry);
  }

  return Array.from(byDay.entries())
    .map(([day, v]) => ({ day, ...v }))
    .slice(-7);
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error" | "info">("success");

  const [stats, setStats] = useState<StatsResponse>({
    scheduled: 0,
    sent: 0,
    failed: 0,
  });
  const [scheduledRows, setScheduledRows] = useState<ScheduledEmailRow[]>([]);
  const [sentRows, setSentRows] = useState<SentEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = useCallback((msg: string, tone: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const loadAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, scheduledRes, sentRes] = await Promise.all([
        api.get<StatsResponse>("/api/emails/stats"),
        api.get<ScheduledEmailRow[]>("/api/emails/scheduled"),
        api.get<SentEmailRow[]>("/api/emails/sent"),
      ]);
      setStats(statsRes.data);
      setScheduledRows(scheduledRes.data);
      setSentRows(sentRes.data);
      if (isManual) {
        showToast("Live data refreshed successfully", "info");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => loadAll(), 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const titles: Record<Tab, { title: string; eyebrow: string }> = {
    dashboard: {
      title: "Dashboard",
      eyebrow: "Overview",
    },
    scheduled: {
      title: "Scheduled Emails",
      eyebrow: "Queue",
    },
    sent: {
      title: "Sent Emails",
      eyebrow: "Delivery History",
    },
  };

  function handleScheduledSuccess(count: number) {
    loadAll();
    showToast(`Campaign scheduled successfully for ${count} recipient(s)!`);
  }

  return (
    <div className="flex min-h-screen bg-canvas text-deep-ink font-sans">
      <Sidebar active={tab} onChange={setTab} onCompose={() => setComposeOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto">
        <Header
          title={titles[tab].title}
          eyebrow={titles[tab].eyebrow}
          onRefresh={() => loadAll(true)}
          onCompose={() => setComposeOpen(true)}
          isRefreshing={refreshing}
        />

        {tab === "dashboard" && (
          <div className="space-y-8">
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon="◷"
                label="Scheduled Outreach"
                value={stats.scheduled}
                tone="brand"
              />
              <StatCard
                icon="↗"
                label="Delivered Successfully"
                value={stats.sent}
                tone="green"
              />
              <StatCard
                icon="✕"
                label="Failed Attempts"
                value={stats.failed}
                tone="red"
              />
            </div>

            {/* Email Overview Performance Chart */}
            <EmailOverviewChart data={buildOverview(scheduledRows, sentRows)} />

            {/* Recent Tables 2-Column Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ScheduledTable
                rows={scheduledRows.slice(0, 5)}
                loading={loading}
                onViewAll={() => setTab("scheduled")}
                onSelectEmail={(id) => setSelectedEmailId(id)}
              />
              <SentTable
                rows={sentRows.slice(0, 5)}
                loading={loading}
                onViewAll={() => setTab("sent")}
                onSelectEmail={(id) => setSelectedEmailId(id)}
              />
            </div>
          </div>
        )}

        {tab === "scheduled" && (
          <div className="space-y-6">
            <ScheduledTable
              rows={scheduledRows}
              loading={loading}
              onSelectEmail={(id) => setSelectedEmailId(id)}
            />
          </div>
        )}

        {tab === "sent" && (
          <div className="space-y-6">
            <SentTable
              rows={sentRows}
              loading={loading}
              onSelectEmail={(id) => setSelectedEmailId(id)}
            />
          </div>
        )}
      </main>

      {/* Compose Email Modal */}
      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onScheduled={handleScheduledSuccess}
        />
      )}

      {/* Email Detail Inspector Modal */}
      {selectedEmailId && (
        <EmailDetailModal
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
        />
      )}

      {/* Floating Action Toast Notification */}
      <Toast
        message={toastMessage}
        tone={toastTone}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}



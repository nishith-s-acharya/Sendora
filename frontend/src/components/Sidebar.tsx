type Tab = "dashboard" | "scheduled" | "sent";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  onCompose: () => void;
}

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "⊞" },
  { key: "scheduled", label: "Scheduled Emails", icon: "◷" },
  { key: "sent", label: "Sent Emails", icon: "↗" },
];

export default function Sidebar({ active, onChange, onCompose }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-[#eff2e5] border-r border-[#130e30]/10 min-h-screen flex flex-col p-6">
      {/* Brand Lockup */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#130e30] text-[#ffe228] flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
          ✉
        </div>
        <div>
          <div className="font-serif font-bold text-lg text-deep-ink">
            Sendora
          </div>
          <div className="text-[11px] text-slate font-medium -mt-0.5">
            Email Scheduler
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={onCompose}
        className="btn-primary-yellow w-full mb-6 font-semibold shadow-sm text-sm rounded-full"
      >
        <span className="text-base font-bold leading-none">+</span>
        <span>Compose Email</span>
      </button>

      {/* Navigation List */}
      <div className="small-caps-label text-slate mb-2 px-2">Navigation</div>
      <nav className="flex flex-col gap-1.5">
        {NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex items-center gap-3 text-left px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#130e30] text-white shadow-sm font-semibold"
                  : "text-deep-ink hover:bg-white/60 hover:text-deep-ink"
              }`}
            >
              <span className={`text-base font-mono leading-none ${isActive ? "text-[#ffe228]" : "text-slate"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="mt-8 bg-white/60 rounded-[24px] p-4 border border-[#130e30]/5 text-xs text-slate space-y-1.5 shadow-2xs">
        <div className="small-caps-label !text-[10px] text-deep-ink font-bold flex items-center justify-between">
          <span>Worker Status</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#59e25d] animate-pulse shrink-0" />
        </div>
        <div className="text-[11px] text-slate leading-tight">
          BullMQ queue active with Redis-backed rate limiting.
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-[#130e30]/10 text-xs text-slate">
        <div className="text-[11px] text-slate/80">
          &copy; 2026 Sendora. All rights reserved.
        </div>
      </div>
    </aside>
  );
}

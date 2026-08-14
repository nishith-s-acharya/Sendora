import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Header({
  title,
  eyebrow = "Overview",
  onRefresh,
  onCompose,
  isRefreshing,
}: {
  title: string;
  eyebrow?: string;
  onRefresh?: () => void;
  onCompose?: () => void;
  isRefreshing?: boolean;
}) {
  const { user, logout } = useAuth();
  const [spinning, setSpinning] = useState(false);

  function handleRefreshClick() {
    if (onRefresh) {
      setSpinning(true);
      onRefresh();
      setTimeout(() => setSpinning(false), 800);
    }
  }

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div className="small-caps-label text-slate mb-1">
          {eyebrow}
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-deep-ink tracking-tighter">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
        {/* Quick Refresh Button */}
        {onRefresh && (
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing || spinning}
            className="btn-meadow-pill !py-2 !px-4 !text-xs border border-[#130e30]/10 hover:border-[#130e30]/30 transition-all cursor-pointer rounded-full shadow-xs"
            title="Refresh email queues & delivery stats"
          >
            <span className={`inline-block text-sm ${spinning || isRefreshing ? "animate-spin" : ""}`}>
              ↻
            </span>
            <span className="hidden sm:inline font-medium">Refresh</span>
          </button>
        )}

        {/* Quick Compose Button */}
        {onCompose && (
          <button
            onClick={onCompose}
            className="btn-primary-yellow !py-2 !px-4 !text-xs font-semibold shadow-xs cursor-pointer rounded-full"
          >
            + Compose
          </button>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-3 bg-[#eff2e5] p-1.5 pl-2.5 rounded-full border border-[#130e30]/10 shadow-xs">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border border-[#130e30]/20 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#130e30] text-[#ffe228] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="text-xs pr-2">
            <div className="font-semibold text-deep-ink truncate max-w-[130px]">
              {user?.name}
            </div>
            <div className="text-slate text-[10px] truncate max-w-[130px]">
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-secondary-dark !py-1.5 !px-3.5 !text-xs rounded-full"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

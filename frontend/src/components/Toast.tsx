interface Props {
  message: string | null;
  tone?: "success" | "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, tone = "success", onClose }: Props) {
  if (!message) return null;

  const bgStyle =
    tone === "success"
      ? "bg-[#130e30] text-[#ffe228] border border-[#ffe228]/30"
      : tone === "error"
      ? "bg-red-900 text-white border border-red-700"
      : "bg-[#130e30] text-white border border-white/20";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-pill shadow-2xl text-xs font-medium ${bgStyle}`}
      >
        <span>{tone === "success" ? "✓" : tone === "error" ? "✕" : "ℹ"}</span>
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-slate hover:text-white text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

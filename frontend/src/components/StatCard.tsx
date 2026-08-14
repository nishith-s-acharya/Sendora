interface Props {
  icon: string;
  label: string;
  value: number;
  tone: "brand" | "green" | "red";
}

const TONES: Record<Props["tone"], { bg: string; text: string }> = {
  brand: { bg: "bg-[#130e30]", text: "text-[#ffe228]" },
  green: { bg: "bg-white", text: "text-[#130e30]" },
  red: { bg: "bg-white", text: "text-[#e261e5]" },
};

export default function StatCard({ icon, label, value, tone }: Props) {
  const toneStyle = TONES[tone];

  return (
    <div className="card-meadow !rounded-[28px] p-6 border border-[#130e30]/10 flex items-center gap-4 transition-all hover:border-[#130e30]/20 shadow-[0_4px_20px_rgba(19,14,48,0.03)]">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-xs shrink-0 ${toneStyle.bg} ${toneStyle.text}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-3xl font-serif font-bold text-deep-ink leading-tight">
          {value}
        </div>
        <div className="small-caps-label text-slate mt-0.5">{label}</div>
      </div>
    </div>
  );
}

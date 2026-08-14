export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-pill bg-[#eff2e5] border border-[#130e30]/10 flex items-center justify-center text-2xl mb-4 shadow-sm">
        {icon}
      </div>
      <div className="font-serif font-bold text-lg text-deep-ink">{title}</div>
      <div className="text-sm text-slate mt-1 max-w-sm font-sans">{subtitle}</div>
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-[#eff2e5] border-t-[#130e30] rounded-pill animate-spin" />
    </div>
  );
}


import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export interface OverviewPoint {
  day: string;
  scheduled: number;
  sent: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#130e30] text-white p-3.5 rounded-3xl shadow-lg border border-white/10 text-xs">
        <div className="font-serif font-bold text-[#ffe228] mb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-pill inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function EmailOverviewChart({
  data,
}: {
  data: OverviewPoint[];
}) {
  return (
    <div className="card-meadow !rounded-[32px] p-6 md:p-8 border border-[#130e30]/10 shadow-[0_4px_24px_rgba(19,14,48,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="small-caps-label text-slate mb-0.5">Performance Trend</div>
          <h2 className="text-xl font-serif font-bold text-deep-ink">Email Activity Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="small-caps-label !text-[10px] bg-white/80 px-4 py-1.5 rounded-full border border-[#130e30]/10 shadow-xs">
            Last 7 Days
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[24px] p-4 border border-[#130e30]/5">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eff2e5" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "#5f5c6e", fontFamily: "Inter" }}
              axisLine={{ stroke: "#eff2e5" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#5f5c6e", fontFamily: "Inter" }}
              axisLine={{ stroke: "#eff2e5" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: "12px" }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="scheduled"
              name="Scheduled"
              stroke="#130e30"
              strokeWidth={3}
              dot={{ r: 4, fill: "#130e30" }}
              activeDot={{ r: 6, fill: "#ffe228", stroke: "#130e30", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="sent"
              name="Sent (Delivered)"
              stroke="#59e25d"
              strokeWidth={3}
              dot={{ r: 4, fill: "#59e25d" }}
              activeDot={{ r: 6, fill: "#130e30", stroke: "#59e25d", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


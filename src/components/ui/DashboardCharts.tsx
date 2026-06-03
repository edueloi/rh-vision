import { Brain, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PanelCard } from "./PanelCard";

interface ChartPoint {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  compatibilityData: ChartPoint[];
  discData: ChartPoint[];
}

const BAR_COLORS = ["#07152B", "#C5A04D", "#6CB4E4", "#10B981", "#8B5CF6", "#F59E0B"];
const DISC_COLORS = ["#07152B", "#C5A04D", "#10B981", "#6CB4E4"];

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex h-52 flex-col items-center justify-center gap-2 opacity-30">
    <div className="h-8 w-8 rounded-lg bg-zinc-200" />
    <p className="text-[11px] font-medium text-zinc-400">{label}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-3 py-2 shadow-xl">
      <p className="mb-1 text-[10px] font-semibold text-zinc-500 truncate max-w-[140px]">{label}</p>
      <p className="text-[14px] font-black text-develoi-navy">{Number(payload[0].value).toFixed(1)}%</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-3 py-2 shadow-xl">
      <p className="text-[11px] font-semibold text-zinc-600">{payload[0].name}</p>
      <p className="text-[14px] font-black text-develoi-navy">{payload[0].value}</p>
    </div>
  );
};

const renderCustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-2">
      {payload?.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] font-medium text-zinc-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardCharts({ compatibilityData, discData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {/* Bar chart */}
      <PanelCard
        title="Score IA por Vaga"
        icon={BarChart3}
        description="Média de compatibilidade"
      >
        {compatibilityData.length === 0 ? (
          <EmptyState label="Sem dados ainda" />
        ) : (
          <div className="mt-1 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compatibilityData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  fontSize={9}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontWeight: 600 }}
                  interval={0}
                  tickFormatter={(v) => v.length > 8 ? v.slice(0, 7) + "…" : v}
                />
                <YAxis
                  fontSize={9}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontWeight: 600 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 6 }} />
                <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={36}>
                  {compatibilityData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>

      {/* Donut chart */}
      <PanelCard
        title="Perfis DISC"
        icon={Brain}
        description="Distribuição comportamental"
      >
        {discData.length === 0 ? (
          <EmptyState label="Sem avaliações ainda" />
        ) : (
          <div className="mt-1 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={discData}
                  cx="50%"
                  cy="44%"
                  innerRadius={52}
                  outerRadius={74}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {discData.map((_, i) => (
                    <Cell key={i} fill={DISC_COLORS[i % DISC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend content={renderCustomLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

import { TrendingUp } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { PanelCard } from "./PanelCard";

interface FunnelStage {
  status: string;
  count: number;
}

interface RecruitmentFunnelProps {
  funnel: FunnelStage[];
}

const STAGES = [
  { key: "Triagem",             label: "Triagem",         color: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  { key: "IA Match",            label: "IA Match",        color: "bg-sky-50 text-sky-600",         dot: "bg-sky-500" },
  { key: "Entrevista",          label: "Entrevista",      color: "bg-violet-50 text-violet-600",   dot: "bg-violet-500" },
  { key: "Entrevista Realizada",label: "Ent. Realizada",  color: "bg-indigo-50 text-indigo-600",   dot: "bg-indigo-500" },
  { key: "Finalista",           label: "Finalista",       color: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
  { key: "Aprovado",            label: "Aprovado",        color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { key: "Contratado",          label: "Contratado",      color: "bg-develoi-navy text-white",     dot: "bg-develoi-gold" },
  { key: "Desistência",         label: "Desistência",     color: "bg-orange-50 text-orange-600",   dot: "bg-orange-400" },
  { key: "Sem Sucesso",         label: "Sem Sucesso",     color: "bg-rose-50 text-rose-600",       dot: "bg-rose-400" },
] as const;

export function RecruitmentFunnel({ funnel }: RecruitmentFunnelProps) {
  const getCount = (key: string) => funnel.find((s) => s.status === key)?.count ?? 0;
  const total = STAGES.reduce((s, stage) => s + getCount(stage.key), 0);
  const maxCount = Math.max(...STAGES.map((s) => getCount(s.key)), 1);

  return (
    <PanelCard
      title="Funil de Recrutamento"
      icon={TrendingUp}
      description="Distribuição de candidatos por etapa"
      action={
        <span className="text-[11px] font-medium text-zinc-400">
          {total} mapeados
        </span>
      }
    >
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 sm:hidden">
        {STAGES.map((stage) => {
          const count = getCount(stage.key);
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={stage.key} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <div className={cn("flex h-12 w-full flex-col items-center justify-center rounded-xl", stage.color)}>
                <span className="text-[18px] font-black leading-none">{count}</span>
                {total > 0 && <span className="mt-0.5 text-[8px] opacity-60">{pct}%</span>}
              </div>
              <p className="text-center text-[8px] font-semibold uppercase tracking-wide text-zinc-400 leading-tight">
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Desktop: column layout with progress bars */}
      <div className="hidden sm:block space-y-2">
        {STAGES.map((stage) => {
          const count = getCount(stage.key);
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={stage.key} className="flex items-center gap-3 group">
              {/* Label */}
              <div className="flex w-32 shrink-0 items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", stage.dot)} />
                <span className="truncate text-[11px] font-medium text-zinc-500 group-hover:text-zinc-700 transition-colors">
                  {stage.label}
                </span>
              </div>
              {/* Bar */}
              <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 h-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", stage.dot)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {/* Count + pct */}
              <div className="flex w-16 shrink-0 items-center justify-end gap-1.5">
                <span className="text-[13px] font-bold text-zinc-800 tabular-nums">{count}</span>
                {total > 0 && (
                  <span className="text-[10px] font-medium text-zinc-400 tabular-nums">{pct}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

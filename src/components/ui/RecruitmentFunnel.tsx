import React from "react";
import { TrendingUp } from "lucide-react";
import { PanelCard } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

interface FunnelStage {
  status: string;
  count: number;
}

interface RecruitmentFunnelProps {
  funnel: FunnelStage[];
}

const POSITIVE_STAGES = [
  { label: 'Triagem',       key: 'Triagem',             color: 'bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-white/60' },
  { label: 'IA Match',      key: 'IA Match',             color: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20' },
  { label: 'Entrevista',    key: 'Entrevista',           color: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20' },
  { label: 'Ent. Realiz.',  key: 'Entrevista Realizada', color: 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20' },
  { label: 'Finalista',     key: 'Finalista',            color: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-develoi-gold/10 dark:text-develoi-gold dark:border-develoi-gold/20' },
  { label: 'Aprovado',      key: 'Aprovado',             color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
  { label: 'Contratado',    key: 'Contratado',           color: 'bg-develoi-navy text-white shadow-lg dark:bg-develoi-gold dark:text-develoi-navy' },
];

const NEGATIVE_STAGES = [
  { label: 'Desistência', key: 'Desistência', color: 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20' },
  { label: 'Sem Sucesso', key: 'Sem Sucesso', color: 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20' },
];

export function RecruitmentFunnel({ funnel }: RecruitmentFunnelProps) {
  const getCount = (key: string) => funnel.find(f => f.status === key)?.count ?? 0;
  const totalPositive = POSITIVE_STAGES.reduce((sum, s) => sum + getCount(s.key), 0);
  const totalNegative = NEGATIVE_STAGES.reduce((sum, s) => sum + getCount(s.key), 0);

  return (
    <PanelCard title="Funil de Recrutamento" icon={TrendingUp} description="Distribuição de candidatos por etapa">
      {/* Etapas positivas do funil */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 py-4">
        {POSITIVE_STAGES.map((stage, i) => (
          <div key={i} className="text-center group">
            <div className={cn(
              "h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-2 transition-all group-hover:scale-105",
              stage.color
            )}>
              {getCount(stage.key)}
            </div>
            <p className="text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest whitespace-nowrap">
              {stage.label}
            </p>
          </div>
        ))}
      </div>

      {/* Separador com total de não-conversão */}
      {totalNegative > 0 && (
        <div className="border-t border-zinc-100 dark:border-white/10 pt-3 pb-1">
          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Não convertidos</p>
          <div className="grid grid-cols-2 gap-3">
            {NEGATIVE_STAGES.map((stage, i) => (
              <div key={i} className="text-center group">
                <div className={cn(
                  "h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-2 transition-all group-hover:scale-105",
                  stage.color
                )}>
                  {getCount(stage.key)}
                </div>
                <p className="text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">
                  {stage.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelCard>
  );
}

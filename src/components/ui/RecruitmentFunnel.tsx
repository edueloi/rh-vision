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

export function RecruitmentFunnel({ funnel }: RecruitmentFunnelProps) {
  const stages = [
    { label: 'Triagem', key: 'Triagem', color: 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-white/60' },
    { label: 'IA Match', key: 'IA Match', color: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20' },
    { label: 'Entrevista', key: 'Entrevista', color: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20' },
    { label: 'Finalista', key: 'Finalista', color: 'bg-develoi-navy/5 text-develoi-navy border border-develoi-navy/10 dark:bg-develoi-gold/10 dark:text-develoi-gold dark:border-develoi-gold/20' },
    { label: 'Aprovado', key: 'Aprovado', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
    { label: 'Contratado', key: 'Contratado', color: 'bg-develoi-navy text-white shadow-lg dark:bg-develoi-gold' },
  ];

  return (
    <PanelCard title="Funil de Recrutamento" icon={TrendingUp} description="Etapas do processo">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 py-4">
        {stages.map((stage, i) => {
          const count = funnel.find(f => f.status === stage.key)?.count || 0;
          return (
            <div key={i} className="text-center group">
              <div className={cn(
                "h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-2 transition-all group-hover:scale-105", 
                stage.color
              )}>
                {count}
              </div>
              <p className="text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest whitespace-nowrap">
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

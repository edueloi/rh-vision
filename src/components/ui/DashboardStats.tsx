import React from "react";
import { Briefcase, Users, UserCheck, Target, Brain } from "lucide-react";
import { StatCard } from "@/src/components/ui";

interface DashboardStatsProps {
  stats: {
    active_jobs: number;
    total_candidates: number;
    new_candidates: number;
    compatible_candidates: number;
    tool_responses: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statConfig = [
    { label: 'Vagas Ativas', value: stats.active_jobs, icon: Briefcase, color: 'navy' as const, trend: '+12%' },
    { label: 'Candidatos', value: stats.total_candidates, icon: Users, color: 'navy' as const, trend: '+8%' },
    { label: 'Novos no Período', value: stats.new_candidates, icon: UserCheck, color: 'success' as const, trend: '+24%' },
    { label: 'Compatíveis (>80%)', value: stats.compatible_candidates, icon: Target, color: 'gold' as any, trend: '+5%' },
    { label: 'DISC Respondidos', value: stats.tool_responses, icon: Brain, color: 'gold' as any, trend: '+18%' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statConfig.map((stat, i) => (
        <StatCard 
          key={stat.label}
          title={stat.label}
          value={stat.value.toString()}
          icon={stat.icon}
          description="Este mês"
          trend={{ value: parseInt(stat.trend), isUp: true }}
          color={stat.color}
          delay={i * 0.1}
        />
      ))}
    </div>
  );
}

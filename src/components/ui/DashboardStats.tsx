import { Brain, Briefcase, Target, UserCheck, Users } from "lucide-react";
import { StatCard } from "./StatCard";

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
  const cards = [
    {
      title: "Vagas Ativas",
      value: stats.active_jobs,
      icon: Briefcase,
      color: "navy" as const,
      description: "abertas agora",
      trend: { value: 12, isUp: true },
    },
    {
      title: "Candidatos",
      value: stats.total_candidates,
      icon: Users,
      color: "navy" as const,
      description: "cadastrados",
      trend: { value: 8, isUp: true },
    },
    {
      title: "Novos no Período",
      value: stats.new_candidates,
      icon: UserCheck,
      color: "success" as const,
      description: "no período",
      trend: { value: 24, isUp: true },
    },
    {
      title: "Compatíveis >80%",
      value: stats.compatible_candidates,
      icon: Target,
      color: "gold" as const,
      description: "alto fit",
      trend: { value: 5, isUp: true },
    },
    {
      title: "DISC Respondidos",
      value: stats.tool_responses,
      icon: Brain,
      color: "purple" as const,
      description: "avaliações",
      trend: { value: 18, isUp: true },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value.toString()}
          icon={card.icon}
          description={card.description}
          trend={card.trend}
          color={card.color}
          delay={index * 0.07}
        />
      ))}
    </div>
  );
}

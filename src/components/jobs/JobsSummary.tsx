import React from "react";
import { Briefcase, FileClock, Globe, PauseCircle } from "lucide-react";
import { StatCard } from "@/src/components/ui";
import { Job } from "@/src/types";

interface JobsSummaryProps {
  jobs: Job[];
}

export function JobsSummary({ jobs }: JobsSummaryProps) {
  const total = jobs.length;
  const open = jobs.filter((job) => job.status === "Aberta").length;
  const draft = jobs.filter((job) => job.status === "Rascunho").length;
  const published = jobs.filter((job) => job.is_public).length;
  const paused = jobs.filter((job) => job.status === "Pausada").length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      <StatCard
        className="col-span-2 xl:col-span-1"
        title="Total de vagas"
        value={total}
        description="Oportunidades ativas e históricas"
        icon={Briefcase}
        color="navy"
        delay={0}
      />
      <StatCard
        title="Abertas"
        value={open}
        description="Vagas disponíveis para candidatura"
        icon={Globe}
        color="success"
        delay={0.04}
      />
      <StatCard
        title="Rascunhos"
        value={draft}
        description="Vagas em preparação"
        icon={FileClock}
        color="gold"
        delay={0.08}
      />
      <StatCard
        title="Publicadas"
        value={published}
        description="Exibidas no portal público"
        icon={Globe}
        color="info"
        delay={0.12}
      />
      <StatCard
        title="Pausadas"
        value={paused}
        description="Temporariamente fora de divulgação"
        icon={PauseCircle}
        color="warning"
        delay={0.16}
      />
    </div>
  );
}

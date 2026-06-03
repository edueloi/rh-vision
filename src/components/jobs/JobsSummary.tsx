import React from "react";
import { Briefcase, FileClock, Globe, PauseCircle, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Job } from "@/src/types";

interface JobsSummaryProps {
  jobs: Job[];
}

interface KpiCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  barColor: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  delay?: number;
  className?: string;
}

function KpiCard({ label, value, total, icon: Icon, barColor, iconBg, iconColor, valueColor, delay = 0, className }: KpiCardProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.24, ease: "easeOut" }}
      className={cn("group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", className)}
    >
      {/* Corner glow */}
      <div className={cn("absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl opacity-50 transition-opacity group-hover:opacity-80", iconBg)} />

      <div className="relative z-10">
        {/* Icon + value row */}
        <div className="mb-3 flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg)}>
            <Icon size={17} className={iconColor} />
          </div>
          <span className={cn("text-[26px] font-black leading-none tabular-nums", valueColor)}>
            {value}
          </span>
        </div>

        {/* Label */}
        <p className="mb-2 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {label}
        </p>

        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className={cn("h-full rounded-full", barColor)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.1, duration: 0.5, ease: "easeOut" }}
          />
        </div>
        {total > 0 && (
          <p className="mt-1 text-right text-[9px] font-medium text-zinc-400 tabular-nums">
            {pct.toFixed(0)}% do total
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function JobsSummary({ jobs }: JobsSummaryProps) {
  const total    = jobs.length;
  const open     = jobs.filter(j => j.status === "Aberta").length;
  const draft    = jobs.filter(j => j.status === "Rascunho").length;
  const pending  = jobs.filter(j => (j as any).approval_status === "pending").length;
  const paused   = jobs.filter(j => j.status === "Pausada").length;

  const cards: KpiCardProps[] = [
    {
      label:      "Total de vagas",
      value:      total,
      total,
      icon:       Briefcase,
      barColor:   "bg-develoi-navy",
      iconBg:     "bg-develoi-navy/8",
      iconColor:  "text-develoi-navy",
      valueColor: "text-develoi-navy",
      delay:      0,
    },
    {
      label:      "Abertas",
      value:      open,
      total,
      icon:       Globe,
      barColor:   "bg-emerald-500",
      iconBg:     "bg-emerald-50",
      iconColor:  "text-emerald-600",
      valueColor: "text-emerald-600",
      delay:      0.05,
    },
    {
      label:      "Rascunhos",
      value:      draft,
      total,
      icon:       FileClock,
      barColor:   "bg-develoi-gold",
      iconBg:     "bg-develoi-gold/10",
      iconColor:  "text-develoi-gold",
      valueColor: "text-develoi-gold",
      delay:      0.1,
    },
    {
      label:      "Em aprovação",
      value:      pending,
      total,
      icon:       ShieldAlert,
      barColor:   "bg-amber-400",
      iconBg:     "bg-amber-50",
      iconColor:  "text-amber-600",
      valueColor: "text-amber-600",
      delay:      0.15,
    },
    {
      label:      "Pausadas",
      value:      paused,
      total,
      icon:       PauseCircle,
      barColor:   "bg-orange-400",
      iconBg:     "bg-orange-50",
      iconColor:  "text-orange-500",
      valueColor: "text-orange-500",
      delay:      0.2,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      {cards.map((card, i) => (
        <KpiCard
          key={card.label}
          {...card}
          className={i === 0 ? "col-span-2 xl:col-span-1" : ""}
        />
      ))}
    </div>
  );
}

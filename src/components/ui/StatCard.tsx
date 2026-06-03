import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

type StatCardColor = "default" | "success" | "info" | "danger" | "purple" | "warning" | "navy" | "red" | "gold";

const colorMap: Record<StatCardColor, {
  iconBg: string;
  iconText: string;
  accent: string;
  glow: string;
  bar: string;
}> = {
  default: {
    iconBg: "bg-develoi-navy/8 ring-1 ring-develoi-navy/12",
    iconText: "text-develoi-navy",
    accent: "text-develoi-navy",
    glow: "from-develoi-navy/5",
    bar: "bg-develoi-navy",
  },
  navy: {
    iconBg: "bg-develoi-navy/8 ring-1 ring-develoi-navy/12",
    iconText: "text-develoi-navy",
    accent: "text-develoi-navy",
    glow: "from-develoi-navy/5",
    bar: "bg-develoi-navy",
  },
  gold: {
    iconBg: "bg-develoi-gold/10 ring-1 ring-develoi-gold/15",
    iconText: "text-develoi-gold",
    accent: "text-develoi-gold",
    glow: "from-develoi-gold/8",
    bar: "bg-develoi-gold",
  },
  success: {
    iconBg: "bg-emerald-50 ring-1 ring-emerald-200/60",
    iconText: "text-emerald-600",
    accent: "text-emerald-600",
    glow: "from-emerald-500/5",
    bar: "bg-emerald-500",
  },
  info: {
    iconBg: "bg-sky-50 ring-1 ring-sky-200/60",
    iconText: "text-sky-600",
    accent: "text-sky-600",
    glow: "from-sky-500/5",
    bar: "bg-sky-500",
  },
  purple: {
    iconBg: "bg-violet-50 ring-1 ring-violet-200/60",
    iconText: "text-violet-600",
    accent: "text-violet-600",
    glow: "from-violet-500/5",
    bar: "bg-violet-500",
  },
  danger: {
    iconBg: "bg-rose-50 ring-1 ring-rose-200/60",
    iconText: "text-rose-600",
    accent: "text-rose-600",
    glow: "from-rose-500/5",
    bar: "bg-rose-500",
  },
  red: {
    iconBg: "bg-rose-50 ring-1 ring-rose-200/60",
    iconText: "text-rose-600",
    accent: "text-rose-600",
    glow: "from-rose-500/5",
    bar: "bg-rose-500",
  },
  warning: {
    iconBg: "bg-amber-50 ring-1 ring-amber-200/60",
    iconText: "text-amber-600",
    accent: "text-amber-600",
    glow: "from-amber-500/5",
    bar: "bg-amber-500",
  },
};

interface StatCardProps {
  key?: any;
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isUp: boolean };
  description?: string;
  color?: StatCardColor;
  className?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color = "default",
  className,
  delay = 0,
}: StatCardProps) {
  const c = colorMap[color] ?? colorMap.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5",
        className
      )}
    >
      {/* Soft corner glow */}
      <div className={cn("absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-150", c.glow, "to-transparent")} />

      {/* Top row: icon + trend badge */}
      <div className="relative z-10 flex items-start justify-between mb-3 sm:mb-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10", c.iconBg)}>
          <Icon size={16} className={cn("sm:hidden", c.iconText)} />
          <Icon size={18} className={cn("hidden sm:block", c.iconText)} />
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
            trend.isUp
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-500"
          )}>
            {trend.isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend.value}%
          </div>
        )}
      </div>

      {/* Value + label */}
      <div className="relative z-10">
        <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {title}
        </p>
        <h3 className="text-[26px] font-black leading-none tracking-tight text-zinc-900 sm:text-[28px]">
          {value}
        </h3>
        {description && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-zinc-400">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.bar)} />
            <span className="truncate">{description}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

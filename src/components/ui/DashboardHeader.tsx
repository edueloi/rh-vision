import { Building2, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Unit } from "@/src/lib/useUnit";
import { cn } from "@/src/lib/utils";

type PeriodOption = { value: string; label: string };

interface DashboardHeaderProps {
  currentUnitName: string;
  period: string;
  periodLabel: string;
  periodOptions: ReadonlyArray<PeriodOption>;
  onPeriodChange: (period: string) => void;
  selectedUnit: string;
  onSelectedUnitChange: (unit: string) => void;
  units: Unit[];
  refreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  currentUnitName,
  period,
  periodLabel,
  periodOptions,
  onPeriodChange,
  selectedUnit,
  onSelectedUnitChange,
  units,
  refreshing,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7 sm:py-6">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-develoi-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 bottom-0 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: title */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Building2 size={10} className="text-develoi-gold/70" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-white/40 uppercase truncate">
              {currentUnitName}
            </span>
          </div>
          <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
            Dashboard
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <TrendingUp size={11} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-white/40">
              Visão geral · <span className="text-white/60">{periodLabel}</span>
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Unit filter */}
          {units.length > 1 && (
            <select
              value={selectedUnit}
              onChange={(e) => onSelectedUnitChange(e.target.value)}
              className="h-8 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.06] px-3 pr-7 text-[11px] font-medium text-white/70 outline-none transition-colors hover:bg-white/10 focus:border-develoi-gold/40"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff60' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "10px" }}
            >
              <option value="master">Todas</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Atualizar"
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
          </button>

          {/* Nova Vaga */}
          <Link
            to="/vagas/nova"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a] hover:shadow-develoi-gold/30"
          >
            <Plus size={13} />
            Nova Vaga
          </Link>
        </div>
      </div>

      {/* Period pills */}
      <div className="relative z-10 mt-4 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPeriodChange(option.value)}
            className={cn(
              "h-7 shrink-0 rounded-lg px-3.5 text-[11px] font-semibold transition-all whitespace-nowrap",
              period === option.value
                ? "bg-white text-develoi-navy shadow-sm"
                : "bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

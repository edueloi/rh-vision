import React from "react";
import { Filter, Building2, RefreshCw, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Unit } from "@/src/lib/useUnit";

interface DashboardHeaderProps {
  period: string;
  setPeriod: (period: string) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  units: Unit[];
  loading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  period,
  setPeriod,
  selectedUnit,
  setSelectedUnit,
  units,
  loading,
  onRefresh
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-1">
      <div>
        <h1 className="text-xl font-bold text-develoi-navy dark:text-white tracking-tight">Dashboard</h1>
        <p className="text-[9px] font-semibold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-1">
          Visão Geral do Ecossistema
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro de Período */}
        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm transition-colors">
          <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100 dark:border-white/5">
            <Filter size={12} /> Filtros
          </div>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent border-none outline-none text-[10px] font-semibold text-zinc-900 dark:text-white pr-2 cursor-pointer"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="all">Histórico</option>
          </select>
        </div>

        {/* Seletor de Unidade */}
        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm transition-colors">
          <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100 dark:border-white/5">
            <Building2 size={12} /> Unidade
          </div>
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="bg-transparent border-none outline-none text-[10px] font-semibold text-zinc-900 dark:text-white pr-2 cursor-pointer"
          >
            <option value="master">Todas</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={onRefresh}
            className="p-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-develoi-navy dark:hover:text-develoi-gold hover:border-develoi-navy dark:hover:border-develoi-gold transition-all shadow-sm cursor-pointer shrink-0 rounded-2xl"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <Link 
            to="/vagas/nova"
            className="flex-1 sm:flex-none px-5 py-3 bg-develoi-navy dark:bg-develoi-gold text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black dark:hover:bg-develoi-gold/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-develoi-navy/10 dark:shadow-develoi-gold/10"
          >
            <Plus size={16} /> Nova Vaga
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Table as TableIcon } from "lucide-react";
import { PanelCard, Badge } from "@/src/components/ui";

interface UnitSummary {
  id: string;
  name: string;
  active_jobs: number;
  total_candidates: number;
  hires: number;
}

interface UnitSummaryTableProps {
  summary: UnitSummary[];
}

export function UnitSummaryTable({ summary }: UnitSummaryTableProps) {
  if (!summary || summary.length === 0) return null;

  return (
    <PanelCard title="Resumo por Unidade" icon={TableIcon} description="Visão consolidada do ecossistema por unidade de negócio">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-white/5">
              <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30">Unidade</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30">Vagas Ativas</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30">Candidatos</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30">Contratações</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
            {summary.map((unit) => (
              <tr key={unit.id} className="group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">
                  <p className="text-xs font-black text-zinc-900 dark:text-white">{unit.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">ID: {unit.id}</p>
                </td>
                <td className="py-4">
                  <span className="text-xs font-bold text-zinc-600 dark:text-white/60">{unit.active_jobs}</span>
                </td>
                <td className="py-4">
                  <span className="text-xs font-bold text-zinc-600 dark:text-white/60">{unit.total_candidates}</span>
                </td>
                <td className="py-4">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{unit.hires}</span>
                </td>
                <td className="py-4">
                  <Badge color="success" size="sm">Ativa</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}

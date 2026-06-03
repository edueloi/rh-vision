import { Building2 } from "lucide-react";
import { Badge } from "./Badge";
import { PanelCard } from "./PanelCard";

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
  if (!summary || summary.length <= 1) {
    return null;
  }

  return (
    <PanelCard title="Resumo por Unidade" icon={Building2} description="Desempenho consolidado por unidade">
      <div className="-mx-4 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-zinc-100">
              {["Unidade", "Vagas Ativas", "Candidatos", "Contratações", "Status"].map((header) => (
                <th key={header} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 sm:px-6">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-50">
            {summary.map((unit) => (
              <tr key={unit.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-3 sm:px-6">
                  <p className="text-[11px] font-black text-zinc-900">{unit.name}</p>
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-zinc-600 sm:px-6">{unit.active_jobs}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-zinc-600 sm:px-6">{unit.total_candidates}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-emerald-600 sm:px-6">+{unit.hires}</td>
                <td className="px-4 py-3 sm:px-6">
                  <Badge color="success" size="sm">
                    Ativa
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}

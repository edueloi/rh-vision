import { ChevronRight, FileText, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { PanelCard } from "./PanelCard";

interface ImportBatch {
  id: string;
  name: string;
  processed_files: number;
  total_files: number;
}

interface RecentImportsProps {
  imports: ImportBatch[];
  href?: string;
}

export function RecentImports({ imports, href = "/importar-cvs" }: RecentImportsProps) {
  return (
    <PanelCard
      title="Importações Recentes"
      icon={Layers}
      description="Últimos lotes de CVs"
      action={
        <Link
          to={href}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-develoi-navy transition-opacity hover:opacity-70"
        >
          Gerenciar
          <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="space-y-3">
        {imports.length === 0 ? (
          <div className="py-8 text-center text-[11px] font-bold uppercase tracking-widest text-zinc-300">
            Nenhuma importação ainda
          </div>
        ) : (
          imports.map((batch) => {
            const percentage =
              batch.total_files > 0 ? Math.round((batch.processed_files / batch.total_files) * 100) : 0;
            const isDone = percentage >= 100;

            return (
              <Link key={batch.id} to={href} className="group flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-all group-hover:bg-develoi-navy group-hover:text-white">
                  <FileText size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black text-zinc-800">{batch.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isDone ? "bg-emerald-500" : "bg-develoi-navy"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className={cn("shrink-0 text-[9px] font-black", isDone ? "text-emerald-600" : "text-zinc-400")}>
                      {batch.processed_files}/{batch.total_files}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </PanelCard>
  );
}

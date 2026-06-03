import { Briefcase, ChevronRight, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { PanelCard } from "./PanelCard";

interface Job {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  candidates_count: number;
  compatible_count: number;
}

const STATUS_MAP: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  Aberta:         { label: "Aberta",     dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  "Em Aprovação": { label: "Aprovação",  dot: "bg-amber-500",   text: "text-amber-700",  bg: "bg-amber-50"   },
  Fechada:        { label: "Fechada",    dot: "bg-zinc-400",    text: "text-zinc-500",   bg: "bg-zinc-100"   },
  Pausada:        { label: "Pausada",    dot: "bg-orange-400",  text: "text-orange-600", bg: "bg-orange-50"  },
};

function getStatus(status: string) {
  return STATUS_MAP[status] ?? { label: status, dot: "bg-zinc-400", text: "text-zinc-500", bg: "bg-zinc-100" };
}

export function RecentJobs({ jobs, href = "/vagas" }: { jobs: Job[]; href?: string }) {
  return (
    <PanelCard
      title="Vagas Recentes"
      icon={Briefcase}
      description="Últimas vagas abertas"
      action={
        <Link
          to={href}
          className="flex items-center gap-1 text-[11px] font-semibold text-develoi-navy transition-opacity hover:opacity-70"
        >
          Ver todas <ChevronRight size={12} />
        </Link>
      }
    >
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 opacity-30">
          <Briefcase size={28} className="text-zinc-300" />
          <p className="text-[11px] font-medium text-zinc-400">Nenhuma vaga cadastrada</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {jobs.map((job) => {
            const s = getStatus(job.status);
            const fitPct = job.candidates_count > 0
              ? Math.round((job.compatible_count / job.candidates_count) * 100)
              : 0;

            return (
              <div key={job.id} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-300 transition-colors group-hover:bg-develoi-navy group-hover:text-white">
                  <Briefcase size={15} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-900">{job.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                      <MapPin size={9} />
                      {job.city}, {job.state}
                    </span>
                    <span className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold", s.bg, s.text)}>
                      <span className={cn("h-1 w-1 rounded-full", s.dot)} />
                      {s.label}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden shrink-0 items-center gap-4 sm:flex">
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-zinc-800 tabular-nums">{job.candidates_count}</p>
                    <p className="text-[9px] font-medium uppercase text-zinc-400">inscritos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-emerald-600 tabular-nums">{job.compatible_count}</p>
                    <p className="text-[9px] font-medium uppercase text-zinc-400">compatíveis</p>
                  </div>
                  {job.candidates_count > 0 && (
                    <div className="w-10">
                      <div className="mb-0.5 text-right text-[9px] font-semibold text-zinc-400">{fitPct}%</div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${fitPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to={`/vagas/${job.id}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

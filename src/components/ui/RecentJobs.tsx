import React from "react";
import { Briefcase, MapPin, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PanelCard, Badge } from "@/src/components/ui";

interface Job {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  candidates_count: number;
  compatible_count: number;
}

interface RecentJobsProps {
  jobs: Job[];
}

export function RecentJobs({ jobs }: RecentJobsProps) {
  return (
    <PanelCard title="Vagas Recentes" icon={Briefcase}>
      <div className="space-y-4">
        {jobs.map((job) => (
          <div 
            key={job.id} 
            className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/5 p-4 rounded-3xl hover:border-zinc-900 dark:hover:border-develoi-gold transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all">
                <Briefcase size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{job.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={10} /> {job.city}, {job.state}
                  </span>
                  <Badge color={job.status === 'Aberta' ? 'success' : 'default'} size="sm">{job.status}</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">{job.candidates_count}</p>
                <p className="text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">Inscritos</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{job.compatible_count}</p>
                <p className="text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">Compatíveis</p>
              </div>
              <Link to={`/vagas/${job.id}`} className="p-2 text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-[40px]">
            <Briefcase size={40} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Nenhuma vaga cadastrada</span>
            <Link to="/vagas/nova" className="text-blue-600 dark:text-develoi-gold underline">Criar Vaga</Link>
          </div>
        )}
      </div>
    </PanelCard>
  );
}

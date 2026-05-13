import React from "react";
import { Target, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PanelCard, Badge } from "@/src/components/ui";

interface Talent {
  id: string;
  full_name: string;
  job_title: string;
  compatibility_score: number;
}

interface RecommendedTalentsProps {
  talents: Talent[];
}

export function RecommendedTalents({ talents }: RecommendedTalentsProps) {
  return (
    <PanelCard title="Talentos Recomendados" icon={Target} description="Top matchings recentes">
      <div className="space-y-4">
        {talents.map((rec) => (
          <div 
            key={rec.id} 
            className="p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl hover:border-zinc-900 dark:hover:border-develoi-gold transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 flex items-center justify-center font-black text-zinc-400 dark:text-white/40 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all text-[10px]">
                  {rec.full_name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h5 className="text-[11px] font-black text-zinc-900 dark:text-white">{rec.full_name}</h5>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">{rec.job_title}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-blue-600 dark:text-develoi-gold">{rec.compatibility_score}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 grayscale opacity-60">
                {[1, 2, 3].map(tagId => (
                  <Badge key={tagId} size="sm" color="default">Tag {tagId}</Badge>
                ))}
              </div>
              <Link 
                to={`/candidatos/${rec.id}`} 
                className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                Perfil <ChevronRight size={10} />
              </Link>
            </div>
          </div>
        ))}
        {talents.length === 0 && (
          <div className="py-12 text-center text-zinc-300 dark:text-white/20 italic text-[10px]">
            Nenhum candidato de alto fit encontrado
          </div>
        )}
      </div>
    </PanelCard>
  );
}

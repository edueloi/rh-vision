import { ChevronRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { PanelCard } from "./PanelCard";

interface Talent {
  id: string;
  full_name: string;
  job_title: string;
  compatibility_score: number;
}

const AVATAR_COLORS = [
  "bg-develoi-navy text-develoi-gold",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-emerald-600" :
    score >= 75 ? "text-sky-600" :
    "text-zinc-500";
  const ringColor =
    score >= 90 ? "stroke-emerald-500" :
    score >= 75 ? "stroke-sky-500" :
    "stroke-zinc-300";

  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      <svg width="40" height="40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          className={ringColor}
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("absolute text-[10px] font-black tabular-nums", color)}>{score}%</span>
    </div>
  );
}

export function RecommendedTalents({ talents, href = "/candidatos" }: { talents: Talent[]; href?: string }) {
  return (
    <PanelCard
      title="Talentos em Destaque"
      icon={Target}
      description="Maiores compatibilidades"
      action={
        <Link to={href} className="flex items-center gap-1 text-[11px] font-semibold text-develoi-navy transition-opacity hover:opacity-70">
          Ver todos <ChevronRight size={12} />
        </Link>
      }
    >
      {talents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 opacity-30">
          <Target size={26} className="text-zinc-300" />
          <p className="text-[11px] font-medium text-zinc-400">Nenhum candidato de alto fit</p>
        </div>
      ) : (
        <div className="space-y-1">
          {talents.map((talent, i) => (
            <Link
              key={talent.id}
              to={`/candidatos/${talent.id}`}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-50"
            >
              {/* Avatar */}
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black",
                AVATAR_COLORS[i % AVATAR_COLORS.length]
              )}>
                {getInitials(talent.full_name || "?")}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-zinc-900">{talent.full_name}</p>
                <p className="truncate text-[10px] text-zinc-400">{talent.job_title}</p>
              </div>

              {/* Score ring */}
              <ScoreRing score={talent.compatibility_score ?? 0} />
            </Link>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

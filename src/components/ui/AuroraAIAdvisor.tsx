import { ArrowRight, Sparkles, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface AuroraAIAdvisorProps {
  newCandidates: number;
  compatibleCandidates: number;
  href?: string;
}

export function AuroraAIAdvisor({
  newCandidates,
  compatibleCandidates,
  href = "/aderencia",
}: AuroraAIAdvisorProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-develoi-navy p-5">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-develoi-gold/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
          <Sparkles size={15} className="text-develoi-gold" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-develoi-gold leading-none">Aurora AI</p>
          <p className="mt-0.5 text-[9px] font-medium text-white/30 uppercase tracking-wider">Análise em tempo real</p>
        </div>
      </div>

      {/* Insight cards */}
      <div className="relative z-10 space-y-2 mb-4">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
              <TrendingUp size={12} className="text-sky-400" />
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-white/70">
              Taxa de conversão <span className="font-bold text-white">Triagem → Entrevista</span> está{" "}
              <span className={newCandidates > 0 ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>
                {newCandidates > 0 ? "acima" : "abaixo"} da média
              </span>.
            </p>
          </div>
        </div>

        {compatibleCandidates > 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-develoi-gold/15">
                <Users size={12} className="text-develoi-gold" />
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-white/70">
                <span className="font-bold text-develoi-gold">{compatibleCandidates} candidatos</span>{" "}
                com <span className="font-bold text-white">+80% de fit</span> aguardam revisão.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        to={href}
        className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[11px] font-semibold text-white ring-1 ring-white/10 transition-all hover:bg-white/15 hover:ring-white/20"
      >
        Consultoria Completa
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

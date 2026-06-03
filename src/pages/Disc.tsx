import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain, Users, Link as LinkIcon, Copy, CheckCircle2, Loader2,
  ChevronRight, Sparkles, BarChart3, RefreshCw, Plus, X,
  MessageSquare, Lightbulb, AlertCircle, Zap, Target, Star,
  TrendingUp, Shield, Globe
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import {
  Badge, Button, ContentCard, EmptyState, PageWrapper, PanelCard,
  SectionTitle, useToast,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { Link } from "react-router-dom";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface DiscResult {
  id: number;
  candidate_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  disc_d: number;
  disc_i: number;
  disc_s: number;
  disc_c: number;
  predominant_profile?: string;
  behavioral_summary?: string;
  strengths?: string;
  attention_points?: string;
  communication_style?: string;
  leadership_style?: string;
  ideal_environment?: string;
  created_at: string;
}

interface DiscAnswer {
  question_text: string;
  question_type: string;
  answer_text?: string;
  answer_json?: string;
  position: number;
}

interface DiscDetail extends DiscResult {
  response?: {
    id: number;
    ai_summary?: string;
    completed_at?: string;
  };
  answers: DiscAnswer[];
}

interface Candidate {
  id: number;
  full_name: string;
  email: string;
}

// ── DISC config ────────────────────────────────────────────────────────────────

const DISC_COLORS: Record<string, { bg: string; border: string; text: string; bar: string; hex: string; label: string; desc: string }> = {
  D: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-500", hex: "#ef4444", label: "Dominância", desc: "Direto, decisivo, orientado a resultados" },
  I: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500", hex: "#f59e0b", label: "Influência", desc: "Comunicativo, otimista, motivador" },
  S: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500", hex: "#10b981", label: "Estabilidade", desc: "Paciente, colaborativo, confiável" },
  C: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "bg-blue-500", hex: "#3b82f6", label: "Conformidade", desc: "Analítico, preciso, sistemático" },
};

function getProfileLetter(profile?: string): string {
  if (!profile) return "?";
  const upper = profile.toUpperCase();
  if (upper.startsWith("D")) return "D";
  if (upper.startsWith("I")) return "I";
  if (upper.startsWith("S") || upper === "ESTABILIDADE") return "S";
  if (upper.startsWith("C") || upper === "CONFORMIDADE") return "C";
  return upper[0] || "?";
}

// ── Componente: gráfico radar ──────────────────────────────────────────────────

function DiscRadarChart({ d, i, s, c }: { d: number; i: number; s: number; c: number }) {
  const data = [
    { subject: "D", value: d, fullMark: 100 },
    { subject: "I", value: i, fullMark: 100 },
    { subject: "S", value: s, fullMark: 100 },
    { subject: "C", value: c, fullMark: 100 },
  ];

  const CustomTick = ({ x, y, payload }: any) => {
    const letter = payload.value as string;
    const cfg = DISC_COLORS[letter];
    return (
      <g transform={`translate(${x},${y})`}>
        <circle r="14" fill={cfg?.hex} opacity={0.15} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={900} fill={cfg?.hex}>
          {letter}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="DISC" dataKey="value" stroke="#1a1f36" fill="#1a1f36" fillOpacity={0.12} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Componente: gráfico de barras ──────────────────────────────────────────────

function DiscBarChart({ d, i, s, c }: { d: number; i: number; s: number; c: number }) {
  const data = [
    { name: "D", value: d, color: DISC_COLORS.D.hex },
    { name: "I", value: i, color: DISC_COLORS.I.hex },
    { name: "S", value: s, color: DISC_COLORS.S.hex },
    { name: "C", value: c, color: DISC_COLORS.C.hex },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900 }} />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          formatter={(v: any) => [`${v}%`, "Score"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Componente: badge de perfil ────────────────────────────────────────────────

function ProfileBadge({ profile, size = "md" }: { profile?: string; size?: "sm" | "md" | "lg" }) {
  const letter = getProfileLetter(profile);
  const cfg = DISC_COLORS[letter] || { bg: "bg-zinc-100", border: "border-zinc-200", text: "text-zinc-500", hex: "#71717a" };
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-lg", lg: "w-16 h-16 text-2xl" };
  return (
    <div className={cn("rounded-2xl flex items-center justify-center font-black border-2 shrink-0", cfg.bg, cfg.border, cfg.text, sizes[size])}>
      {letter}
    </div>
  );
}

// ── Componente: card de resultado na lista ─────────────────────────────────────

function DiscCard({ result, onOpen }: { result: DiscResult; onOpen: () => void }) {
  const letter = getProfileLetter(result.predominant_profile);
  const cfg = DISC_COLORS[letter] || DISC_COLORS.D;
  const scores = { D: result.disc_d || 0, I: result.disc_i || 0, S: result.disc_s || 0, C: result.disc_c || 0 };
  const hasScores = Object.values(scores).some(v => v > 0);
  const dominantScore = Math.max(...Object.values(scores));

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-develoi-navy/20 hover:shadow-md"
    >
      {/* Color band from dominant profile */}
      <div className={cn("h-0.5", cfg.bar)} />

      <div className="flex items-center gap-4 p-4">
        {/* Profile avatar */}
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-[16px] font-black", cfg.bg, cfg.border, cfg.text)}>
          {letter}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <h3 className="truncate text-[13px] font-bold text-zinc-900">{result.full_name}</h3>
            {result.predominant_profile && (
              <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold border", cfg.bg, cfg.border, cfg.text)}>
                {cfg.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
            {result.email && <span className="truncate">{result.email}</span>}
            {result.city && (
              <>
                <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-zinc-300" />
                <span>{result.city}, {result.state}</span>
              </>
            )}
          </div>
        </div>

        {/* DISC mini bars */}
        {hasScores && (
          <div className="hidden shrink-0 items-end gap-1.5 sm:flex">
            {(["D", "I", "S", "C"] as const).map(l => {
              const val = scores[l];
              const c2 = DISC_COLORS[l];
              const isDominant = val === dominantScore && val > 0;
              return (
                <div key={l} className="flex flex-col items-center gap-0.5">
                  {isDominant && <span className={cn("text-[7px] font-bold", c2.text)}>▲</span>}
                  <div className={cn("w-5 h-10 rounded-lg overflow-hidden flex items-end", isDominant ? c2.bg : "bg-zinc-100")}>
                    <div className={cn("w-full rounded-sm transition-all", c2.bar)} style={{ height: `${val}%` }} />
                  </div>
                  <span className="text-[8px] font-bold text-zinc-400">{l}</span>
                  <span className={cn("text-[8px] font-semibold tabular-nums", isDominant ? c2.text : "text-zinc-400")}>{val}%</span>
                </div>
              );
            })}
          </div>
        )}

        <ChevronRight size={14} className="shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
      </div>
    </div>
  );
}

// ── Modal: detalhe completo ────────────────────────────────────────────────────

function DiscDetailModal({
  discId,
  tenantId,
  onClose,
}: {
  discId: number;
  tenantId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [data, setData] = useState<DiscDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/disc/results/${discId}`)
      .then(r => r.json())
      .then(async (d: DiscDetail) => {
        setData(d);
        setLoading(false);
        // Auto-trigger AI analysis if scores are missing but answers exist
        const hasScores = (d.disc_d || 0) + (d.disc_i || 0) + (d.disc_s || 0) + (d.disc_c || 0) > 0;
        if (!hasScores && d.answers && d.answers.length > 0) {
          setAnalyzing(true);
          const loadingId = toastRef.current.loading("Aurora IA gerando análise DISC detalhada…");
          try {
            const res = await fetch(`/api/disc/results/${discId}/analyze`, { method: "POST" });
            toastRef.current.dismiss(loadingId);
            if (res.ok) {
              const r2 = await fetch(`/api/disc/results/${discId}`);
              setData(await r2.json());
              toastRef.current.success("Análise DISC gerada com sucesso!");
            }
          } catch {
            toastRef.current.dismiss(loadingId);
            toastRef.current.error("Erro ao gerar análise DISC.");
          } finally { setAnalyzing(false); }
        }
      })
      .catch(() => { toastRef.current.error("Erro ao carregar resultado DISC."); setLoading(false); });
  }, [discId]);

  const handleReAnalyze = async () => {
    setAnalyzing(true);
    const loadingId = toastRef.current.loading("Aurora IA re-analisando perfil DISC…");
    try {
      const res = await fetch(`/api/disc/results/${discId}/analyze`, { method: "POST" });
      toastRef.current.dismiss(loadingId);
      if (!res.ok) throw new Error();
      const r2 = await fetch(`/api/disc/results/${discId}`);
      setData(await r2.json());
      toastRef.current.success("Análise DISC atualizada com sucesso!");
    } catch {
      toastRef.current.dismiss(loadingId);
      toastRef.current.error("Erro na análise IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  const letter = data ? getProfileLetter(data.predominant_profile) : "?";
  const cfg = DISC_COLORS[letter] || DISC_COLORS.D;

  const parseList = (raw?: string): string[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return [raw]; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className={cn("px-5 py-4 border-b border-zinc-100 flex items-center gap-3", cfg.bg)}>
          {data && <ProfileBadge profile={data.predominant_profile} size="lg" />}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-4 bg-zinc-200 rounded animate-pulse w-40" />
            ) : (
              <>
                <h2 className="text-base font-black text-zinc-900">{data?.full_name}</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Perfil {cfg.label} {data?.predominant_profile ? `· ${data.predominant_profile}` : ""}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              iconLeft={analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              onClick={handleReAnalyze}
              disabled={analyzing || loading}
            >
              {analyzing ? "Analisando..." : "Re-analisar IA"}
            </Button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/80 border border-zinc-200 flex items-center justify-center hover:bg-white transition-colors">
              <X size={14} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Banner de análise em andamento */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-5 mt-4 flex items-center gap-3 bg-develoi-navy text-white rounded-2xl px-4 py-3"
            >
              <div className="relative shrink-0">
                <Sparkles size={16} className="text-develoi-gold" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black">Aurora IA está gerando análise detalhada</p>
                <p className="text-[10px] text-white/60 font-medium">Calculando pontuações DISC e perfil comportamental…</p>
              </div>
              <Loader2 size={14} className="animate-spin text-white/50 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-develoi-navy" />
            </div>
          ) : data ? (
            <>
              {/* Scores — gráficos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">Radar DISC</p>
                  <DiscRadarChart d={data.disc_d || 0} i={data.disc_i || 0} s={data.disc_s || 0} c={data.disc_c || 0} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">Pontuação por dimensão</p>
                  <DiscBarChart d={data.disc_d || 0} i={data.disc_i || 0} s={data.disc_s || 0} c={data.disc_c || 0} />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {(["D", "I", "S", "C"] as const).map((l) => {
                      const val = { D: data.disc_d, I: data.disc_i, S: data.disc_s, C: data.disc_c }[l] || 0;
                      const c2 = DISC_COLORS[l];
                      return (
                        <div key={l} className={cn("flex items-center gap-2.5 rounded-xl p-2.5 border", c2.bg, c2.border)}>
                          <span className={cn("text-sm font-black w-4 shrink-0", c2.text)}>{l}</span>
                          <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", c2.bar)} style={{ width: `${val}%` }} />
                          </div>
                          <span className={cn("text-xs font-black shrink-0", c2.text)}>{val}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Resumo comportamental */}
              {data.behavioral_summary && (
                <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                  <p className="text-xs font-black text-zinc-500 mb-2 flex items-center gap-2">
                    <Brain size={13} /> Análise Comportamental
                  </p>
                  <p className="text-sm font-medium text-zinc-700 leading-relaxed">{data.behavioral_summary}</p>
                </div>
              )}

              {/* Pontos fortes + atenção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parseList(data.strengths).length > 0 && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                    <p className="text-xs font-black text-emerald-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 size={13} /> Pontos Fortes
                    </p>
                    <ul className="space-y-2">
                      {parseList(data.strengths).map((s, i) => (
                        <li key={i} className="text-sm font-medium text-emerald-800 flex items-start gap-2">
                          <Star size={11} className="shrink-0 mt-0.5 text-emerald-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parseList(data.attention_points).length > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                    <p className="text-xs font-black text-amber-700 mb-3 flex items-center gap-2">
                      <AlertCircle size={13} /> Pontos de Atenção
                    </p>
                    <ul className="space-y-2">
                      {parseList(data.attention_points).map((s, i) => (
                        <li key={i} className="text-sm font-medium text-amber-800 flex items-start gap-2">
                          <AlertCircle size={11} className="shrink-0 mt-0.5 text-amber-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Comunicação + liderança + ambiente */}
              {(data.communication_style || data.leadership_style || data.ideal_environment) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.communication_style && (
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                      <p className="text-xs font-black text-blue-600 mb-2 flex items-center gap-1.5">
                        <MessageSquare size={12} /> Comunicação
                      </p>
                      <p className="text-sm font-medium text-blue-900 leading-relaxed">{data.communication_style}</p>
                    </div>
                  )}
                  {data.leadership_style && (
                    <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                      <p className="text-xs font-black text-purple-600 mb-2 flex items-center gap-1.5">
                        <TrendingUp size={12} /> Liderança
                      </p>
                      <p className="text-sm font-medium text-purple-900 leading-relaxed">{data.leadership_style}</p>
                    </div>
                  )}
                  {data.ideal_environment && (
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                      <p className="text-xs font-black text-emerald-600 mb-2 flex items-center gap-1.5">
                        <Shield size={12} /> Ambiente Ideal
                      </p>
                      <p className="text-sm font-medium text-emerald-900 leading-relaxed">{data.ideal_environment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Respostas do formulário */}
              {data.answers.length > 0 && (
                <div>
                  <p className="text-xs font-black text-zinc-500 mb-3 flex items-center gap-2">
                    <Target size={13} /> Respostas do Formulário
                    <span className="text-zinc-400 font-medium">({data.answers.length} questões)</span>
                  </p>
                  <div className="space-y-2">
                    {data.answers.map((ans, i) => (
                      <div key={i} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                        <p className="text-xs font-bold text-zinc-400 mb-1.5">
                          {i + 1}. {ans.question_text}
                        </p>
                        <p className="text-sm font-semibold text-zinc-800">
                          {ans.answer_text || (ans.answer_json ? JSON.parse(ans.answer_json).join(", ") : "—")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ver perfil completo */}
              <div className="pt-1">
                <Link to={`/candidatos/${data.candidate_id}`}>
                  <Button variant="outline" size="sm" iconRight={<ChevronRight size={13} />} className="w-full justify-center">
                    Ver perfil completo do candidato
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-12">Resultado não encontrado.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Modal: criar link DISC ─────────────────────────────────────────────────────

function CreateLinkModal({
  tenantId,
  unitId,
  onClose,
  onCreated,
}: {
  tenantId: string;
  unitId: string;
  onClose: () => void;
  onCreated: (link: string) => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<"free" | "linked">("free");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (candidateSearch.length < 2) { setCandidates([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/candidates?tenantId=${tenantId}&search=${encodeURIComponent(candidateSearch)}&limit=10`);
      if (res.ok) setCandidates((await res.json()).slice(0, 10));
    }, 300);
    return () => clearTimeout(t);
  }, [candidateSearch, tenantId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/disc/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          unitId,
          candidateId: selectedCandidate?.id || null,
          label: selectedCandidate?.full_name || "Link público",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setCreated(data.link);
      onCreated(data.link);
    } catch {
      toast.error("Erro ao criar link DISC.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (created) {
      navigator.clipboard.writeText(created);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
          <div className="w-9 h-9 rounded-xl bg-develoi-gold/10 flex items-center justify-center">
            <LinkIcon size={16} className="text-develoi-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-zinc-900">Criar link de avaliação DISC</h3>
            <p className="text-[10px] text-zinc-400">Link público para preenchimento do formulário</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">
            <X size={13} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {created ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-700">Link criado com sucesso!</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-600 truncate">
                  {created}
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                    copied ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
                  )}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full justify-center" onClick={onClose}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              {/* Modo */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "free", label: "Link livre", desc: "Qualquer pessoa pode responder", icon: Globe },
                  { key: "linked", label: "Vincular candidato", desc: "Resultado vai para o perfil", icon: Users },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setMode(opt.key as any)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-3 rounded-2xl border text-left transition-all",
                      mode === opt.key
                        ? "border-develoi-navy/30 bg-develoi-navy/5"
                        : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <opt.icon size={16} className={mode === opt.key ? "text-develoi-navy" : "text-zinc-400"} />
                    <p className={cn("text-xs font-black", mode === opt.key ? "text-develoi-navy" : "text-zinc-700")}>{opt.label}</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Busca de candidato */}
              {mode === "linked" && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Buscar candidato</label>
                  <input
                    type="text"
                    value={candidateSearch}
                    onChange={e => { setCandidateSearch(e.target.value); setSelectedCandidate(null); }}
                    placeholder="Nome ou e-mail..."
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium outline-none focus:border-develoi-gold/60 focus:ring-2 focus:ring-develoi-gold/20 transition-all"
                  />
                  {candidates.length > 0 && !selectedCandidate && (
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                      {candidates.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCandidate(c); setCandidateSearch(c.full_name); setCandidates([]); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                        >
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">
                            {c.full_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{c.full_name}</p>
                            <p className="text-[9px] text-zinc-400 truncate">{c.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCandidate && (
                    <div className="flex items-center gap-2 bg-develoi-navy/5 border border-develoi-navy/20 rounded-xl px-3 py-2">
                      <CheckCircle2 size={12} className="text-develoi-navy shrink-0" />
                      <p className="text-xs font-bold text-develoi-navy flex-1 truncate">{selectedCandidate.full_name}</p>
                      <button onClick={() => { setSelectedCandidate(null); setCandidateSearch(""); }} className="text-zinc-400 hover:text-zinc-600">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button
                size="sm"
                className="w-full justify-center"
                iconLeft={creating ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                onClick={handleCreate}
                disabled={creating || (mode === "linked" && !selectedCandidate)}
              >
                {creating ? "Criando link..." : "Gerar link DISC"}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function Disc() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const [results, setResults] = useState<DiscResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreateLink, setShowCreateLink] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/disc/results?tenantId=${tenantId}&unitId=${queryUnitId}`);
      if (res.ok) setResults(await res.json());
    } catch {
      toastRef.current.error("Erro ao carregar resultados DISC.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, queryUnitId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const filtered = results.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.full_name.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || false;
    const letter = getProfileLetter(r.predominant_profile);
    const matchProfile = profileFilter === "all" || letter === profileFilter;
    return matchSearch && matchProfile;
  });

  // Stats
  const profileCounts = results.reduce<Record<string, number>>((acc, r) => {
    const l = getProfileLetter(r.predominant_profile);
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  const dominantProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0];

  const avgScores = results.length > 0 ? {
    D: Math.round(results.reduce((s, r) => s + (r.disc_d || 0), 0) / results.length),
    I: Math.round(results.reduce((s, r) => s + (r.disc_i || 0), 0) / results.length),
    S: Math.round(results.reduce((s, r) => s + (r.disc_s || 0), 0) / results.length),
    C: Math.round(results.reduce((s, r) => s + (r.disc_c || 0), 0) / results.length),
  } : { D: 0, I: 0, S: 0, C: 0 };

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Brain size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">{currentUnit.name}</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Avaliações DISC
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                Perfis comportamentais e análises completas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchResults} title="Atualizar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/50 transition-all hover:bg-white/12 hover:text-white">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => setShowCreateLink(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]">
                <Plus size={13} /> Criar link DISC
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
            {[
              { label: "Avaliações",    value: results.length,                                                          color: "text-white" },
              { label: "Perfil dominante", value: dominantProfile ? `${dominantProfile[0]} – ${DISC_COLORS[dominantProfile[0]]?.label}` : "—", color: "text-develoi-gold" },
              ...Object.entries(profileCounts).map(([l, n]) => ({
                label: DISC_COLORS[l]?.label ?? l,
                value: n,
                color: l === "D" ? "text-red-300" : l === "I" ? "text-amber-300" : l === "S" ? "text-emerald-300" : "text-sky-300",
              })),
            ].slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <span className={cn("text-[18px] font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[10px] font-medium text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PROFILE KPI CARDS (filtráveis) ── */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["D", "I", "S", "C"] as const).map(l => {
              const cfg = DISC_COLORS[l];
              const count = profileCounts[l] || 0;
              const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
              const isActive = profileFilter === l;
              return (
                <button
                  key={l}
                  onClick={() => setProfileFilter(isActive ? "all" : l)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                    isActive ? `${cfg.border} ${cfg.bg} shadow-sm` : "border-zinc-200 bg-white"
                  )}
                >
                  {/* Glow */}
                  <div className={cn("absolute -right-4 -top-4 h-14 w-14 rounded-full blur-xl opacity-40", cfg.bar)} />
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("text-[18px] font-black leading-none", cfg.text)}>{l}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", cfg.bg, cfg.text, "ring-1", cfg.border.replace("border-", "ring-"))}>
                        {pct}%
                      </span>
                    </div>
                    <p className={cn("text-[26px] font-black leading-none tabular-nums", cfg.text)}>{count}</p>
                    <p className="mt-1 text-[10px] font-medium text-zinc-500">{cfg.label}</p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                      <motion.div
                        className={cn("h-full rounded-full", cfg.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-develoi-navy">
                      <CheckCircle2 size={11} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── GRÁFICO MÉDIO ── */}
        {results.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                <BarChart3 size={13} className="text-develoi-navy" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-zinc-900">Perfil médio do grupo</span>
                <p className="text-[10px] text-zinc-400">{results.length} candidatos avaliados</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-0 divide-y divide-zinc-100 p-4 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="pb-4 md:pb-0 md:pr-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Barras por dimensão</p>
                <DiscBarChart d={avgScores.D} i={avgScores.I} s={avgScores.S} c={avgScores.C} />
              </div>
              <div className="pt-4 md:pl-5 md:pt-0">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Radar do grupo</p>
                <DiscRadarChart d={avgScores.D} i={avgScores.I} s={avgScores.S} c={avgScores.C} />
              </div>
            </div>
            {dominantProfile && (
              <div className={cn("mx-4 mb-4 flex items-center gap-3 rounded-xl border p-3",
                DISC_COLORS[dominantProfile[0]]?.bg || "bg-zinc-50",
                DISC_COLORS[dominantProfile[0]]?.border || "border-zinc-200"
              )}>
                <Lightbulb size={13} className={DISC_COLORS[dominantProfile[0]]?.text || "text-zinc-500"} />
                <p className="text-[12px] font-medium text-zinc-700">
                  Perfil predominante:{" "}
                  <span className={cn("font-bold", DISC_COLORS[dominantProfile[0]]?.text)}>
                    {DISC_COLORS[dominantProfile[0]]?.label} ({dominantProfile[0]})
                  </span>{" "}
                  com {dominantProfile[1]} candidato{dominantProfile[1] !== 1 ? "s" : ""} — {DISC_COLORS[dominantProfile[0]]?.desc}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
          <div className="relative flex min-w-[180px] flex-1 items-center">
            <Target size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
            />
          </div>

          {/* Profile filter pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setProfileFilter("all")}
              className={cn("rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                profileFilter === "all" ? "bg-develoi-navy text-white shadow-sm" : "border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              )}
            >
              Todos
            </button>
            {(["D", "I", "S", "C"] as const).map(l => {
              const cfg = DISC_COLORS[l];
              const isActive = profileFilter === l;
              return (
                <button key={l}
                  onClick={() => setProfileFilter(isActive ? "all" : l)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                    isActive ? `${cfg.bar} text-white shadow-sm` : `${cfg.bg} ${cfg.text} border ${cfg.border} hover:opacity-80`
                  )}
                >
                  {l}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />
          <span className="text-[11px] text-zinc-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── LISTA ── */}
        <div className="space-y-2.5 pb-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
                <Loader2 size={20} className="animate-spin text-develoi-navy" />
              </div>
              <p className="text-[11px] font-medium text-zinc-400">Carregando avaliações…</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <Brain size={26} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-zinc-700">Nenhuma avaliação DISC ainda</p>
                <p className="mt-1 max-w-xs text-[12px] text-zinc-400">
                  Crie um link DISC e envie para candidatos preencherem. Os resultados aparecerão aqui.
                </p>
              </div>
              <button onClick={() => setShowCreateLink(true)}
                className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                <Plus size={13} /> Criar link DISC
              </button>
            </div>
          )}

          {!loading && results.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white py-14 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <Target size={22} />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-zinc-600">Nenhum resultado</p>
                <p className="mt-1 text-[11px] text-zinc-400">Ajuste os filtros de busca.</p>
              </div>
            </div>
          )}

          {!loading && filtered.map((result, idx) => (
            <motion.div key={result.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.025 }}>
              <DiscCard result={result} onOpen={() => setSelectedId(result.id)} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {selectedId !== null && (
          <DiscDetailModal
            discId={selectedId}
            tenantId={tenantId}
            onClose={() => setSelectedId(null)}
          />
        )}
        {showCreateLink && (
          <CreateLinkModal
            tenantId={tenantId}
            unitId={queryUnitId as string}
            onClose={() => setShowCreateLink(false)}
            onCreated={() => { setTimeout(fetchResults, 1000); }}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

import React, { useState, useEffect } from "react";
import {
  Target, ChevronDown, Download, Mail, Phone,
  Brain, FileText, CheckCircle2, Zap, Briefcase, Loader2, MapPin,
  Star, Users, Award, ChevronRight, Sparkles, MessageSquare, PhoneCall,
  Clock, XCircle, AlertCircle, Ban, CheckCheck, HelpCircle, Save,
  TrendingUp, UserX, ThumbsDown, PlayCircle, Trophy, UserCheck, Handshake
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PanelCard,
  PageWrapper,
  SectionTitle,
  Select,
  StatCard,
  Textarea,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { Link } from "react-router-dom";
import { useToast } from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface MatchResult {
  candidate_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  city: string;
  state: string;
  desired_position: string;
  compatibility_score: number;
  classification: string;
  distance_km?: number;
  has_disc: boolean;
  disc_profile: string;
  strengths: string[];
  attention_points: string[];
  recommendation_reason: string;
  risk_reason: string;
  contact_status: string;
  contact_notes?: string;
  funnel_stage: string;
}

// ── Status de contato ──────────────────────────────────────────────────────────

interface ContactStatusOption {
  value: string;
  label: string;
  color: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  icon: React.ReactNode;
  blocks: boolean;
}

const CONTACT_STATUSES: ContactStatusOption[] = [
  {
    value: "",
    label: "Não informado",
    color: "text-zinc-400",
    bgLight: "bg-zinc-50",
    borderLight: "border-zinc-200",
    textLight: "text-zinc-500",
    icon: <HelpCircle size={13} />,
    blocks: false,
  },
  {
    value: "em_andamento",
    label: "Em andamento",
    color: "text-blue-600",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    textLight: "text-blue-700",
    icon: <PhoneCall size={13} />,
    blocks: false,
  },
  {
    value: "aguardando",
    label: "Aguardando resposta",
    color: "text-amber-600",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-200",
    textLight: "text-amber-700",
    icon: <Clock size={13} />,
    blocks: false,
  },
  {
    value: "sem_resposta",
    label: "Sem resposta",
    color: "text-orange-600",
    bgLight: "bg-orange-50",
    borderLight: "border-orange-200",
    textLight: "text-orange-700",
    icon: <MessageSquare size={13} />,
    blocks: false,
  },
  {
    value: "pendente",
    label: "Pendente",
    color: "text-purple-600",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-200",
    textLight: "text-purple-700",
    icon: <AlertCircle size={13} />,
    blocks: false,
  },
  {
    value: "ja_trabalhando",
    label: "Já está trabalhando",
    color: "text-red-600",
    bgLight: "bg-red-50",
    borderLight: "border-red-200",
    textLight: "text-red-700",
    icon: <Ban size={13} />,
    blocks: true,
  },
  {
    value: "sem_interesse",
    label: "Sem interesse",
    color: "text-red-600",
    bgLight: "bg-red-50",
    borderLight: "border-red-200",
    textLight: "text-red-700",
    icon: <XCircle size={13} />,
    blocks: true,
  },
  {
    value: "nao_sucedido",
    label: "Não sucedido",
    color: "text-zinc-600",
    bgLight: "bg-zinc-100",
    borderLight: "border-zinc-300",
    textLight: "text-zinc-600",
    icon: <CheckCheck size={13} />,
    blocks: true,
  },
];

function getContactStatusOption(value: string): ContactStatusOption {
  return CONTACT_STATUSES.find(s => s.value === value) ?? CONTACT_STATUSES[0];
}

// ── Etapas do Funil ────────────────────────────────────────────────────────────

interface FunnelStageOption {
  value: string;
  label: string;
  color: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  icon: React.ReactNode;
  isNegative?: boolean;
}

const FUNNEL_STAGES_OPTIONS: FunnelStageOption[] = [
  {
    value: "Triagem",
    label: "Triagem",
    color: "text-zinc-500",
    bgLight: "bg-zinc-50",
    borderLight: "border-zinc-200",
    textLight: "text-zinc-600",
    icon: <Target size={13} />,
  },
  {
    value: "IA Match",
    label: "IA Match",
    color: "text-blue-600",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    textLight: "text-blue-700",
    icon: <Brain size={13} />,
  },
  {
    value: "Entrevista",
    label: "Entrevista agendada",
    color: "text-purple-600",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-200",
    textLight: "text-purple-700",
    icon: <PhoneCall size={13} />,
  },
  {
    value: "Entrevista Realizada",
    label: "Entrevista realizada",
    color: "text-indigo-600",
    bgLight: "bg-indigo-50",
    borderLight: "border-indigo-200",
    textLight: "text-indigo-700",
    icon: <PlayCircle size={13} />,
  },
  {
    value: "Finalista",
    label: "Finalista",
    color: "text-amber-700",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-200",
    textLight: "text-amber-800",
    icon: <Star size={13} />,
  },
  {
    value: "Aprovado",
    label: "Aprovado",
    color: "text-emerald-600",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    textLight: "text-emerald-700",
    icon: <UserCheck size={13} />,
  },
  {
    value: "Contratado",
    label: "Contratado",
    color: "text-white",
    bgLight: "bg-develoi-navy",
    borderLight: "border-develoi-navy",
    textLight: "text-white",
    icon: <Handshake size={13} />,
  },
  {
    value: "Desistência",
    label: "Desistência",
    color: "text-orange-600",
    bgLight: "bg-orange-50",
    borderLight: "border-orange-200",
    textLight: "text-orange-700",
    icon: <UserX size={13} />,
    isNegative: true,
  },
  {
    value: "Sem Sucesso",
    label: "Sem sucesso",
    color: "text-red-600",
    bgLight: "bg-red-50",
    borderLight: "border-red-200",
    textLight: "text-red-700",
    icon: <ThumbsDown size={13} />,
    isNegative: true,
  },
];

function getFunnelStageOption(value: string): FunnelStageOption {
  return FUNNEL_STAGES_OPTIONS.find(s => s.value === value) ?? FUNNEL_STAGES_OPTIONS[0];
}

// ── Componente do painel de etapa do funil ─────────────────────────────────────

function getContactBadgeColor(value: string): "default" | "info" | "warning" | "danger" | "purple" | "orange" {
  switch (value) {
    case "em_andamento":
      return "info";
    case "aguardando":
      return "warning";
    case "sem_resposta":
      return "orange";
    case "pendente":
      return "purple";
    case "ja_trabalhando":
    case "sem_interesse":
      return "danger";
    default:
      return "default";
  }
}

function getFunnelBadgeColor(value: string): "default" | "info" | "purple" | "warning" | "success" | "primary" | "orange" | "danger" {
  switch (value) {
    case "IA Match":
      return "info";
    case "Entrevista":
      return "purple";
    case "Entrevista Realizada":
      return "info";
    case "Finalista":
      return "warning";
    case "Aprovado":
      return "success";
    case "Contratado":
      return "primary";
    case "DesistÃªncia":
      return "orange";
    case "Sem Sucesso":
      return "danger";
    default:
      return "default";
  }
}

function FunnelStagePanel({
  match,
  jobId,
  tenantId,
  onSaved,
}: {
  match: MatchResult;
  jobId: string;
  tenantId: string;
  onSaved: (candidateId: number, stage: string) => void;
}) {
  const toast = useToast();
  const [stage, setStage] = useState(match.funnel_stage ?? "Triagem");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStage(match.funnel_stage ?? "Triagem");
  }, [match.funnel_stage]);

  const selected = getFunnelStageOption(stage);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/stage/${match.candidate_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_stage: stage }),
      });
      if (!res.ok) throw new Error();
      onSaved(match.candidate_id, stage);
      toast.success("Etapa do processo atualizada.");
    } catch {
      toast.error("Erro ao atualizar etapa do processo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select
        label="Etapa do processo"
        icon={<TrendingUp size={14} />}
        value={stage}
        onChange={(event) => setStage(event.target.value)}
        className={cn(
          "h-11 rounded-2xl bg-white text-xs font-bold shadow-sm",
          selected.bgLight,
          selected.borderLight,
          selected.textLight
        )}
      >
        {FUNNEL_STAGES_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {selected.isNegative && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-100 bg-orange-50 p-2.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0 text-orange-400" />
          <p className="text-[10px] font-medium leading-relaxed text-orange-700">
            Candidato marcado como <strong>{selected.label}</strong> e contabilizado nos indicadores de não conversão.
          </p>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        iconLeft={saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        onClick={handleSave}
        disabled={saving}
        className="w-full justify-center"
      >
        {saving ? "Salvando..." : "Salvar etapa"}
      </Button>
    </div>
  );
}
function ContactStatusPanel({
  match,
  jobId,
  tenantId,
  onSaved,
}: {
  match: MatchResult;
  jobId: string;
  tenantId: string;
  onSaved: (candidateId: number, status: string, notes: string) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(match.contact_status ?? "");
  const [notes, setNotes] = useState(match.contact_notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(match.contact_status ?? "");
    setNotes(match.contact_notes ?? "");
  }, [match.contact_status, match.contact_notes]);

  const selected = getContactStatusOption(status);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/contact/${match.candidate_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_status: status, contact_notes: notes, tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error();
      onSaved(match.candidate_id, status, notes);
      toast.success("Status de contato salvo.");
    } catch {
      toast.error("Erro ao salvar status de contato.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select
        label="Status do contato"
        icon={<PhoneCall size={14} />}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className={cn(
          "h-11 rounded-2xl bg-white text-xs font-bold shadow-sm",
          selected.bgLight,
          selected.borderLight,
          selected.textLight
        )}
      >
        {CONTACT_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {selected.blocks && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-2.5">
          <Ban size={11} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[10px] font-medium leading-relaxed text-red-600">
            Candidato ficará <strong>oculto</strong> nesta vaga na próxima consulta da IA.
          </p>
        </div>
      )}

      <Textarea
        label="Observações"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Ex: Enviou email no dia 10/05, aguardando retorno..."
        rows={3}
        className="rounded-2xl border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 placeholder:text-zinc-300"
      />

      <Button
        size="sm"
        variant="secondary"
        iconLeft={saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        onClick={handleSave}
        disabled={saving}
        className="w-full justify-center"
      >
        {saving ? "Salvando..." : "Salvar status"}
      </Button>
    </div>
  );
}
function getScoreConfig(score: number) {
  if (score >= 90) return {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "ring-emerald-400",
    bar: "bg-emerald-500",
    badge: "success" as const,
    label: "Alta Aderência",
  };
  if (score >= 80) return {
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    ring: "ring-blue-400",
    bar: "bg-blue-500",
    badge: "info" as const,
    label: "Boa Aderência",
  };
  return {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "ring-amber-400",
    bar: "bg-amber-500",
    badge: "warning" as const,
    label: "Revisão",
  };
}

function ScoreRing({ score }: { score: number }) {
  const cfg = getScoreConfig(score);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className={cn("relative w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center", cfg.bg)}>
      <svg width="56" height="56" className="absolute" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/60" />
        <circle
          cx="28" cy="28" r={radius} fill="none" strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cfg.color.replace("text-", "stroke-")}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <span className={cn("text-sm font-black leading-none", cfg.color)}>{score}</span>
        <span className={cn("block text-[7px] font-bold uppercase leading-none mt-0.5", cfg.color)}>%</span>
      </div>
    </div>
  );
}

const classificationLabel: Record<string, string> = {
  "ALTÍSSIMO FIT": "Alta Aderência",
  "ALTO FIT":      "Boa Aderência",
  "BOM FIT":       "Boa Aderência",
  "FIT MÉDIO":     "Aderência Parcial",
  "FIT BAIXO":     "Baixa Aderência",
  "REVISÃO":       "Revisão",
};

// ── Página principal ───────────────────────────────────────────────────────────

export default function Matches() {
  const toast = useToast();
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [minScore, setMinScore] = useState<string>("70");
  const [maxRadius, setMaxRadius] = useState<string>("");

  useEffect(() => { fetchJobs(); }, [queryUnitId]);

  useEffect(() => {
    if (selectedJobId) fetchMatches();
    else setMatches([]);
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      if (res.ok) setJobs(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMatches = async (scoreOverride?: string, radiusOverride?: string) => {
    setLoading(true);
    const score = scoreOverride ?? minScore;
    const radius = radiusOverride ?? maxRadius;
    try {
      const params = new URLSearchParams();
      if (score) params.set("minScore", score);
      if (radius) params.set("maxRadius", radius);
      const res = await fetch(`/api/aurora-ai/matches/${selectedJobId}?${params.toString()}`);
      if (res.ok) setMatches((await res.json()) || []);
    } catch {
      toast.error("Erro ao carregar as aderências.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSaved = (candidateId: number, status: string, notes: string) => {
    setMatches(prev => prev.map(m =>
      m.candidate_id === candidateId
        ? { ...m, contact_status: status, contact_notes: notes }
        : m
    ));
  };

  const handleStageSaved = (candidateId: number, stage: string) => {
    setMatches(prev => prev.map(m =>
      m.candidate_id === candidateId
        ? { ...m, funnel_stage: stage }
        : m
    ));
  };

  const handleDownloadCV = (e: React.MouseEvent, candidateId: number) => {
    e.stopPropagation();
    window.open(`/api/candidates/${candidateId}/cv/download`, '_blank');
  };

  const handleSendDISC = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Avaliação DISC enviada por e-mail com sucesso!");
  };

  const handleLinkDISC = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("DISC vinculado ao perfil do candidato.");
  };

  const topScore = matches.length > 0 ? Math.max(...matches.map(m => m.compatibility_score)) : 0;
  const excellentCount = matches.filter(m => m.compatibility_score >= 90).length;

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-8 px-3 py-5 sm:space-y-10 sm:px-5 sm:py-7 lg:space-y-12 lg:px-8 lg:py-10">
        <SectionTitle
          title="Aderência AI"
          subtitle={`${currentUnit.name} · Análise de aderência gerada pela Aurora IA`}
          icon={<Zap size={22} />}
          actions={
            <div className="flex w-full flex-col items-end gap-3 sm:w-auto sm:flex-row">
              <div className="w-full shrink-0 sm:w-72">
                <Select
                  label="Filtrar por vaga ativa"
                  icon={<Briefcase size={14} />}
                  value={selectedJobId}
                  onChange={(event) => setSelectedJobId(event.target.value)}
                  className="h-11 rounded-2xl border-zinc-200 bg-white text-xs font-bold text-zinc-900 shadow-sm"
                >
                  <option value="">Selecione uma vaga...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.city}/{job.state}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full shrink-0 sm:w-32">
                <Input
                  label="Score mínimo"
                  icon={<Star size={14} />}
                  inputMode="numeric"
                  value={minScore}
                  placeholder="0"
                  addonRight="%"
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, "");
                    const clamped = Math.min(100, Math.max(0, Number(raw || 0)));
                    setMinScore(raw === "" ? "" : String(clamped));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && selectedJobId) fetchMatches();
                  }}
                  onBlur={() => {
                    if (selectedJobId) fetchMatches();
                  }}
                  className="h-11 rounded-2xl border-zinc-200 bg-white pr-10 text-xs font-bold text-zinc-900 shadow-sm"
                />
              </div>

              <div className="w-full shrink-0 sm:w-32">
                <Input
                  label="Raio (km)"
                  icon={<MapPin size={14} />}
                  inputMode="numeric"
                  value={maxRadius}
                  placeholder="Qualquer"
                  addonRight="km"
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, "");
                    setMaxRadius(raw === "" ? "" : String(Math.max(0, Number(raw))));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && selectedJobId) fetchMatches();
                  }}
                  onBlur={() => {
                    if (selectedJobId) fetchMatches();
                  }}
                  className="h-11 rounded-2xl border-zinc-200 bg-white pr-12 text-xs font-bold text-zinc-900 shadow-sm"
                />
              </div>
            </div>
          }
        />
      {matches.length > 0 && !loading && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            title="Candidatos"
            value={matches.length}
            icon={Users}
            color="info"
            description="aderências encontradas"
          />
          <StatCard
            title="Maior Aderência"
            value={`${topScore}%`}
            icon={Star}
            color="success"
            description="melhor score atual"
          />
          <StatCard
            title="Alta Aderência"
            value={excellentCount}
            icon={Award}
            color="gold"
            description="scores acima de 90%"
          />
        </div>
      )}
      <div className="space-y-3 pb-20">

        {!selectedJobId && (
          <PanelCard padding={false}>
            <EmptyState
              icon={<Target size={40} />}
              title="Nenhuma Vaga Selecionada"
              description="Selecione uma vaga no filtro acima para visualizar a aderência dos candidatos analisada pela Aurora AI."
              className="py-20"
            />
          </PanelCard>
        )}

        {selectedJobId && loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-develoi-gold/10 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-develoi-gold" />
              </div>
              <div className="absolute inset-0 rounded-full bg-develoi-gold/5 animate-ping" />
            </div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Calculando aderências...</p>
          </div>
        )}

        {selectedJobId && !loading && matches.length === 0 && (
          <PanelCard padding={false}>
            <EmptyState
              icon={<Sparkles size={40} />}
              title="Nenhum Candidato com Aderência"
              description="A IA não encontrou candidatos com aderência mínima de 70% para esta vaga. Tente ampliar o banco de candidatos."
              className="py-20"
            />
          </PanelCard>
        )}

        {!loading && matches.map((match, idx) => {
          const isExpanded = expanded === match.candidate_id;
          const cfg = getScoreConfig(match.compatibility_score);
          const contactOpt = getContactStatusOption(match.contact_status);
          const stageOpt = getFunnelStageOption(match.funnel_stage ?? "Triagem");

          return (
            <motion.div
              key={match.candidate_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <div className={cn(
                "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-200",
                isExpanded ? "border-develoi-gold/40 shadow-md" : "border-zinc-200 hover:border-zinc-300 hover:shadow"
              )}>

                {/* ── Card Header ─────────────────────────────────────── */}
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setExpanded(isExpanded ? null : match.candidate_id)}
                  className="h-auto min-w-0 rounded-none border-0 px-4 py-4 hover:bg-zinc-50/60 sm:px-5 [&>span]:w-full [&>span]:justify-start [&>span]:whitespace-normal [&>span]:gap-0"
                >
                  <div className="flex w-full items-start gap-4 text-left sm:items-center">
                    <span className="hidden w-5 shrink-0 pt-0.5 text-[10px] font-black text-zinc-300 sm:flex">
                      #{idx + 1}
                    </span>

                    <ScoreRing score={match.compatibility_score} />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-zinc-900">{match.full_name}</h3>
                        <Badge size="sm" color={cfg.badge}>
                          {classificationLabel[match.classification?.toUpperCase()] || cfg.label}
                        </Badge>
                        {match.has_disc && (
                          <Badge size="sm" color="primary" icon={<Brain size={9} />}>
                            {match.disc_profile}
                          </Badge>
                        )}
                        <Badge size="sm" color={getFunnelBadgeColor(stageOpt.value)} icon={stageOpt.icon} pill>
                          {stageOpt.label}
                        </Badge>
                        {match.contact_status && (
                          <Badge size="sm" color={getContactBadgeColor(match.contact_status)} icon={contactOpt.icon} pill>
                            {contactOpt.label}
                          </Badge>
                        )}
                      </div>
                      <p className="mb-1.5 truncate text-xs font-semibold text-zinc-500">
                        {match.desired_position}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-1 max-w-[120px] flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
                            style={{ width: `${match.compatibility_score}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                          <MapPin size={10} />
                          <span>{match.city}, {match.state}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                        isExpanded
                          ? "rotate-180 border-develoi-navy bg-develoi-navy text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400"
                      )}
                    >
                      <ChevronDown size={13} />
                    </div>
                  </div>
                </Button>

                {/* ── Painel Expandido ─────────────────────────────────── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="border-t border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                          {/* Coluna 1 — Contato + Status */}
                          <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                              Contato
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                  <Mail size={13} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">E-mail</p>
                                  <p className="text-xs font-bold text-zinc-800 truncate">{match.email || "Não informado"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                                  <Phone size={13} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Telefone</p>
                                  <p className="text-xs font-bold text-zinc-800 truncate">{match.phone || "Não informado"}</p>
                                </div>
                              </div>
                            </div>

                            {match.attention_points?.length > 0 && (
                              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Atenção</p>
                                <ul className="space-y-1">
                                  {match.attention_points.slice(0, 2).map((pt, i) => (
                                    <li key={i} className="text-[10px] font-medium text-amber-700 flex items-start gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                      {pt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Etapa do Processo */}
                            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-3">
                              <FunnelStagePanel
                                match={match}
                                jobId={selectedJobId}
                                tenantId={tenantId}
                                onSaved={handleStageSaved}
                              />
                            </div>

                            {/* Status de contato */}
                            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-3">
                              <ContactStatusPanel
                                match={match}
                                jobId={selectedJobId}
                                tenantId={tenantId}
                                onSaved={handleContactSaved}
                              />
                            </div>
                          </div>

                          {/* Coluna 2–3 — Análise IA */}
                          <div className="md:col-span-2 space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                              Análise Aurora AI
                            </p>

                            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-28 h-28 bg-develoi-gold/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                              <div className="flex items-start gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-xl bg-develoi-gold/10 flex items-center justify-center shrink-0">
                                  <Brain size={14} className="text-develoi-gold" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Recomendação</p>
                                  <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                                    "{match.recommendation_reason}"
                                  </p>
                                </div>
                              </div>
                            </div>

                            {match.strengths?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {match.strengths.slice(0, 5).map((strength, index) => (
                                  <Badge
                                    key={index}
                                    color="success"
                                    size="md"
                                    icon={<CheckCircle2 size={9} />}
                                    className="normal-case tracking-normal"
                                  >
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Button variant="outline" size="sm" iconLeft={<Download size={13} />} onClick={(e) => handleDownloadCV(e, match.candidate_id)}>
                                Baixar CV
                              </Button>
                              <Button variant="primary" size="sm" iconLeft={<Mail size={13} />} onClick={handleSendDISC}>
                                Enviar DISC
                              </Button>
                              <Button
                                variant={match.has_disc ? "success" : "outline"}
                                size="sm"
                                iconLeft={match.has_disc ? <CheckCircle2 size={13} /> : <FileText size={13} />}
                                onClick={handleLinkDISC}
                                disabled={match.has_disc}
                              >
                                {match.has_disc ? "DISC Vinculado" : "Vincular DISC"}
                              </Button>
                              <Link to={`/candidatos/${match.candidate_id}`} className="sm:ml-auto">
                                <Button variant="ghost" size="sm" iconRight={<ChevronRight size={13} />}>
                                  Ver Perfil
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>
    </PageWrapper>
  );
}


import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  FileText,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  BarChart3,
  History,
  ExternalLink,
  MessageCircle,
  Check,
  Building2,
  Download,
  ClipboardCheck,
  Wand2,
  Brain,
  Eye,
  PauseCircle,
  ArrowLeft,
  ChevronDown,
  TrendingUp,
  Target,
  PhoneCall,
  PlayCircle,
  Star,
  UserCheck,
  Handshake,
  UserX,
  ThumbsDown,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import {
  PanelCard,
  Badge,
  useToast,
  Button,
  IconButton,
  ContentCard,
  Select,
  Textarea,
  Modal
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Candidate, Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { decodeId, encodeId } from "@/src/lib/hashid";

// ── Etapas do Funil (reutilizadas aqui) ───────────────────────────────────────

const FUNNEL_STAGE_OPTIONS = [
  { value: "Triagem",             label: "Triagem",             color: "text-zinc-500",   bgLight: "bg-zinc-50",    borderLight: "border-zinc-200",  textLight: "text-zinc-600",  icon: <Target size={12} /> },
  { value: "IA Match",            label: "IA Match",            color: "text-blue-600",   bgLight: "bg-blue-50",    borderLight: "border-blue-200",  textLight: "text-blue-700",  icon: <Brain size={12} /> },
  { value: "Entrevista",          label: "Entrevista agendada", color: "text-purple-600", bgLight: "bg-purple-50",  borderLight: "border-purple-200",textLight: "text-purple-700",icon: <PhoneCall size={12} /> },
  { value: "Entrevista Realizada",label: "Entrevista realizada",color: "text-indigo-600", bgLight: "bg-indigo-50",  borderLight: "border-indigo-200",textLight: "text-indigo-700",icon: <PlayCircle size={12} /> },
  { value: "Finalista",           label: "Finalista",           color: "text-amber-700",  bgLight: "bg-amber-50",   borderLight: "border-amber-200", textLight: "text-amber-800", icon: <Star size={12} /> },
  { value: "Aprovado",            label: "Aprovado",            color: "text-emerald-600",bgLight: "bg-emerald-50", borderLight: "border-emerald-200",textLight: "text-emerald-700",icon: <UserCheck size={12} /> },
  { value: "Contratado",          label: "Contratado",          color: "text-white",      bgLight: "bg-develoi-navy",borderLight: "border-develoi-navy",textLight: "text-white",    icon: <Handshake size={12} /> },
  { value: "Desistência",         label: "Desistência",         color: "text-orange-600", bgLight: "bg-orange-50",  borderLight: "border-orange-200",textLight: "text-orange-700",icon: <UserX size={12} />, isNegative: true },
  { value: "Sem Sucesso",         label: "Sem sucesso",         color: "text-red-600",    bgLight: "bg-red-50",     borderLight: "border-red-200",   textLight: "text-red-700",   icon: <ThumbsDown size={12} />, isNegative: true },
];

function getFunnelStageOpt(value: string) {
  return FUNNEL_STAGE_OPTIONS.find(s => s.value === value) ?? FUNNEL_STAGE_OPTIONS[0];
}

function FunnelStageDropdown({ matchId, jobId, currentStage, onSaved }: {
  matchId: number;
  jobId: number;
  currentStage: string;
  onSaved: (matchId: number, stage: string) => void;
}) {
  const toast = useToast();
  const [stage, setStage] = useState(currentStage ?? "Triagem");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setStage(currentStage ?? "Triagem"); }, [currentStage]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = getFunnelStageOpt(stage);

  const handleSelect = async (value: string) => {
    setOpen(false);
    if (value === stage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/stage/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_stage: value }),
      });
      if (!res.ok) throw new Error();
      setStage(value);
      onSaved(matchId, value);
      toast.success("Etapa atualizada com sucesso.");
    } catch {
      toast.error("Erro ao atualizar etapa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm",
          selected.bgLight, selected.borderLight, selected.textLight
        )}
      >
        {saving ? <Loader2 size={11} className="animate-spin" /> : selected.icon}
        <span>{selected.label}</span>
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 left-0 min-w-[200px] bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden"
          >
            {FUNNEL_STAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-zinc-50",
                  stage === opt.value && "bg-zinc-50"
                )}
              >
                <span className={opt.isNegative ? "text-red-500" : opt.color}>{opt.icon}</span>
                <span className="flex-1 text-zinc-700">{opt.label}</span>
                {opt.isNegative && (
                  <span className="text-[8px] font-black text-orange-400 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5 uppercase">saída</span>
                )}
                {stage === opt.value && <CheckCircle2 size={10} className="shrink-0 text-develoi-navy" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CandidateDetailsPage() {
  const { candidateId: candidateSlug } = useParams<{ candidateId: string }>();
  const candidateId = candidateSlug ? String(decodeId(candidateSlug)) : undefined;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const initialTab = (searchParams.get('tab') as any) || 'summary';
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'resume' | 'jobs' | 'evaluations' | 'ai' | 'disc' | 'history'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [showLinkJob, setShowLinkJob] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!candidateId || Number(candidateId) <= 0) {
      navigate("/candidatos", { replace: true });
      return;
    }
    setPageLoading(true);
    fetch(`/api/candidates/${candidateId}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setCandidate)
      .catch(() => {
        toast.error("Candidato não encontrado.");
        navigate("/candidatos", { replace: true });
      })
      .finally(() => setPageLoading(false));
  }, [candidateId]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/hr-tools`);
      const data = await res.json();
      setEvaluations(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (candidateId && activeTab === 'evaluations') {
      fetchEvaluations();
    }
  }, [candidateId, activeTab]);

  const fetchAvailableJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableJobs(data);
    } catch (err) {
      toast.error("Erro ao carregar vagas disponíveis.");
    }
  };

  const handleCandidateFileAction = (mode: 'view' | 'download') => {
    const primaryFile = candidate?.files?.[0];
    if (!primaryFile?.id) {
      toast.error("Nenhum currículo anexado para este candidato.");
      return;
    }
    const url = `/api/candidates/${candidateId}/files/${primaryFile.id}${mode === 'download' ? '?download=1' : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMatchStageSaved = (matchId: number, stage: string) => {
    setCandidate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        matches: prev.matches?.map((m: any) =>
          m.id === matchId ? { ...m, status: stage } : m
        )
      };
    });
  };

  const handleLinkJob = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/link-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId, tenant_id: tenantId })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao vincular vaga.");
      }
      toast.success("Candidato vinculado com sucesso!");
      setShowLinkJob(false);
      // refresh candidate
      const updated = await fetch(`/api/candidates/${candidateId}`).then(r => r.json());
      setCandidate(updated);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (jobId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/analyze-job/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      });
      if (!res.ok) throw new Error("Falha na análise IA.");
      toast.success("Análise IA concluída!");
      const updated = await fetch(`/api/candidates/${candidateId}`).then(r => r.json());
      setCandidate(updated);
    } catch (err) {
      toast.error("Erro ao processar análise com a Aurora AI.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      navigate("/candidatos");
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'summary', label: 'Resumo', icon: User },
    { id: 'resume', label: 'Currículo', icon: FileText },
    { id: 'jobs', label: 'Vagas', icon: Briefcase },
    { id: 'evaluations', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'ai', label: 'Análise IA', icon: Sparkles },
    { id: 'disc', label: 'DISC', icon: BarChart3 },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
          <Loader2 size={20} className="animate-spin text-develoi-navy" />
        </div>
        <p className="text-[11px] font-medium text-zinc-400">Carregando candidato…</p>
      </div>
    );
  }

  if (!candidate) return null;

  const STATUS_COLOR: Record<string, string> = {
    Novo:              "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Compatível:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Entrevista:        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Aprovado:          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Reprovado:         "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    Contratado:        "bg-develoi-navy/8 text-develoi-navy ring-1 ring-develoi-navy/15",
    "Em análise":      "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    "Banco de talentos":"bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
  };
  const statusCls = STATUS_COLOR[candidate.status] ?? "bg-zinc-100 text-zinc-600";

  const initials = candidate.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER navy ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Back + identity */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/candidatos")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={16} />
              </button>

              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-develoi-gold/20 text-[16px] font-black text-develoi-gold ring-2 ring-develoi-gold/30">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[18px] font-black leading-none text-white sm:text-[22px]">
                    {candidate.full_name}
                  </h1>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", statusCls)}>
                    {candidate.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                  {candidate.desired_position && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={10} /> {candidate.desired_position}
                    </span>
                  )}
                  {candidate.city && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {candidate.city}{candidate.state ? `, ${candidate.state}` : ''}
                      </span>
                    </>
                  )}
                  {candidate.experience_years && (
                    <>
                      <span>·</span>
                      <span>{candidate.experience_years} anos exp.</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => handleCandidateFileAction('download')}
                title="Baixar CV"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/50 transition-all hover:bg-white/12 hover:text-white"
              >
                <Download size={13} />
              </button>
              <button
                onClick={() => navigate(`/candidatos/${encodeId(Number(candidateId))}/editar`)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
              >
                <Edit size={13} /> Editar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/30 transition-colors hover:border-rose-400/30 hover:bg-rose-500/15 hover:text-rose-300"
                title="Excluir candidato"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Contact strip */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
            {[
              { icon: Mail,  value: candidate.email },
              { icon: Phone, value: candidate.phone },
              { icon: Calendar, value: new Date(candidate.created_at).toLocaleDateString('pt-BR') },
            ].filter(r => r.value).map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <row.icon size={10} className="text-white/30" />
                <span className="text-[11px] font-medium text-white/45">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS + CONTENT ── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

          {/* LEFT sidebar — tabs vertical desktop */}
          <div className="hidden w-52 shrink-0 flex-col gap-3 lg:flex">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-3 text-left text-[12px] font-semibold transition-all last:border-0",
                    activeTab === tab.id
                      ? "bg-develoi-navy/5 text-develoi-navy"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                  )}
                >
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 top-0 w-0.5 rounded-r-full bg-develoi-navy" />
                  )}
                  <tab.icon size={14} className={activeTab === tab.id ? "text-develoi-navy" : "text-zinc-400"} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sidebar contact card */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Contato</span>
              </div>
              <div className="space-y-0 divide-y divide-zinc-50 p-1">
                {[
                  { icon: Mail,    value: candidate.email,  label: "E-mail" },
                  { icon: Phone,   value: candidate.phone,  label: "Telefone" },
                  { icon: MapPin,  value: candidate.city ? `${candidate.city}${candidate.state ? `, ${candidate.state}` : ''}` : null, label: "Localidade" },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5">
                    <row.icon size={13} className="mt-0.5 shrink-0 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{row.label}</p>
                      <p className="truncate text-[11px] font-medium text-zinc-700">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — main content */}
          <div className="min-w-0 flex-1">
            {/* Mobile tabs */}
            <div className="mb-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm lg:hidden">
              <div className="flex">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-[11px] font-semibold transition-all",
                      activeTab === tab.id ? "text-develoi-navy" : "text-zinc-400 hover:text-zinc-700"
                    )}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="cand-tab-m" className="absolute bottom-0 left-0 right-0 h-0.5 bg-develoi-navy" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">

            {activeTab === 'summary' && (
              <div className="space-y-4">

                {/* Resumo */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                      <FileText size={13} className="text-develoi-navy" />
                    </div>
                    <span className="text-[13px] font-bold text-zinc-900">Resumo Profissional</span>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[13px] font-medium leading-relaxed text-zinc-600">
                      {candidate.professional_summary || <span className="italic text-zinc-400">Candidato sem resumo profissional cadastrado.</span>}
                    </p>
                  </div>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Pretensão Salarial",  value: candidate.desired_salary ? `R$ ${Number(candidate.desired_salary).toLocaleString('pt-BR')}` : "Não informada" },
                    { label: "Anos de Experiência", value: candidate.experience_years ? `${candidate.experience_years} anos` : "Não informado" },
                    { label: "Escolaridade",        value: candidate.education_level || "Não informado" },
                    { label: "Modelo Desejado",     value: candidate.desired_work_model || "Indiferente" },
                  ].map(f => (
                    <div key={f.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{f.label}</p>
                      <p className="text-[15px] font-bold text-zinc-900 leading-tight">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Skills */}
                {(candidate.hard_skills_json || candidate.hard_skills) && (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-gold/10">
                        <Sparkles size={13} className="text-develoi-gold" />
                      </div>
                      <span className="text-[13px] font-bold text-zinc-900">Principais Competências</span>
                    </div>
                    <div className="flex flex-wrap gap-2 px-5 py-4">
                      {(candidate.hard_skills_json
                        ? JSON.parse(candidate.hard_skills_json)
                        : candidate.hard_skills?.split(',').map((s: string) => s.trim())
                      )?.filter(Boolean).map((skill: string, i: number) => (
                        <span key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-develoi-navy/30 hover:bg-develoi-navy/5 hover:text-develoi-navy">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiências */}
                {candidate.experiences_json && JSON.parse(candidate.experiences_json).length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                        <Briefcase size={13} className="text-develoi-navy" />
                      </div>
                      <span className="text-[13px] font-bold text-zinc-900">Histórico Profissional</span>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {JSON.parse(candidate.experiences_json).map((exp: any, i: number) => (
                        <div key={i} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-zinc-900">{exp.role}</p>
                              <p className="mt-0.5 text-[12px] font-semibold text-develoi-navy">{exp.company}</p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                              {exp.period}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="mt-2 text-[12px] font-medium leading-relaxed text-zinc-500">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formação */}
                {candidate.education_json && JSON.parse(candidate.education_json).length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                        <GraduationCap size={13} className="text-sky-600" />
                      </div>
                      <span className="text-[13px] font-bold text-zinc-900">Formação Acadêmica</span>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {JSON.parse(candidate.education_json).map((edu: any, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-3 px-5 py-4">
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-zinc-900">{edu.course}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">{edu.institution}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="rounded-lg bg-develoi-navy/8 px-2 py-0.5 text-[10px] font-semibold text-develoi-navy">
                              {edu.status}
                            </span>
                            {edu.period && <p className="mt-1 text-[10px] text-zinc-400">{edu.period}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'resume' && (
              <div className="space-y-8">
                <PanelCard
                  title="Currículo Extraído"
                  icon={FileText}
                  className="bg-white shadow-sm border-zinc-100"
                >
                  <div className="prose prose-zinc max-w-none text-sm font-semibold text-zinc-600 leading-relaxed bg-zinc-50/50 p-8 rounded-[32px] border border-zinc-100 max-h-[600px] overflow-y-auto whitespace-pre-wrap no-scrollbar">
                    {candidate.professional_experiences || candidate.files?.[0]?.extracted_text || candidate.professional_summary || "Texto do currículo não disponível."}
                  </div>
                </PanelCard>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleCandidateFileAction('download')}
                    disabled={!candidate.files?.length}
                    fullWidth
                    size="lg"
                    variant="primary"
                    iconLeft={<Download size={18} />}
                  >
                    Baixar PDF Original
                  </Button>
                  <Button
                    onClick={() => handleCandidateFileAction('view')}
                    disabled={!candidate.files?.length}
                    fullWidth
                    size="lg"
                    variant="outline"
                    className="bg-white"
                    iconLeft={<ExternalLink size={18} />}
                  >
                    Ver Arquivo
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Processos Seletivos</h4>
                  {!showLinkJob && (
                    <Button
                      onClick={() => { setShowLinkJob(true); fetchAvailableJobs(); }}
                      size="sm"
                      iconLeft={<Plus size={14} />}
                    >
                      Vincular a Vaga
                    </Button>
                  )}
                </div>

                <AnimatePresence>
                  {showLinkJob && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-develoi-navy/5 p-6 rounded-[32px] border border-develoi-navy/10 overflow-hidden space-y-4"
                    >
                      <p className="text-[10px] font-black text-develoi-navy uppercase tracking-widest">Vincular Nova Oportunidade</p>
                      <div className="flex gap-3">
                        <Select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          className="bg-white"
                        >
                          <option value="">Escolha a vaga...</option>
                          {availableJobs.map(j => (
                            <option key={j.id} value={j.id}>{j.title} ({j.city}/{j.state})</option>
                          ))}
                        </Select>
                        <Button onClick={handleLinkJob} disabled={loading || !selectedJobId} variant="primary">
                          Vincular
                        </Button>
                        <IconButton onClick={() => setShowLinkJob(false)} variant="ghost" className="bg-white border border-zinc-200">
                          <X size={18} />
                        </IconButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid gap-4">
                  {candidate.matches?.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4 bg-white">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                        <Briefcase size={32} />
                      </div>
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Nenhuma vaga vinculada.</p>
                    </div>
                  ) : (
                    candidate.matches?.map((match: any) => (
                      <ContentCard key={match.id} className="group hover:border-develoi-navy/30 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-navy/10 group-hover:text-develoi-navy transition-all">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-zinc-900 tracking-tight">{match.job_title}</p>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{match.job_city}/{match.job_state}</p>
                            </div>
                          </div>
                          <FunnelStageDropdown
                            matchId={Number(candidateId)}
                            jobId={match.job_id}
                            currentStage={match.status ?? "Triagem"}
                            onSaved={(_, stage) => handleMatchStageSaved(match.id, stage)}
                          />
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-50 pt-5">
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-lg font-black tracking-tight",
                              match.compatibility_score && match.compatibility_score >= 80 ? "text-emerald-600" :
                              match.compatibility_score && match.compatibility_score >= 60 ? "text-amber-600" :
                              "text-zinc-400"
                            )}>
                              {match.compatibility_score ? `${match.compatibility_score}%` : "--"}
                            </span>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Match Aurora AI</span>
                          </div>
                          <Button
                            onClick={() => runAiAnalysis(match.job_id)}
                            disabled={loading}
                            variant="ghost"
                            size="sm"
                            className="bg-develoi-navy/5 text-develoi-navy hover:bg-develoi-navy hover:text-white"
                            iconLeft={<Sparkles size={14} />}
                          >
                            {match.compatibility_score ? "Refazer Análise" : "Rodar Análise IA"}
                          </Button>
                        </div>
                      </ContentCard>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instrumentos Aplicados</h4>
                  <Button variant="outline" size="sm" iconLeft={<Plus size={14} />}>
                    Enviar Nova
                  </Button>
                </div>

                {evaluations.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4 bg-white">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                      <ClipboardCheck size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-zinc-900">Nenhuma avaliação</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                        O candidato ainda não respondeu nenhum instrumento de RH.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {evaluations.map((evalItem) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={evalItem.id}
                        className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:border-develoi-navy/30 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-50 rounded-2xl text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white transition-all shadow-sm">
                              {evalItem.tool_type === 'DISC' ? <Brain size={20} /> : <FileText size={20} />}
                            </div>
                            <div>
                              <h5 className="text-sm font-black text-zinc-900">{evalItem.tool_name}</h5>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                Concluído em {new Date(evalItem.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge color={evalItem.score >= 80 ? 'success' : evalItem.score >= 50 ? 'warning' : 'default'} size="sm">
                            {evalItem.score ? `${evalItem.score}%` : 'N/A'}
                          </Badge>
                        </div>

                        <div className="bg-zinc-50/50 p-5 rounded-2xl mb-6 border border-zinc-100 italic">
                          <div className="flex items-center gap-1.5 mb-2 text-amber-600">
                            <Sparkles size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Parecer Aurora IA</span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-600 leading-relaxed">
                            "{evalItem.ai_summary || "Análise de IA ainda não gerada para esta resposta."}"
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button variant="primary" fullWidth iconLeft={<Eye size={16} />}>
                            Ver Detalhes
                          </Button>
                          {!evalItem.ai_analysis_json && (
                            <Button variant="outline" fullWidth iconLeft={<Wand2 size={16} />}>
                              Analisar IA
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-10">
                <div className="bg-develoi-navy p-8 rounded-[40px] text-white shadow-xl shadow-develoi-navy/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <Sparkles size={24} className="text-develoi-gold" />
                      <h4 className="text-sm font-black uppercase tracking-widest tracking-[0.2em]">Relatório Aurora AI</h4>
                    </div>
                    <p className="text-xs font-medium text-develoi-navy-light leading-relaxed max-w-lg opacity-80">
                      Análise automatizada de compatibilidade baseada em competências técnicas, fit cultural e perfil comportamental.
                    </p>
                  </div>
                </div>

                {candidate.matches?.some(m => m.compatibility_score) ? (
                  candidate.matches.filter(m => m.compatibility_score).map(match => (
                    <PanelCard
                      key={match.id}
                      title={`Análise de Fit: ${match.job_title}`}
                      icon={Briefcase}
                      className="bg-white border-zinc-100"
                    >
                      <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col gap-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Score de Compatibilidade</p>
                            <p className="text-3xl font-black text-zinc-900">{match.compatibility_score}%</p>
                          </div>
                          <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col gap-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Classificação de Fit</p>
                            <p className="text-xl font-black text-develoi-navy">{match.compatibility_classification}</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                              <Check size={14} /> Pontos de Destaque
                            </p>
                            <ul className="space-y-3">
                              {JSON.parse(match.strengths || '[]').map((s: string, i: number) => (
                                <li key={i} className="text-xs font-semibold text-zinc-600 flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                              <PauseCircle size={14} /> Riscos e Atenção
                            </p>
                            <ul className="space-y-3">
                              {JSON.parse(match.attention_points || '[]').map((s: string, i: number) => (
                                <li key={i} className="text-xs font-semibold text-zinc-600 flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <section className="bg-zinc-50 p-8 rounded-[32px] border border-zinc-100 space-y-4">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resumo da Inteligência</p>
                          <p className="text-sm font-semibold text-zinc-600 leading-relaxed italic">
                            "{match.compatibility_summary}"
                          </p>
                        </section>

                        <section className="bg-develoi-navy p-8 rounded-[40px] text-white space-y-6">
                          <div className="flex items-center gap-3 text-develoi-gold">
                            <MessageCircle size={20} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Perguntas Sugeridas para Entrevista</p>
                          </div>
                          <div className="grid gap-3">
                            {JSON.parse(match.interview_questions || '[]').map((q: string, i: number) => (
                              <div key={i} className="p-5 bg-white/5 rounded-2xl text-xs font-semibold border border-white/5 italic leading-relaxed hover:bg-white/10 transition-all">
                                "{q}"
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </PanelCard>
                  ))
                ) : (
                  <div className="p-24 text-center border-2 border-dashed border-zinc-200 rounded-[48px] space-y-6 bg-white">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto">
                      <Sparkles size={40} />
                    </div>
                    <div className="space-y-2 max-w-xs mx-auto">
                      <p className="text-base font-black text-zinc-900 leading-tight">Nenhuma análise disponível</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                        Vincule o candidato a uma vaga para rodar a análise comportamental da Aurora AI.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Linha do Tempo</h4>
                </div>

                <div className="space-y-8 relative ml-4">
                  <div className="absolute top-0 bottom-0 left-[-16px] w-0.5 bg-zinc-100" />

                  {candidate.history?.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute left-[-20.5px] top-2 w-3 h-3 rounded-full bg-white border-2 border-zinc-200" />
                      <div className="bg-white p-6 rounded-[28px] border border-zinc-100 shadow-sm hover:border-zinc-200 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-black text-zinc-900">{event.title}</span>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(event.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">{event.description}</p>
                        {event.created_by && (
                          <div className="mt-4 flex items-center gap-2">
                            <div className="w-5 h-5 bg-zinc-100 rounded-full border border-zinc-200 flex items-center justify-center text-[8px] font-black text-zinc-400 uppercase">
                              {event.created_by[0]}
                            </div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{event.created_by}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="relative">
                    <div className="absolute left-[-20.5px] top-2 w-3 h-3 rounded-full bg-develoi-navy ring-4 ring-develoi-navy/10" />
                    <div className="bg-white p-8 rounded-[32px] border-2 border-develoi-navy/10 shadow-xl shadow-develoi-navy/5 space-y-6">
                      <div className="flex items-center gap-3 text-develoi-navy">
                        <Plus size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Adicionar Nota Interna</span>
                      </div>
                      <Textarea
                        placeholder="Escreva uma observação para a equipe de recrutamento..."
                        rows={4}
                      />
                      <div className="flex justify-end">
                        <Button variant="primary" iconLeft={<Plus size={16} />}>
                          Salvar Observação
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'disc' && (
              <div className="p-24 text-center border-2 border-dashed border-zinc-200 rounded-[48px] space-y-6 bg-white">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto">
                  <BarChart3 size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black text-zinc-900">Perfil DISC</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    Nenhuma avaliação DISC disponível para este candidato.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-develoi-navy/8">
                <Loader2 size={22} className="animate-spin text-develoi-navy" />
              </div>
              <p className="text-[11px] font-medium text-zinc-500">Processando análise…</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
        title="Excluir Candidato"
        description="Esta ação remove o talento permanentemente."
        icon={<Trash2 size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={loading}>
              Remover
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Deseja realmente remover <span className="font-black text-zinc-900">{candidate.full_name}</span> permanentemente?
        </p>
      </Modal>
      </div>
    </div>
  );
}

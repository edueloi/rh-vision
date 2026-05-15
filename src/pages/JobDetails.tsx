import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  Globe,
  Target,
  FileText,
  Users,
  Edit,
  User,
  ChevronRight,
  Check,
  Phone,
  Mail,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Brain,
  PhoneCall,
  PlayCircle,
  Star,
  UserCheck,
  Handshake,
  UserX,
  ThumbsDown,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge, useToast } from "@/src/components/ui";
import { Job, CandidateJobMatch } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useNavigate } from "react-router-dom";
import { encodeId } from "@/src/lib/hashid";

// ── Etapas do funil ────────────────────────────────────────────────────────────

const FUNNEL_STAGE_OPTIONS = [
  { value: "Triagem",             label: "Triagem",             color: "text-zinc-500",    bgLight: "bg-zinc-50",      borderLight: "border-zinc-200",    textLight: "text-zinc-600",   icon: <Target size={11} /> },
  { value: "IA Match",            label: "IA Match",            color: "text-blue-600",    bgLight: "bg-blue-50",      borderLight: "border-blue-200",    textLight: "text-blue-700",   icon: <Brain size={11} /> },
  { value: "Entrevista",          label: "Entrevista",          color: "text-purple-600",  bgLight: "bg-purple-50",    borderLight: "border-purple-200",  textLight: "text-purple-700", icon: <PhoneCall size={11} /> },
  { value: "Entrevista Realizada",label: "Ent. Realizada",      color: "text-indigo-600",  bgLight: "bg-indigo-50",    borderLight: "border-indigo-200",  textLight: "text-indigo-700", icon: <PlayCircle size={11} /> },
  { value: "Finalista",           label: "Finalista",           color: "text-amber-700",   bgLight: "bg-amber-50",     borderLight: "border-amber-200",   textLight: "text-amber-800",  icon: <Star size={11} /> },
  { value: "Aprovado",            label: "Aprovado",            color: "text-emerald-600", bgLight: "bg-emerald-50",   borderLight: "border-emerald-200", textLight: "text-emerald-700",icon: <UserCheck size={11} /> },
  { value: "Contratado",          label: "Contratado",          color: "text-white",       bgLight: "bg-develoi-navy", borderLight: "border-develoi-navy",textLight: "text-white",      icon: <Handshake size={11} /> },
  { value: "Desistência",         label: "Desistência",         color: "text-orange-600",  bgLight: "bg-orange-50",    borderLight: "border-orange-200",  textLight: "text-orange-700", icon: <UserX size={11} />, isNegative: true },
  { value: "Sem Sucesso",         label: "Sem sucesso",         color: "text-red-600",     bgLight: "bg-red-50",       borderLight: "border-red-200",     textLight: "text-red-700",    icon: <ThumbsDown size={11} />, isNegative: true },
];

function getFunnelStageOpt(value: string) {
  return FUNNEL_STAGE_OPTIONS.find(s => s.value === value) ?? FUNNEL_STAGE_OPTIONS[0];
}

// ── Dropdown inline de etapa ──────────────────────────────────────────────────

function StageDropdown({ jobId, candidateId, currentStage, onSaved }: {
  jobId: number;
  candidateId: number;
  currentStage: string;
  onSaved: (candidateId: number, stage: string) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState(currentStage ?? "Triagem");
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => { setStage(currentStage ?? "Triagem"); }, [currentStage]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = getFunnelStageOpt(stage);

  const handleSelect = async (value: string) => {
    setOpen(false);
    if (value === stage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/stage/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_stage: value }),
      });
      if (!res.ok) throw new Error();
      setStage(value);
      onSaved(candidateId, value);
      toast.success("Etapa atualizada.");
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
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold transition-all",
          selected.bgLight, selected.borderLight, selected.textLight
        )}
      >
        {saving ? <Loader2 size={9} className="animate-spin" /> : selected.icon}
        <span>{selected.label}</span>
        <ChevronDown size={8} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 top-full mt-1 left-0 min-w-[180px] bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden"
          >
            {FUNNEL_STAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-[10px] font-bold transition-colors hover:bg-zinc-50",
                  stage === opt.value && "bg-zinc-50"
                )}
              >
                <span className={opt.isNegative ? "text-red-400" : opt.color}>{opt.icon}</span>
                <span className="flex-1 text-zinc-700">{opt.label}</span>
                {opt.isNegative && (
                  <span className="text-[7px] font-black text-orange-400 bg-orange-50 border border-orange-100 rounded-full px-1 py-0.5 uppercase">saída</span>
                )}
                {stage === opt.value && <CheckCircle2 size={9} className="text-develoi-navy shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Painel lateral do candidato ────────────────────────────────────────────────

function CandidatePanel({ candidate, jobId, onClose, onStageChange }: {
  candidate: any;
  jobId: number;
  onClose: () => void;
  onStageChange: (candidateId: number, stage: string) => void;
}) {
  const navigate = useNavigate();
  if (!candidate) return null;

  const stageOpt = getFunnelStageOpt(candidate.match_status ?? "Triagem");

  return (
    <AnimatePresence>
      <motion.div
        key="candidate-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="absolute inset-y-0 right-0 w-72 bg-white border-l border-zinc-100 shadow-xl flex flex-col z-10"
      >
        {/* Header do painel */}
        <div className="p-4 border-b border-zinc-100 flex items-start justify-between gap-2 bg-zinc-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-develoi-navy/10 flex items-center justify-center font-black text-[11px] text-develoi-navy shrink-0">
              {candidate.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate leading-tight">{candidate.full_name}</p>
              {candidate.desired_position && (
                <p className="text-[9px] font-bold text-zinc-400 truncate">{candidate.desired_position}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-all shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Etapa atual */}
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1">
              <TrendingUp size={9} /> Etapa do Processo
            </p>
            <StageDropdown
              jobId={jobId}
              candidateId={candidate.id}
              currentStage={candidate.match_status ?? "Triagem"}
              onSaved={onStageChange}
            />
          </div>

          {/* Score IA */}
          {candidate.ai_score > 0 && (
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Aderência IA</p>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black border",
                candidate.ai_score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                candidate.ai_score >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
                "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                <Brain size={13} />
                {candidate.ai_score}%
              </div>
            </div>
          )}

          {/* Contato */}
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Contato</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 bg-zinc-50 rounded-xl border border-zinc-100 px-3 py-2.5">
                <Mail size={12} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">E-mail</p>
                  <p className="text-[10px] font-bold text-zinc-800 truncate">{candidate.email || "Não informado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-zinc-50 rounded-xl border border-zinc-100 px-3 py-2.5">
                <Phone size={12} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Telefone</p>
                  <p className="text-[10px] font-bold text-zinc-800 truncate">{candidate.phone || "Não informado"}</p>
                </div>
              </div>
              {candidate.city && (
                <div className="flex items-center gap-2.5 bg-zinc-50 rounded-xl border border-zinc-100 px-3 py-2.5">
                  <MapPin size={12} className="text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Localização</p>
                    <p className="text-[10px] font-bold text-zinc-800">{candidate.city}, {candidate.state}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Experiência */}
          {candidate.experience_years != null && (
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Experiência</p>
              <span className="text-[10px] font-black text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg">
                {candidate.experience_years} ano{candidate.experience_years !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Footer — botão ver perfil */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={() => navigate(`/candidatos/${encodeId(candidate.id)}`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-develoi-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a1e3a] transition-all shadow-lg shadow-develoi-navy/15 active:scale-[0.98]"
          >
            <ExternalLink size={13} />
            Ver perfil completo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
  onEdit: () => void;
}

export default function JobDetails({ job, onClose, onEdit }: JobDetailsProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'candidates'>('details');
  const [appliedCandidates, setAppliedCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'candidates') fetchAppliedCandidates();
    else setSelectedCandidate(null);
  }, [activeTab]);

  // Fecha painel lateral ao trocar de vaga
  useEffect(() => { setSelectedCandidate(null); }, [job.id]);

  const fetchAppliedCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/candidates`);
      if (!res.ok) throw new Error();
      setAppliedCandidates(await res.json());
    } catch {
      toast.error("Erro ao carregar candidatos.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleStageChange = (candidateId: number, stage: string) => {
    setAppliedCandidates(prev =>
      prev.map(c => c.id === candidateId ? { ...c, match_status: stage } : c)
    );
    setSelectedCandidate((prev: any) =>
      prev?.id === candidateId ? { ...prev, match_status: stage } : prev
    );
  };

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(prev => prev?.id === candidate.id ? null : candidate);
  };

  // Contadores por etapa
  const stageCounts = FUNNEL_STAGE_OPTIONS.reduce((acc, s) => {
    acc[s.value] = appliedCandidates.filter(c => (c.match_status ?? "Triagem") === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Painel principal */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 leading-tight">{job.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={job.status === "Aberta" ? "success" : "default"} size="sm">{job.status}</Badge>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest">{job.department || "Geral"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <Edit size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-zinc-100 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0",
              activeTab === "details" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Detalhes
            {activeTab === "details" && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={cn(
              "px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2",
              activeTab === "candidates" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Users size={13} />
            Candidatos
            {appliedCandidates.length > 0 && (
              <span className="bg-develoi-navy text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {appliedCandidates.length}
              </span>
            )}
            {activeTab === "candidates" && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
        </div>

        {/* Content — posição relative para o painel lateral */}
        <div className="flex-1 overflow-hidden relative">

          {/* ── Detalhes ── */}
          {activeTab === "details" && (
            <div className="h-full overflow-y-auto p-8 space-y-10 bg-zinc-50/20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Localização", val: `${job.city}, ${job.state}`, icon: MapPin },
                  { label: "Contrato", val: job.contract_type, icon: FileText },
                  { label: "Modelo", val: job.work_model, icon: Globe },
                  { label: "Salário", val: job.salary_min ? `R$ ${job.salary_min?.toLocaleString("pt-BR")}` : "A combinar", icon: Target },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                    <item.icon size={14} className="text-zinc-400 mb-2" />
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{item.label}</p>
                    <p className="text-xs font-bold text-zinc-900 mt-1 truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={14} /> Descrição da Vaga
                  </h4>
                  <div
                    className="text-sm font-bold text-zinc-700 leading-relaxed bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm prose prose-zinc"
                    dangerouslySetInnerHTML={{ __html: job.description || job.responsibilities || "Nenhuma descrição detalhada fornecida." }}
                  />
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                  <section>
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Requisitos Técnicos</h4>
                    <div
                      className="p-5 bg-white rounded-3xl text-xs font-bold text-zinc-600 leading-relaxed border border-zinc-100 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: job.technical_requirements || "Ver descrição geral." }}
                    />
                  </section>
                  <section>
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Critérios de IA</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Score Mínimo", val: `${job.compatibility_threshold}%` },
                        { label: "Peso Hard Skills", val: String(job.weight_technical) },
                        { label: "Anos de Experiência", val: `${job.min_experience_years || 0}a` },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{item.label}</span>
                          <span className="text-xs font-bold text-develoi-gold">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* ── Candidatos ── */}
          {activeTab === "candidates" && (
            <div className="h-full flex">
              {/* Lista de candidatos */}
              <div className={cn(
                "flex-1 overflow-y-auto p-5 space-y-4 transition-all duration-200",
                selectedCandidate ? "mr-72" : ""
              )}>
                {/* Header com contagem e refresh */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-zinc-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                      {appliedCandidates.length} Candidato{appliedCandidates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={fetchAppliedCandidates}
                    disabled={loadingCandidates}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors"
                    title="Atualizar"
                  >
                    <RefreshCw size={14} className={loadingCandidates ? "animate-spin" : ""} />
                  </button>
                </div>

                {/* Mini funil compacto */}
                {appliedCandidates.length > 0 && !loadingCandidates && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {FUNNEL_STAGE_OPTIONS.filter(s => stageCounts[s.value] > 0).map(s => (
                      <div key={s.value} className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[8px] font-black",
                        s.bgLight, s.borderLight, s.textLight
                      )}>
                        {s.icon}
                        <span className="truncate">{s.label}</span>
                        <span className="ml-auto font-black">{stageCounts[s.value]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {loadingCandidates ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-3 border-develoi-navy border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Buscando candidatos...</p>
                  </div>
                ) : appliedCandidates.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-zinc-100 rounded-[32px]">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
                      <User size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nenhum candidato nesta vaga ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appliedCandidates.map(c => {
                      const stageOpt = getFunnelStageOpt(c.match_status ?? "Triagem");
                      const isSelected = selectedCandidate?.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                            isSelected
                              ? "bg-develoi-navy/5 border-develoi-navy/30 shadow-sm"
                              : "bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-sm"
                          )}
                        >
                          {/* Avatar */}
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 transition-colors",
                            isSelected ? "bg-develoi-navy text-white" : "bg-zinc-100 text-zinc-500"
                          )}>
                            {c.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-zinc-900 truncate">{c.full_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className={cn(
                                "inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border",
                                stageOpt.bgLight, stageOpt.borderLight, stageOpt.textLight
                              )}>
                                {stageOpt.icon}
                                {stageOpt.label}
                              </span>
                              {c.ai_score > 0 && (
                                <span className={cn(
                                  "text-[8px] font-black px-1.5 py-0.5 rounded-full border",
                                  c.ai_score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  c.ai_score >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                  {c.ai_score}% IA
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={14} className={cn(
                            "text-zinc-300 transition-all shrink-0",
                            isSelected && "text-develoi-navy rotate-90"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Painel lateral do candidato selecionado */}
              {selectedCandidate && (
                <CandidatePanel
                  candidate={selectedCandidate}
                  jobId={job.id}
                  onClose={() => setSelectedCandidate(null)}
                  onStageChange={handleStageChange}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3 shrink-0">
          <button
            onClick={() => window.open(`/portal/vagas/${job.id}`, "_blank")}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-zinc-200 text-zinc-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all font-sans"
          >
            <Share2 size={16} /> Link Público
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-zinc-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
            <Check size={16} /> Publicar Vaga
          </button>
        </div>
      </motion.div>
    </div>
  );
}

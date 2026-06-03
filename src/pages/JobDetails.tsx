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
  Copy,
  Send,
  MessageCircle,
  Link2,
  Megaphone,
  QrCode,
  Zap,
  BarChart2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ClipboardCheck,
  History,
  XCircle,
  Printer,
} from "lucide-react";
import { Badge, useToast } from "@/src/components/ui";
import { Job, CandidateJobMatch } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useNavigate } from "react-router-dom";
import { encodeId } from "@/src/lib/hashid";
import { getAuthUser } from "@/src/lib/auth";
import JobPosterModal from "@/src/components/jobs/JobPosterModal";

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

// ── Painel de Divulgação ───────────────────────────────────────────────────────

const APP_URL = (import.meta as any).env?.VITE_APP_URL || window.location.origin;

type LinkedInBotStatus = 'idle' | 'pending' | 'logging_in' | 'navigating' | 'filling_form' | 'submitting' | 'done' | 'error';

function LinkedInBotPanel({ jobId, jobLinkedinUrl }: { jobId: number; jobLinkedinUrl?: string }) {
  const [status, setStatus] = useState<LinkedInBotStatus>('idle');
  const [linkedinUrl, setLinkedinUrl] = useState<string | undefined>(jobLinkedinUrl);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorScreenshot, setErrorScreenshot] = useState<string | undefined>();
  const [pubId, setPubId] = useState<number | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  const statusLabel: Record<LinkedInBotStatus, string> = {
    idle: '',
    pending: 'Iniciando bot…',
    logging_in: 'Fazendo login no LinkedIn…',
    navigating: 'Acessando formulário de vagas…',
    filling_form: 'Preenchendo formulário…',
    submitting: 'Publicando vaga…',
    done: 'Vaga publicada com sucesso!',
    error: 'Erro na publicação',
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = (id: number) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/linkedin/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status as LinkedInBotStatus);
        if (data.status === 'done') {
          setLinkedinUrl(data.linkedin_url);
          stopPolling();
          toast.success('Vaga publicada no LinkedIn!');
        } else if (data.status === 'error') {
          setErrorMsg(data.error_message || 'Erro desconhecido');
          setErrorScreenshot(data.screenshot_b64 || undefined);
          stopPolling();
          toast.error('Erro ao publicar no LinkedIn.');
        }
      } catch {}
    }, 3000);
  };

  const handlePublish = async () => {
    setStatus('pending');
    setErrorMsg('');
    setErrorScreenshot(undefined);
    setLinkedinUrl(undefined);
    try {
      const res = await fetch(`/api/jobs/${jobId}/publish/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'rh-panel' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro');
      const data = await res.json();
      setPubId(data.id);
      startPolling(data.id);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro ao iniciar bot');
    }
  };

  const isRunning = ['pending', 'logging_in', 'navigating', 'filling_form', 'submitting'].includes(status);

  return (
    <div className="rounded-2xl border border-[#0077B5]/20 bg-[#f0f7ff] overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#0077B5]/10">
        <div className="w-8 h-8 bg-[#0077B5] rounded-lg flex items-center justify-center shrink-0">
          <Globe size={16} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-black text-[#004471]">Publicação automática — LinkedIn</p>
          <p className="text-[10px] text-[#0077B5]">O bot preenche o formulário por você</p>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* URL já publicada */}
        {linkedinUrl && status === 'done' && (
          <div className="flex items-center gap-2 p-3 bg-white border border-emerald-200 rounded-xl">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
               className="text-[11px] font-bold text-[#0077B5] underline flex-1 truncate">
              Ver vaga no LinkedIn
            </a>
            <ExternalLink size={12} className="text-zinc-400 shrink-0" />
          </div>
        )}

        {/* Status em andamento */}
        {isRunning && (
          <div className="flex items-center gap-2 p-3 bg-white border border-[#0077B5]/20 rounded-xl">
            <Loader2 size={13} className="text-[#0077B5] animate-spin shrink-0" />
            <p className="text-[11px] font-bold text-[#0077B5]">{statusLabel[status]}</p>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <p className="text-[11px] font-black text-red-700">Falha na publicação</p>
            </div>
            {errorMsg && (
              <p className="text-[10px] text-red-600 leading-relaxed font-mono break-all">{errorMsg}</p>
            )}
            {errorScreenshot && (
              <details className="mt-1">
                <summary className="text-[9px] text-red-500 cursor-pointer font-bold">Ver screenshot do erro</summary>
                <img
                  src={`data:image/png;base64,${errorScreenshot}`}
                  alt="Screenshot do erro"
                  className="mt-1 rounded-lg border border-red-200 w-full"
                />
              </details>
            )}
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handlePublish}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0077B5] hover:bg-[#006399] text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm active:scale-[0.98]"
        >
          {isRunning
            ? <><Loader2 size={13} className="animate-spin" /> Bot trabalhando…</>
            : status === 'done'
            ? <><RefreshCw size={13} /> Republicar no LinkedIn</>
            : <><Zap size={13} /> Publicar automaticamente</>
          }
        </button>

        <p className="text-[9px] text-zinc-400 text-center leading-relaxed">
          O bot abre o LinkedIn, preenche o formulário e publica a vaga.<br />
          Na primeira execução pode pedir 2FA — faça login manual uma vez.
        </p>
      </div>
    </div>
  );
}

// ── Workflow de Aprovação ──────────────────────────────────────────────────────

type ApprovalAction = 'requested' | 'approved' | 'rejected' | 'cancelled';

interface ApprovalEntry {
  id: number;
  action: ApprovalAction;
  actor_id: string;
  actor_name: string;
  notes?: string;
  created_at: string;
}

const ACTION_META: Record<ApprovalAction, { label: string; color: string; icon: React.ReactNode }> = {
  requested:  { label: 'Aprovação solicitada',  color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: <ClipboardCheck size={11} /> },
  approved:   { label: 'Vaga aprovada',          color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <ShieldCheck size={11} /> },
  rejected:   { label: 'Aprovação reprovada',    color: 'text-red-700 bg-red-50 border-red-200',         icon: <ShieldX size={11} /> },
  cancelled:  { label: 'Solicitação cancelada',  color: 'text-zinc-500 bg-zinc-50 border-zinc-200',      icon: <XCircle size={11} /> },
};

function ApprovalPanel({ job, onJobChange }: { job: Job; onJobChange: (patch: Partial<Job>) => void }) {
  const toast = useToast();
  const currentUser = getAuthUser();

  const approvalStatus: string | null = (job as any).approval_status ?? null;
  const [history, setHistory] = useState<ApprovalEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch(`/api/jobs/${job.id}/approvals`);
      if (r.ok) setHistory(await r.json());
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory, job.id]);

  const doAction = async (action: 'request' | 'approve' | 'reject' | 'cancel') => {
    setActionLoading(action);
    try {
      const method = action === 'cancel' ? 'DELETE' : 'POST';
      const url = action === 'cancel'
        ? `/api/jobs/${job.id}/approvals/request`
        : `/api/jobs/${job.id}/approvals/${action === 'request' ? 'request' : action === 'approve' ? 'approve' : 'reject'}`;

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: currentUser?.id || 'unknown',
          actor_name: currentUser?.full_name || 'Usuário',
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Erro desconhecido');
      }
      const data = await r.json();

      if (action === 'approve') {
        onJobChange({ status: 'Aberta', approval_status: 'approved' } as any);
        toast.success('Vaga aprovada e publicada!');
      } else if (action === 'reject') {
        onJobChange({ approval_status: 'rejected' } as any);
        toast.error('Vaga reprovada.');
      } else if (action === 'request') {
        onJobChange({ approval_status: 'pending' } as any);
        toast.success('Aprovação solicitada com sucesso!');
      } else {
        onJobChange({ approval_status: null } as any);
        toast.success('Solicitação cancelada.');
      }

      setNotes('');
      if (showHistory) fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.access_profile?.includes('admin');
  const isPending = approvalStatus === 'pending';
  const isRejected = approvalStatus === 'rejected';
  const isApproved = approvalStatus === 'approved';
  const isNone = !approvalStatus;

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <ShieldCheck size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Workflow de Aprovação</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {isPending ? 'Aguardando aprovação do gestor' :
             isApproved ? 'Vaga aprovada — status: Aberta' :
             isRejected ? 'Vaga reprovada — revise e solicite novamente' :
             'Solicite aprovação antes de publicar'}
          </p>
        </div>
        {/* Status badge */}
        <span className={cn(
          "text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wide shrink-0",
          isPending ? 'text-amber-700 bg-amber-50 border-amber-200' :
          isApproved ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
          isRejected ? 'text-red-700 bg-red-50 border-red-200' :
          'text-zinc-500 bg-zinc-50 border-zinc-200'
        )}>
          {isPending ? 'Em aprovação' : isApproved ? 'Aprovada' : isRejected ? 'Reprovada' : 'Sem solicitação'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Nota / observação */}
        {(isNone || isRejected || (isPending && isAdmin)) && (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              isPending && isAdmin ? 'Observação ao reprovar (opcional)...' :
              isRejected ? 'Comentário ao re-solicitar (opcional)...' :
              'Observação para o aprovador (opcional)...'
            }
            className="w-full text-[11px] text-zinc-700 border border-zinc-200 rounded-xl px-3 py-2.5 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-develoi-navy/20 focus:border-develoi-navy/40 placeholder-zinc-400"
          />
        )}

        {/* Ações — quem pode solicitar: qualquer user */}
        {(isNone || isRejected) && (
          <button
            onClick={() => doAction('request')}
            disabled={!!actionLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-develoi-navy hover:bg-develoi-navy/90 text-white rounded-xl text-[11px] font-black transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {actionLoading === 'request'
              ? <Loader2 size={12} className="animate-spin" />
              : <ClipboardCheck size={12} />}
            {isRejected ? 'Re-solicitar aprovação' : 'Solicitar aprovação'}
          </button>
        )}

        {/* Pendente — solicitante pode cancelar */}
        {isPending && !isAdmin && (
          <button
            onClick={() => doAction('cancel')}
            disabled={!!actionLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[11px] font-black transition-all disabled:opacity-50"
          >
            {actionLoading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Cancelar solicitação
          </button>
        )}

        {/* Pendente — admin pode aprovar ou rejeitar */}
        {isPending && isAdmin && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => doAction('reject')}
              disabled={!!actionLoading}
              className="flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-[11px] font-black transition-all disabled:opacity-50"
            >
              {actionLoading === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
              Reprovar
            </button>
            <button
              onClick={() => doAction('approve')}
              disabled={!!actionLoading}
              className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black transition-all disabled:opacity-50"
            >
              {actionLoading === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              Aprovar vaga
            </button>
          </div>
        )}

        {/* Aprovada — nada a fazer */}
        {isApproved && (
          <div className="flex items-center gap-2 py-2 text-emerald-700">
            <CheckCircle2 size={13} className="shrink-0" />
            <p className="text-[11px] font-black">Vaga ativa e publicável</p>
          </div>
        )}

        {/* Histórico */}
        <button
          onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2 text-zinc-400 hover:text-zinc-600 text-[10px] font-bold transition-colors"
        >
          <History size={11} />
          {showHistory ? 'Ocultar histórico' : 'Ver histórico de aprovações'}
          <ChevronDown size={10} className={cn("transition-transform", showHistory && "rotate-180")} />
        </button>

        {showHistory && (
          <div className="space-y-2">
            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-zinc-300" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-[10px] text-zinc-400 text-center py-3">Nenhum evento ainda.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.map(entry => {
                  const meta = ACTION_META[entry.action] ?? ACTION_META.cancelled;
                  return (
                    <div key={entry.id} className={cn("flex items-start gap-2 px-3 py-2 rounded-xl border text-[10px]", meta.color)}>
                      <span className="mt-0.5 shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black leading-tight">{meta.label}</p>
                        <p className="opacity-70 truncate">{entry.actor_name}</p>
                        {entry.notes && <p className="opacity-70 italic mt-0.5">"{entry.notes}"</p>}
                      </div>
                      <span className="shrink-0 opacity-60 font-mono text-[9px]">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SharePanel({ job, onPublish, onOpenPoster }: { job: Job; onPublish?: () => void; onOpenPoster?: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const toast = useToast();

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/publication`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: true }),
      });
      if (!res.ok) throw new Error();
      toast.success('Vaga publicada! Agora aparece no portal e feeds.');
      onPublish?.();
    } catch {
      toast.error('Erro ao publicar vaga.');
    } finally {
      setPublishing(false);
    }
  };

  const slug = (job as any).public_slug || job.id;
  const jobUrl = `${APP_URL}/vaga/${slug}`;
  const title = job.title;
  const location = [job.city, job.state].filter(Boolean).join(', ');
  const salary = (job.salary_min || job.salary_max)
    ? `R$ ${(job.salary_min || job.salary_max)?.toLocaleString('pt-BR')}`
    : 'A combinar';

  const shortText = `🚀 Vaga: ${title}\n📍 ${location}\n💰 ${salary}\n🔗 ${jobUrl}`;
  const whatsappText = encodeURIComponent(
    `*Nova vaga aberta!*\n\n*${title}*\n📍 ${location}\n💰 ${salary}\n\nSe candidate agora: ${jobUrl}`
  );
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(jobUrl)}&text=${encodeURIComponent(`🚀 Vaga: ${title} — ${location}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Vaga: ${title}`)}&body=${encodeURIComponent(shortText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚀 Vaga aberta: ${title} em ${location}`)}&url=${encodeURIComponent(jobUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}`;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erro ao copiar.');
    }
  };

  const channels = [
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={18} />,
      color: 'bg-[#25D366] hover:bg-[#1ebe5d]',
      textColor: 'text-white',
      action: () => window.open(`https://wa.me/?text=${whatsappText}`, '_blank'),
      desc: 'Envie para grupos e contatos',
    },
    // LinkedIn removido — não utilizado no momento
    // {
    //   label: 'LinkedIn',
    //   icon: <Globe size={18} />,
    //   color: 'bg-[#0077B5] hover:bg-[#006399]',
    //   textColor: 'text-white',
    //   action: () => window.open(linkedinUrl, '_blank'),
    //   desc: 'Publique no seu perfil',
    // },
    {
      label: 'Telegram',
      icon: <Send size={18} />,
      color: 'bg-[#229ED9] hover:bg-[#1b8fc4]',
      textColor: 'text-white',
      action: () => window.open(telegramUrl, '_blank'),
      desc: 'Compartilhe em canais e grupos',
    },
    {
      label: 'E-mail',
      icon: <Mail size={18} />,
      color: 'bg-zinc-700 hover:bg-zinc-800',
      textColor: 'text-white',
      action: () => window.open(emailUrl, '_blank'),
      desc: 'Envie por e-mail',
    },
    {
      label: 'Twitter / X',
      icon: <X size={18} />,
      color: 'bg-black hover:bg-zinc-900',
      textColor: 'text-white',
      action: () => window.open(twitterUrl, '_blank'),
      desc: 'Poste no Twitter/X',
    },
    {
      label: 'Facebook',
      icon: <Share2 size={18} />,
      color: 'bg-[#1877F2] hover:bg-[#1468d4]',
      textColor: 'text-white',
      action: () => window.open(facebookUrl, '_blank'),
      desc: 'Compartilhe no Facebook',
    },
  ];

  const copyOptions = [
    { label: 'Link da vaga', value: jobUrl, icon: <Link2 size={13} /> },
    { label: 'Texto para WhatsApp', value: decodeURIComponent(whatsappText), icon: <MessageCircle size={13} /> },
    { label: 'Texto completo', value: shortText, icon: <FileText size={13} /> },
  ];

  const isPublic = (job as any).is_public;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">

      {/* Gerar Cartaz A4 */}
      {onOpenPoster && (
        <button
          onClick={onOpenPoster}
          className="w-full flex items-center gap-3 px-5 py-4 bg-[#0D532F] hover:bg-[#0a4525] text-white rounded-2xl transition-all shadow-sm active:scale-[0.98] group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-all">
            <Printer size={18} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black tracking-wider uppercase">Gerar Cartaz A4</p>
            <p className="text-[10px] text-white/70 mt-0.5">Cartaz profissional para impressão e redes sociais</p>
          </div>
        </button>
      )}

      {/* Portal público — desativado no momento */}
      {/* {!isPublic ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-800">Vaga não está pública</p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                O link funciona para preview, mas a vaga <strong>não aparece no portal nem nos feeds</strong> (Indeed, Google for Jobs). Ative abaixo para divulgar.
              </p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all disabled:opacity-60"
            >
              {publishing
                ? <><Loader2 size={13} className="animate-spin" /> Publicando…</>
                : <><Zap size={13} /> Ativar publicação agora</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-black text-emerald-800">Vaga pública — aparece no portal e feeds</p>
        </div>
      )} */}

      {/* Link público */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <Link2 size={11} /> Link público da vaga
        </p>
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
          <p className="flex-1 text-xs font-mono text-zinc-600 truncate">{jobUrl}</p>
          <button
            onClick={() => copyText(jobUrl, 'Link')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-black text-zinc-600 hover:border-develoi-navy/30 hover:text-develoi-navy transition-all shrink-0"
          >
            {copied === 'Link' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            {copied === 'Link' ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={() => window.open(jobUrl, '_blank')}
            className="p-1.5 text-zinc-400 hover:text-develoi-navy transition-colors"
            title="Abrir vaga"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Botões de canais */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <Megaphone size={11} /> Compartilhar nos canais
        </p>
        <div className="grid grid-cols-2 gap-2">
          {channels.map(({ label, icon, color, textColor, action, desc }) => (
            <button
              key={label}
              onClick={action}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.97] shadow-sm',
                color, textColor
              )}
            >
              <span className="shrink-0">{icon}</span>
              <div className="text-left min-w-0">
                <p className="text-[11px] font-black leading-none">{label}</p>
                <p className="text-[9px] opacity-70 mt-0.5 leading-none truncate">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Copiar textos prontos */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <Copy size={11} /> Textos prontos para copiar
        </p>
        <div className="space-y-2">
          {copyOptions.map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-white border border-zinc-100 rounded-xl hover:border-zinc-200 transition-all">
              <div className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500 shrink-0">
                {icon}
              </div>
              <p className="flex-1 text-xs font-bold text-zinc-700 truncate">{label}</p>
              <button
                onClick={() => copyText(value, label)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[9px] font-black text-zinc-500 hover:border-develoi-navy/30 hover:text-develoi-navy transition-all shrink-0"
              >
                {copied === label ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                {copied === label ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mensagem pronta para WhatsApp */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <MessageCircle size={11} /> Preview da mensagem WhatsApp
        </p>
        <div className="bg-[#e5ddd5] rounded-2xl p-4">
          <div className="bg-white rounded-xl p-3.5 shadow-sm max-w-[280px]">
            <p className="text-[11px] text-zinc-800 leading-relaxed whitespace-pre-line font-medium">
              {`*Nova vaga aberta!*\n\n*${title}*\n📍 ${location}\n💰 ${salary}\n\nSe candidate agora:\n${jobUrl}`}
            </p>
            <p className="text-[8px] text-zinc-400 text-right mt-2">agora ✓✓</p>
          </div>
        </div>
        <button
          onClick={() => window.open(`https://wa.me/?text=${whatsappText}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-xs font-black hover:bg-[#1ebe5d] transition-all shadow-sm active:scale-[0.98]"
        >
          <MessageCircle size={14} /> Enviar pelo WhatsApp
        </button>
      </div>

      {/* LinkedIn automação — desativado no momento */}
      {/* <LinkedInBotPanel jobId={job.id} jobLinkedinUrl={(job as any).external_link_linkedin} /> */}

      {/* Stats placeholder */}
      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={13} className="text-zinc-400" />
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Alcance estimado</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'WhatsApp', val: '~200', sub: 'por grupo' },
            // { label: 'LinkedIn', val: '~500', sub: 'conexões' }, // LinkedIn desativado
            { label: 'Telegram', val: '~300', sub: 'por canal' },
            { label: 'Google', val: '∞', sub: 'orgânico' },
          ].map(({ label, val, sub }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-black text-develoi-navy">{val}</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
              <p className="text-[8px] text-zinc-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
  onEdit: () => void;
}

export default function JobDetails({ job: jobProp, onClose, onEdit }: JobDetailsProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'candidates' | 'share' | 'approval'>('details');
  const [showPoster, setShowPoster] = useState(false);
  const [appliedCandidates, setAppliedCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [jobIsPublic, setJobIsPublic] = useState<boolean>(Boolean((jobProp as any).is_public));

  // Local job state to reflect approval changes without full reload
  const [job, setJob] = useState<Job>(jobProp);
  useEffect(() => { setJob(jobProp); }, [jobProp.id]);

  const handleJobPatch = (patch: Partial<Job>) => {
    setJob(prev => ({ ...prev, ...patch }));
    if ((patch as any).is_public !== undefined) setJobIsPublic(Boolean((patch as any).is_public));
  };

  const approvalStatus: string | null = (job as any).approval_status ?? null;
  const hasPendingApproval = approvalStatus === 'pending';

  useEffect(() => {
    if (activeTab === 'candidates') fetchAppliedCandidates();
    else setSelectedCandidate(null);
  }, [activeTab]);

  // Fecha painel lateral ao trocar de vaga
  useEffect(() => { setSelectedCandidate(null); }, [jobProp.id]);

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
                <Badge
                  color={
                    approvalStatus === 'pending' ? 'warning' :
                    approvalStatus === 'rejected' ? 'danger' :
                    job.status === "Aberta" ? "success" : "default"
                  }
                  size="sm"
                >
                  {approvalStatus === 'pending' ? 'Em Aprovação' :
                   approvalStatus === 'rejected' ? 'Reprovada' :
                   job.status}
                </Badge>
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
          <button
            onClick={() => setActiveTab("share")}
            className={cn(
              "px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2",
              activeTab === "share" ? "text-develoi-gold" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Megaphone size={13} />
            Divulgar
            {activeTab === "share" && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-develoi-gold" />}
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={cn(
              "px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2",
              activeTab === "approval"
                ? hasPendingApproval ? "text-amber-600" : "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <ShieldCheck size={13} />
            Aprovação
            {hasPendingApproval && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            )}
            {activeTab === "approval" && (
              <motion.div layoutId="job-tab" className={cn("absolute bottom-0 left-0 right-0 h-0.5", hasPendingApproval ? "bg-amber-400" : "bg-zinc-900")} />
            )}
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

          {/* ── Divulgar ── */}
          {activeTab === "share" && (
            <SharePanel
              job={{ ...job, is_public: jobIsPublic } as any}
              onPublish={() => { setJobIsPublic(true); handleJobPatch({ is_public: true } as any); }}
              onOpenPoster={() => setShowPoster(true)}
            />
          )}

          {/* ── Aprovação ── */}
          {activeTab === "approval" && (
            <div className="h-full overflow-y-auto p-6">
              <ApprovalPanel job={job} onJobChange={handleJobPatch} />
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
            onClick={() => setActiveTab("share")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all font-sans",
              activeTab === "share"
                ? "bg-develoi-gold text-white shadow-lg shadow-develoi-gold/25"
                : "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50"
            )}
          >
            <Megaphone size={16} /> Divulgar vaga
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-zinc-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
            <Check size={16} /> Publicar Vaga
          </button>
          <button
            onClick={() => setShowPoster(true)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0D532F] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#0a4525] transition-all shadow-lg active:scale-[0.98] shrink-0"
            title="Gerar Cartaz A4"
          >
            <Printer size={16} /> Cartaz
          </button>
        </div>
      </motion.div>

      {/* Poster modal — rendered outside the slide panel so it can cover full screen */}
      <AnimatePresence>
        {showPoster && (
          <JobPosterModal
            isOpen={showPoster}
            onClose={() => setShowPoster(false)}
            job={job}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

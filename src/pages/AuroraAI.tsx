import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { encodeId } from '@/src/lib/hashid';
import {
  Brain, Sparkles, Target, CheckCircle2, AlertCircle,
  MessageSquare, History, Settings as SettingsIcon, ChevronRight, ChevronDown,
  Zap, User, MapPin, Cpu, Users, Search, BarChart3, Save, Loader2,
  Package, TrendingUp, Clock, ArrowRight, Activity, Shield,
  Mail, Phone, Download, FileText, Star, Award, Ban, XCircle,
  PhoneCall, HelpCircle, PlayCircle, UserX, ThumbsDown, Handshake,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getTenantId } from '@/src/lib/auth';
import { useUserPreferences } from '@/src/lib/useUserPreferences';
import { useUnit } from '@/src/lib/useUnit';
import {
  useToast, Button, Badge, Switch, Modal, EmptyState, StatCard,
} from '@/src/components/ui';

// ─── SegmentedControl ─────────────────────────────────────────────────────────

function SegmentedControl({
  label, options, value, onChange,
}: {
  label?: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      )}
      <div className="flex h-9 gap-0.5 rounded-lg bg-zinc-100 p-0.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 rounded-md text-[11px] font-semibold transition-all px-2',
              value === opt
                ? 'bg-white text-develoi-navy shadow-sm'
                : 'text-zinc-400 hover:text-zinc-700'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MatchResult {
  candidate_id: number;
  full_name: string;
  city: string;
  state: string;
  desired_position: string;
  compatibility_score: number;
  classification: string;
  distance_km?: number;
  has_disc: boolean;
  disc_profile: string;
  disc_d?: number;
  disc_i?: number;
  disc_s?: number;
  disc_c?: number;
  strengths: string[];
  attention_points: string[];
  recommendation_reason: string;
  risk_reason: string;
}

// ─── Matches types & helpers ─────────────────────────────────────────────────

interface SavedMatch {
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

const CONTACT_STATUSES = [
  { value: '',             label: 'Não informado',      bgLight: 'bg-zinc-50',     borderLight: 'border-zinc-200',   textLight: 'text-zinc-500',   icon: <HelpCircle size={12} />,  blocks: false },
  { value: 'em_andamento', label: 'Em andamento',        bgLight: 'bg-blue-50',     borderLight: 'border-blue-200',   textLight: 'text-blue-700',   icon: <PhoneCall size={12} />,   blocks: false },
  { value: 'aguardando',   label: 'Aguardando resposta', bgLight: 'bg-amber-50',    borderLight: 'border-amber-200',  textLight: 'text-amber-700',  icon: <Clock size={12} />,       blocks: false },
  { value: 'sem_resposta', label: 'Sem resposta',        bgLight: 'bg-orange-50',   borderLight: 'border-orange-200', textLight: 'text-orange-700', icon: <MessageSquare size={12} />, blocks: false },
  { value: 'pendente',     label: 'Pendente',            bgLight: 'bg-purple-50',   borderLight: 'border-purple-200', textLight: 'text-purple-700', icon: <AlertCircle size={12} />, blocks: false },
  { value: 'ja_trabalhando', label: 'Já está trabalhando', bgLight: 'bg-red-50',   borderLight: 'border-red-200',    textLight: 'text-red-700',    icon: <Ban size={12} />,         blocks: true  },
  { value: 'sem_interesse', label: 'Sem interesse',       bgLight: 'bg-red-50',    borderLight: 'border-red-200',    textLight: 'text-red-700',    icon: <XCircle size={12} />,     blocks: true  },
  { value: 'nao_sucedido', label: 'Não sucedido',         bgLight: 'bg-zinc-100',  borderLight: 'border-zinc-300',   textLight: 'text-zinc-600',   icon: <CheckCircle2 size={12} />, blocks: true  },
];

const FUNNEL_STAGES = [
  { value: 'Triagem',               label: 'Triagem',               textLight: 'text-zinc-600',   bgLight: 'bg-zinc-50',     borderLight: 'border-zinc-200',   icon: <Target size={12} />,      isNegative: false },
  { value: 'IA Match',              label: 'IA Match',               textLight: 'text-blue-700',   bgLight: 'bg-blue-50',     borderLight: 'border-blue-200',   icon: <Brain size={12} />,       isNegative: false },
  { value: 'Entrevista',            label: 'Entrevista agendada',    textLight: 'text-purple-700', bgLight: 'bg-purple-50',   borderLight: 'border-purple-200', icon: <PhoneCall size={12} />,   isNegative: false },
  { value: 'Entrevista Realizada',  label: 'Entrevista realizada',   textLight: 'text-indigo-700', bgLight: 'bg-indigo-50',   borderLight: 'border-indigo-200', icon: <PlayCircle size={12} />,  isNegative: false },
  { value: 'Finalista',             label: 'Finalista',              textLight: 'text-amber-800',  bgLight: 'bg-amber-50',    borderLight: 'border-amber-200',  icon: <Star size={12} />,        isNegative: false },
  { value: 'Aprovado',              label: 'Aprovado',               textLight: 'text-emerald-700', bgLight: 'bg-emerald-50', borderLight: 'border-emerald-200', icon: <UserCheck size={12} />,  isNegative: false },
  { value: 'Contratado',            label: 'Contratado',             textLight: 'text-white',      bgLight: 'bg-develoi-navy', borderLight: 'border-develoi-navy', icon: <Handshake size={12} />, isNegative: false },
  { value: 'Desistência',           label: 'Desistência',            textLight: 'text-orange-700', bgLight: 'bg-orange-50',   borderLight: 'border-orange-200', icon: <UserX size={12} />,       isNegative: true  },
  { value: 'Sem Sucesso',           label: 'Sem sucesso',            textLight: 'text-red-700',    bgLight: 'bg-red-50',      borderLight: 'border-red-200',    icon: <ThumbsDown size={12} />,  isNegative: true  },
];

const getContactOpt = (v: string) => CONTACT_STATUSES.find(s => s.value === v) ?? CONTACT_STATUSES[0];
const getStageOpt   = (v: string) => FUNNEL_STAGES.find(s => s.value === v)    ?? FUNNEL_STAGES[0];

function getScoreCfg(score: number) {
  if (score >= 90) return { color: 'text-emerald-600', ring: 'stroke-emerald-500', bar: 'bg-emerald-500', bg: 'bg-emerald-50' };
  if (score >= 70) return { color: 'text-develoi-gold', ring: 'stroke-develoi-gold', bar: 'bg-develoi-gold', bg: 'bg-develoi-gold/8' };
  return { color: 'text-amber-600', ring: 'stroke-amber-400', bar: 'bg-amber-400', bg: 'bg-amber-50' };
}

function MatchScoreRing({ score }: { score: number }) {
  const cfg = getScoreCfg(score);
  const r = 22; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ;
  return (
    <div className={cn('relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl', cfg.bg)}>
      <svg width="52" height="52" className="absolute -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/60" />
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ - dash}
          strokeLinecap="round" className={cfg.ring}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
      </svg>
      <div className="relative z-10 text-center">
        <span className={cn('text-[13px] font-black leading-none', cfg.color)}>{score}</span>
        <span className={cn('block text-[8px] font-bold', cfg.color)}>%</span>
      </div>
    </div>
  );
}

function FunnelStagePanel({ match, jobId, tenantId, onSaved }: { match: SavedMatch; jobId: string; tenantId: string; onSaved: (id: number, stage: string) => void }) {
  const toast = useToast();
  const [stage, setStage] = useState(match.funnel_stage ?? 'Triagem');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setStage(match.funnel_stage ?? 'Triagem'); }, [match.funnel_stage]);
  const opt = getStageOpt(stage);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/stage/${match.candidate_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_stage: stage }),
      });
      if (!res.ok) throw new Error();
      onSaved(match.candidate_id, stage);
      toast.success('Etapa atualizada.');
    } catch { toast.error('Erro ao atualizar etapa.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Etapa do processo</label>
      <select
        value={stage} onChange={e => setStage(e.target.value)}
        className={cn('h-9 w-full cursor-pointer appearance-none rounded-lg border px-3 text-[12px] font-medium outline-none transition-all', opt.bgLight, opt.borderLight, opt.textLight)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '10px', paddingRight: '2rem' }}
      >
        {FUNNEL_STAGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {opt.isNegative && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 p-2.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0 text-orange-400" />
          <p className="text-[10px] font-medium text-orange-700">Candidato marcado como <strong>{opt.label}</strong> — contabilizado como não conversão.</p>
        </div>
      )}
      <button onClick={save} disabled={saving}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        {saving ? 'Salvando…' : 'Salvar etapa'}
      </button>
    </div>
  );
}

function ContactStatusPanel({ match, jobId, tenantId, onSaved }: { match: SavedMatch; jobId: string; tenantId: string; onSaved: (id: number, s: string, n: string) => void }) {
  const toast = useToast();
  const [status, setStatus] = useState(match.contact_status ?? '');
  const [notes, setNotes] = useState(match.contact_notes ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setStatus(match.contact_status ?? ''); setNotes(match.contact_notes ?? ''); }, [match.contact_status, match.contact_notes]);
  const opt = getContactOpt(status);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/contact/${match.candidate_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_status: status, contact_notes: notes, tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error();
      onSaved(match.candidate_id, status, notes);
      toast.success('Status de contato salvo.');
    } catch { toast.error('Erro ao salvar status.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Status do contato</label>
      <select
        value={status} onChange={e => setStatus(e.target.value)}
        className={cn('h-9 w-full cursor-pointer appearance-none rounded-lg border px-3 text-[12px] font-medium outline-none transition-all', opt.bgLight, opt.borderLight, opt.textLight)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '10px', paddingRight: '2rem' }}
      >
        {CONTACT_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {opt.blocks && (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-2.5">
          <Ban size={11} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[10px] font-medium text-red-600">Candidato ficará <strong>oculto</strong> nesta vaga na próxima análise da IA.</p>
        </div>
      )}
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Observações: Ex: Enviou email no dia 10/05, aguardando retorno..."
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
      />
      <button onClick={save} disabled={saving}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        {saving ? 'Salvando…' : 'Salvar status'}
      </button>
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-develoi-navy text-develoi-gold">
        <Sparkles size={14} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3">
        {[0, 0.18, 0.36].map((d, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isAssistant = msg.role === 'assistant';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-end gap-2.5', isAssistant ? 'flex-row' : 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black shadow-sm',
        isAssistant
          ? 'bg-develoi-navy text-develoi-gold'
          : 'bg-develoi-gold text-develoi-navy'
      )}>
        {isAssistant ? <Sparkles size={14} /> : <User size={14} />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed',
        isAssistant
          ? 'rounded-bl-sm bg-white text-zinc-700 border border-zinc-100 shadow-sm'
          : 'rounded-br-sm bg-develoi-navy text-white font-medium shadow-md'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={cn(
          'mt-1.5 text-[10px] font-medium opacity-40',
          isAssistant ? 'text-left' : 'text-right'
        )}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

interface ChatViewProps {
  messages: Message[];
  input: string;
  isTyping: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onOpenSettings: () => void;
}

const QUICK_PROMPTS = [
  'Quais vagas têm mais candidatos compatíveis?',
  'Me ajude a criar uma vaga de Analista de RH',
  'Como melhorar a taxa de conversão no funil?',
  'Analise os perfis DISC mais comuns na empresa',
];

function ChatView({ messages, input, isTyping, scrollRef, onInputChange, onSend, onOpenSettings }: ChatViewProps) {
  const showEmpty = messages.length === 1 && messages[0].role === 'assistant';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" style={{ height: 620 }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-develoi-navy px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-gold/20 ring-1 ring-develoi-gold/30">
            <Sparkles size={15} className="text-develoi-gold" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-white leading-none">Aurora Core</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <SettingsIcon size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-50/50 px-5 py-5 space-y-4 scroll-smooth">
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
        {isTyping && <TypingIndicator />}

        {/* Quick prompts — shown only when chat is empty */}
        {showEmpty && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-2"
          >
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sugestões</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onInputChange(q)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 transition-all hover:border-develoi-gold/40 hover:bg-develoi-gold/5 hover:text-zinc-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Pergunte algo para a Aurora..."
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            className="h-10 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[13px] text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-develoi-navy text-white shadow-sm transition-all hover:bg-[#0a1e3a] disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analysis progress overlay ────────────────────────────────────────────────

const ANALYSIS_STAGES = [
  { icon: Search,    label: 'Buscando candidatos',      detail: 'Carregando banco de talentos' },
  { icon: Users,     label: 'Carregando perfis',        detail: 'Processando dados e histórico' },
  { icon: Brain,     label: 'Aurora analisando perfis', detail: 'IA neural comparando competências' },
  { icon: BarChart3, label: 'Calculando aderência',     detail: 'Atribuindo scores e classificações' },
  { icon: Save,      label: 'Salvando resultados',      detail: 'Registrando análises no sistema' },
];

function AnalysisProgressOverlay({ jobTitle, visible }: { jobTitle: string; visible: boolean }) {
  const [stage, setStage] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!visible) { setStage(0); return; }
    setStage(0);
    const timings = [800, 1800, 0, 2200, 1200];
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const advance = () => {
      idx++;
      if (idx < ANALYSIS_STAGES.length - 1) {
        setStage(idx);
        if (timings[idx] > 0) timers.push(setTimeout(advance, timings[idx]));
      } else {
        setStage(idx);
      }
    };
    timers.push(setTimeout(advance, timings[0]));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setDots(d => (d + 1) % 4), 450);
    return () => clearInterval(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden rounded-2xl border border-develoi-navy/20 bg-develoi-navy shadow-xl"
        >
          {/* Shimmer bar */}
          <div className="h-0.5 bg-gradient-to-r from-develoi-gold via-amber-300 to-develoi-gold animate-shimmer bg-[length:200%_100%]" />

          <div className="px-5 py-5">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                <Sparkles size={16} className="text-develoi-gold animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white">Aurora AI · Analisando</p>
                <p className="mt-0.5 truncate text-[10px] text-white/40">{jobTitle}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-develoi-gold/10 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-develoi-gold animate-ping" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-develoi-gold">Live</span>
              </div>
            </div>

            {/* Stages */}
            <div className="mb-4 space-y-1.5">
              {ANALYSIS_STAGES.map((s, i) => {
                const isDone = i < stage;
                const isCurrent = i === stage;
                const isPending = i > stage;
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: isPending ? 0.25 : 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all',
                      isCurrent && 'bg-white/[0.06] ring-1 ring-white/[0.08]',
                    )}
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all',
                      isDone    && 'bg-emerald-500/20 text-emerald-400',
                      isCurrent && 'bg-develoi-gold/20 text-develoi-gold',
                      isPending && 'bg-white/5 text-white/20',
                    )}>
                      {isDone
                        ? <CheckCircle2 size={13} />
                        : isCurrent
                          ? <Icon size={13} className="animate-pulse" />
                          : <Icon size={13} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-[12px] font-medium leading-none',
                        isDone    && 'text-white/35 line-through',
                        isCurrent && 'text-white',
                        isPending && 'text-white/20',
                      )}>
                        {s.label}
                      </p>
                      {isCurrent && (
                        <p className="mt-0.5 text-[10px] text-white/35">
                          {s.detail}{'.'.repeat(dots + 1)}
                        </p>
                      )}
                    </div>
                    {isCurrent && <Loader2 size={12} className="shrink-0 animate-spin text-develoi-gold" />}
                    {isDone && <span className="shrink-0 text-[9px] font-bold text-emerald-400">✓</span>}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress */}
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-develoi-gold to-amber-300"
                initial={{ width: '4%' }}
                animate={{ width: `${Math.max(4, ((stage + 1) / ANALYSIS_STAGES.length) * 96)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1.5 text-right text-[9px] font-medium text-white/25">
              {stage + 1} / {ANALYSIS_STAGES.length}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── MatchFilters ─────────────────────────────────────────────────────────────

interface MatchFiltersProps {
  jobs: any[];
  batches: any[];
  selectedJobId: string;
  selectedBatchId: string;
  precisionMode: string;
  minScore: string;
  radius: string;
  onlyWithDisc: boolean;
  isMatching: boolean;
  onJobChange: (v: string) => void;
  onBatchChange: (v: string) => void;
  onPrecisionChange: (v: string) => void;
  onMinScoreChange: (v: string) => void;
  onRadiusChange: (v: string) => void;
  onDiscChange: (v: boolean) => void;
  onExecute: () => void;
}

function NumericInput({
  label, value, onChange, placeholder, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value !== '' ? `${value}${suffix ?? ''}` : ''}
          placeholder={placeholder}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            if (raw === '') { onChange(''); return; }
            onChange(String(Math.min(suffix === '%' ? 100 : 999999, Math.max(0, Number(raw)))));
          }}
          className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 text-[12px] font-medium text-zinc-900 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
        />
      </div>
    </div>
  );
}

function MatchFilters(props: MatchFiltersProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-navy/8">
            <Target size={15} className="text-develoi-navy" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-zinc-900">Aderência de Candidatos</h3>
            <p className="text-[11px] text-zinc-400">IA neural por competências, comportamento e localização</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Vaga + Rigor */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Vaga Alvo</span>
            <select
              value={props.selectedJobId}
              onChange={e => props.onJobChange(e.target.value)}
              className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 text-[12px] font-medium text-zinc-800 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '10px', paddingRight: '2rem' }}
            >
              <option value="">Selecione uma vaga…</option>
              {props.jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} — {j.city}/{j.state}</option>
              ))}
            </select>
          </div>
          <SegmentedControl
            label="Rigor da IA"
            options={['Flexível', 'Equilibrada', 'Rigorosa']}
            value={props.precisionMode}
            onChange={props.onPrecisionChange}
          />
        </div>

        {/* Fonte dos candidatos */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Fonte dos Candidatos</span>
          <select
            value={props.selectedBatchId}
            onChange={e => props.onBatchChange(e.target.value)}
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 text-[12px] font-medium text-zinc-800 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '10px', paddingRight: '2rem' }}
          >
            <option value="">Todos os candidatos</option>
            {props.batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name || `Lote #${b.id}`}{b.job_title ? ` — ${b.job_title}` : ''} ({b.total_files ?? 0} arq.)
              </option>
            ))}
          </select>
          {props.selectedBatchId && (
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-sky-600">
              <Package size={10} />
              Analisando apenas candidatos do lote selecionado
            </p>
          )}
        </div>

        {/* Filtros numéricos */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NumericInput
            label="Score Mínimo"
            value={props.minScore}
            onChange={props.onMinScoreChange}
            placeholder="0%"
            suffix="%"
          />
          <NumericInput
            label="Raio (KM)"
            value={props.radius}
            onChange={props.onRadiusChange}
            placeholder="Qualquer"
            suffix=" km"
          />
          <label className="flex cursor-pointer flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 select-none">Filtrar DISC</span>
            <div
              onClick={() => props.onDiscChange(!props.onlyWithDisc)}
              className={cn(
                'flex h-9 items-center justify-between rounded-lg border px-3.5 transition-all',
                props.onlyWithDisc
                  ? 'border-develoi-navy/30 bg-develoi-navy/5'
                  : 'border-zinc-200 bg-zinc-50'
              )}
            >
              <span className={cn(
                'text-[12px] font-medium transition-colors',
                props.onlyWithDisc ? 'text-develoi-navy' : 'text-zinc-400'
              )}>
                {props.onlyWithDisc ? 'Ativo' : 'Inativo'}
              </span>
              <Switch checked={props.onlyWithDisc} onCheckedChange={props.onDiscChange} />
            </div>
          </label>
        </div>

        {/* Run button */}
        <button
          onClick={props.onExecute}
          disabled={props.isMatching || !props.selectedJobId}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-develoi-navy py-3 text-[12px] font-bold text-white shadow-lg shadow-develoi-navy/15 transition-all hover:bg-[#0a1e3a] disabled:opacity-50"
        >
          {props.isMatching ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Processando análise…
            </>
          ) : (
            <>
              <Zap size={15} className="text-develoi-gold" />
              Rodar Análise Aurora AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#C5A04D' : '#94a3b8';

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-[11px] font-black tabular-nums"
        style={{ color }}
      >
        {score}%
      </span>
    </div>
  );
}

// ─── DiscMiniBar ──────────────────────────────────────────────────────────────

const DISC_COLORS = { D: '#ef4444', I: '#f59e0b', S: '#10b981', C: '#3b82f6' } as const;

function DiscMiniBar({ d, i, s, c }: { d?: number; i?: number; s?: number; c?: number }) {
  const entries = [
    { l: 'D' as const, v: d || 0 },
    { l: 'I' as const, v: i || 0 },
    { l: 'S' as const, v: s || 0 },
    { l: 'C' as const, v: c || 0 },
  ];
  const total = entries.reduce((a, e) => a + e.v, 0);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-2">
      <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">DISC</span>
      {entries.map(({ l, v }) => (
        <div key={l} className="flex flex-col items-center gap-0.5 flex-1">
          <span className="text-[9px] font-bold tabular-nums" style={{ color: DISC_COLORS[l] }}>{v}%</span>
          <div className="h-6 w-full overflow-hidden rounded-full bg-zinc-200 flex items-end">
            <div className="w-full rounded-full" style={{ height: `${v}%`, backgroundColor: DISC_COLORS[l] }} />
          </div>
          <span className="text-[9px] font-bold text-zinc-400">{l}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-develoi-navy text-develoi-gold',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
];

const CLASSIFICATION_STYLE: Record<string, string> = {
  'Altíssimo Fit': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Alto Fit':      'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'Fit Baixo':     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Incompatível':  'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

function MatchCard({ rec, radius, onClick, index }: { rec: MatchResult; radius: number; onClick: () => void; index: number }) {
  const initials = (rec.full_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const classStyle = CLASSIFICATION_STYLE[rec.classification] ?? 'bg-zinc-100 text-zinc-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-develoi-gold/40 hover:shadow-md"
    >
      {/* Top band — colored by score */}
      <div className={cn(
        'h-1',
        rec.compatibility_score >= 90 ? 'bg-emerald-500' :
        rec.compatibility_score >= 70 ? 'bg-develoi-gold' :
        'bg-zinc-300'
      )} />

      <div className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-black transition-colors',
            AVATAR_COLORS[index % AVATAR_COLORS.length]
          )}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-zinc-900">{rec.full_name}</p>
            <p className="flex items-center gap-1 text-[10px] text-zinc-400">
              <MapPin size={9} /> {rec.city}, {rec.state}
              {rec.distance_km != null && (
                <span className={cn('ml-1 font-medium', rec.distance_km <= radius ? 'text-emerald-600' : 'text-amber-500')}>
                  · {rec.distance_km}km
                </span>
              )}
            </p>
          </div>
          <ScoreRing score={rec.compatibility_score} size={48} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', classStyle)}>
            {rec.classification}
          </span>
          {rec.has_disc && (
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
              DISC {rec.disc_profile}
            </span>
          )}
        </div>

        {/* DISC bars */}
        {rec.has_disc && (
          <DiscMiniBar d={rec.disc_d} i={rec.disc_i} s={rec.disc_s} c={rec.disc_c} />
        )}

        {/* Strengths */}
        {rec.strengths?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rec.strengths.slice(0, 3).map((s, i) => (
              <span key={i} className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                {s}
              </span>
            ))}
            {rec.strengths.length > 3 && (
              <span className="px-1 text-[10px] text-zinc-400">+{rec.strengths.length - 3}</span>
            )}
          </div>
        )}

        {/* Reason */}
        <p className="border-l-2 border-develoi-gold/50 pl-3 text-[11px] font-medium italic leading-relaxed text-zinc-500 line-clamp-2">
          "{rec.recommendation_reason}"
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-50 pt-2">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-develoi-gold transition-all group-hover:gap-1.5">
            Ver análise <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AuroraSidebar ────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

interface SidebarProps {
  stats: any;
}

function AuroraSidebar({ stats }: SidebarProps) {
  const kpis = [
    { label: 'Vagas Ativas',      value: stats?.active_jobs ?? 0,           icon: Briefcase2, color: 'text-white' },
    { label: 'Novos Candidatos',  value: `+${stats?.new_candidates ?? 0}`,   icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Alto Fit (>80%)',   value: stats?.compatible_candidates ?? 0,  icon: Target,     color: 'text-develoi-gold' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI card */}
      <div className="relative overflow-hidden rounded-2xl bg-develoi-navy p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-develoi-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={13} className="text-develoi-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Insights de Hoje</span>
          </div>
          <div className="space-y-3">
            {kpis.map((k, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <k.icon size={12} className="text-white/40" />
                  <span className="text-[11px] font-medium text-white/60">{k.label}</span>
                </div>
                <span className={cn('text-[18px] font-black tabular-nums', k.color)}>{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Neural Engine status */}
      <div className="relative overflow-hidden rounded-2xl bg-develoi-navy p-5">
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-sky-500/10 blur-3xl -ml-12 -mb-12" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Cpu size={18} className="text-develoi-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-white">Neural Engine</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium text-white/40">v4.2.0 · Stable</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-develoi-gold/15">
            <Shield size={12} className="text-develoi-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SettingsModal ────────────────────────────────────────────────────────────

interface SettingsModalProps {
  open: boolean;
  minScore: string;
  radius: string;
  precisionMode: string;
  onMinScoreChange: (v: string) => void;
  onRadiusChange: (v: string) => void;
  onPrecisionChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

function SettingsModal(props: SettingsModalProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title="Configurações da Aurora AI">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <NumericInput label="Score Mínimo (%)" value={props.minScore} onChange={props.onMinScoreChange} placeholder="0%" suffix="%" />
          <NumericInput label="Raio Padrão (KM)" value={props.radius} onChange={props.onRadiusChange} placeholder="Qualquer" suffix=" km" />
        </div>
        <SegmentedControl label="Personalidade do Core" options={['Analítica', 'Criativa', 'Equilibrada']} value={props.precisionMode} onChange={props.onPrecisionChange} />
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" fullWidth onClick={props.onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth onClick={props.onSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MatchDetailsModal ────────────────────────────────────────────────────────

function MatchDetailsModal({ rec, radius, onClose }: { rec: MatchResult; radius: number; onClose: () => void }) {
  const navigate = useNavigate();
  const initials = (rec.full_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const classStyle = CLASSIFICATION_STYLE[rec.classification] ?? 'bg-zinc-100 text-zinc-600';
  const discLabel: Record<string, string> = {
    D: 'Dominância — Direto, decisivo, orientado a resultados',
    I: 'Influência — Comunicativo, otimista, motivador',
    S: 'Estabilidade — Paciente, colaborativo, confiável',
    C: 'Conformidade — Analítico, preciso, sistemático',
  };

  return (
    <Modal open onClose={onClose} title={`Análise IA: ${rec.full_name}`} size="lg">
      <div className="space-y-5 pb-2">
        {/* Candidate header */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-develoi-navy text-[16px] font-black text-develoi-gold shadow-md">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-zinc-900 truncate">{rec.full_name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                  <MapPin size={10} /> {rec.city}, {rec.state}
                  {rec.distance_km != null && (
                    <span className={cn('ml-1 font-semibold', rec.distance_km <= radius ? 'text-emerald-600' : 'text-amber-500')}>
                      ({rec.distance_km}km)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <ScoreRing score={rec.compatibility_score} size={52} />
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', classStyle)}>
                  {rec.classification}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => { onClose(); navigate(`/candidatos/${encodeId(Number(rec.candidate_id))}`); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-develoi-navy/20 bg-develoi-navy/5 py-2.5 text-[12px] font-semibold text-develoi-navy transition-all hover:bg-develoi-navy/8"
        >
          <User size={13} /> Ver Perfil Completo
        </button>

        {/* Veredito */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={12} className="text-develoi-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Veredito Aurora</span>
          </div>
          <p className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-[12px] font-medium italic leading-relaxed text-sky-900">
            "{rec.recommendation_reason}"
          </p>
        </div>

        {/* Strengths + attention */}
        <div className="grid gap-4 sm:grid-cols-2">
          {rec.strengths?.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Pontos Fortes</span>
              </div>
              <ul className="space-y-1.5">
                {rec.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] font-medium text-zinc-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.attention_points?.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Pontos de Atenção</span>
              </div>
              <ul className="space-y-1.5">
                {rec.attention_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] font-medium text-zinc-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* DISC */}
        {rec.has_disc && (
          <div className="border-t border-zinc-100 pt-4">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-100 text-[9px] font-black text-blue-700">D</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Perfil DISC</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-black',
                rec.disc_profile === 'D' ? 'bg-red-100 text-red-700' :
                rec.disc_profile === 'I' ? 'bg-amber-100 text-amber-700' :
                rec.disc_profile === 'S' ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700'
              )}>
                {rec.disc_profile}
              </div>
              <p className="min-w-0 flex-1 text-[11px] font-medium text-zinc-600">
                {discLabel[rec.disc_profile] ?? `Perfil ${rec.disc_profile}`}
              </p>
              <DiscMiniBar d={rec.disc_d} i={rec.disc_i} s={rec.disc_s} c={rec.disc_c} />
            </div>
          </div>
        )}

        {/* Risk */}
        {rec.risk_reason && (
          <div className="border-t border-zinc-100 pt-4">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertCircle size={12} className="text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">Análise de Risco</span>
            </div>
            <p className="text-[12px] font-medium text-zinc-600">{rec.risk_reason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

type ViewId = 'match' | 'results' | 'history';

const VIEW_PATHS: Record<ViewId, string> = {
  match:   '/aderencia',
  results: '/aderencia/aderencias',
  history: '/aderencia/historico',
};

const PATH_TO_VIEW: Record<string, ViewId> = {
  '':         'match',
  aderencia:  'match',
  aderencias: 'results',
  historico:  'history',
};

const VIEWS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'match',   label: 'Nova Análise', icon: Zap },
  { id: 'results', label: 'Aderências',   icon: Target },
  { id: 'history', label: 'Histórico',    icon: History },
];

function TabBar({ active, onChange }: { active: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
      {VIEWS.map(view => (
        <button
          key={view.id}
          onClick={() => onChange(view.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-all',
            active === view.id
              ? 'bg-develoi-navy text-white shadow-sm'
              : 'text-zinc-500 hover:bg-white hover:text-zinc-800'
          )}
        >
          <view.icon size={13} />
          {view.label}
        </button>
      ))}
    </div>
  );
}

// ─── Placeholder component for missing Briefcase2 ────────────────────────────

function Briefcase2({ size, className }: { size?: number; className?: string }) {
  return <Zap size={size} className={className} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuroraAI() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? 'master' : currentUnit.id;
  const activeUnitId = currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.replace('/aderencia', '').replace(/^\//, '').split('/')[0];
  const activeView: ViewId = PATH_TO_VIEW[pathSegment] ?? 'match';

  const setActiveView = useCallback((v: ViewId) => {
    navigate(VIEW_PATHS[v], { replace: true });
  }, [navigate]);

  // Data
  const [jobs, setJobs] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Match
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  const { get: getPref, set: setPref } = useUserPreferences();
  const [precisionMode, setPrecisionMode] = useState(() => getPref<string>('aurora_precisionMode', 'Equilibrada'));
  const [minScore, setMinScore] = useState(() => getPref<string>('aurora_minScore', '70'));
  const [radius, setRadius] = useState(() => getPref<string>('aurora_radius', '50'));
  const [onlyWithDisc, setOnlyWithDisc] = useState(() => getPref<boolean>('aurora_onlyWithDisc', false));
  const [showSettings, setShowSettings] = useState(false);

  // ─── Results (Aderências salvas) ─────────────────────────────────────────
  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([]);
  const [savedMatchesJobId, setSavedMatchesJobId] = useState('');
  const [savedMatchesMinScore, setSavedMatchesMinScore] = useState('70');
  const [savedMatchesLoading, setSavedMatchesLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  useEffect(() => { fetchJobs(); fetchSessions(); fetchStats(); fetchBatches(); }, [queryUnitId]);
  useEffect(() => { if (selectedJobId && activeView === 'match') fetchExistingMatches(); }, [selectedJobId, activeView, minScore]);
  useEffect(() => { if (activeView === 'results') fetchSavedMatches(); }, [activeView, savedMatchesJobId]);

  async function fetchJobs() {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      setJobs(await res.json());
    } catch { /* silent */ }
  }
  async function fetchBatches() {
    try {
      const res = await fetch(`/api/imports?tenantId=${tenantId}`);
      if (res.ok) setBatches(await res.json());
    } catch { /* silent */ }
  }
  async function fetchSessions() {
    try {
      const res = await fetch(`/api/aurora-ai/sessions?tenantId=${tenantId}&unitId=${queryUnitId}`);
      setSessions(await res.json());
    } catch { /* silent */ }
  }
  async function fetchStats() {
    try {
      const res = await fetch(`/api/dashboard/overview?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch { /* silent */ }
  }
  async function fetchExistingMatches() {
    try {
      const res = await fetch(`/api/aurora-ai/matches/${selectedJobId}?minScore=${minScore}`);
      if (res.ok) setMatchResults((await res.json()) || []);
    } catch { /* silent */ }
  }

  async function fetchSavedMatches(jobId?: string, scoreOverride?: string) {
    const jid = jobId ?? savedMatchesJobId;
    if (!jid) { setSavedMatches([]); return; }
    setSavedMatchesLoading(true);
    try {
      const score = scoreOverride ?? savedMatchesMinScore;
      const res = await fetch(`/api/aurora-ai/matches/${jid}?minScore=${score}`);
      if (res.ok) setSavedMatches((await res.json()) || []);
    } catch { toast.error('Erro ao carregar aderências.'); }
    finally { setSavedMatchesLoading(false); }
  }

  async function executeMatch() {
    if (!selectedJobId) { toast.error('Selecione uma vaga primeiro'); return; }
    setIsMatching(true);
    try {
      const res = await fetch('/api/aurora-ai/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId, tenantId, unitId: queryUnitId,
          precisionMode, minScore, radius, onlyWithDisc,
          batchId: selectedBatchId || undefined,
          filters: { precisionMode, minScore, radius, onlyWithDisc, batchId: selectedBatchId || undefined },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Erro ao calcular aderência.');
      setMatchResults(data.results || []);
      setHasSearched(true);
      toast.success(`Análise concluída! ${(data.results || []).length} candidato(s) encontrado(s).`);
      fetchSessions();
      // Sincronizar na aba de aderências também
      setSavedMatchesJobId(String(selectedJobId));
      setSavedMatchesMinScore(minScore);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao calcular aderência.');
    } finally {
      setIsMatching(false);
    }
  }

  const handlePrecisionChange = (v: string) => { setPrecisionMode(v); setPref('aurora_precisionMode', v); };
  const handleMinScoreChange  = (v: string) => { setMinScore(v); setPref('aurora_minScore', v); };
  const handleRadiusChange    = (v: string) => { setRadius(v); setPref('aurora_radius', v); };
  const handleDiscChange      = (v: boolean) => { setOnlyWithDisc(v); setPref('aurora_onlyWithDisc', v); };

  const handleContactSaved = (id: number, status: string, notes: string) =>
    setSavedMatches(prev => prev.map(m => m.candidate_id === id ? { ...m, contact_status: status, contact_notes: notes } : m));

  const handleStageSaved = (id: number, stage: string) =>
    setSavedMatches(prev => prev.map(m => m.candidate_id === id ? { ...m, funnel_stage: stage } : m));

  const [sessionDetailModal, setSessionDetailModal] = useState<any | null>(null);

  function handleSessionClick(session: any) {
    if (session.search_type === 'match-job' && session.job_id) {
      setSelectedJobId(String(session.job_id));
      if (session.filters) {
        if (session.filters.precisionMode) handlePrecisionChange(session.filters.precisionMode);
        if (session.filters.minScore != null) handleMinScoreChange(String(session.filters.minScore));
        if (session.filters.radius != null) handleRadiusChange(String(session.filters.radius));
        if (session.filters.onlyWithDisc != null) handleDiscChange(session.filters.onlyWithDisc);
      }
    }
    setActiveView('match');
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

      {/* ── PAGE HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
        {/* Glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/2 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
              <Brain size={22} className="text-develoi-gold" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-develoi-navy">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-black leading-none tracking-tight text-white sm:text-[24px]">
                  Aurora AI
                </h1>
                <span className="rounded-full bg-develoi-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-develoi-gold">
                  v4.2
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-white/40">
                Intelligent Human Capital Advisor
              </p>
            </div>
          </div>

          {/* Tabs */}
          <TabBar active={activeView} onChange={setActiveView} />
        </div>

        {/* Stats strip */}
        <div className="relative z-10 mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4">
          {[
            { label: 'Vagas ativas',   value: stats?.active_jobs ?? '–' },
            { label: 'Candidatos',     value: stats?.total_candidates ?? '–' },
            { label: 'Alto fit (>80%)', value: stats?.compatible_candidates ?? '–' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="h-3 w-px bg-white/10" />}
              <span className="text-[16px] font-black text-white tabular-nums">{s.value}</span>
              <span className="text-[10px] font-medium text-white/35">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

        {/* Main area */}
        <div className="space-y-5 lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeView === 'match' && (
              <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-5">
                <MatchFilters
                  jobs={jobs}
                  batches={batches}
                  selectedJobId={selectedJobId}
                  selectedBatchId={selectedBatchId}
                  precisionMode={precisionMode}
                  minScore={minScore}
                  radius={radius}
                  onlyWithDisc={onlyWithDisc}
                  isMatching={isMatching}
                  onJobChange={v => { setSelectedJobId(v); setHasSearched(false); setMatchResults([]); }}
                  onBatchChange={setSelectedBatchId}
                  onPrecisionChange={handlePrecisionChange}
                  onMinScoreChange={handleMinScoreChange}
                  onRadiusChange={handleRadiusChange}
                  onDiscChange={handleDiscChange}
                  onExecute={executeMatch}
                />

                <AnalysisProgressOverlay
                  visible={isMatching}
                  jobTitle={jobs.find(j => String(j.id) === String(selectedJobId))?.title ?? 'vaga selecionada'}
                />

                {!isMatching && matchResults.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-zinc-500">
                        <span className="font-bold text-zinc-900">{matchResults.length}</span> candidatos encontrados
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {matchResults.map((rec, i) => (
                        <MatchCard
                          key={`${rec.candidate_id}-${i}`}
                          rec={rec}
                          radius={Number(radius) || 0}
                          index={i}
                          onClick={() => setSelectedMatch(rec)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!isMatching && hasSearched && matchResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white py-16 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                      <Sparkles size={22} className="text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-zinc-700">Nenhum candidato compatível</p>
                      <p className="mt-1 max-w-xs text-[11px] text-zinc-400">
                        Tente reduzir o score mínimo ou o raio de distância.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeView === 'results' && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">

                {/* Filtros da aba results */}
                <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5" style={{ minWidth: 200 }}>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Vaga</span>
                    <select
                      value={savedMatchesJobId}
                      onChange={e => { setSavedMatchesJobId(e.target.value); setExpandedMatch(null); }}
                      className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-800 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '10px', paddingRight: '2rem' }}
                    >
                      <option value="">Selecione uma vaga…</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.city}/{j.state}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Score mín.</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text" inputMode="numeric"
                        value={savedMatchesMinScore !== '' ? `${savedMatchesMinScore}%` : ''}
                        placeholder="70%"
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setSavedMatchesMinScore(raw === '' ? '' : String(Math.min(100, Math.max(0, Number(raw)))));
                        }}
                        onBlur={() => { if (savedMatchesJobId) fetchSavedMatches(savedMatchesJobId, savedMatchesMinScore); }}
                        onKeyDown={e => { if (e.key === 'Enter' && savedMatchesJobId) fetchSavedMatches(savedMatchesJobId, savedMatchesMinScore); }}
                        className="h-9 w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-800 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white"
                      />
                      <button
                        onClick={() => fetchSavedMatches(savedMatchesJobId, savedMatchesMinScore)}
                        disabled={!savedMatchesJobId || savedMatchesLoading}
                        className="flex h-9 items-center gap-1.5 rounded-lg bg-develoi-navy px-3.5 text-[12px] font-medium text-white transition-all hover:bg-[#0a1e3a] disabled:opacity-40"
                      >
                        {savedMatchesLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        Filtrar
                      </button>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                {savedMatches.length > 0 && !savedMatchesLoading && (() => {
                  const top = Math.max(...savedMatches.map(m => m.compatibility_score));
                  const excellent = savedMatches.filter(m => m.compatibility_score >= 90).length;
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard title="Candidatos" value={savedMatches.length} icon={Users} color="info" description="aderências encontradas" />
                      <StatCard title="Maior Aderência" value={`${top}%`} icon={Star} color="gold" description="melhor score atual" />
                      <StatCard title="Alta Aderência" value={excellent} icon={Award} color="success" description="scores ≥ 90%" />
                    </div>
                  );
                })()}

                {/* Empty states */}
                {!savedMatchesJobId && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white py-16 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                      <Target size={22} className="text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-zinc-700">Selecione uma vaga</p>
                      <p className="mt-1 text-[11px] text-zinc-400">Escolha uma vaga acima para ver as aderências já analisadas pela Aurora AI.</p>
                    </div>
                  </div>
                )}

                {savedMatchesJobId && savedMatchesLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-develoi-gold/10">
                      <Loader2 size={22} className="animate-spin text-develoi-gold" />
                      <div className="absolute inset-0 animate-ping rounded-full bg-develoi-gold/5" />
                    </div>
                    <p className="text-[11px] font-medium text-zinc-400">Carregando aderências…</p>
                  </div>
                )}

                {savedMatchesJobId && !savedMatchesLoading && savedMatches.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white py-16 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                      <Sparkles size={22} className="text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-zinc-700">Nenhuma aderência encontrada</p>
                      <p className="mt-1 max-w-xs text-[11px] text-zinc-400">
                        Não há resultados para esta vaga com score ≥ {savedMatchesMinScore || 0}%. Execute uma nova análise na aba "Nova Análise".
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de matches */}
                {!savedMatchesLoading && savedMatches.map((match, idx) => {
                  const isOpen = expandedMatch === match.candidate_id;
                  const cfg = getScoreCfg(match.compatibility_score);
                  const stageOpt = getStageOpt(match.funnel_stage ?? 'Triagem');
                  const contactOpt = getContactOpt(match.contact_status ?? '');

                  return (
                    <motion.div
                      key={match.candidate_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className={cn(
                        'overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
                        isOpen ? 'border-develoi-gold/40 shadow-md' : 'border-zinc-200 hover:border-zinc-300'
                      )}
                    >
                      {/* Banda de score */}
                      <div className={cn('h-0.5', cfg.bar)} />

                      {/* Header clicável */}
                      <button
                        type="button"
                        onClick={() => setExpandedMatch(isOpen ? null : match.candidate_id)}
                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50/60 sm:px-5"
                      >
                        <span className="hidden w-5 shrink-0 text-[10px] font-bold text-zinc-300 sm:block">
                          #{idx + 1}
                        </span>
                        <MatchScoreRing score={match.compatibility_score} />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[13px] font-bold text-zinc-900">{match.full_name}</span>
                            <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', stageOpt.bgLight, stageOpt.textLight)}>
                              {stageOpt.label}
                            </span>
                            {match.contact_status && (
                              <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', contactOpt.bgLight, contactOpt.textLight)}>
                                {contactOpt.label}
                              </span>
                            )}
                            {match.has_disc && (
                              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                DISC {match.disc_profile}
                              </span>
                            )}
                          </div>
                          <p className="mb-1 truncate text-[11px] font-medium text-zinc-500">{match.desired_position}</p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                              <div className={cn('h-full rounded-full transition-all duration-700', cfg.bar)} style={{ width: `${match.compatibility_score}%` }} />
                            </div>
                            <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                              <MapPin size={9} /> {match.city}, {match.state}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all',
                          isOpen ? 'rotate-180 border-develoi-navy bg-develoi-navy text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                        )}>
                          <ChevronDown size={13} />
                        </div>
                      </button>

                      {/* Painel expandido */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="border-t border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                                {/* Coluna 1 — Contato + etapa + status */}
                                <div className="space-y-3">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">Contato</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white p-2.5 shadow-sm">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Mail size={12} /></div>
                                      <div className="min-w-0">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">E-mail</p>
                                        <p className="truncate text-[12px] font-medium text-zinc-800">{match.email || 'Não informado'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white p-2.5 shadow-sm">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500"><Phone size={12} /></div>
                                      <div className="min-w-0">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Telefone</p>
                                        <p className="truncate text-[12px] font-medium text-zinc-800">{match.phone || 'Não informado'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {match.attention_points?.length > 0 && (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                                      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">Pontos de atenção</p>
                                      <ul className="space-y-1">
                                        {match.attention_points.slice(0, 3).map((pt, i) => (
                                          <li key={i} className="flex items-start gap-1.5 text-[10px] font-medium text-amber-800">
                                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                                            {pt}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                                    <FunnelStagePanel match={match} jobId={savedMatchesJobId} tenantId={tenantId} onSaved={handleStageSaved} />
                                  </div>
                                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                                    <ContactStatusPanel match={match} jobId={savedMatchesJobId} tenantId={tenantId} onSaved={handleContactSaved} />
                                  </div>
                                </div>

                                {/* Colunas 2-3 — Análise IA */}
                                <div className="space-y-3 md:col-span-2">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">Análise Aurora AI</p>

                                  {/* Veredito */}
                                  <div className="relative overflow-hidden rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-develoi-gold/5 blur-2xl" />
                                    <div className="relative flex items-start gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-develoi-gold/10">
                                        <Brain size={14} className="text-develoi-gold" />
                                      </div>
                                      <div>
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Recomendação</p>
                                        <p className="text-[12px] font-medium italic leading-relaxed text-zinc-700">"{match.recommendation_reason}"</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Strengths */}
                                  {match.strengths?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {match.strengths.slice(0, 5).map((s, i) => (
                                        <span key={i} className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                                          <CheckCircle2 size={9} /> {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Risk */}
                                  {match.risk_reason && match.risk_reason !== 'Nenhum risco relevante identificado' && (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-3">
                                      <AlertCircle size={13} className="mt-0.5 shrink-0 text-rose-500" />
                                      <div>
                                        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-500">Risco</p>
                                        <p className="text-[11px] font-medium text-rose-800">{match.risk_reason}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Ações */}
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                      onClick={() => window.open(`/api/candidates/${match.candidate_id}/cv/download`, '_blank')}
                                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                                    >
                                      <Download size={12} /> Baixar CV
                                    </button>
                                    <button
                                      onClick={() => { toast.success('DISC enviado por e-mail!'); }}
                                      className="flex items-center gap-1.5 rounded-lg bg-develoi-navy px-3 py-2 text-[11px] font-medium text-white transition-colors hover:bg-[#0a1e3a]"
                                    >
                                      <Mail size={12} /> Enviar DISC
                                    </button>
                                    {!match.has_disc && (
                                      <button
                                        onClick={() => { toast.success('DISC vinculado ao perfil.'); }}
                                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                                      >
                                        <FileText size={12} /> Vincular DISC
                                      </button>
                                    )}
                                    {match.has_disc && (
                                      <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
                                        <CheckCircle2 size={12} /> DISC Vinculado
                                      </span>
                                    )}
                                    <Link
                                      to={`/candidatos/${encodeId(match.candidate_id)}`}
                                      className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                                    >
                                      Ver Perfil <ChevronRight size={12} />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {activeView === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-navy/8">
                      <History size={14} className="text-develoi-navy" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-zinc-900">Histórico de Análises</h3>
                      <p className="text-[11px] text-zinc-400">Clique em uma sessão para ver os detalhes completos</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {sessions.length === 0 ? (
                      <div className="py-14 text-center text-[12px] font-medium text-zinc-400">
                        Nenhuma sessão encontrada ainda.
                      </div>
                    ) : sessions.map((session, i) => {
                      const isMatch = session.search_type === 'match-job';
                      const title = isMatch
                        ? (jobs.find(j => j.id === session.job_id)?.title ?? `Vaga #${session.job_id}`)
                        : (session.summary ?? 'Conversa Aurora');
                      const f = session.filters;
                      const results: any[] = session.results ?? [];
                      const topScore = isMatch && results.length > 0
                        ? Math.max(...results.map((r: any) => r.compatibility_score ?? 0))
                        : null;
                      const dateStr = session.created_at
                        ? new Date(session.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—';
                      return (
                        <button
                          key={i}
                          onClick={() => setSessionDetailModal(session)}
                          className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50"
                        >
                          <div className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                            isMatch
                              ? 'bg-develoi-navy/8 text-develoi-navy group-hover:bg-develoi-navy group-hover:text-white'
                              : 'bg-zinc-100 text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white'
                          )}>
                            {isMatch ? <Target size={15} /> : <MessageSquare size={15} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  <span className={cn(
                                    'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                    isMatch ? 'bg-develoi-navy/8 text-develoi-navy' : 'bg-zinc-100 text-zinc-500'
                                  )}>
                                    {isMatch ? 'Pré-Análise' : 'Consulta'}
                                  </span>
                                  {isMatch && results.length > 0 && (
                                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                      {results.length} resultado{results.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-[13px] font-semibold text-zinc-800">{title}</p>
                              </div>
                              {topScore !== null && (
                                <div className="shrink-0 text-right">
                                  <p className="text-[11px] font-black text-develoi-navy">{topScore}%</p>
                                  <p className="text-[9px] text-zinc-400">top fit</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                                <Clock size={9} /> {dateStr}
                              </span>
                              {isMatch && f && (
                                <>
                                  {f.precisionMode && (
                                    <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-600">
                                      <Brain size={8} /> {f.precisionMode}
                                    </span>
                                  )}
                                  {f.minScore != null && f.minScore !== '' && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">≥{f.minScore}%</span>
                                  )}
                                  {f.radius != null && f.radius !== '' && (
                                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">{f.radius}km</span>
                                  )}
                                  {f.onlyWithDisc && (
                                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">DISC ✓</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={14} className="mt-2 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-600" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <AuroraSidebar
            stats={stats}
          />
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        minScore={minScore}
        radius={radius}
        precisionMode={precisionMode}
        onMinScoreChange={handleMinScoreChange}
        onRadiusChange={handleRadiusChange}
        onPrecisionChange={handlePrecisionChange}
        onClose={() => setShowSettings(false)}
        onSave={() => { toast.success('Configurações salvas!'); setShowSettings(false); }}
      />

      {selectedMatch && (
        <MatchDetailsModal
          rec={selectedMatch}
          radius={Number(radius) || 0}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Session Detail Modal */}
      {sessionDetailModal && (() => {
        const session = sessionDetailModal;
        const isMatch = session.search_type === 'match-job';
        const title = isMatch
          ? (jobs.find((j: any) => j.id === session.job_id)?.title ?? `Vaga #${session.job_id}`)
          : (session.summary ?? 'Conversa Aurora');
        const f = session.filters;
        const results: any[] = session.results ?? [];
        const dateStr = session.created_at
          ? new Date(session.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';

        return (
          <Modal open onClose={() => setSessionDetailModal(null)} title="Detalhes da Sessão" size="lg">
            <div className="space-y-5 pb-2">
              {/* Header da sessão */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  isMatch ? 'bg-develoi-navy/10 text-develoi-navy' : 'bg-zinc-200 text-zinc-500'
                )}>
                  {isMatch ? <Target size={18} /> : <MessageSquare size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      isMatch ? 'bg-develoi-navy/10 text-develoi-navy' : 'bg-zinc-200 text-zinc-600'
                    )}>
                      {isMatch ? 'Pré-Análise de Aderência' : 'Consulta Aurora'}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-bold text-zinc-900">{title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400">
                    <Clock size={10} /> {dateStr}
                  </p>
                </div>
              </div>

              {/* Parâmetros usados */}
              {isMatch && f && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Parâmetros Aplicados</p>
                  <div className="flex flex-wrap gap-2">
                    {f.precisionMode && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                        <Brain size={11} className="text-zinc-500" />
                        <span className="text-[11px] font-semibold text-zinc-700">{f.precisionMode}</span>
                      </div>
                    )}
                    {f.minScore != null && f.minScore !== '' && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <Target size={11} className="text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-700">Score mín. {f.minScore}%</span>
                      </div>
                    )}
                    {f.radius != null && f.radius !== '' && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                        <MapPin size={11} className="text-sky-600" />
                        <span className="text-[11px] font-semibold text-sky-700">Raio {f.radius}km</span>
                      </div>
                    )}
                    {f.onlyWithDisc && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                        <span className="text-[11px] font-black text-violet-700">DISC</span>
                        <CheckCircle2 size={11} className="text-violet-600" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resultados */}
              {isMatch && results.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Resultados da Análise ({results.length})
                    </p>
                    <button
                      onClick={() => {
                        setSessionDetailModal(null);
                        handleSessionClick(session);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-develoi-navy hover:underline"
                    >
                      Restaurar e continuar <ChevronRight size={11} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {results.slice(0, 20).map((r: any, idx: number) => {
                      const classStyle = CLASSIFICATION_STYLE[r.classification] ?? 'bg-zinc-100 text-zinc-600';
                      return (
                        <div key={idx} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-develoi-navy text-[11px] font-black text-develoi-gold">
                            {(r.full_name || 'C').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-zinc-800">{r.full_name}</p>
                            <p className="truncate text-[10px] text-zinc-400">{r.city}{r.state ? `, ${r.state}` : ''}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[13px] font-black text-develoi-navy">{r.compatibility_score}%</p>
                            <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold', classStyle)}>
                              {r.classification}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {results.length > 20 && (
                      <p className="py-1 text-center text-[10px] text-zinc-400">
                        +{results.length - 20} candidatos — restaure a sessão para ver todos
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sem resultados */}
              {isMatch && results.length === 0 && (
                <div className="rounded-xl border border-zinc-100 py-8 text-center">
                  <p className="text-[12px] font-medium text-zinc-400">Nenhum resultado registrado nesta sessão.</p>
                </div>
              )}

              {/* Ações */}
              {isMatch && (
                <button
                  onClick={() => { setSessionDetailModal(null); handleSessionClick(session); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-develoi-navy/20 bg-develoi-navy/5 py-2.5 text-[12px] font-semibold text-develoi-navy transition-all hover:bg-develoi-navy/10"
                >
                  <Zap size={13} /> Restaurar Filtros e Ir para Nova Análise
                </button>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

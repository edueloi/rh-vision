import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Sparkles, Bot, Send, Target, CheckCircle2, AlertCircle,
  MessageSquare, History, Settings as SettingsIcon, ChevronRight,
  Zap, User, MapPin, Cpu, Users, Search, BarChart3, Save, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getAuthHeaders, getTenantId } from '@/src/lib/auth';
import { useUnit } from '@/src/lib/useUnit';
import {
  useToast, PanelCard, Button, IconButton, Badge, Input, Select, Switch, Modal,
  PageWrapper, SectionTitle,
} from '@/src/components/ui';

// ─── SegmentedControl ────────────────────────────────────────────────────────

interface SegmentedControlProps {
  label?: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}

function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">{label}</span>
      )}
      <div className="flex h-10 p-1 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-full shadow-sm">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all px-2',
              value === opt
                ? 'bg-[#2a74ac] text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Small reusable pieces ────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-zinc-900 dark:bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
        <Bot size={16} className="animate-pulse" />
      </div>
      <div className="bg-zinc-100 dark:bg-white/5 p-4 rounded-3xl rounded-tl-none flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isAssistant = msg.role === 'assistant';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-end gap-3', isAssistant ? 'flex-row' : 'flex-row-reverse')}
    >
      <div className={cn(
        'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md',
        isAssistant
          ? 'bg-develoi-navy dark:bg-white/10 text-develoi-gold'
          : 'bg-develoi-gold dark:bg-develoi-navy text-white'
      )}>
        {isAssistant ? <Sparkles size={16} /> : <User size={16} />}
      </div>

      <div className={cn(
        'max-w-[80%] rounded-3xl px-5 py-3.5 text-[13px] leading-relaxed',
        isAssistant
          ? 'bg-white dark:bg-white/5 text-zinc-700 dark:text-zinc-200 rounded-bl-none border border-zinc-100 dark:border-white/5 shadow-sm'
          : 'bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy rounded-br-none font-medium shadow-lg'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={cn(
          'mt-1.5 text-[10px] font-bold uppercase tracking-widest opacity-40',
          isAssistant ? 'text-left' : 'text-right'
        )}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Chat view ────────────────────────────────────────────────────────────────

interface ChatViewProps {
  messages: Message[];
  input: string;
  isTyping: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onOpenSettings: () => void;
}

function ChatView({ messages, input, isTyping, scrollRef, onInputChange, onSend, onOpenSettings }: ChatViewProps) {
  return (
    <div className="bg-white dark:bg-[#0d1b3e]/40 dark:backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-white/10 shadow-xl flex flex-col h-[600px] md:h-[650px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-develoi-navy dark:bg-white/10 text-develoi-gold rounded-xl flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-develoi-navy dark:text-white uppercase tracking-widest">Aurora Core</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <IconButton variant="ghost" size="md" onClick={onOpenSettings}>
          <SettingsIcon size={16} className="text-zinc-400" />
        </IconButton>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth">
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-transparent shrink-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Pergunte algo para a Aurora..."
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            className="flex-1 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-xs font-bold"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-2xl bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity shadow-lg"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analysis progress overlay ───────────────────────────────────────────────

const ANALYSIS_STAGES = [
  { icon: Search,    label: "Buscando candidatos",         detail: "Carregando banco de talentos..." },
  { icon: Users,     label: "Carregando perfis",           detail: "Processando dados e histórico..." },
  { icon: Brain,     label: "Aurora analisando perfis",    detail: "IA neural comparando competências..." },
  { icon: BarChart3, label: "Calculando aderência",        detail: "Atribuindo scores e classificações..." },
  { icon: Save,      label: "Salvando resultados",         detail: "Registrando análises no sistema..." },
];

function AnalysisProgressOverlay({ jobTitle, visible }: { jobTitle: string; visible: boolean }) {
  const [stage, setStage] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!visible) { setStage(0); return; }
    setStage(0);

    // Advance through stages with realistic timing
    const timings = [800, 1800, 0, 2200, 1200]; // ms each stage lasts (stage 2 stays until done)
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const advance = () => {
      idx++;
      if (idx < ANALYSIS_STAGES.length - 1) {
        setStage(idx);
        if (timings[idx] > 0) {
          timers.push(setTimeout(advance, timings[idx]));
        }
      } else {
        setStage(idx); // stay on last stage
      }
    };

    timers.push(setTimeout(advance, timings[0]));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  // Animated dots
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setDots(d => (d + 1) % 4), 450);
    return () => clearInterval(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25 }}
          className="mt-4 rounded-3xl border border-develoi-navy/20 bg-develoi-navy overflow-hidden shadow-2xl"
        >
          {/* Top glow bar */}
          <div className="h-1 bg-gradient-to-r from-develoi-gold via-amber-300 to-develoi-gold animate-shimmer bg-[length:200%_100%]" />

          <div className="px-6 py-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-develoi-gold/10 border border-develoi-gold/20 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-develoi-gold animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white uppercase tracking-[0.15em]">Aurora AI · Processando análise</p>
                <p className="text-[10px] text-white/40 font-medium truncate mt-0.5">{jobTitle}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-develoi-gold rounded-full animate-ping" />
                <span className="text-[9px] font-black text-develoi-gold uppercase tracking-widest">Live</span>
              </div>
            </div>

            {/* Stage list */}
            <div className="space-y-2 mb-5">
              {ANALYSIS_STAGES.map((s, i) => {
                const isDone    = i < stage;
                const isCurrent = i === stage;
                const isPending = i > stage;
                const Icon = s.icon;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-all duration-300",
                      isCurrent && "bg-white/5 border border-white/10",
                      isDone && "opacity-60",
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                      isDone    && "bg-emerald-500/20 text-emerald-400",
                      isCurrent && "bg-develoi-gold/20 text-develoi-gold",
                      isPending && "bg-white/5 text-white/20",
                    )}>
                      {isDone
                        ? <CheckCircle2 size={14} />
                        : isCurrent
                          ? <Icon size={14} className="animate-pulse" />
                          : <Icon size={14} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs font-black leading-none",
                        isDone    && "text-white/50 line-through",
                        isCurrent && "text-white",
                        isPending && "text-white/20",
                      )}>
                        {s.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] text-white/40 font-medium mt-0.5">
                          {s.detail.replace(/\.\.\.$/, '.'.repeat(dots + 1))}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <Loader2 size={13} className="text-develoi-gold animate-spin shrink-0" />
                    )}
                    {isDone && (
                      <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest shrink-0">OK</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-develoi-gold to-amber-300 rounded-full"
                initial={{ width: "5%" }}
                animate={{ width: `${Math.max(5, ((stage + 1) / ANALYSIS_STAGES.length) * 95)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-2 text-right">
              Etapa {stage + 1} de {ANALYSIS_STAGES.length}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Match filters ────────────────────────────────────────────────────────────

interface MatchFiltersProps {
  jobs: any[];
  selectedJobId: string;
  precisionMode: string;
  minScore: string;
  radius: string;
  onlyWithDisc: boolean;
  isMatching: boolean;
  onJobChange: (v: string) => void;
  onPrecisionChange: (v: string) => void;
  onMinScoreChange: (v: string) => void;
  onRadiusChange: (v: string) => void;
  onDiscChange: (v: boolean) => void;
  onExecute: () => void;
}

function MatchFilters(props: MatchFiltersProps) {
  return (
    <PanelCard
      title="Aderência de Candidatos"
      icon={Target}
      description="IA neural para encontrar candidatos ideais por competências, comportamento e localização."
    >
      <div className="space-y-6 py-2">
        {/* Job + Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Select
              label="Vaga Alvo"
              value={props.selectedJobId}
              onChange={e => props.onJobChange(e.target.value)}
            >
              <option value="">Selecione uma vaga...</option>
              {props.jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title} – {job.city}/{job.state}</option>
              ))}
            </Select>
          </div>

          <SegmentedControl
            label="Rigor da IA"
            options={['Flexível', 'Equilibrada', 'Rigorosa']}
            value={props.precisionMode}
            onChange={props.onPrecisionChange}
          />
        </div>

        {/* Numeric filters + toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Score mínimo com máscara % */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Score Mínimo</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={props.minScore !== "" ? `${props.minScore}%` : ""}
                placeholder="0%"
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") { props.onMinScoreChange(""); return; }
                  const clamped = Math.min(100, Math.max(0, Number(raw)));
                  props.onMinScoreChange(String(clamped));
                }}
                className="w-full h-10 pl-4 pr-4 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-develoi-gold/40 focus:border-develoi-gold transition-all shadow-sm"
              />
            </div>
          </div>
          {/* Raio com máscara km */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Raio (KM)</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={props.radius !== "" ? `${props.radius} km` : ""}
                placeholder="Qualquer"
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") { props.onRadiusChange(""); return; }
                  props.onRadiusChange(String(Math.max(0, Number(raw))));
                }}
                className="w-full h-10 pl-4 pr-4 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-develoi-gold/40 focus:border-develoi-gold transition-all shadow-sm"
              />
            </div>
          </div>
          <label className="flex flex-col gap-1.5 cursor-pointer group" onClick={() => props.onDiscChange(!props.onlyWithDisc)}>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">Filtrar por DISC</span>
            <div className="flex h-10 items-center justify-between px-4 bg-zinc-50 border border-zinc-200 rounded-full shadow-sm transition-all group-hover:border-zinc-300">
              <span className={cn(
                'text-xs font-black uppercase tracking-widest transition-colors',
                props.onlyWithDisc ? 'text-[#2a74ac]' : 'text-zinc-400'
              )}>
                {props.onlyWithDisc ? 'Sim' : 'Não'}
              </span>
              <Switch checked={props.onlyWithDisc} onCheckedChange={props.onDiscChange} />
            </div>
          </label>
        </div>

        <Button
          onClick={props.onExecute}
          loading={props.isMatching}
          variant="primary"
          className="w-full py-6 rounded-2xl bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy text-xs font-black uppercase tracking-[0.2em] shadow-xl"
          iconLeft={!props.isMatching && <Zap size={16} className="text-develoi-gold dark:text-develoi-navy" />}
        >
          {props.isMatching ? 'Processando...' : 'Rodar Análise Aurora AI'}
        </Button>
      </div>
    </PanelCard>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ rec, radius, onClick }: { rec: MatchResult; radius: number; onClick: () => void }) {
  const initials = (rec.full_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2);
  const isHighFit = rec.classification === 'Alto Fit' || rec.classification === 'Altíssimo Fit';

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/5 p-5 rounded-3xl hover:border-develoi-gold transition-all group shadow-sm cursor-pointer flex flex-col"
    >
      {/* Top row */}
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center font-black text-zinc-400 dark:text-white/40 group-hover:bg-develoi-navy group-hover:text-develoi-gold transition-all shrink-0 text-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-black text-zinc-900 dark:text-white truncate">{rec.full_name}</h5>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <MapPin size={9} /> {rec.city}, {rec.state}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-develoi-navy dark:text-develoi-gold">{rec.compatibility_score}%</div>
          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Aderência</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge color={isHighFit ? 'success' : 'gold'}>{rec.classification}</Badge>
        {rec.has_disc && <Badge color="primary">{rec.disc_profile}</Badge>}
        {rec.distance_km != null && (
          <Badge color="default" className="flex items-center gap-1">
            <MapPin size={9} />
            {rec.distance_km <= radius ? `${rec.distance_km}km ✓` : `${rec.distance_km}km (fora)`}
          </Badge>
        )}
      </div>

      {/* DISC mini scores */}
      {rec.has_disc && ((rec.disc_d || 0) + (rec.disc_i || 0) + (rec.disc_s || 0) + (rec.disc_c || 0)) > 0 && (
        <div className="flex items-end gap-2 mb-4 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mr-1 self-center">DISC</span>
          {([
            { l: 'D', v: rec.disc_d || 0, color: '#ef4444' },
            { l: 'I', v: rec.disc_i || 0, color: '#f59e0b' },
            { l: 'S', v: rec.disc_s || 0, color: '#10b981' },
            { l: 'C', v: rec.disc_c || 0, color: '#3b82f6' },
          ] as const).map(({ l, v, color }) => (
            <div key={l} className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-[8px] font-black" style={{ color }}>{v}%</span>
              <div className="w-full h-8 bg-zinc-200 rounded-full overflow-hidden flex items-end">
                <div className="w-full rounded-full transition-all" style={{ height: `${v}%`, backgroundColor: color }} />
              </div>
              <span className="text-[8px] font-black text-zinc-400">{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {rec.strengths?.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Pontos Fortes</p>
          <div className="flex flex-wrap gap-1">
            {rec.strengths.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[10px] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 px-2 py-0.5 rounded-lg text-zinc-600 dark:text-zinc-300">
                {s}
              </span>
            ))}
            {rec.strengths.length > 3 && (
              <span className="text-[10px] text-zinc-400 italic px-1">+{rec.strengths.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Reason */}
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2 italic border-l-2 border-develoi-gold pl-3 mb-4 flex-1">
        "{rec.recommendation_reason}"
      </p>

      <div className="pt-3 border-t border-zinc-50 dark:border-white/5 flex justify-end">
        <span className="text-[10px] font-bold text-develoi-gold uppercase tracking-widest flex items-center gap-1 group-hover:underline">
          Ver Análise <ChevronRight size={11} />
        </span>
      </div>
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

interface SidebarProps {
  stats: any;
  sessions: any[];
  jobs: any[];
  onSessionClick: (session: any) => void;
}

function formatRelativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  return new Date(dateStr).toLocaleDateString();
}

function AuroraSidebar({ stats, sessions, jobs, onSessionClick }: SidebarProps) {
  const insights = [
    { title: 'Vagas Ativas', value: stats?.active_jobs ?? '0', desc: 'Em recrutamento' },
    { title: 'Novos Candidatos', value: `+${stats?.new_candidates ?? '0'}`, desc: 'Processados hoje' },
    { title: 'Compatíveis', value: stats?.compatible_candidates ?? '0', desc: 'Acima de 80%' },
  ];

  return (
    <div className="space-y-5">
      {/* Insights card */}
      <div className="bg-develoi-gold dark:bg-[#1a1408] rounded-3xl p-6 text-develoi-navy dark:text-develoi-gold shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-3xl -mr-14 -mt-14 pointer-events-none" />
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
          <Zap size={14} /> Insights de Hoje
        </h4>
        <div className="space-y-4">
          {insights.map((item, i) => (
            <div key={i} className="flex justify-between items-end border-b border-develoi-navy/10 dark:border-develoi-gold/10 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.title}</p>
                <p className="text-[10px] font-bold mt-0.5">{item.desc}</p>
              </div>
              <span className="text-2xl font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <PanelCard title="Histórico Recente" icon={History}>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {sessions.length > 0 ? sessions.slice(0, 8).map((session, i) => {
            const isMatch = session.search_type === 'match-job';
            const f = session.filters;
            return (
              <button
                key={i}
                onClick={() => onSessionClick(session)}
                className="w-full flex items-start justify-between gap-3 group hover:bg-zinc-50 dark:hover:bg-white/5 p-2.5 rounded-xl transition-all text-left"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white transition-all shrink-0 mt-0.5">
                    {isMatch ? <Target size={12} /> : <MessageSquare size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-zinc-800 dark:text-white/90 truncate">
                      {isMatch
                        ? `${jobs.find(j => j.id === session.job_id)?.title ?? `Vaga #${session.job_id}`}`
                        : (session.summary ?? 'Conversa Aurora')}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{formatRelativeDate(session.created_at)}</p>
                    {isMatch && f && (
                      <div className="flex flex-wrap gap-1">
                        {f.precisionMode && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-develoi-navy/8 text-develoi-navy border border-develoi-navy/10 uppercase">
                            {f.precisionMode}
                          </span>
                        )}
                        {f.minScore != null && f.minScore !== "" && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                            ≥{f.minScore}%
                          </span>
                        )}
                        {f.radius != null && f.radius !== "" && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            {f.radius}km
                          </span>
                        )}
                        {f.onlyWithDisc && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                            DISC
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={12} className="text-zinc-200 group-hover:text-develoi-navy dark:group-hover:text-white transition-colors shrink-0 mt-1" />
              </button>
            );
          }) : (
            <p className="text-[9px] font-bold text-zinc-400 uppercase text-center py-6">Sem histórico recente</p>
          )}
        </div>
      </PanelCard>

      {/* Engine status */}
      <div className="p-6 bg-develoi-navy rounded-3xl text-white relative overflow-hidden shadow-xl">
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-develoi-blue/10 rounded-full blur-3xl -ml-14 -mb-14 pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-develoi-gold">
            <Cpu size={28} />
          </div>
          <h4 className="text-xs font-black uppercase tracking-[0.25em] mb-1">Neural Engine</h4>
          <p className="text-[9px] font-medium text-white/40 mb-4 uppercase tracking-widest">v4.2.0 · Stable</p>
          <Button variant="ghost" className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border">
            Ver Logs
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings modal ───────────────────────────────────────────────────────────

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
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Parâmetros de Aderência</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Score Mínimo (%)</label>
              <input
                type="text"
                inputMode="numeric"
                value={props.minScore !== "" ? `${props.minScore}%` : ""}
                placeholder="0%"
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") { props.onMinScoreChange(""); return; }
                  props.onMinScoreChange(String(Math.min(100, Math.max(0, Number(raw)))));
                }}
                className="h-11 w-full px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:border-develoi-gold focus:ring-2 focus:ring-develoi-gold/30 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Raio Padrão (KM)</label>
              <input
                type="text"
                inputMode="numeric"
                value={props.radius !== "" ? `${props.radius} km` : ""}
                placeholder="Qualquer"
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") { props.onRadiusChange(""); return; }
                  props.onRadiusChange(String(Math.max(0, Number(raw))));
                }}
                className="h-11 w-full px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:border-develoi-gold focus:ring-2 focus:ring-develoi-gold/30 transition-all"
              />
            </div>
          </div>
        </div>

        <SegmentedControl
          label="Personalidade do Core"
          options={['Analítica', 'Criativa', 'Equilibrada']}
          value={props.precisionMode}
          onChange={props.onPrecisionChange}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" fullWidth onClick={props.onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth onClick={props.onSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Match details modal ──────────────────────────────────────────────────────

function MatchDetailsModal({ rec, radius, onClose }: { rec: MatchResult; radius: number; onClose: () => void }) {
  const initials = (rec.full_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2);
  const isHighFit = rec.classification === 'Alto Fit' || rec.classification === 'Altíssimo Fit';

  return (
    <Modal open onClose={onClose} title={`Análise IA: ${rec.full_name}`} size="lg">
      <div className="space-y-6 pb-2">
        {/* Candidate header */}
        <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-develoi-navy text-develoi-gold flex items-center justify-center font-black text-xl shadow-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white truncate">{rec.full_name}</h3>
                <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                  <MapPin size={11} /> {rec.city}, {rec.state}
                  {rec.distance_km != null && (
                    <span className={rec.distance_km <= radius ? 'text-emerald-500' : 'text-amber-500'}>
                      ({rec.distance_km}km)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-develoi-navy dark:text-develoi-gold">{rec.compatibility_score}%</div>
                <Badge color={isHighFit ? 'success' : 'gold'}>{rec.classification}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Aurora verdict */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <Sparkles size={13} className="text-develoi-gold" /> Veredito Aurora
          </h4>
          <p className="p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed italic">
            "{rec.recommendation_reason}"
          </p>
        </div>

        {/* Strengths & attention */}
        <div className="grid sm:grid-cols-2 gap-5">
          {rec.strengths?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                <CheckCircle2 size={13} /> Pontos Fortes
              </h4>
              <ul className="space-y-2">
                {rec.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.attention_points?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                <AlertCircle size={13} /> Pontos de Atenção
              </h4>
              <ul className="space-y-2">
                {rec.attention_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* DISC Profile */}
        {rec.has_disc && (
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-black">D</span>
              Perfil DISC
            </h4>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
                rec.disc_profile === 'D' ? 'bg-red-100 text-red-700' :
                rec.disc_profile === 'I' ? 'bg-amber-100 text-amber-700' :
                rec.disc_profile === 'S' ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {rec.disc_profile}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-zinc-700">
                  {rec.disc_profile === 'D' ? 'Dominância' : rec.disc_profile === 'I' ? 'Influência' : rec.disc_profile === 'S' ? 'Estabilidade' : 'Conformidade'}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {rec.disc_profile === 'D' ? 'Direto, decisivo, orientado a resultados' :
                   rec.disc_profile === 'I' ? 'Comunicativo, otimista, motivador' :
                   rec.disc_profile === 'S' ? 'Paciente, colaborativo, confiável' :
                   'Analítico, preciso, sistemático'}
                </p>
              </div>
              {((rec.disc_d || 0) + (rec.disc_i || 0) + (rec.disc_s || 0) + (rec.disc_c || 0)) > 0 && (
                <div className="flex items-end gap-1.5 shrink-0">
                  {([
                    { l: 'D', v: rec.disc_d || 0, color: '#ef4444' },
                    { l: 'I', v: rec.disc_i || 0, color: '#f59e0b' },
                    { l: 'S', v: rec.disc_s || 0, color: '#10b981' },
                    { l: 'C', v: rec.disc_c || 0, color: '#3b82f6' },
                  ] as const).map(({ l, v, color }) => (
                    <div key={l} className="flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-black" style={{ color }}>{v}%</span>
                      <div className="w-5 h-10 bg-zinc-200 rounded-full overflow-hidden flex items-end">
                        <div className="w-full rounded-full" style={{ height: `${v}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[8px] font-black text-zinc-400">{l}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk */}
        {rec.risk_reason && (
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
              <AlertCircle size={13} /> Análise de Risco
            </h4>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{rec.risk_reason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type ViewId = 'chat' | 'match' | 'history';

const VIEWS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Conversa', icon: MessageSquare },
  { id: 'match', label: 'Aderência', icon: Target },
  { id: 'history', label: 'Histórico', icon: History },
];

function TabBar({ active, onChange }: { active: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm w-full sm:w-auto">
      {VIEWS.map(view => (
        <button
          key={view.id}
          onClick={() => onChange(view.id)}
          className={cn(
            'flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5',
            active === view.id
              ? 'bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy shadow-md'
              : 'text-zinc-500 hover:text-develoi-navy dark:hover:text-white'
          )}
        >
          <view.icon size={13} />
          <span className="hidden sm:inline">{view.label}</span>
          <span className="sm:hidden">{view.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuroraAI() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? 'master' : currentUnit.id;
  const activeUnitId = currentUnit.id;
  const toast = useToast();

  const [activeView, setActiveView] = useState<ViewId>('chat');

  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: 'Olá! Sou a Aurora, sua inteligência artificial. Posso ajudar com triagem de candidatos, análise de vagas e consultoria estratégica. Como posso ser útil hoje?',
    timestamp: new Date().toISOString(),
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Data state
  const [jobs, setJobs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Match state
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  // Filters — restored from localStorage on mount
  const PREFS_KEY = `aurora_prefs_${tenantId}`;
  const loadedPrefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } })();
  const [precisionMode, setPrecisionMode] = useState(loadedPrefs.precisionMode ?? 'Equilibrada');
  const [minScore, setMinScore] = useState(loadedPrefs.minScore ?? "70");
  const [radius, setRadius] = useState(loadedPrefs.radius ?? "50");
  const [onlyWithDisc, setOnlyWithDisc] = useState(loadedPrefs.onlyWithDisc ?? false);

  const savePrefs = (patch: object) => {
    try {
      const current = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }));
    } catch { /* silent */ }
  };

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchJobs();
    fetchSessions();
    fetchStats();
  }, [queryUnitId]);

  useEffect(() => {
    if (selectedJobId && activeView === 'match') fetchExistingMatches();
  }, [selectedJobId, activeView, minScore]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, isTyping]);

  async function fetchJobs() {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      setJobs(await res.json());
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSendMessage() {
    const text = inputMessage.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/aurora-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ message: text, tenantId, unitId: activeUnitId, sessionId: chatSessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na conexão com Aurora.');

      setChatSessionId(data.sessionId ?? null);
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() }]);
      fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar mensagem');
    } finally {
      setIsTyping(false);
    }
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
          filters: { precisionMode, minScore, radius, onlyWithDisc },
        }),
      });
      const data = await res.json();
      setMatchResults(data.results || []);
      toast.success('Análise de aderência concluída!');
      fetchSessions();
    } catch {
      toast.error('Erro ao calcular aderência.');
    } finally {
      setIsMatching(false);
    }
  }

  const handlePrecisionChange = (v: string) => { setPrecisionMode(v); savePrefs({ precisionMode: v }); };
  const handleMinScoreChange = (v: string) => { setMinScore(v); savePrefs({ minScore: v }); };
  const handleRadiusChange = (v: string) => { setRadius(v); savePrefs({ radius: v }); };
  const handleDiscChange = (v: boolean) => { setOnlyWithDisc(v); savePrefs({ onlyWithDisc: v }); };

  function handleSessionClick(session: any) {
    if (session.search_type === 'match-job' && session.job_id) {
      setSelectedJobId(String(session.job_id));
      // Restore filters saved with this session
      if (session.filters) {
        if (session.filters.precisionMode) { setPrecisionMode(session.filters.precisionMode); savePrefs({ precisionMode: session.filters.precisionMode }); }
        if (session.filters.minScore != null) { setMinScore(String(session.filters.minScore)); savePrefs({ minScore: String(session.filters.minScore) }); }
        if (session.filters.radius != null) { setRadius(String(session.filters.radius)); savePrefs({ radius: String(session.filters.radius) }); }
        if (session.filters.onlyWithDisc != null) { setOnlyWithDisc(session.filters.onlyWithDisc); savePrefs({ onlyWithDisc: session.filters.onlyWithDisc }); }
      }
      setActiveView('match');
    } else {
      setActiveView('chat');
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-24 px-4 sm:px-6 py-5 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy rounded-2xl shadow-lg">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-develoi-navy dark:text-white tracking-tight">Aurora AI</h1>
              <Badge color="gold" className="animate-pulse">Active</Badge>
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-0.5">
              Intelligent Human Capital Advisor
            </p>
          </div>
        </div>

        <TabBar active={activeView} onChange={setActiveView} />
      </div>

      {/* Body — main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main area */}
        <div className="lg:col-span-8 space-y-5">
          {activeView === 'chat' && (
            <ChatView
              messages={chatMessages}
              input={inputMessage}
              isTyping={isTyping}
              scrollRef={scrollRef}
              onInputChange={setInputMessage}
              onSend={handleSendMessage}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {activeView === 'match' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <MatchFilters
                jobs={jobs}
                selectedJobId={selectedJobId}
                precisionMode={precisionMode}
                minScore={minScore}
                radius={radius}
                onlyWithDisc={onlyWithDisc}
                isMatching={isMatching}
                onJobChange={setSelectedJobId}
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
                <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {matchResults.map((rec, i) => (
                    <MatchCard
                      key={`${rec.candidate_id}-${i}`}
                      rec={rec}
                      radius={Number(radius) || 0}
                      onClick={() => setSelectedMatch(rec)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'history' && (
            <PanelCard title="Histórico de Sessões" icon={History} description="Clique em uma sessão para restaurar os filtros e continuar de onde parou.">
              <div className="space-y-2">
                {sessions.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-10">Nenhuma sessão encontrada ainda.</p>
                )}
                {sessions.map((session, i) => {
                  const isMatch = session.search_type === 'match-job';
                  const title = isMatch
                    ? `${jobs.find(j => j.id === session.job_id)?.title ?? `Vaga #${session.job_id}`}`
                    : (session.summary ?? 'Conversa Aurora');
                  const f = session.filters;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSessionClick(session)}
                      className="w-full flex items-start justify-between gap-4 group hover:bg-zinc-50 dark:hover:bg-white/5 p-3.5 rounded-2xl transition-all text-left border border-transparent hover:border-zinc-100"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={cn(
                          'p-2.5 rounded-xl shrink-0 transition-all mt-0.5',
                          isMatch
                            ? 'bg-develoi-navy/10 dark:bg-develoi-gold/10 text-develoi-navy dark:text-develoi-gold group-hover:bg-develoi-navy group-hover:text-white'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white'
                        )}>
                          {isMatch ? <Target size={14} /> : <MessageSquare size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isMatch && (
                              <span className="text-[9px] font-black text-develoi-navy/60 dark:text-develoi-gold/60 uppercase tracking-widest">Aderência</span>
                            )}
                            <p className="text-sm font-bold text-zinc-800 dark:text-white/90 truncate">{title}</p>
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 mb-2">
                            {formatRelativeDate(session.created_at)}
                          </p>
                          {/* Filtros usados */}
                          {isMatch && f && (
                            <div className="flex flex-wrap gap-1.5">
                              {f.precisionMode && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-develoi-navy/8 text-develoi-navy dark:bg-develoi-gold/10 dark:text-develoi-gold border border-develoi-navy/10 dark:border-develoi-gold/20 uppercase tracking-wider">
                                  <Brain size={8} /> {f.precisionMode}
                                </span>
                              )}
                              {f.minScore != null && f.minScore !== "" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                  <Target size={8} /> ≥{f.minScore}%
                                </span>
                              )}
                              {f.radius != null && f.radius !== "" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                                  <MapPin size={8} /> {f.radius}km
                                </span>
                              )}
                              {f.onlyWithDisc && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">
                                  DISC ✓
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300 group-hover:text-develoi-navy dark:group-hover:text-white transition-colors shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>
            </PanelCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <AuroraSidebar
            stats={stats}
            sessions={sessions}
            jobs={jobs}
            onSessionClick={handleSessionClick}
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
    </div>
  );
}

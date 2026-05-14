import React, { useState, useEffect, useRef } from "react";
import {
  Target, ChevronDown, Download, Mail, Phone,
  Brain, FileText, CheckCircle2, Zap, Briefcase, Loader2, MapPin,
  Star, Users, Award, ChevronRight, Sparkles, MessageSquare, PhoneCall,
  Clock, XCircle, AlertCircle, Ban, CheckCheck, HelpCircle, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Button, PanelCard, EmptyState, PageWrapper, SectionTitle } from "@/src/components/ui";
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

// ── Componente do painel de contato ────────────────────────────────────────────

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
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(match.contact_status ?? "");
    setNotes(match.contact_notes ?? "");
  }, [match.contact_status, match.contact_notes]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
        <PhoneCall size={11} />
        Status do contato
      </p>

      {/* Dropdown de status */}
      <div className="relative" ref={dropRef}>
        <button
          type="button"
          onClick={() => setDropOpen(!dropOpen)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-sm font-bold transition-all shadow-sm",
            selected.bgLight, selected.borderLight, selected.textLight
          )}
        >
          <span className={selected.color}>{selected.icon}</span>
          <span className="flex-1 text-left text-xs">{selected.label}</span>
          <ChevronDown size={12} className={cn("shrink-0 transition-transform", dropOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {dropOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden"
            >
              {CONTACT_STATUSES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setStatus(opt.value); setDropOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-zinc-50",
                    status === opt.value && "bg-zinc-50"
                  )}
                >
                  <span className={opt.color}>{opt.icon}</span>
                  <span className="flex-1 text-zinc-700">{opt.label}</span>
                  {opt.blocks && (
                    <span className="text-[8px] font-black uppercase tracking-wide text-red-400 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5">
                      oculta
                    </span>
                  )}
                  {status === opt.value && <CheckCircle2 size={11} className="shrink-0 text-develoi-navy" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Aviso de bloqueio */}
      {selected.blocks && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-2.5">
          <Ban size={11} className="shrink-0 mt-0.5 text-red-400" />
          <p className="text-[10px] font-medium text-red-600 leading-relaxed">
            Candidato ficará <strong>oculto</strong> nesta vaga na próxima consulta da IA.
          </p>
        </div>
      )}

      {/* Observações */}
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Enviou email no dia 10/05, aguardando retorno..."
          rows={3}
          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-300 focus:border-develoi-gold/60 focus:ring-2 focus:ring-develoi-gold/20 transition-all"
        />
      </div>

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

// ── Helpers de score ───────────────────────────────────────────────────────────

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

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${selectedJobId}?minScore=70`);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <SectionTitle
            title="Aderência AI"
            subtitle={`${currentUnit.name} · Análise de aderência gerada pela Aurora IA`}
            icon={<Zap size={22} />}
            className=""
          />
          <div className="w-full sm:w-80 shrink-0">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5 mb-1.5">
              <Briefcase size={11} />
              Filtrar por Vaga Ativa
            </label>
            <div className="relative">
              <select
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-white border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-develoi-gold/40 focus:border-develoi-gold transition-all shadow-sm appearance-none cursor-pointer"
              >
                <option value="">Selecione uma vaga...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.city}/{job.state}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {matches.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-3 gap-3 mb-5"
          >
            {[
              { icon: Users, label: "Candidatos", value: matches.length, color: "text-blue-600", bg: "bg-blue-50" },
              { icon: Star, label: "Maior Aderência", value: `${topScore}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Award, label: "Alta Aderência", value: excellentCount, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-zinc-100 p-3 sm:p-4 shadow-sm flex items-center gap-3"
              >
                <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                  <stat.icon size={15} className={stat.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">{stat.label}</p>
                  <p className="text-base sm:text-lg font-black text-zinc-900 leading-none">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Conteúdo Principal ─────────────────────────────────────── */}
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
                <button
                  className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center gap-4 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : match.candidate_id)}
                >
                  <span className="hidden sm:flex w-5 text-[10px] font-black text-zinc-300 shrink-0 pt-0.5">
                    #{idx + 1}
                  </span>

                  <ScoreRing score={match.compatibility_score} />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-black text-zinc-900">{match.full_name}</h3>
                      <Badge size="sm" color={cfg.badge}>
                        {classificationLabel[match.classification?.toUpperCase()] || cfg.label}
                      </Badge>
                      {match.has_disc && (
                        <Badge size="sm" color="primary" icon={<Brain size={9} />}>
                          {match.disc_profile}
                        </Badge>
                      )}
                      {/* Badge de status de contato */}
                      {match.contact_status && (
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border",
                          contactOpt.bgLight, contactOpt.borderLight, contactOpt.textLight
                        )}>
                          {contactOpt.icon}
                          {contactOpt.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-zinc-500 truncate mb-1.5">
                      {match.desired_position}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden max-w-[120px]">
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

                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 border",
                    isExpanded
                      ? "bg-develoi-navy text-white border-develoi-navy rotate-180"
                      : "bg-zinc-50 text-zinc-400 border-zinc-200"
                  )}>
                    <ChevronDown size={13} />
                  </div>
                </button>

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
                                {match.strengths.slice(0, 5).map((s, i) => (
                                  <span
                                    key={i}
                                    className="flex items-center gap-1 text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide"
                                  >
                                    <CheckCircle2 size={9} />
                                    {s}
                                  </span>
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

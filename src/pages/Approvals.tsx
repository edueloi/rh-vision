import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck, ShieldX, ShieldAlert, ClipboardCheck,
  Loader2, RefreshCw, Briefcase, MapPin,
  CheckCircle2, XCircle, ChevronRight, History,
  ChevronDown, Clock, Info, Send, RotateCcw,
  Building2, X, ArrowRight, Users, FileEdit,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { PageWrapper, useToast } from "@/src/components/ui";
import { getTenantId, getAuthUser } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { cn } from "@/src/lib/utils";
import { encodeId } from "@/src/lib/hashid";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalJob = {
  id: number;
  title: string;
  department?: string;
  city: string;
  state: string;
  status: string;
  approval_status: "pending" | "rejected" | "approved" | null;
  approval_requested_at?: string;
};

type ApprovalEntry = {
  id: number;
  action: string;
  actor_name: string;
  notes?: string;
  created_at: string;
};

const ACTION_COLOR: Record<string, string> = {
  requested: "border-amber-200 bg-amber-50 text-amber-700",
  approved:  "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected:  "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-500",
};
const ACTION_LABEL: Record<string, string> = {
  requested: "Aprovação solicitada",
  approved:  "Vaga aprovada",
  rejected:  "Reprovada",
  cancelled: "Cancelada",
};
const ACTION_ICON: Record<string, React.ReactNode> = {
  requested: <ShieldAlert size={11} />,
  approved:  <ShieldCheck size={11} />,
  rejected:  <ShieldX size={11} />,
  cancelled: <XCircle size={11} />,
};

// ─── ApprovalCard ─────────────────────────────────────────────────────────────

function ApprovalCard({ job, onAction, currentUser }: {
  job: ApprovalJob;
  onAction: (jobId: number, action: "approve" | "reject" | "cancel", notes?: string) => Promise<void>;
  currentUser: any;
}) {
  const [loading, setLoading]       = useState<string | null>(null);
  const [notes, setNotes]           = useState("");
  const [showNotes, setShowNotes]   = useState(false);
  const [history, setHistory]       = useState<ApprovalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();

  const isAdmin    = currentUser?.role === "admin" || currentUser?.access_profile?.includes("admin");
  const isPending  = job.approval_status === "pending";
  const isRejected = job.approval_status === "rejected";

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch(`/api/jobs/${job.id}/approvals`);
      if (r.ok) setHistory(await r.json());
    } finally { setLoadingHistory(false); }
  };

  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  const doAction = async (action: "approve" | "reject" | "cancel") => {
    setLoading(action);
    try {
      await onAction(job.id, action, notes.trim() || undefined);
      setNotes(""); setShowNotes(false);
    } finally { setLoading(null); }
  };

  const timeAgo = job.approval_requested_at
    ? new Date(job.approval_requested_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md",
        isPending  ? "border-amber-200/80" : "border-rose-200/80"
      )}
    >
      {/* Status band */}
      <div className={cn("h-1", isPending ? "bg-amber-400" : "bg-rose-400")} />

      <div className="p-5 space-y-4">
        {/* Job header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isPending ? "bg-amber-50 ring-1 ring-amber-200" : "bg-rose-50 ring-1 ring-rose-200"
          )}>
            {isPending
              ? <ShieldAlert size={17} className="text-amber-600" />
              : <ShieldX size={17} className="text-rose-500" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-[14px] font-bold text-zinc-900 leading-tight">{job.title}</p>
              <span className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                isPending
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              )}>
                {isPending ? "Em Aprovação" : "Reprovada"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {job.department && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
                  <Building2 size={9} /> {job.department}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <MapPin size={9} /> {job.city}, {job.state}
              </span>
              {timeAgo && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <Clock size={9} /> {timeAgo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Admin actions for pending */}
        {isPending && isAdmin && (
          <div className="space-y-2.5">
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observação opcional para o recrutador…"
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
                    rows={3}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotes(v => !v)}
                className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
              >
                {showNotes ? "− ocultar nota" : "+ adicionar nota"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => doAction("reject")}
                disabled={!!loading}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[11px] font-semibold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 active:scale-[0.97]"
              >
                {loading === "reject" ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
                Reprovar
              </button>
              <button
                onClick={() => doAction("approve")}
                disabled={!!loading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.97]"
              >
                {loading === "approve" ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                Aprovar
              </button>
            </div>
          </div>
        )}

        {/* Non-admin pending — can cancel */}
        {isPending && !isAdmin && (
          <button
            onClick={() => doAction("cancel")}
            disabled={!!loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
          >
            {loading === "cancel" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Cancelar solicitação
          </button>
        )}

        {/* Rejected — guidance */}
        {isRejected && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-3">
            <p className="text-[11px] font-medium text-rose-700">
              Edite a vaga e re-solicite a aprovação na aba Aprovação.
            </p>
            <button
              onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
              className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-rose-700 transition-colors hover:text-rose-900"
            >
              Abrir <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-100 pt-3 text-[10px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
        >
          <History size={10} />
          {showHistory ? "Ocultar histórico" : "Ver histórico"}
          <ChevronDown size={9} className={cn("transition-transform", showHistory && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {loadingHistory ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-zinc-300" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="py-3 text-center text-[11px] text-zinc-400">Nenhum evento registrado.</p>
                ) : history.map(e => (
                  <div key={e.id} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[11px]", ACTION_COLOR[e.action] ?? ACTION_COLOR.cancelled)}>
                    <span className="mt-0.5 shrink-0">{ACTION_ICON[e.action]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{ACTION_LABEL[e.action] ?? e.action}</p>
                      <p className="truncate opacity-70">{e.actor_name}{e.notes ? ` — "${e.notes}"` : ""}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] opacity-50 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── HelpModal ────────────────────────────────────────────────────────────────

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const FLOW = [
    { label: "Recrutador cria vaga",    dot: "bg-zinc-400",    text: "text-zinc-600",    bg: "bg-zinc-50",    border: "border-zinc-200" },
    { label: "Solicita aprovação",       dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
    { label: "Gestor analisa aqui",      dot: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200" },
    { label: "Vaga aprovada",            dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Publicada no portal",      dot: "bg-develoi-navy", text: "text-develoi-navy", bg: "bg-develoi-navy/5", border: "border-develoi-navy/15" },
  ];

  const CASES = [
    { icon: <Users size={14} className="text-develoi-navy" />,    title: "Hierarquia de aprovação", desc: "Recrutador cria, gestor ou diretor aprova antes de publicar." },
    { icon: <ClipboardCheck size={14} className="text-emerald-600" />, title: "Controle de headcount", desc: "RH valida se a vaga está dentro do orçamento antes de abrir." },
    { icon: <FileEdit size={14} className="text-violet-600" />,   title: "Revisão de conteúdo", desc: "Garante que o texto da vaga está correto antes de ir ao portal." },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px]"
          >
            {/* Header navy */}
            <div className="relative overflow-hidden bg-develoi-navy px-6 py-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-develoi-gold/10 blur-3xl" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                    <ShieldCheck size={17} className="text-develoi-gold" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white">Como funciona Aprovações?</p>
                    <p className="text-[11px] text-white/40">Controle de publicação de vagas</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Concept */}
              <p className="text-[13px] leading-relaxed text-zinc-600">
                Quando sua empresa exige que um{" "}
                <span className="font-semibold text-zinc-900">gestor ou diretor aprove uma vaga</span>{" "}
                antes de publicá-la, o recrutador solicita aprovação na aba da vaga — e o aprovador age aqui.
              </p>

              {/* Flow */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Caminho de uma vaga
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {FLOW.map((step, i) => (
                    <React.Fragment key={i}>
                      <span className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
                        step.bg, step.border, step.text
                      )}>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", step.dot)} />
                        {step.label}
                      </span>
                      {i < FLOW.length - 1 && <ArrowRight size={12} className="shrink-0 text-zinc-300" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Use cases */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Quando usar
                </p>
                <div className="space-y-2.5">
                  {CASES.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200">
                        {c.icon}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-zinc-800">{c.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to trigger */}
              <div className="rounded-xl border border-develoi-gold/20 bg-develoi-gold/6 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Info size={14} className="mt-0.5 shrink-0 text-develoi-gold" />
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-800">Como solicitar aprovação</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                      Abra qualquer vaga → aba <span className="font-semibold text-zinc-800">Aprovação</span> → clique em{" "}
                      <span className="font-semibold text-zinc-800">Solicitar Aprovação</span>.
                      A vaga aparecerá aqui para o gestor agir.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-develoi-navy py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Approvals() {
  const toast       = useToast();
  const tenantId    = getTenantId();
  const { currentUnit } = useUnit();
  const currentUser = getAuthUser();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const [jobs, setJobs]     = useState<ApprovalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "rejected" | "all">("pending");
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId, unitId: queryUnitId });
      const r = await fetch(`/api/jobs?${params}`);
      if (!r.ok) throw new Error();
      const all: ApprovalJob[] = await r.json();
      setJobs(all.filter(j => j.approval_status === "pending" || j.approval_status === "rejected"));
    } catch {
      toast.error("Erro ao carregar aprovações.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, queryUnitId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleAction = async (jobId: number, action: "approve" | "reject" | "cancel", notes?: string) => {
    const method = action === "cancel" ? "DELETE" : "POST";
    const path   = action === "cancel" ? "request" : action === "approve" ? "approve" : "reject";

    const r = await fetch(`/api/jobs/${jobId}/approvals/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor_id:   currentUser?.id || "unknown",
        actor_name: currentUser?.full_name || "Usuário",
        notes,
      }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Erro");

    if (action === "approve")      toast.success("Vaga aprovada e publicada!");
    else if (action === "reject")  toast.error("Vaga reprovada.");
    else                           toast.success("Solicitação cancelada.");

    fetchJobs();
  };

  const pending   = jobs.filter(j => j.approval_status === "pending");
  const rejected  = jobs.filter(j => j.approval_status === "rejected");
  const displayed = filter === "pending" ? pending : filter === "rejected" ? rejected : jobs;

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Building2 size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">{currentUnit.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                  Aprovações
                </h1>
                {/* Pulsing badge when there are pending */}
                {pending.length > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-1 ring-1 ring-amber-400/30">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                    <span className="text-[10px] font-bold text-amber-300">{pending.length} aguardando</span>
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                Gerencie o fluxo de aprovação antes da publicação de vagas
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Help button */}
              <button
                onClick={() => setHelpOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 text-[11px] font-medium text-white/60 transition-all hover:bg-white/12 hover:text-white"
                title="Como funciona esta página?"
              >
                <Info size={13} />
                <span className="hidden sm:inline">Como funciona?</span>
              </button>

              {/* Refresh */}
              <button
                onClick={fetchJobs}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/50 transition-all hover:bg-white/12 hover:text-white disabled:opacity-50"
                title="Atualizar"
              >
                <RefreshCw size={13} className={cn(loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-4 flex items-center gap-5 border-t border-white/[0.06] pt-4">
            {[
              { label: "Aguardando",  value: pending.length,  color: pending.length > 0 ? "text-amber-300" : "text-white" },
              { label: "Reprovadas",  value: rejected.length, color: rejected.length > 0 ? "text-rose-300" : "text-white" },
              { label: "Total",       value: jobs.length,     color: "text-white" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <span className={cn("text-[20px] font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[10px] font-medium text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
          {([
            ["pending",  `Aguardando${pending.length > 0 ? ` (${pending.length})` : ""}`],
            ["rejected", `Reprovadas${rejected.length > 0 ? ` (${rejected.length})` : ""}`],
            ["all",      "Todas"],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn(
                "rounded-lg px-4 py-2 text-[12px] font-semibold transition-all",
                filter === v
                  ? "bg-develoi-navy text-white shadow-sm"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-800"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
              <Loader2 size={20} className="animate-spin text-develoi-navy" />
            </div>
            <p className="text-[11px] font-medium text-zinc-400">Carregando aprovações…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-zinc-700">
                {filter === "pending" ? "Nenhuma vaga aguardando aprovação" : "Nenhuma vaga aqui"}
              </p>
              <p className="mt-1 text-[12px] text-zinc-400">
                {filter === "pending"
                  ? "Todas as vagas estão aprovadas ou em rascunho."
                  : "Tente outro filtro acima."}
              </p>
            </div>
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-white"
            >
              <Info size={12} /> Como solicitar aprovação?
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {displayed.map(job => (
                <ApprovalCard
                  key={job.id}
                  job={job}
                  onAction={handleAction}
                  currentUser={currentUser}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </PageWrapper>
  );
}

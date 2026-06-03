import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCcw,
  Edit,
  Trash2,
  Upload,
  Eye,
  ClipboardCheck,
  MapPin,
  Briefcase,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUpDown,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Target,
  Brain,
  PhoneCall,
  PlayCircle,
  Star,
  UserCheck,
  Handshake,
  UserX,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  useToast,
  Badge,
  Button,
  Modal,
  PageWrapper,
} from "@/src/components/ui";
import { getTenantId, getAuthUser } from "@/src/lib/auth";
import { getActionPermissions } from "@/src/lib/access";
import { Candidate } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import CandidateForm from "./CandidateForm";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMatch, useNavigate } from "react-router-dom";
import { encodeId, decodeId } from "@/src/lib/hashid";
import { useUserPreferences } from "@/src/lib/useUserPreferences";

type SortField = 'name' | 'date';
type SortDir = 'asc' | 'desc';

// ── Etapas do Funil ────────────────────────────────────────────────────────────

const FUNNEL_STAGE_OPTIONS = [
  { value: "Triagem",             label: "Triagem",             color: "text-zinc-500",    bgLight: "bg-zinc-50",     borderLight: "border-zinc-200",   textLight: "text-zinc-600",   icon: <Target size={13} /> },
  { value: "IA Match",            label: "IA Match",            color: "text-blue-600",    bgLight: "bg-blue-50",     borderLight: "border-blue-200",   textLight: "text-blue-700",   icon: <Brain size={13} /> },
  { value: "Entrevista",          label: "Entrevista agendada", color: "text-purple-600",  bgLight: "bg-purple-50",   borderLight: "border-purple-200", textLight: "text-purple-700", icon: <PhoneCall size={13} /> },
  { value: "Entrevista Realizada",label: "Entrevista realizada",color: "text-indigo-600",  bgLight: "bg-indigo-50",   borderLight: "border-indigo-200", textLight: "text-indigo-700", icon: <PlayCircle size={13} /> },
  { value: "Finalista",           label: "Finalista",           color: "text-amber-700",   bgLight: "bg-amber-50",    borderLight: "border-amber-200",  textLight: "text-amber-800",  icon: <Star size={13} /> },
  { value: "Aprovado",            label: "Aprovado",            color: "text-emerald-600", bgLight: "bg-emerald-50",  borderLight: "border-emerald-200",textLight: "text-emerald-700",icon: <UserCheck size={13} /> },
  { value: "Contratado",          label: "Contratado",          color: "text-white",       bgLight: "bg-develoi-navy",borderLight: "border-develoi-navy",textLight: "text-white",      icon: <Handshake size={13} /> },
  { value: "Desistência",         label: "Desistência",         color: "text-orange-600",  bgLight: "bg-orange-50",   borderLight: "border-orange-200", textLight: "text-orange-700", icon: <UserX size={13} />, isNegative: true },
  { value: "Sem Sucesso",         label: "Sem sucesso",         color: "text-red-600",     bgLight: "bg-red-50",      borderLight: "border-red-200",    textLight: "text-red-700",    icon: <ThumbsDown size={13} />, isNegative: true },
];

function getFunnelStageOpt(value: string) {
  return FUNNEL_STAGE_OPTIONS.find(s => s.value === value) ?? FUNNEL_STAGE_OPTIONS[0];
}

// ── Modal de Etapa do Funil ────────────────────────────────────────────────────

function FunnelStageModal({ candidate, tenantId, unitId, onClose, onSaved }: {
  candidate: { id: number; full_name: string } | null;
  tenantId: string;
  unitId: string;
  onClose: () => void;
  onSaved: (matchId: number, stage: string) => void;
}) {
  const toast = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [linking, setLinking] = useState<number | null>(null);
  const [view, setView] = useState<'stages' | 'link'>('stages');

  useEffect(() => {
    if (!candidate) return;
    setLoading(true);
    setView('stages');
    fetch(`/api/candidates/${candidate.id}`)
      .then(r => r.json())
      .then(data => setMatches(data.matches ?? []))
      .catch(() => toast.error("Erro ao carregar vagas do candidato."))
      .finally(() => setLoading(false));
  }, [candidate?.id]);

  // Busca vagas disponíveis com score de aderência do candidato
  const fetchAvailableJobs = async () => {
    try {
      const [jobsRes, scoresRes] = await Promise.all([
        fetch(`/api/jobs?tenantId=${tenantId}&unitId=${unitId}`),
        fetch(`/api/candidates/${candidate!.id}/ai-scores`).catch(() => ({ ok: false, json: async () => [] })),
      ]);
      const jobs = jobsRes.ok ? await jobsRes.json() : [];
      const scores: any[] = (scoresRes as any).ok ? await (scoresRes as any).json() : [];

      // Filtra vagas já vinculadas
      const linkedJobIds = new Set(matches.map((m: any) => m.job_id));
      const filtered = jobs
        .filter((j: any) => !linkedJobIds.has(j.id))
        .map((j: any) => ({
          ...j,
          ai_score: scores.find((s: any) => s.job_id === j.id)?.compatibility_score ?? null,
        }))
        .sort((a: any, b: any) => (b.ai_score ?? -1) - (a.ai_score ?? -1));

      setAvailableJobs(filtered);
    } catch {
      toast.error("Erro ao carregar vagas.");
    }
  };

  const handleShowLink = async () => {
    setView('link');
    await fetchAvailableJobs();
  };

  const handleLink = async (jobId: number) => {
    setLinking(jobId);
    try {
      const res = await fetch(`/api/candidates/${candidate!.id}/link-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, tenant_id: tenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao vincular.");
      }
      // Recarrega matches e volta para a aba de etapas
      const updated = await fetch(`/api/candidates/${candidate!.id}`).then(r => r.json());
      setMatches(updated.matches ?? []);
      setView('stages');
      toast.success("Candidato vinculado à vaga.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao vincular candidato à vaga.");
    } finally {
      setLinking(null);
    }
  };

  const handleSelect = async (matchId: number, jobId: number, stage: string) => {
    setSaving(matchId);
    try {
      const res = await fetch(`/api/aurora-ai/matches/${jobId}/stage/${candidate!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_stage: stage }),
      });
      if (!res.ok) throw new Error();
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: stage } : m));
      onSaved(matchId, stage);
      toast.success("Etapa atualizada.");
    } catch {
      toast.error("Erro ao atualizar etapa.");
    } finally {
      setSaving(null);
    }
  };

  if (!candidate) return null;

  return (
    <Modal open={!!candidate} onClose={onClose} title={`Etapa do Processo · ${candidate.full_name}`}>
      <div className="space-y-4 py-2">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={24} className="animate-spin text-develoi-navy" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Carregando vagas...</p>
          </div>

        ) : view === 'link' ? (
          /* ── Tela de vincular a vaga ── */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('stages')}
                className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
              >
                ← Voltar
              </button>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">|</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Vincular a Vaga</p>
            </div>

            {availableJobs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <Building2 size={18} className="text-zinc-400" />
                </div>
                <p className="text-xs font-bold text-zinc-600">Nenhuma vaga disponível</p>
                <p className="text-xs text-zinc-400">Todas as vagas já foram vinculadas ou não há vagas abertas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {availableJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center gap-3 bg-zinc-50 rounded-2xl border border-zinc-100 p-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-zinc-200 shrink-0">
                      <Building2 size={13} className="text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-zinc-800 truncate">{job.title}</p>
                      <p className="text-[9px] font-bold text-zinc-400">{job.city}/{job.state} · {job.work_model}</p>
                    </div>
                    {job.ai_score !== null && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-full border shrink-0",
                        job.ai_score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        job.ai_score >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {job.ai_score}% IA
                      </span>
                    )}
                    <button
                      onClick={() => handleLink(job.id)}
                      disabled={linking === job.id}
                      className="h-7 px-3 rounded-xl bg-develoi-navy text-white text-[9px] font-black uppercase tracking-wide hover:bg-[#0a1e3a] transition-all disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      {linking === job.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                      Vincular
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : matches.length === 0 ? (
          /* ── Sem vagas vinculadas ── */
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
              <TrendingUp size={24} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-700">Nenhuma vaga vinculada</p>
              <p className="text-xs text-zinc-400 mt-1">Deseja vincular este candidato a uma vaga?</p>
            </div>
            <button
              onClick={handleShowLink}
              className="h-9 px-5 rounded-xl bg-develoi-navy text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0a1e3a] transition-all flex items-center gap-2"
            >
              <Building2 size={13} />
              Ver vagas disponíveis
            </button>
          </div>

        ) : (
          /* ── Etapas por vaga vinculada ── */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Etapa por vaga</p>
              <button
                onClick={handleShowLink}
                className="text-[9px] font-black uppercase tracking-widest text-develoi-navy hover:text-develoi-gold flex items-center gap-1 transition-colors"
              >
                <Building2 size={10} /> Vincular outra vaga
              </button>
            </div>

            {matches.map((match: any) => {
              const currentOpt = getFunnelStageOpt(match.status ?? "Triagem");
              const isSaving = saving === match.id;
              return (
                <div key={match.id} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white rounded-xl flex items-center justify-center border border-zinc-200 shrink-0">
                      <Building2 size={13} className="text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-zinc-800 truncate">{match.job_title}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{match.job_city}/{match.job_state}</p>
                    </div>
                    {match.compatibility_score > 0 && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-full border shrink-0",
                        match.compatibility_score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        match.compatibility_score >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {match.compatibility_score}% IA
                      </span>
                    )}
                    <div className={cn(
                      "flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full border shrink-0",
                      currentOpt.bgLight, currentOpt.borderLight, currentOpt.textLight
                    )}>
                      {isSaving ? <Loader2 size={10} className="animate-spin" /> : currentOpt.icon}
                      <span>{currentOpt.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {FUNNEL_STAGE_OPTIONS.map(opt => {
                      const isActive = (match.status ?? "Triagem") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => !isActive && handleSelect(match.id, match.job_id, opt.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-2 rounded-xl border text-[9px] font-bold transition-all",
                            isActive
                              ? cn(opt.bgLight, opt.borderLight, opt.textLight, "shadow-sm")
                              : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50",
                            isSaving && "opacity-40 cursor-not-allowed",
                            opt.isNegative && !isActive && "hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          )}
                        >
                          <span className={isActive ? "" : opt.isNegative ? "text-red-400" : "text-zinc-400"}>
                            {opt.icon}
                          </span>
                          <span className="truncate">{opt.label}</span>
                          {isActive && <CheckCircle2 size={9} className="shrink-0 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>

                  {getFunnelStageOpt(match.status ?? "Triagem").isNegative && (
                    <div className="flex items-start gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-2">
                      <AlertCircle size={10} className="shrink-0 mt-0.5 text-orange-400" />
                      <p className="text-[9px] font-medium text-orange-700">
                        Candidato <strong>não aparecerá</strong> na Aderência AI desta vaga. Para reativar, mova para <strong>Triagem</strong>.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

const PREFS_KEY = (tenantId: string) => `rh_candidates_prefs_${tenantId}`;

function loadPrefs(tenantId: string) {
  try {
    const raw = localStorage.getItem(PREFS_KEY(tenantId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePrefs(tenantId: string, data: object) {
  try {
    localStorage.setItem(PREFS_KEY(tenantId), JSON.stringify(data));
  } catch {}
}

// Custom checkbox component
function Checkbox({ checked, indeterminate = false, onChange, className }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
        checked || indeterminate
          ? "bg-develoi-navy border-develoi-navy"
          : "bg-white border-zinc-300 hover:border-zinc-400",
        className
      )}
      aria-checked={indeterminate ? "mixed" : checked}
    >
      {indeterminate ? (
        <span className="w-2 h-0.5 bg-white rounded-full block" />
      ) : checked ? (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}

export default function Candidates() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();
  const actions = getActionPermissions(getAuthUser());
  const createMatch = useMatch("/candidatos/novo");
  const editMatch = useMatch("/candidatos/:candidateId/editar");
  const isCreateRoute = Boolean(createMatch);
  const isEditRoute = Boolean(editMatch);
  const routeCandidateId = decodeId(editMatch?.params.candidateId ?? '') || null;
  const [candidateForEdit, setCandidateForEdit] = useState<Candidate | null>(null);
  const [candidateEditLoading, setCandidateEditLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const [funnelModalCandidate, setFunnelModalCandidate] = useState<{ id: number; full_name: string } | null>(null);

  const savedPrefs = useMemo(() => loadPrefs(tenantId), [tenantId]);

  const [searchInput, setSearchInput] = useState(savedPrefs?.search ?? "");
  const [filters, setFilters] = useState({
    search: savedPrefs?.search ?? "",
    status: savedPrefs?.status ?? "",
    source: savedPrefs?.source ?? ""
  });
  const [sortField, setSortField] = useState<SortField>(savedPrefs?.sortField ?? 'name');
  const [sortDir, setSortDir] = useState<SortDir>(savedPrefs?.sortDir ?? 'asc');

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200] as const;
  const { get: getPref, set: setPref } = useUserPreferences();
  const [pageSize, setPageSize] = useState<number>(() => getPref<number>("candidates_pageSize", savedPrefs?.pageSize ?? 20));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    savePrefs(tenantId, { ...filters, search: searchInput, sortField, sortDir });
  }, [filters, searchInput, sortField, sortDir, tenantId]);

  // Reset to page 1 when filters/sort change
  useEffect(() => { setCurrentPage(1); }, [filters, searchInput, sortField, sortDir]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        unitId: queryUnitId,
        search: filters.search,
        status: filters.status,
        source: filters.source
      });
      const res = await fetch(`/api/candidates?${params}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setCandidates([]);
        toast.error(`Erro ao carregar candidatos.${data?.detail ? ` (${data.detail})` : ''}`);
        return;
      }
      setCandidates(data);
    } catch (err) {
      toast.error("Erro ao carregar candidatos.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [filters, queryUnitId, tenantId, toast]);

  const fetchCandidateForEdit = useCallback(async (id: number) => {
    if (!id || id <= 0) return;
    setCandidateEditLoading(true);
    try {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setCandidateForEdit(data);
    } catch (err) {
      toast.error("Erro ao carregar candidato.");
      navigate("/candidatos", { replace: true });
    } finally {
      setCandidateEditLoading(false);
    }
  }, [navigate, toast]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setLoading(true);
      await fetch(`/api/candidates/${deleteConfirmId}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      setDeleteConfirmId(null);
      fetchCandidates();
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    } finally {
      setLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setLoading(true);
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/candidates/${id}`, { method: 'DELETE' })
      ));
      toast.success(`${selectedIds.size} candidato(s) removido(s).`);
      setSelectedIds(new Set());
      setDeleteBulkConfirm(false);
      fetchCandidates();
    } catch (err) {
      toast.error("Erro ao remover candidatos.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Client-side sort
  const sortedCandidates = useMemo(() => {
    const list = [...candidates];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' });
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [candidates, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCandidates = sortedCandidates.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected = pagedCandidates.length > 0 && pagedCandidates.every(c => selectedIds.has(c.id));
  const someSelected = !allSelected && pagedCandidates.some(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedCandidates.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...pagedCandidates.map(c => c.id)]));
    }
  };

  const stats = useMemo(() => ({
    total: candidates.length,
    new: candidates.filter(c => c.status === 'Novo').length,
    interview: candidates.filter(c => c.status === 'Entrevista').length,
    approved: candidates.filter(c => c.status === 'Aprovado' || c.status === 'Contratado').length,
  }), [candidates]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (isEditRoute && routeCandidateId) {
      fetchCandidateForEdit(routeCandidateId);
    }
  }, [isEditRoute, routeCandidateId, fetchCandidateForEdit]);

  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (candidateEditLoading || !candidateForEdit || Number(candidateForEdit.id) !== routeCandidateId)) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Carregando candidato...
          </p>
        </div>
      );
    }
    return (
      <CandidateForm
        candidate={isEditRoute ? candidateForEdit : null}
        onBack={() => navigate(isEditRoute && routeCandidateId ? `/candidatos/${encodeId(routeCandidateId)}` : "/candidatos")}
        onSuccess={() => {
          navigate("/candidatos");
          fetchCandidates();
        }}
      />
    );
  }

  const statusColor = (status: string) => {
    if (status === 'Novo') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'Compatível') return 'bg-green-50 text-green-700 border-green-100';
    if (status === 'Entrevista') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (status === 'Aprovado' || status === 'Contratado') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'Reprovado') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-zinc-50 text-zinc-600 border-zinc-100';
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-zinc-300" />;
    if (field === 'name') return sortDir === 'asc'
      ? <ArrowUpAZ size={12} className="text-develoi-navy" />
      : <ArrowDownAZ size={12} className="text-develoi-navy" />;
    return sortDir === 'asc'
      ? <CalendarArrowUp size={12} className="text-develoi-navy" />
      : <CalendarArrowDown size={12} className="text-develoi-navy" />;
  };

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Building2 size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">{currentUnit.name}</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Banco de Talentos
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                <span className="font-semibold text-white/60">{candidates.length}</span> candidatos encontrados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/importar-cvs")}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
              >
                <Upload size={13} /> Importar CVs
              </button>
              {actions.can_create_candidates && (
                <button
                  onClick={() => navigate("/candidatos/novo")}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
                >
                  <Plus size={13} /> Novo Talento
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
            {[
              { label: "Total",      value: stats.total,     color: "text-white" },
              { label: "Novos",      value: stats.new,       color: "text-amber-300" },
              { label: "Entrevista", value: stats.interview, color: "text-sky-300" },
              { label: "Aprovados",  value: stats.approved,  color: "text-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <span className={cn("text-[20px] font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[10px] font-medium text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
          {/* Search */}
          <div className="relative flex min-w-[180px] flex-1 items-center">
            <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Nome, cargo, skill…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition-all focus:border-develoi-gold/50 sm:w-36"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '10px', paddingRight: '2rem' }}
          >
            <option value="">Todos status</option>
            {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Source */}
          <select
            value={filters.source}
            onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
            className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition-all focus:border-develoi-gold/50 sm:w-36"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '10px', paddingRight: '2rem' }}
          >
            <option value="">Todas origens</option>
            <option value="Manual">Manual</option>
            <option value="Portal">Portal</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Indicação">Indicação</option>
            <option value="Importação em Lote">Importação</option>
          </select>

          {/* Sort pills */}
          <div className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              onClick={() => toggleSort('name')}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors",
                sortField === 'name' ? "bg-white text-develoi-navy shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <SortIcon field="name" /> Nome
            </button>
            <button
              onClick={() => toggleSort('date')}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors",
                sortField === 'date' ? "bg-white text-develoi-navy shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <SortIcon field="date" /> Data
            </button>
          </div>

          {/* Spacer + refresh */}
          <div className="flex-1" />
          <button
            onClick={fetchCandidates}
            title="Atualizar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700"
          >
            <RefreshCcw size={13} />
          </button>
        </div>

        {/* ── BULK BAR ── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-2.5"
            >
              <span className="text-[12px] font-semibold text-amber-800">
                {selectedIds.size} candidato{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds(new Set())}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-50">
                  Limpar
                </button>
                {actions.can_delete_candidates && (
                  <button onClick={() => setDeleteBulkConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-600">
                    <Trash2 size={12} /> Remover {selectedIds.size}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TABLE ── */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_auto] items-center border-b border-zinc-200 bg-zinc-50/80 md:grid-cols-[2.5rem_1fr_6.5rem_7rem_10rem]">
            <div className="flex items-center justify-center py-3">
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
            </div>
            <div className="border-l border-zinc-200 px-4 py-3">
              <button onClick={() => toggleSort('name')}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:text-zinc-600">
                Candidato <SortIcon field="name" />
              </button>
            </div>
            <div className="hidden items-center justify-center border-l border-zinc-200 px-4 py-3 md:flex">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</span>
            </div>
            <div className="hidden items-center justify-center border-l border-zinc-200 px-4 py-3 md:flex">
              <button onClick={() => toggleSort('date')}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:text-zinc-600">
                <SortIcon field="date" /> Inclusão
              </button>
            </div>
            <div className="flex items-center justify-end border-l border-zinc-200 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Ações</span>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
                <Loader2 size={20} className="animate-spin text-develoi-navy" />
              </div>
              <p className="text-[11px] font-medium text-zinc-400">Carregando candidatos…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && pagedCandidates.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <Users size={26} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-zinc-800">Nenhum talento encontrado</p>
                <p className="mt-1 text-[12px] text-zinc-400">Altere os filtros ou cadastre um novo candidato</p>
              </div>
              {actions.can_create_candidates && (
                <button onClick={() => navigate("/candidatos/novo")}
                  className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                  <Plus size={13} /> Novo Talento
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          {!loading && pagedCandidates.map((c, idx) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02, duration: 0.18 }}
                className={cn(
                  "group grid grid-cols-[2.5rem_1fr_auto] items-center border-b border-zinc-100 transition-all duration-150 md:grid-cols-[2.5rem_1fr_6.5rem_7rem_10rem]",
                  "border-l-2",
                  isSelected
                    ? "border-l-develoi-gold bg-develoi-gold/[0.04]"
                    : "border-l-transparent hover:border-l-zinc-300 hover:bg-zinc-50/80"
                )}
              >
                {/* Checkbox */}
                <div className="flex cursor-pointer items-center justify-center py-3.5" onClick={() => toggleSelect(c.id)}>
                  <Checkbox checked={isSelected} onChange={() => toggleSelect(c.id)} />
                </div>

                {/* Info */}
                <div
                  className="flex cursor-pointer items-center gap-3 border-l border-zinc-100 px-4 py-3.5 min-w-0"
                  onClick={() => navigate(`/candidatos/${encodeId(c.id)}`)}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black transition-colors",
                    isSelected
                      ? "bg-develoi-gold/20 text-develoi-navy"
                      : "bg-zinc-100 text-zinc-500 group-hover:bg-develoi-navy/8 group-hover:text-develoi-navy"
                  )}>
                    {c.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-zinc-900">{c.full_name}</span>
                      {c.experience_years ? (
                        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                          {c.experience_years}a exp.
                        </span>
                      ) : null}
                      <span className="md:hidden">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", statusColor(c.status))}>
                          {c.status}
                        </span>
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
                      {c.desired_position && (
                        <span className="flex items-center gap-0.5 truncate">
                          <Briefcase size={9} /> {c.desired_position}
                        </span>
                      )}
                      {c.city && (
                        <>
                          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-zinc-300" />
                          <span className="flex items-center gap-0.5">
                            <MapPin size={9} /> {c.city}
                          </span>
                        </>
                      )}
                      {(c as any).source && (c as any).source !== 'Manual' && (
                        <>
                          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-zinc-300" />
                          <span className="rounded bg-zinc-100 px-1 text-[9px] font-medium text-zinc-500">{(c as any).source}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="hidden items-center justify-center border-l border-zinc-100 px-4 py-3.5 md:flex">
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold border", statusColor(c.status))}>
                    {c.status}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden flex-col items-center justify-center border-l border-zinc-100 px-4 py-3.5 md:flex">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <span className="text-[9px] text-zinc-400">
                    {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-0.5 border-l border-zinc-100 px-2.5 py-3.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/candidatos/${encodeId(c.id)}`)}
                    title="Ver perfil" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-develoi-navy">
                    <Eye size={13} />
                  </button>
                  <button onClick={() => navigate(`/candidatos/${encodeId(c.id)}?tab=evaluations`)}
                    title="Avaliações" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-purple-50 hover:text-purple-600">
                    <ClipboardCheck size={13} />
                  </button>
                  <button onClick={() => setFunnelModalCandidate({ id: c.id, full_name: c.full_name })}
                    title="Etapa do processo" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600">
                    <TrendingUp size={13} />
                  </button>
                  {actions.can_edit_candidates && (
                    <button onClick={() => navigate(`/candidatos/${encodeId(c.id)}/editar`)}
                      title="Editar" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                      <Edit size={13} />
                    </button>
                  )}
                  {actions.can_delete_candidates && (
                    <button onClick={() => setDeleteConfirmId(c.id)}
                      title="Excluir" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Pagination footer */}
          {!loading && sortedCandidates.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-medium text-zinc-500">
                  {sortedCandidates.length} candidato{sortedCandidates.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-zinc-300">·</span>
                <span className="text-[11px] text-zinc-400">pág. {safePage} / {totalPages}</span>
                {selectedIds.size > 0 && (
                  <span className="rounded-full bg-develoi-navy/8 px-2 py-0.5 text-[10px] font-semibold text-develoi-navy">
                    {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[
                    { icon: <ChevronsLeft size={13} />, action: () => setCurrentPage(1), disabled: safePage === 1 },
                    { icon: <ChevronLeft size={13} />,  action: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: safePage === 1 },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30">
                      {btn.icon}
                    </button>
                  ))}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p); return acc;
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`d-${i}`} className="flex h-7 w-7 items-center justify-center text-[10px] text-zinc-300">…</span>
                      : <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={cn("h-7 min-w-[1.75rem] rounded-lg px-1 text-[11px] font-semibold transition-all",
                            safePage === p ? "bg-develoi-navy text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200")}>
                          {p}
                        </button>
                    )}
                  {[
                    { icon: <ChevronRight size={13} />,  action: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: safePage === totalPages },
                    { icon: <ChevronsRight size={13} />, action: () => setCurrentPage(totalPages), disabled: safePage === totalPages },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30">
                      {btn.icon}
                    </button>
                  ))}
                </div>
                <select
                  value={pageSize}
                  onChange={e => { const n = Number(e.target.value); setPageSize(n); setPref("candidates_pageSize", n); setCurrentPage(1); }}
                  className="h-7 cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white pl-2.5 pr-6 text-[11px] font-medium text-zinc-600 outline-none transition-colors hover:border-zinc-300"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '9px' }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / pág.</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Delete single modal */}
        <Modal
          open={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          size="sm"
          title="Excluir Candidato"
          description="Esta ação remove o talento permanentemente."
          icon={<Trash2 size={20} />}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmDelete} loading={loading}>Remover</Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-zinc-600">
            Deseja realmente remover este candidato permanentemente?
          </p>
        </Modal>

        {/* Delete bulk modal */}
        <Modal
          open={deleteBulkConfirm}
          onClose={() => setDeleteBulkConfirm(false)}
          size="sm"
          title="Remover Selecionados"
          description={`${selectedIds.size} candidato(s) serão removidos permanentemente.`}
          icon={<Trash2 size={20} />}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setDeleteBulkConfirm(false)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmBulkDelete} loading={loading}>
                Remover {selectedIds.size}
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-zinc-600">
            Tem certeza que deseja remover <strong>{selectedIds.size} candidato{selectedIds.size !== 1 ? 's' : ''}</strong> permanentemente? Esta ação não pode ser desfeita.
          </p>
        </Modal>

        {/* Funnel stage modal */}
        <FunnelStageModal
          candidate={funnelModalCandidate}
          tenantId={tenantId}
          unitId={queryUnitId}
          onClose={() => setFunnelModalCandidate(null)}
          onSaved={() => {}}
        />

      </div>
    </PageWrapper>
  );
}

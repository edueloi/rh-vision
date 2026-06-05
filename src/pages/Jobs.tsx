import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown, Briefcase, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ChevronUp, Copy, ExternalLink,
  Globe, GlobeLock, Loader2, MoreHorizontal, Pencil, Trash2, MapPin,
  Calendar, Building2, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  Button, ContentCard, EmptyState, IconButton, PageWrapper,
  PanelCard, SectionTitle, useToast,
} from "@/src/components/ui";
import { getTenantId, getAuthUser } from "@/src/lib/auth";
import { getActionPermissions } from "@/src/lib/access";
import { useUnit } from "@/src/lib/useUnit";
import { Job } from "@/src/types";
import { JobDeleteModal, JobFiltersBar, JobStatusBadge, JobsSummary } from "@/src/components/jobs";
import JobDetails from "./JobDetails";
import JobForm from "./JobForm";
import { cn } from "@/src/lib/utils";
import { encodeId, decodeId } from "@/src/lib/hashid";
import { useUserPreferences } from "@/src/lib/useUserPreferences";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200];

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate = false, onChange, className }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "h-4 w-4 rounded flex items-center justify-center border transition-all shrink-0",
        checked || indeterminate
          ? "bg-develoi-navy border-develoi-navy"
          : "bg-white border-zinc-300 hover:border-zinc-400",
        className
      )}
    >
      {indeterminate
        ? <span className="h-0.5 w-2 rounded-full bg-white block" />
        : checked
          ? <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : null}
    </button>
  );
}

const STATUS_DOT: Record<string, string> = {
  Aberta: "bg-emerald-500",
  Pausada: "bg-amber-400",
  Encerrada: "bg-rose-500",
  Rascunho: "bg-zinc-400",
};

const STATUS_ROW: Record<string, string> = {
  Aberta:    "border-l-emerald-400",
  Pausada:   "border-l-amber-400",
  Encerrada: "border-l-rose-400",
  Rascunho:  "border-l-zinc-300",
};

function WorkModelPill({ model }: { model?: string | null }) {
  if (!model) return null;
  const colors: Record<string, string> = {
    "Presencial":  "bg-blue-50 text-blue-700",
    "Híbrido":     "bg-violet-50 text-violet-700",
    "Home Office": "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-semibold", colors[model] ?? "bg-zinc-100 text-zinc-500")}>
      {model}
    </span>
  );
}

// ─── Sort button ──────────────────────────────────────────────────────────────
function SortBtn({ field, label, sortBy, sortDir, onSort }: {
  field: string; label: string; sortBy: string; sortDir: string;
  onSort: (f: any) => void;
}) {
  const active = sortBy === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 group"
    >
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
        active ? "text-develoi-navy" : "text-zinc-400 group-hover:text-zinc-600"
      )}>
        {label}
      </span>
      {active
        ? (sortDir === 'asc' ? <ChevronUp size={11} className="text-develoi-navy" /> : <ChevronDown size={11} className="text-develoi-navy" />)
        : <ArrowUpDown size={10} className="text-zinc-300 group-hover:text-zinc-400" />}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Jobs() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();
  const actions = getActionPermissions(getAuthUser());

  const createMatch  = useMatch("/vagas/nova");
  const importMatch  = useMatch("/vagas/importar");
  const editMatch    = useMatch("/vagas/:jobId/editar");
  const detailsMatch = useMatch("/vagas/:jobId");

  const isCreateRoute  = Boolean(createMatch || importMatch);
  const isEditRoute    = Boolean(editMatch);
  const isDetailsRoute = Boolean(detailsMatch) && !isEditRoute && !isCreateRoute;
  const routeJobId = decodeId(
    editMatch?.params.jobId ??
    (isDetailsRoute ? detailsMatch?.params.jobId : undefined) ?? ""
  ) || null;

  const { get: getPref, set: setPref } = useUserPreferences();

  const [selectedJob, setSelectedJob]           = useState<Job | null>(null);
  const [selectedJobLoading, setSelectedJobLoading] = useState(false);
  const [jobToDelete, setJobToDelete]           = useState<Job | null>(null);
  const [jobs, setJobs]                         = useState<Job[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [filters, setFilters]                   = useState({ search: "", status: "", workModel: "" });
  const [selectedIds, setSelectedIds]           = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const [pageSize, setPageSizeState]            = useState<number>(() => getPref<number>("jobs_pageSize", 20));
  const [currentPage, setCurrentPage]           = useState(1);
  const [viewMode, setViewMode]                 = useState<"grid" | "list">(() =>
    (localStorage.getItem("jobs_view_mode") as "grid" | "list") || "list"
  );

  type SortField = 'title' | 'department' | 'status' | 'created_at';
  const [sortBy, setSortBy]   = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const setPageSize = (n: number) => { setPageSizeState(n); setPref("jobs_pageSize", n); setCurrentPage(1); };
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode); localStorage.setItem("jobs_view_mode", mode);
  };

  // Portal action menu
  const [menuState, setMenuState] = useState<{ id: number; x: number; top: number; bottom: number; openUp: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const openMenu = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    if (menuState?.id === jobId) { setMenuState(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const openUp = rect.bottom + 240 > window.innerHeight - 16;
    setMenuState({ id: jobId, x: rect.right, top: rect.top, bottom: rect.bottom, openUp });
  };

  useEffect(() => {
    if (!menuState) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuState(null); };
    const onScroll = () => setMenuState(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("scroll", onScroll, true); };
  }, [menuState]);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ unitId: String(queryUnitId), tenantId: String(tenantId) });
      if (filters.search)    params.set("search", filters.search);
      if (filters.status)    params.set("status", filters.status);
      if (filters.workModel) params.set("workModel", filters.workModel);
      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao carregar vagas.");
      setJobs(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar vagas.");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.workModel, queryUnitId, tenantId, toast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const fetchJob = useCallback(async (id: number) => {
    if (!id || id <= 0) { navigate("/vagas", { replace: true }); return; }
    setSelectedJobLoading(true);
    try {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) throw new Error("Job not found");
      setSelectedJob(await response.json());
    } catch {
      toast.error("Vaga não encontrada.");
      navigate("/vagas", { replace: true });
    } finally {
      setSelectedJobLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (routeJobId && routeJobId > 0) { fetchJob(routeJobId); return; }
    const slug = editMatch?.params.jobId ?? (isDetailsRoute ? detailsMatch?.params.jobId : undefined);
    if (slug && !routeJobId && !isCreateRoute) { navigate("/vagas", { replace: true }); return; }
    if (!isCreateRoute) setSelectedJob(null);
  }, [fetchJob, isCreateRoute, isDetailsRoute, routeJobId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      const r = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Vaga removida.");
      setJobToDelete(null);
      fetchJobs();
    } catch { toast.error("Erro ao remover vaga."); }
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const r = await fetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, title: `${job.title} (Cópia)`, id: undefined, created_at: undefined, updated_at: undefined, is_public: false, status: "Rascunho" }),
      });
      if (!r.ok) throw new Error();
      toast.success("Vaga duplicada.");
      fetchJobs();
    } catch { toast.error("Erro ao duplicar vaga."); }
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      const r = await fetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error();
      toast.success(`Status → ${newStatus}`);
      fetchJobs();
    } catch { toast.error("Erro ao alterar status."); }
  };

  const togglePublication = async (job: Job) => {
    try {
      const r = await fetch(`/api/jobs/${job.id}/publication`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !job.is_public }),
      });
      if (!r.ok) throw new Error();
      toast.success(job.is_public ? "Vaga removida do portal." : "Vaga publicada no portal.");
      fetchJobs();
    } catch { toast.error("Erro ao alterar publicação."); }
  };

  const confirmBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/jobs/${id}`, { method: "DELETE" })));
      toast.success(`${selectedIds.size} vaga(s) removida(s).`);
      setSelectedIds(new Set());
      setDeleteBulkConfirm(false);
      fetchJobs();
    } catch { toast.error("Erro ao remover vagas."); }
  };

  // ── Sorting / pagination ──────────────────────────────────────────────────
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const get = (j: Job) =>
        sortBy === 'title' ? j.title || '' :
        sortBy === 'department' ? j.department || '' :
        sortBy === 'status' ? j.status || '' :
        j.created_at || '';
      const cmp = get(a).localeCompare(get(b), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [jobs, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pagedJobs  = sortedJobs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected  = pagedJobs.length > 0 && pagedJobs.every((j) => selectedIds.has(j.id));
  const someSelected = !allSelected && pagedJobs.some((j) => selectedIds.has(j.id));

  const toggleSelect    = (id: number) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds((prev) => { const n = new Set(prev); pagedJobs.forEach((j) => n.delete(j.id)); return n; });
    else             setSelectedIds((prev) => { const n = new Set(prev); pagedJobs.forEach((j) => n.add(j.id)); return n; });
  };

  const fmtDate = (raw?: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  };

  // ── Sub-route guards ──────────────────────────────────────────────────────
  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (selectedJobLoading || !selectedJob || Number(selectedJob.id) !== routeJobId)) {
      return (
        <PageWrapper>
          <div className="flex h-60 items-center justify-center gap-3">
            <Loader2 size={22} className="animate-spin text-develoi-navy" />
            <span className="text-[12px] font-medium text-zinc-400">Carregando vaga…</span>
          </div>
        </PageWrapper>
      );
    }
    return (
      <JobForm
        job={isEditRoute ? selectedJob : null}
        initialData={importMatch ? ({ _importMode: true } as Partial<Job>) : null}
        onBack={() => navigate(isEditRoute && routeJobId ? `/vagas/${encodeId(routeJobId)}` : "/vagas")}
        onSuccess={() => { navigate("/vagas"); fetchJobs(); }}
      />
    );
  }

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
                Gestão de Vagas
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                <span className="text-white/60 font-semibold">{jobs.length}</span> vagas encontradas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open('/empregos', '_blank')}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
              >
                <Globe size={11} /> Portal de Empregos
              </button>
              {actions.can_create_jobs && (
                <>
                  <button
                    onClick={() => navigate("/vagas/importar")}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
                  >
                    Importar vaga
                  </button>
                  <button
                    onClick={() => navigate("/vagas/nova")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
                  >
                    + Nova vaga
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI SUMMARY ── */}
        <JobsSummary jobs={jobs} />

        {/* ── FILTER BAR ── */}
        <JobFiltersBar
          filters={filters}
          onChange={(f) => { setFilters(f); setCurrentPage(1); }}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={fetchJobs}
          onImport={() => navigate("/vagas/importar")}
          onCreate={() => navigate("/vagas/nova")}
          canCreate={actions.can_create_jobs}
        />

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
                {selectedIds.size} vaga{selectedIds.size !== 1 ? "s" : ""} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                {actions.can_delete_jobs && deleteBulkConfirm ? (
                  <>
                    <span className="text-[11px] font-medium text-rose-600">Confirmar exclusão?</span>
                    <button onClick={confirmBulkDelete} className="rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-600">
                      Sim, excluir
                    </button>
                    <button onClick={() => setDeleteBulkConfirm(false)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    {actions.can_delete_jobs && (
                      <button onClick={() => setDeleteBulkConfirm(true)} className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-600">
                        <Trash2 size={12} /> Excluir selecionadas
                      </button>
                    )}
                    <button onClick={() => setSelectedIds(new Set())} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-50">
                      Limpar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TABLE ── */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          {/* Table header */}
          <div className="grid grid-cols-[2.5rem_1fr_auto] items-center border-b border-zinc-200 bg-zinc-50/80 md:grid-cols-[2.5rem_1fr_6.5rem_7.5rem_7rem_7.5rem]">
            <div className="flex items-center justify-center py-3">
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
            </div>
            <div className="border-l border-zinc-200 px-4 py-3">
              <SortBtn field="title" label="Vaga" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="hidden items-center justify-center border-l border-zinc-200 px-4 py-3 md:flex">
              <SortBtn field="department" label="Depto." sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="hidden items-center justify-center border-l border-zinc-200 px-4 py-3 md:flex">
              <SortBtn field="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="hidden items-center justify-center border-l border-zinc-200 px-4 py-3 md:flex">
              <SortBtn field="created_at" label="Criação" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
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
              <p className="text-[11px] font-medium text-zinc-400">Carregando vagas…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && pagedJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <Briefcase size={26} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-zinc-800">Nenhuma vaga encontrada</p>
                <p className="mt-1 text-[12px] text-zinc-400">Altere os filtros ou cadastre uma nova vaga</p>
              </div>
              {actions.can_create_jobs && (
                <button
                  onClick={() => navigate("/vagas/nova")}
                  className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]"
                >
                  + Nova vaga
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          {!loading && pagedJobs.map((job, idx) => {
            const isSelected = selectedIds.has(job.id);
            const statusKey = job.status || 'Rascunho';
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.025, duration: 0.18 }}
                className={cn(
                  "group grid grid-cols-[2.5rem_1fr_auto] items-center border-b border-zinc-100 transition-all duration-150 md:grid-cols-[2.5rem_1fr_6.5rem_7.5rem_7rem_7.5rem]",
                  "border-l-2",
                  isSelected
                    ? "border-l-develoi-gold bg-develoi-gold/[0.04]"
                    : cn("border-l-transparent hover:border-l-zinc-300 hover:bg-zinc-50/80", STATUS_ROW[statusKey])
                )}
              >
                {/* Checkbox */}
                <div className="flex cursor-pointer items-center justify-center py-3.5" onClick={() => toggleSelect(job.id)}>
                  <Checkbox checked={isSelected} onChange={() => toggleSelect(job.id)} />
                </div>

                {/* Title + meta */}
                <div
                  className="flex cursor-pointer items-center gap-3 border-l border-zinc-100 px-4 py-3.5 min-w-0"
                  onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                >
                  {/* Avatar initials */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black transition-colors",
                    isSelected
                      ? "bg-develoi-gold/20 text-develoi-navy"
                      : "bg-zinc-100 text-zinc-500 group-hover:bg-develoi-navy/8 group-hover:text-develoi-navy"
                  )}>
                    {job.title.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-zinc-900">{job.title}</span>
                      {job.is_public && (
                        <Globe size={11} className="shrink-0 text-emerald-500" title="Publicada no portal" />
                      )}
                      {/* Status badge on mobile */}
                      <span className="md:hidden">
                        <JobStatusBadge status={job.status} approvalStatus={(job as any).approval_status} />
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {(job.city || job.state) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                          <MapPin size={9} />
                          {[job.city, job.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <WorkModelPill model={job.work_model} />
                      {job.candidates_count != null && job.candidates_count > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                          <Users size={9} />
                          {job.candidates_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department */}
                <div className="hidden items-center justify-center border-l border-zinc-100 px-4 py-3.5 md:flex">
                  {job.department ? (
                    <span className="max-w-[5rem] truncate rounded-lg bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                      {job.department}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-300">—</span>
                  )}
                </div>

                {/* Status */}
                <div className="hidden items-center justify-center border-l border-zinc-100 px-4 py-3.5 md:flex">
                  <JobStatusBadge status={job.status} approvalStatus={(job as any).approval_status} />
                </div>

                {/* Date */}
                <div className="hidden flex-col items-center justify-center border-l border-zinc-100 px-4 py-3.5 md:flex">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                    <Calendar size={9} className="text-zinc-400" />
                    {fmtDate(job.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-end gap-0.5 border-l border-zinc-100 px-2.5 py-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                    title="Ver detalhes"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-develoi-navy"
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    onClick={() => navigate(`/vagas/${encodeId(job.id)}/editar`)}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => openMenu(e, job.id)}
                    title="Mais ações"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                      menuState?.id === job.id
                        ? "bg-zinc-100 text-zinc-700"
                        : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    )}
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* ── Pagination footer ── */}
          {!loading && sortedJobs.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-medium text-zinc-500">
                  {sortedJobs.length} vaga{sortedJobs.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-zinc-300">·</span>
                <span className="text-[11px] text-zinc-400">pág. {safePage} / {totalPages}</span>
                {selectedIds.size > 0 && (
                  <span className="rounded-full bg-develoi-navy/8 px-2 py-0.5 text-[10px] font-semibold text-develoi-navy">
                    {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Page buttons */}
                <div className="flex items-center gap-0.5">
                  {[
                    { icon: <ChevronsLeft size={13} />, action: () => setCurrentPage(1),                           disabled: safePage === 1 },
                    { icon: <ChevronLeft size={13} />,  action: () => setCurrentPage(p => Math.max(1, p - 1)),     disabled: safePage === 1 },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30">
                      {btn.icon}
                    </button>
                  ))}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} className="flex h-7 w-7 items-center justify-center text-[10px] text-zinc-300">…</span>
                      ) : (
                        <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={cn(
                            "h-7 min-w-[1.75rem] rounded-lg px-1 text-[11px] font-semibold transition-all",
                            safePage === p ? "bg-develoi-navy text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200"
                          )}>
                          {p}
                        </button>
                      )
                    )}

                  {[
                    { icon: <ChevronRight size={13} />,  action: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: safePage === totalPages },
                    { icon: <ChevronsRight size={13} />, action: () => setCurrentPage(totalPages),                        disabled: safePage === totalPages },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30">
                      {btn.icon}
                    </button>
                  ))}
                </div>

                {/* Page size */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white pl-2.5 pr-6 text-[11px] font-medium text-zinc-600 outline-none transition-colors hover:border-zinc-300"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '9px' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / pág.</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Portal action menu ── */}
      {menuState && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            ...(menuState.openUp ? { bottom: window.innerHeight - menuState.top + 4 } : { top: menuState.bottom + 4 }),
            left: menuState.x - 212,
            zIndex: 9999,
          }}
          className="w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl"
        >
          {(() => {
            const job = pagedJobs.find((j) => j.id === menuState.id);
            if (!job) return null;
            return (
              <>
                <button
                  onClick={() => { handleDuplicate(job); setMenuState(null); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <Copy size={13} className="text-zinc-400" /> Duplicar
                </button>
                <button
                  onClick={() => { togglePublication(job); setMenuState(null); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  {job.is_public
                    ? <GlobeLock size={13} className="text-zinc-400" />
                    : <Globe size={13} className="text-zinc-400" />}
                  {job.is_public ? "Remover do portal" : "Publicar no portal"}
                </button>

                <div className="my-1 border-t border-zinc-100" />
                <p className="px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Alterar status</p>
                {["Aberta", "Pausada", "Encerrada", "Rascunho"]
                  .filter((s) => s !== job.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => { handleStatusChange(job, s); setMenuState(null); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[s] ?? "bg-zinc-400")} />
                      {s}
                    </button>
                  ))}

                {actions.can_delete_jobs && (
                  <>
                    <div className="my-1 border-t border-zinc-100" />
                    <button
                      onClick={() => { setJobToDelete(job); setMenuState(null); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 size={13} /> Excluir
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Details panel */}
      <AnimatePresence>
        {isDetailsRoute && selectedJob && (
          <JobDetails
            job={selectedJob}
            onClose={() => navigate("/vagas")}
            onEdit={() => navigate(`/vagas/${encodeId(selectedJob.id)}/editar`)}
          />
        )}
      </AnimatePresence>

      <JobDeleteModal
        job={jobToDelete}
        open={Boolean(jobToDelete)}
        onClose={() => setJobToDelete(null)}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}

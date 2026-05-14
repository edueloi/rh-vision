import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  ExternalLink,
  Globe,
  GlobeLock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  Button,
  ContentCard,
  EmptyState,
  IconButton,
  PageWrapper,
  PanelCard,
  SectionTitle,
  useToast,
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { Job } from "@/src/types";
import {
  JobDeleteModal,
  JobFiltersBar,
  JobStatusBadge,
  JobsSummary,
} from "@/src/components/jobs";
import JobDetails from "./JobDetails";
import JobForm from "./JobForm";
import { cn } from "@/src/lib/utils";
import { encodeId, decodeId } from "@/src/lib/hashid";
import { useUserPreferences } from "@/src/lib/useUserPreferences";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200];

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  className,
}: {
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

function statusDot(status: string) {
  if (status === "Aberta") return "bg-emerald-500";
  if (status === "Pausada") return "bg-amber-400";
  if (status === "Encerrada") return "bg-rose-500";
  return "bg-zinc-400";
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Jobs() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();

  const createMatch = useMatch("/vagas/nova");
  const importMatch = useMatch("/vagas/importar");
  const editMatch = useMatch("/vagas/:jobId/editar");
  const detailsMatch = useMatch("/vagas/:jobId");

  const isCreateRoute = Boolean(createMatch || importMatch);
  const isEditRoute = Boolean(editMatch);
  const isDetailsRoute = Boolean(detailsMatch) && !isEditRoute && !isCreateRoute;
  const routeJobId =
    decodeId(
      editMatch?.params.jobId ??
      (isDetailsRoute ? detailsMatch?.params.jobId : undefined) ??
      ""
    ) || null;

  const { get: getPref, set: setPref } = useUserPreferences();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobLoading, setSelectedJobLoading] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "", workModel: "" });

  // multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);

  // pagination
  const [pageSize, setPageSizeState] = useState<number>(() => getPref<number>("jobs_pageSize", 20));
  const [currentPage, setCurrentPage] = useState(1);

  const setPageSize = (n: number) => {
    setPageSizeState(n);
    setPref("jobs_pageSize", n);
    setCurrentPage(1);
  };

  // view mode (kept for FiltersBar)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("jobs_view_mode") as "grid" | "list") || "list";
  });
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("jobs_view_mode", mode);
  };

  // row action menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (openMenuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ unitId: String(queryUnitId), tenantId: String(tenantId) });
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
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
      if (!r.ok) throw new Error("Erro ao remover vaga.");
      toast.success("Vaga removida com sucesso.");
      setJobToDelete(null);
      fetchJobs();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao remover vaga."); }
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, title: `${job.title} (Cópia)`, id: undefined, created_at: undefined, updated_at: undefined, is_public: false, status: "Rascunho" }),
      });
      if (!r.ok) throw new Error("Erro ao duplicar vaga.");
      toast.success("Vaga duplicada com sucesso.");
      fetchJobs();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao duplicar vaga."); }
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      const r = await fetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Erro ao alterar status.");
      toast.success(`Status alterado para ${newStatus}.`);
      fetchJobs();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao alterar status."); }
  };

  const togglePublication = async (job: Job) => {
    try {
      const r = await fetch(`/api/jobs/${job.id}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !job.is_public }),
      });
      if (!r.ok) throw new Error("Erro ao alterar publicação.");
      toast.success(job.is_public ? "Vaga removida do portal." : "Vaga publicada no portal.");
      fetchJobs();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao alterar publicação."); }
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

  // ── Pagination / selection ────────────────────────────────────────────────
  const sortedJobs = useMemo(() => [...jobs], [jobs]);
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedJobs = sortedJobs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected = pagedJobs.length > 0 && pagedJobs.every((j) => selectedIds.has(j.id));
  const someSelected = !allSelected && pagedJobs.some((j) => selectedIds.has(j.id));

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); pagedJobs.forEach((j) => n.delete(j.id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); pagedJobs.forEach((j) => n.add(j.id)); return n; });
    }
  };

  const resultsLabel = useMemo(
    () => `${currentUnit.name} · ${jobs.length} vagas encontradas`,
    [currentUnit.name, jobs.length]
  );

  // ── Date formatter ────────────────────────────────────────────────────────
  const fmtDate = (raw?: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };
  const fmtTime = (raw?: string | null) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // ── Create / edit guards ──────────────────────────────────────────────────
  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (selectedJobLoading || !selectedJob || Number(selectedJob.id) !== routeJobId)) {
      return (
        <PageWrapper className="min-h-screen bg-zinc-50/60">
          <div className="px-4 py-10 sm:px-6 lg:px-8">
            <ContentCard className="flex flex-col items-center justify-center gap-4 py-24">
              <Loader2 size={28} className="animate-spin text-develoi-navy" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Carregando vaga</p>
            </ContentCard>
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
    <PageWrapper className="min-h-screen overflow-x-hidden bg-zinc-50/60">
      <div className="space-y-8 px-3 py-5 sm:space-y-10 sm:px-5 sm:py-7 lg:space-y-12 lg:px-8 lg:py-10">

        <SectionTitle title="Gestão de Vagas" subtitle={resultsLabel} icon={<Briefcase size={22} />} />

        <JobsSummary jobs={jobs} />

        <JobFiltersBar
          filters={filters}
          onChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={fetchJobs}
          onImport={() => navigate("/vagas/importar")}
          onCreate={() => navigate("/vagas/nova")}
        />

        {/* ── Bulk bar ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5"
            >
              <span className="text-xs font-black text-develoi-navy uppercase tracking-wider">
                {selectedIds.size} vaga{selectedIds.size !== 1 ? "s" : ""} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                {deleteBulkConfirm ? (
                  <>
                    <span className="text-xs font-semibold text-rose-600">Confirmar exclusão?</span>
                    <Button size="sm" variant="danger" onClick={confirmBulkDelete}>Sim, excluir</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteBulkConfirm(false)}>Cancelar</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="danger" onClick={() => setDeleteBulkConfirm(true)}>
                      <Trash2 size={12} className="mr-1" /> Excluir selecionadas
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_7rem_7rem_7rem_9rem] items-center border-b-2 border-zinc-200 bg-zinc-100 border-l-2 border-l-transparent">
            <div className="flex items-center justify-center py-2.5">
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
            </div>
            <div className="px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vaga</p>
            </div>
            <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Depto.</p>
            </div>
            <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</p>
            </div>
            <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Criação</p>
            </div>
            <div className="flex items-center justify-end px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ações</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-zinc-400 uppercase">Carregando...</p>
            </div>
          ) : pagedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                <Briefcase size={28} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-900">Nenhuma vaga encontrada</p>
                <p className="text-xs text-zinc-500 mt-1">Altere os filtros ou cadastre uma nova vaga</p>
              </div>
            </div>
          ) : (
            <div>
              {pagedJobs.map((job, idx) => {
                const isSelected = selectedIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_7rem_7rem_7rem_9rem] items-center transition-colors duration-100 border-b border-zinc-200",
                      isSelected
                        ? "bg-amber-50 border-l-2 border-l-develoi-gold"
                        : idx % 2 === 0
                        ? "bg-white hover:bg-zinc-50 border-l-2 border-l-transparent"
                        : "bg-zinc-50 hover:bg-zinc-100 border-l-2 border-l-transparent"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center py-3 cursor-pointer" onClick={() => toggleSelect(job.id)}>
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(job.id)} />
                    </div>

                    {/* Title + meta */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 border-l border-zinc-200 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                    >
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg font-black text-[10px] shrink-0 transition-colors",
                        isSelected ? "bg-develoi-gold/20 text-develoi-navy" : "bg-zinc-200/70 text-zinc-600"
                      )}>
                        {job.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900 text-sm truncate">{job.title}</span>
                          {job.is_public && (
                            <span title="Publicada no portal">
                              <Globe size={11} className="shrink-0 text-emerald-500" />
                            </span>
                          )}
                          <span className="md:hidden">
                            <JobStatusBadge status={job.status} />
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          {[job.city, job.state].filter(Boolean).join(", ")}
                          {job.work_model ? ` · ${job.work_model}` : ""}
                          {job.candidates_count != null ? ` · ${job.candidates_count} candidato(s)` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="hidden md:flex items-center justify-center px-4 py-3 border-l border-zinc-200">
                      <span className="text-[11px] text-zinc-500 truncate">{job.department || "—"}</span>
                    </div>

                    {/* Status */}
                    <div className="hidden md:flex items-center justify-center px-4 py-3 border-l border-zinc-200">
                      <JobStatusBadge status={job.status} />
                    </div>

                    {/* Date */}
                    <div className="hidden md:flex flex-col items-center justify-center px-4 py-3 border-l border-zinc-200">
                      <span className="text-[11px] font-semibold text-zinc-700">{fmtDate(job.created_at)}</span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{fmtTime(job.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center justify-end gap-0.5 px-2 py-3 border-l border-zinc-200 relative"
                      onClick={(e) => e.stopPropagation()}
                      ref={openMenuId === job.id ? menuRef : null}
                    >
                      <IconButton
                        onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-develoi-navy hover:bg-develoi-navy/5"
                        title="Ver detalhes"
                      >
                        <ExternalLink size={13} />
                      </IconButton>
                      <IconButton
                        onClick={() => navigate(`/vagas/${encodeId(job.id)}/editar`)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </IconButton>
                      <IconButton
                        onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                        title="Mais ações"
                      >
                        <MoreHorizontal size={13} />
                      </IconButton>

                      {openMenuId === job.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1"
                        >
                          <button
                            onClick={() => { handleDuplicate(job); setOpenMenuId(null); }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            <Copy size={13} className="text-zinc-400" /> Duplicar
                          </button>
                          <button
                            onClick={() => { togglePublication(job); setOpenMenuId(null); }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            {job.is_public
                              ? <GlobeLock size={13} className="text-zinc-400" />
                              : <Globe size={13} className="text-zinc-400" />}
                            {job.is_public ? "Remover do portal" : "Publicar no portal"}
                          </button>
                          {["Aberta", "Pausada", "Encerrada", "Rascunho"]
                            .filter((s) => s !== job.status)
                            .map((s) => (
                              <button
                                key={s}
                                onClick={() => { handleStatusChange(job, s); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                              >
                                <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot(s))} />
                                Marcar como {s}
                              </button>
                            ))}
                          <div className="my-1 border-t border-zinc-100" />
                          <button
                            onClick={() => { setJobToDelete(job); setOpenMenuId(null); }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination footer */}
          {!loading && sortedJobs.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {sortedJobs.length} vaga{sortedJobs.length !== 1 ? "s" : ""} · pág. {safePage}/{totalPages}
                </p>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-black text-develoi-navy uppercase tracking-wider bg-develoi-navy/8 px-2 py-0.5 rounded-full">
                    {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronsLeft size={13} />
                  </button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={13} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} className="w-7 text-center text-[10px] font-bold text-zinc-400">…</span>
                      ) : (
                        <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={cn(
                            "h-7 min-w-[1.75rem] px-1 rounded-lg text-[10px] font-black transition-all",
                            safePage === p ? "bg-develoi-navy text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200"
                          )}>
                          {p}
                        </button>
                      )
                    )}

                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={13} />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronsRight size={13} />
                  </button>
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 appearance-none rounded-lg border border-zinc-200 bg-white text-[10px] font-black text-zinc-600 pl-2.5 pr-6 outline-none cursor-pointer hover:border-zinc-300 transition-colors"
                  title="Itens por página"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / pág.</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

      </div>

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

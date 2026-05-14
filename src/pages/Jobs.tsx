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

// ─── Checkbox ───────────────────────────────────────────────────────────────
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
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

// ─── Status color helper ─────────────────────────────────────────────────────
function statusDot(status: string) {
  if (status === "Aberta") return "bg-emerald-500";
  if (status === "Pausada") return "bg-amber-400";
  if (status === "Encerrada") return "bg-rose-500";
  return "bg-zinc-400";
}

// ─── Main component ──────────────────────────────────────────────────────────
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
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    workModel: "",
  });

  // ── Multi-select ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);

  // ── Pagination ──────────────────────────────────────────────────────────
  const [pageSize, setPageSizeState] = useState<number>(() =>
    getPref<number>("jobs_pageSize", 20)
  );
  const [currentPage, setCurrentPage] = useState(1);

  const setPageSize = (n: number) => {
    setPageSizeState(n);
    setPref("jobs_pageSize", n);
    setCurrentPage(1);
  };

  // ── View mode (kept for FiltersBar; grid/list toggle still wired) ───────
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("jobs_view_mode");
    return (saved as "grid" | "list") || "list";
  });

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("jobs_view_mode", mode);
  };

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        unitId: String(queryUnitId),
        tenantId: String(tenantId),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.workModel) params.set("workModel", filters.workModel);

      const response = await fetch(`/api/jobs?${params.toString()}`);
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

  const fetchJob = useCallback(
    async (id: number) => {
      if (!id || id <= 0) { navigate("/vagas", { replace: true }); return; }
      setSelectedJobLoading(true);
      try {
        const response = await fetch(`/api/jobs/${id}`);
        if (!response.ok) throw new Error("Job not found");
        const data = await response.json();
        setSelectedJob(data);
      } catch {
        toast.error("Vaga não encontrada.");
        navigate("/vagas", { replace: true });
      } finally {
        setSelectedJobLoading(false);
      }
    },
    [navigate, toast]
  );

  useEffect(() => {
    if (routeJobId && routeJobId > 0) { fetchJob(routeJobId); return; }
    const slug =
      editMatch?.params.jobId ??
      (isDetailsRoute ? detailsMatch?.params.jobId : undefined);
    if (slug && !routeJobId && !isCreateRoute) {
      navigate("/vagas", { replace: true });
      return;
    }
    if (!isCreateRoute) setSelectedJob(null);
  }, [fetchJob, isCreateRoute, isDetailsRoute, routeJobId]);

  // ── Single-job actions ──────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao remover vaga.");
      toast.success("Vaga removida com sucesso.");
      setJobToDelete(null);
      fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover vaga.");
    }
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...job,
          title: `${job.title} (Cópia)`,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
          is_public: false,
          status: "Rascunho",
        }),
      });
      if (!response.ok) throw new Error("Erro ao duplicar vaga.");
      toast.success("Vaga duplicada com sucesso.");
      fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao duplicar vaga.");
    }
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Erro ao alterar status.");
      toast.success(`Status alterado para ${newStatus}.`);
      fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status.");
    }
  };

  const togglePublication = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !job.is_public }),
      });
      if (!response.ok) throw new Error("Erro ao alterar publicação.");
      toast.success(job.is_public ? "Vaga removida do portal." : "Vaga publicada no portal.");
      fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar publicação.");
    }
  };

  // ── Bulk delete ─────────────────────────────────────────────────────────
  const confirmBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/jobs/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`${selectedIds.size} vaga(s) removida(s).`);
      setSelectedIds(new Set());
      setDeleteBulkConfirm(false);
      fetchJobs();
    } catch {
      toast.error("Erro ao remover vagas.");
    }
  };

  // ── Sorting / filtering / pagination ────────────────────────────────────
  const sortedJobs = useMemo(() => [...jobs], [jobs]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedJobs = sortedJobs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected = pagedJobs.length > 0 && pagedJobs.every((j) => selectedIds.has(j.id));
  const someSelected = !allSelected && pagedJobs.some((j) => selectedIds.has(j.id));

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedJobs.forEach((j) => next.delete(j.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedJobs.forEach((j) => next.add(j.id));
        return next;
      });
    }
  };

  const resultsLabel = useMemo(
    () => `${currentUnit.name} · ${jobs.length} vagas encontradas`,
    [currentUnit.name, jobs.length]
  );

  // ── Row action menu state ────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openMenuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  // ── Date formatter ──────────────────────────────────────────────────────
  const fmtDate = (raw?: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  };

  // ── Render guard: create / edit routes ──────────────────────────────────
  if (isCreateRoute || isEditRoute) {
    if (
      isEditRoute &&
      (selectedJobLoading || !selectedJob || Number(selectedJob.id) !== routeJobId)
    ) {
      return (
        <PageWrapper className="min-h-screen bg-zinc-50/60">
          <div className="px-4 py-10 sm:px-6 lg:px-8">
            <ContentCard className="flex flex-col items-center justify-center gap-4 py-24">
              <Loader2 size={28} className="animate-spin text-develoi-navy" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Carregando vaga
              </p>
            </ContentCard>
          </div>
        </PageWrapper>
      );
    }
    return (
      <JobForm
        job={isEditRoute ? selectedJob : null}
        initialData={importMatch ? ({ _importMode: true } as Partial<Job>) : null}
        onBack={() =>
          navigate(
            isEditRoute && routeJobId
              ? `/vagas/${encodeId(routeJobId)}`
              : "/vagas"
          )
        }
        onSuccess={() => { navigate("/vagas"); fetchJobs(); }}
      />
    );
  }

  // ── Page size options ────────────────────────────────────────────────────
  const pageSizeOptions = [5, 10, 20, 50, 100, 200];

  // ── Pagination pills ─────────────────────────────────────────────────────
  const pagePills = () => {
    const pills: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pills.push(i);
    } else {
      pills.push(1);
      if (safePage > 3) pills.push("…");
      for (
        let i = Math.max(2, safePage - 1);
        i <= Math.min(totalPages - 1, safePage + 1);
        i++
      )
        pills.push(i);
      if (safePage < totalPages - 2) pills.push("…");
      pills.push(totalPages);
    }
    return pills;
  };

  return (
    <PageWrapper className="min-h-screen overflow-x-hidden bg-zinc-50/60">
      <div className="space-y-8 px-3 py-5 sm:space-y-10 sm:px-5 sm:py-7 lg:space-y-12 lg:px-8 lg:py-10">
        <SectionTitle
          title="Gestão de Vagas"
          subtitle={resultsLabel}
          icon={<Briefcase size={22} />}
        />

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

        <PanelCard
          title="Oportunidades"
          description="Gerencie, publique, pause e revise as vagas da unidade com uma listagem padronizada."
          icon={Briefcase}
          className="overflow-visible rounded-[1.75rem] sm:rounded-[2rem]"
          headerClassName="px-4 py-4 sm:px-6 sm:py-5"
          contentClassName="p-0"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 sm:px-6 sm:py-24">
              <Loader2 size={28} className="animate-spin text-develoi-navy" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Carregando vagas
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-3 sm:p-5 lg:p-6">
              <EmptyState
                title="Nenhuma vaga encontrada"
                description="Tente ajustar os filtros ou cadastre uma nova oportunidade para começar a operação."
                icon={<Briefcase size={42} />}
                action={
                  <Button variant="secondary" onClick={() => navigate("/vagas/nova")}>
                    Criar nova vaga
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* ── Table ──────────────────────────────────────────────── */}
              <div className="overflow-x-auto rounded-b-[1.75rem] sm:rounded-b-[2rem]">
                {/* Header */}
                <div className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_6rem_8rem_9rem_9rem] border-b-2 border-zinc-200 bg-zinc-100 border-l-2 border-l-transparent min-w-[44rem]">
                  {/* Checkbox */}
                  <div className="flex items-center justify-center px-2 py-3">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                    />
                  </div>
                  {/* Title */}
                  <div className="flex items-center border-l border-zinc-200 px-3 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Vaga
                    </span>
                  </div>
                  {/* Department */}
                  <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Depto.
                    </span>
                  </div>
                  {/* Status */}
                  <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Status
                    </span>
                  </div>
                  {/* Date */}
                  <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Criação
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Ações
                    </span>
                  </div>
                </div>

                {/* Rows */}
                {pagedJobs.map((job, idx) => {
                  const isSelected = selectedIds.has(job.id);
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_6rem_8rem_9rem_9rem] border-b border-zinc-200 transition-colors min-w-[44rem]",
                        isSelected
                          ? "bg-amber-50 border-l-2 border-l-develoi-gold"
                          : idx % 2 === 0
                          ? "bg-white hover:bg-zinc-50 border-l-2 border-l-transparent"
                          : "bg-zinc-50 hover:bg-zinc-100 border-l-2 border-l-transparent"
                      )}
                    >
                      {/* Checkbox cell */}
                      <div
                        className="flex items-center justify-center px-2 py-3 cursor-pointer"
                        onClick={() => toggleSelect(job.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(job.id)}
                        />
                      </div>

                      {/* Title + meta */}
                      <div
                        className="flex flex-col justify-center border-l border-zinc-200 px-3 py-3 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-sm font-bold text-zinc-900">
                            {job.title}
                          </span>
                          {job.is_public && (
                            <span title="Publicada no portal">
                              <Globe size={11} className="shrink-0 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate">
                          {[job.city, job.state].filter(Boolean).join(", ")}
                          {job.work_model ? ` · ${job.work_model}` : ""}
                          {job.candidates_count != null
                            ? ` · ${job.candidates_count} candidato(s)`
                            : ""}
                        </span>
                        {/* Mobile: status badge inline */}
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(job.status))} />
                          <span className="text-[11px] text-zinc-500">{job.status}</span>
                          {job.department && (
                            <span className="text-[11px] text-zinc-400">· {job.department}</span>
                          )}
                        </div>
                      </div>

                      {/* Department */}
                      <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                        <span className="truncate text-xs text-zinc-600">
                          {job.department || "—"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="hidden md:flex items-center border-l border-zinc-200 px-3 py-3">
                        <JobStatusBadge status={job.status} />
                      </div>

                      {/* Date */}
                      <div className="hidden md:flex flex-col justify-center border-l border-zinc-200 px-3 py-3">
                        <span className="text-xs text-zinc-600">
                          {fmtDate(job.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="hidden md:flex items-center gap-1 border-l border-zinc-200 px-2 py-3 relative" ref={openMenuId === job.id ? menuRef : null}>
                        <button
                          title="Ver detalhes"
                          onClick={() => navigate(`/vagas/${encodeId(job.id)}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-develoi-navy hover:bg-zinc-100 transition-colors"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          title="Editar"
                          onClick={() => navigate(`/vagas/${encodeId(job.id)}/editar`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-develoi-navy hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Mais ações"
                          onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-develoi-navy hover:bg-zinc-100 transition-colors"
                        >
                          <MoreHorizontal size={13} />
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === job.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1"
                          >
                            <button
                              onClick={() => { handleDuplicate(job); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                            >
                              <Copy size={13} className="text-zinc-400" />
                              Duplicar
                            </button>
                            <button
                              onClick={() => { togglePublication(job); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                            >
                              {job.is_public ? (
                                <GlobeLock size={13} className="text-zinc-400" />
                              ) : (
                                <Globe size={13} className="text-zinc-400" />
                              )}
                              {job.is_public ? "Remover do portal" : "Publicar no portal"}
                            </button>

                            {/* Status sub-options */}
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
                              <Trash2 size={13} />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Pagination footer ─────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Por página
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-develoi-navy/30"
                  >
                    {pageSizeOptions.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-zinc-400">
                    {sortedJobs.length} vaga(s)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronsLeft size={13} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  {pagePills().map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-zinc-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={cn(
                          "flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg border px-1.5 text-xs font-semibold transition-colors",
                          safePage === p
                            ? "border-develoi-navy bg-develoi-navy text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </PanelCard>
      </div>

      {/* ── Bulk action bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-xl shadow-black/10">
              <span className="text-sm font-bold text-zinc-700">
                {selectedIds.size} vaga{selectedIds.size !== 1 ? "s" : ""} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="h-5 w-px bg-zinc-200" />
              {deleteBulkConfirm ? (
                <>
                  <span className="text-sm text-rose-600 font-semibold">Confirmar exclusão?</span>
                  <button
                    onClick={confirmBulkDelete}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                  >
                    Sim, excluir
                  </button>
                  <button
                    onClick={() => setDeleteBulkConfirm(false)}
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setDeleteBulkConfirm(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 size={12} />
                    Excluir selecionadas
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Job details panel ─────────────────────────────────────────── */}
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

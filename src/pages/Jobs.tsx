import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  Button,
  ContentCard,
  EmptyState,
  PageWrapper,
  Pagination,
  PanelCard,
  SectionTitle,
  usePagination,
  useToast,
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { Job } from "@/src/types";
import {
  JobCard,
  JobDeleteModal,
  JobFiltersBar,
  JobsSummary,
} from "@/src/components/jobs";
import JobDetails from "./JobDetails";
import JobForm from "./JobForm";
import { cn } from "@/src/lib/utils";

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
  const isDetailsRoute = Boolean(detailsMatch) && !isEditRoute;
  const routeJobId = Number(editMatch?.params.jobId ?? detailsMatch?.params.jobId ?? 0) || null;

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

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar vagas.");
      }

      setJobs(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar vagas.");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.workModel, queryUnitId, tenantId, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchJob = useCallback(
    async (id: number) => {
      setSelectedJobLoading(true);
      try {
        const response = await fetch(`/api/jobs/${id}`);
        if (!response.ok) {
          throw new Error("Job not found");
        }

        const data = await response.json();
        setSelectedJob(data);
      } catch {
        toast.error("Erro ao carregar vaga.");
        navigate("/vagas", { replace: true });
      } finally {
        setSelectedJobLoading(false);
      }
    },
    [navigate, toast]
  );

  useEffect(() => {
    if (routeJobId) {
      fetchJob(routeJobId);
      return;
    }

    if (!isCreateRoute) {
      setSelectedJob(null);
    }
  }, [fetchJob, isCreateRoute, routeJobId]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Erro ao remover vaga.");
      }

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

      if (!response.ok) {
        throw new Error("Erro ao duplicar vaga.");
      }

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

      if (!response.ok) {
        throw new Error("Erro ao alterar status.");
      }

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

      if (!response.ok) {
        throw new Error("Erro ao alterar publicação.");
      }

      toast.success(job.is_public ? "Vaga removida do portal." : "Vaga publicada no portal.");
      fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar publicação.");
    }
  };

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("jobs_view_mode");
    return (saved as "grid" | "list") || "grid";
  });

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("jobs_view_mode", mode);
  };

  const resultsLabel = useMemo(() => {
    return `${currentUnit.name} · ${jobs.length} vagas encontradas`;
  }, [currentUnit.name, jobs.length]);

  const {
    page,
    pageSize,
    paginatedData: paginatedJobs,
    setPage,
    setPageSize,
  } = usePagination(jobs, viewMode === "grid" ? 9 : 12);

  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (selectedJobLoading || !selectedJob || Number(selectedJob.id) !== routeJobId)) {
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
        onBack={() => navigate(isEditRoute && routeJobId ? `/vagas/${routeJobId}` : "/vagas")}
        onSuccess={() => {
          navigate("/vagas");
          fetchJobs();
        }}
      />
    );
  }

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        <SectionTitle
          title="Gestão de Vagas"
          subtitle={resultsLabel}
          icon={<Briefcase size={22} />}
          className="mb-0"
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
          className="mt-12"
        />

        <PanelCard
          title="Oportunidades"
          description="Gerencie, publique, pause e revise as vagas da unidade com uma listagem padronizada."
          icon={Briefcase}
          className="overflow-visible"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-24">
              <Loader2 size={28} className="animate-spin text-develoi-navy" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Carregando vagas
              </p>
            </div>
          ) : jobs.length === 0 ? (
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
          ) : (
            <>
              <div
                className={cn(
                  "",
                  viewMode === "grid"
                    ? "grid gap-5 lg:grid-cols-2 2xl:grid-cols-3"
                    : "space-y-4"
                )}
              >
                {paginatedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant={viewMode}
                    onOpen={(item) => navigate(`/vagas/${item.id}`)}
                    onEdit={(item) => navigate(`/vagas/${item.id}/editar`)}
                    onDuplicate={handleDuplicate}
                    onTogglePublication={togglePublication}
                    onStatusChange={handleStatusChange}
                    onDeleteRequest={(item) => setJobToDelete(item)}
                  />
                ))}
              </div>

              <Pagination
                total={jobs.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </PanelCard>
      </div>


      <AnimatePresence>
        {isDetailsRoute && selectedJob && (
          <JobDetails
            job={selectedJob}
            onClose={() => navigate("/vagas")}
            onEdit={() => navigate(`/vagas/${selectedJob.id}/editar`)}
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

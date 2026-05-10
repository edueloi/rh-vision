import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Briefcase, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Share2, 
  Globe, 
  RefreshCcw,
  Building2,
  Calendar,
  Users,
  Layers
} from "lucide-react";
import { PanelCard, Pagination, useToast, Badge } from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Job } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import JobForm from "./JobForm";
import JobDetails from "./JobDetails";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMatch, useNavigate } from "react-router-dom";

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
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    workModel: ""
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        unitId: queryUnitId,
        tenantId,
        search: filters.search,
        status: filters.status,
      });
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      toast.error("Erro ao carregar vagas.");
    } finally {
      setLoading(false);
    }
  }, [filters, queryUnitId, tenantId, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchJob = useCallback(
    async (id: number) => {
      setSelectedJobLoading(true);
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) {
          throw new Error("Job not found");
        }

        const data = await res.json();
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
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      toast.success("Vaga removida com sucesso.");
      setShowDeleteModal(null);
      fetchJobs();
    } catch (err) {
      toast.error("Erro ao remover vaga.");
    }
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...job,
          title: `${job.title} (Cópia)`,
          id: undefined,
          created_at: undefined,
          is_public: false,
          status: 'Rascunho'
        })
      });
      if (res.ok) {
        toast.success("Vaga duplicada com sucesso.");
        fetchJobs();
      }
    } catch (err) {
      toast.error("Erro ao duplicar vaga.");
    }
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Status alterado para ${newStatus}`);
      fetchJobs();
    } catch (err) {
      toast.error("Erro ao alterar status.");
    }
  };

  const togglePublication = async (job: Job) => {
    try {
      await fetch(`/api/jobs/${job.id}/publication`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !job.is_public })
      });
      toast.success(job.is_public ? "Vaga removida do portal." : "Vaga publicada no portal!");
      fetchJobs();
    } catch (err) {
      toast.error("Erro ao alterar publicação.");
    }
  };

  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (selectedJobLoading || !selectedJob || Number(selectedJob.id) !== routeJobId)) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Carregando vaga...
          </p>
        </div>
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
    <div className="space-y-6">
      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Gestão de Vagas</h2>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
            {currentUnit.name} • {jobs.length} Vagas Encontradas
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchJobs}
            className="p-2.5 bg-white border border-zinc-200 text-zinc-500 rounded-2xl hover:bg-zinc-50 transition-all active:rotate-180"
          >
            <RefreshCcw size={16} />
          </button>
          
          <button 
            onClick={() => navigate("/vagas/importar")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-zinc-200 hover:border-zinc-900 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
          >
            <Layers size={16} /> Importar Vaga
          </button>

          <button 
            onClick={() => navigate("/vagas/nova")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-develoi-navy hover:bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-develoi-navy/10"
          >
            <Plus size={16} /> Nova Vaga
          </button>
        </div>
      </div>

      <PanelCard 
        padding={false}
        headerClassName="border-b border-zinc-100"
        title="Oportunidades"
        icon={Briefcase}
        action={
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Título ou cidade..." 
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-9 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-develoi-gold/20 w-48 transition-all"
              />
            </div>
            <select 
              className="px-3 py-2 bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-none"
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">Status: Todos</option>
              <option value="Aberta">Aberta</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Pausada">Pausada</option>
              <option value="Encerrada">Encerrada</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Vagas...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
              <Briefcase size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">Nenhuma vaga encontrada</p>
              <p className="text-xs text-zinc-400 font-bold mt-1 max-w-[240px]">Tente ajustar os filtros ou cadastre uma nova oportunidade para começar.</p>
            </div>
            <button 
              onClick={() => navigate("/vagas/nova")}
              className="px-6 py-2.5 bg-develoi-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-develoi-navy/10"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <motion.div 
                layout
                key={job.id} 
                className="group relative bg-white border border-zinc-100 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500 overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-develoi-navy/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-develoi-gold/10 transition-colors duration-500" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                      job.is_public 
                        ? "bg-develoi-gold/5 border-develoi-gold/10 text-develoi-gold group-hover:bg-develoi-gold group-hover:text-white" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-300 group-hover:border-develoi-navy group-hover:text-develoi-navy"
                    )}>
                      {job.is_public ? <Globe size={24} /> : <Briefcase size={24} />}
                    </div>
                    
                    <div className="flex gap-2">
                       <Badge color={
                        job.status === 'Aberta' ? 'success' :
                        job.status === 'Pausada' ? 'warning' :
                        job.status === 'Encerrada' ? 'danger' : 'default'
                      } size="sm">
                        {job.status}
                      </Badge>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === job.id ? null : job.id); }}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 hover:bg-zinc-100 transition-all",
                            activeMenu === job.id && "bg-develoi-navy text-white"
                          )}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        
                        <AnimatePresence>
                          {activeMenu === job.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-100 rounded-3xl shadow-2xl shadow-zinc-900/20 z-[100] overflow-hidden py-2"
                              >
                                <button onClick={() => { handleDuplicate(job); setActiveMenu(null); }} className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3">
                                  <Layers size={14} className="text-zinc-400" /> Duplicar
                                </button>
                                <button onClick={() => { togglePublication(job); setActiveMenu(null); }} className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3">
                                  <Globe size={14} className="text-zinc-400" /> {job.is_public ? 'Remover do Portal' : 'Publicar'}
                                </button>
                                <div className="h-px bg-zinc-100 my-1 mx-2" />
                                <button onClick={() => { setShowDeleteModal(job.id); setActiveMenu(null); }} className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-3">
                                  <Trash2 size={14} /> Excluir
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-base font-black text-zinc-900 group-hover:text-develoi-gold transition-colors line-clamp-1 mb-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <span>{job.department || "Geral"}</span>
                      <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                      <span>{job.city}/{job.state}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100/50">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Candidatos</p>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-develoi-navy" />
                        <span className="text-sm font-black text-zinc-900">0</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100/50">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Criada em</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-develoi-navy" />
                        <span className="text-sm font-black text-zinc-900">{new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/vagas/${job.id}`)}
                      className="flex-1 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
                    >
                      Gerenciar
                    </button>
                    <button 
                      onClick={() => navigate(`/vagas/${job.id}/editar`)}
                      className="p-3 bg-zinc-100 text-zinc-500 rounded-2xl hover:bg-zinc-200 transition-all active:scale-95"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <Pagination 
          total={jobs.length} 
          page={1} 
          pageSize={10} 
          onPageChange={() => {}} 
          onPageSizeChange={() => {}}
          className="border-t-0 rounded-b-3xl"
        />
      </PanelCard>

      <AnimatePresence>
        {isDetailsRoute && selectedJob && (
          <JobDetails 
            job={selectedJob} 
            onClose={() => navigate("/vagas")} 
            onEdit={() => navigate(`/vagas/${selectedJob.id}/editar`)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Excluir Vaga?</h2>
              <p className="text-sm text-zinc-500 font-medium mb-8">
                Esta ação não pode ser desfeita. Todos os dados vinculados a esta vaga serão permanentemente removidos.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 py-4 bg-zinc-50 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteModal)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

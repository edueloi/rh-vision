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
import { Job } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import JobForm from "./JobForm";
import JobDetails from "./JobDetails";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function Jobs() {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [importInitialData, setImportInitialData] = useState<Partial<Job> | null>(null);
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
        unitId: currentUnit.id,
        tenantId: 'fadel',
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
  }, [currentUnit, filters, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  if (view === 'create' || view === 'edit') {
    return (
      <JobForm 
        job={selectedJob} 
        initialData={importInitialData}
        onBack={() => { setView('list'); setSelectedJob(null); setImportInitialData(null); }}
        onSuccess={() => { setView('list'); setSelectedJob(null); setImportInitialData(null); fetchJobs(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Gestão de Vagas</h2>
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
            onClick={() => { setView('create'); setSelectedJob(null); setImportInitialData({ _importMode: true } as any); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-zinc-200 hover:border-zinc-900 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
          >
            <Layers size={16} /> Importar Vaga
          </button>

          <button 
            onClick={() => { setView('create'); setSelectedJob(null); setImportInitialData(null); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-fadel-navy hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-fadel-navy/10"
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
                className="pl-9 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400/20 w-48 transition-all"
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
            <div className="w-10 h-10 border-4 border-fadel-navy border-t-transparent rounded-full animate-spin"></div>
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
              onClick={() => setView('create')}
              className="px-6 py-2.5 bg-fadel-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-fadel-navy/10"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="px-6 py-4 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Oportunidade</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Status</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Candidatos</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {jobs.map((job) => (
                  <tr key={job.id} className="group hover:bg-zinc-50/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2",
                          job.is_public ? "bg-fadel-red/5 border-fadel-red/10 text-fadel-red" : "bg-zinc-50 border-zinc-100 text-zinc-300"
                        )}>
                          {job.is_public ? <Globe size={20} /> : <Briefcase size={20} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-black text-zinc-900 group-hover:text-fadel-red transition-colors truncate">{job.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{job.department || "Geral"}</span>
                            <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{job.city}/{job.state}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                             <div className="flex items-center gap-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                               <Calendar size={12} /> {new Date(job.created_at).toLocaleDateString('pt-BR')}
                             </div>
                             {job.is_public && (
                               <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                 <Globe size={11} /> Público
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <Badge color={
                          job.status === 'Aberta' ? 'success' :
                          job.status === 'Pausada' ? 'warning' :
                          job.status === 'Encerrada' ? 'danger' : 'default'
                        } size="sm">
                          {job.status}
                        </Badge>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                          {job.work_model} • {job.contract_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-zinc-900 leading-none">0</span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">Total</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setShowDetails(true); }}
                          title="Ver Detalhes"
                          className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-fadel-red hover:border-fadel-red/40 transition-all shadow-sm active:scale-95"
                        >
                          <Eye size={16} />
                        </button>
                         <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setView('edit'); }}
                          title="Editar"
                          className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm active:scale-95"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); togglePublication(job); }}
                          title={job.is_public ? "Remover do Portal" : "Publicar no Portal"}
                          className={cn(
                            "p-2.5 border rounded-xl transition-all shadow-sm active:scale-95",
                            job.is_public 
                              ? "bg-fadel-red border-fadel-red/20 text-white hover:bg-red-700" 
                              : "bg-white border-zinc-200 text-zinc-500 hover:text-fadel-red hover:border-fadel-red/40"
                          )}
                        >
                          <Globe size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowDeleteModal(job.id); }}
                          title="Excluir"
                          className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-red-600 hover:border-red-400 transition-all shadow-sm active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === job.id ? null : job.id); }}
                            className={cn(
                              "p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 transition-all shadow-sm active:scale-95",
                              activeMenu === job.id && "bg-zinc-900 text-white border-zinc-900"
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
                                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-100 rounded-3xl shadow-2xl shadow-zinc-900/20 z-[100] overflow-hidden py-3"
                                >
                                  <button 
                                    onClick={() => { handleDuplicate(job); setActiveMenu(null); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 transition-all"
                                  >
                                    <Layers size={14} className="text-zinc-400" /> Duplicar Vaga
                                  </button>
                                  <button 
                                    onClick={() => { handleStatusChange(job, 'Pausada'); setActiveMenu(null); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 transition-all"
                                  >
                                    <RefreshCcw size={14} className="text-zinc-400" /> Pausar Vaga
                                  </button>
                                  <button 
                                    onClick={() => { handleStatusChange(job, 'Encerrada'); setActiveMenu(null); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 transition-all"
                                  >
                                    <Trash2 size={14} className="text-zinc-400" /> Encerrar Vaga
                                  </button>
                                  <div className="h-px bg-zinc-100 my-1 mx-3" />
                                  <button 
                                    onClick={() => { toast.success("Link compartilhado"); setActiveMenu(null); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-all"
                                  >
                                    <Share2 size={14} /> Copiar Link Público
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        {showDetails && selectedJob && (
          <JobDetails 
            job={selectedJob} 
            onClose={() => { setShowDetails(false); setSelectedJob(null); }} 
            onEdit={() => { setShowDetails(false); setView('edit'); }}
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

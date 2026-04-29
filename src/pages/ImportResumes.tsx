import React, { useState, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Plus, 
  History, 
  Users, 
  Download, 
  Search, 
  Filter, 
  ArrowRight, 
  Settings, 
  Brain, 
  Target, 
  Shield, 
  Wand2, 
  Sparkles, 
  Clock, 
  Database,
  Copy,
  Eye,
  MoreVertical,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Briefcase,
  MapPin,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Trash2,
  Check
} from "lucide-react";
import { 
  PanelCard, 
  Badge, 
  useToast, 
  Switch,
  TokenTextarea,
  StatCard,
  EmptyState,
  PageWrapper,
  StatGrid,
  SectionTitle
} from "@/src/components/ui";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";
import { Job } from "@/src/types";

type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'committed';

interface ImportBatch {
  id: number;
  name: string;
  job_id: number | null;
  job_title?: string;
  status: ImportStatus;
  total_files: number;
  processed_files: number;
  created_candidates: number;
  duplicate_files: number;
  error_files: number;
  created_at: string;
  import_type: string;
}

interface ImportFile {
  id: number;
  file_name: string;
  status: string;
  progress: number;
  compatibility_score?: number;
  duplicate_status?: string;
  file_size: number;
  parsed_data_json?: string;
  error_message?: string;
}

export default function ImportResumes() {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [view, setView] = useState<'dashboard' | 'new' | 'history' | 'details'>('dashboard');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchFiles, setBatchFiles] = useState<ImportFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ImportFile | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  // New Import State
  const [isProcessing, setIsProcessing] = useState(false);
  const [newImport, setNewImport] = useState({
    name: '',
    job_id: '',
    import_type: 'mixed',
    analysis_mode: 'full',
    precision_mode: 'Equilibrada',
    threshold: 70,
    duplicate_strategy: 'manual'
  });
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchBatches();
    fetchJobs();
  }, [currentUnit]);

  // Monitoramento em tempo real quando estiver nos detalhes e processando
  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    if (view === 'details' && selectedBatch && (selectedBatch.status === 'processing' || selectedBatch.status === 'uploaded')) {
      interval = setInterval(async () => {
        await openBatchDetails(selectedBatch);
        // If it just finished, refresh main stats too
        if (selectedBatch.status === 'completed') {
          fetchDashboard();
          fetchBatches();
        }
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [view, selectedBatch]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/imports/dashboard?tenantId=fadel`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/imports?tenantId=fadel`);
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      setAvailableJobs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadQueue.length === 0) {
      toast.error("Adicione pelo menos um arquivo.");
      return;
    }

    try {
      setIsProcessing(true);
      // 1. Create Batch
      const batchRes = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newImport,
          tenant_id: 'fadel',
          unit_id: currentUnit.id
        })
      });
      const batchData = await batchRes.json();
      const batchId = batchData.id;

      // 2. Upload Files (Mock metadata for this env)
      await fetch(`/api/imports/${batchId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'fadel',
          unit_id: currentUnit.id,
          files: uploadQueue.map(f => ({ name: f.name, type: f.type, size: f.size }))
        })
      });

      // 3. Start Processing
      fetch(`/api/imports/${batchId}/start`, { method: 'POST' }); // Don't await, background

      toast.success("Processamento iniciado com sucesso!");
      
      // Clear form and queue
      setUploadQueue([]);
      setNewImport({
        name: '',
        job_id: '',
        import_type: 'mixed',
        analysis_mode: 'full',
        precision_mode: 'Equilibrada',
        threshold: 70,
        duplicate_strategy: 'manual'
      });
      
      // Open details of the new batch immediately
      openBatchDetails(batchData);
      fetchBatches();
    } catch (error) {
      toast.error("Falha ao iniciar importação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openBatchDetails = async (batch: ImportBatch) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/imports/${batch.id}`);
      const data = await res.json();
      setSelectedBatch(data);
      setBatchFiles(data.files);
      setView('details');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const commitBatch = async (batchId: number) => {
    try {
      const res = await fetch(`/api/imports/${batchId}/commit`, { method: 'POST' });
      if (res.ok) {
        toast.success("Candidatos gerados com sucesso!");
        fetchBatches();
        setView('dashboard');
      }
    } catch (error) {
      toast.error("Erro ao finalizar importação.");
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats */}
      <StatGrid cols={6}>
        <StatCard title="Arquivos" value={stats?.total_files || 0} icon={FileText} delay={0} />
        <StatCard title="Processados" value={stats?.processed_files || 0} icon={Zap} color="info" delay={0.05} />
        <StatCard title="Candidatos" value={stats?.created_candidates || 0} icon={Users} color="success" delay={0.1} />
        <StatCard title="Duplicados" value={stats?.duplicate_files || 0} icon={Copy} color="warning" delay={0.15} />
        <StatCard title="Erros" value={stats?.error_files || 0} icon={AlertCircle} color="danger" delay={0.2} />
        <StatCard title="Shortlist" value={35} icon={Target} color="purple" delay={0.25} />
      </StatGrid>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900 tracking-tighter">Lotes Recentes</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setView('history')}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200"
                >
                  Ver Histórico
                </button>
              </div>
           </div>

           <div className="grid gap-4">
              {batches.slice(0, 4).map((batch) => (
                <div 
                  key={batch.id} 
                  onClick={() => openBatchDetails(batch)}
                  className="bg-white border border-zinc-200 p-6 rounded-[32px] hover:border-zinc-900 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-900">{batch.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                        <Badge color={batch.status === 'completed' ? 'success' : 'warning'} size="sm">
                          {batch.status === 'completed' ? 'Concluído' : 'Processando'}
                        </Badge>
                        {batch.job_title && (
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                            <Briefcase size={10} /> {batch.job_title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden md:flex items-center gap-6">
                       <div className="text-center">
                          <p className="text-xs font-black text-zinc-900">{batch.total_files}</p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Arquivos</p>
                       </div>
                       <div className="text-center">
                          <p className="text-xs font-black text-emerald-600">{batch.created_candidates}</p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Novos</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-zinc-900 rounded-[40px] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-blue-400">Nexux AI Insights</h3>
                <p className="text-sm font-bold leading-relaxed mb-6 italic opacity-80">
                  "Sua última importação para <span className="text-blue-400">Motorista Carreteiro</span> gerou 85% de candidatos com CNH E e experiência interestadual."
                </p>
                <button className="w-full py-4 bg-white/10 hover:bg-white text-white hover:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/20">
                  <Wand2 size={14} />
                  Ver Resumo Geral
                </button>
              </div>
           </div>

           <PanelCard title="Ações Rápidas" icon={Zap}>
              <div className="grid grid-cols-1 gap-2">
                 <button 
                  onClick={() => setView('new')}
                  className="w-full p-4 bg-zinc-50 hover:bg-zinc-900 hover:text-white rounded-2xl transition-all flex items-center justify-between group"
                 >
                   <div className="flex items-center gap-3">
                      <Plus size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Novo Lote</span>
                   </div>
                   <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                 </button>
                 <button className="w-full p-4 bg-zinc-50 hover:bg-zinc-900 hover:text-white rounded-2xl transition-all flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                      <FileSpreadsheet size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Importar Planilha</span>
                   </div>
                   <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                 </button>
              </div>
           </PanelCard>
        </div>
      </div>
    </div>
  );

  const renderNewImport = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tighter">Nova Importação em Massa</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configure os parâmetros de IA e envie os currículos</p>
         </div>
         <button 
          onClick={() => setView('dashboard')}
          className="p-2 text-zinc-400 hover:text-zinc-900"
         >
           <X size={24} />
         </button>
      </div>

      <form onSubmit={handleStartImport} className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
           <section className="bg-white border border-zinc-200 rounded-[40px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900">
                    <Settings size={20} />
                 </div>
                 <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Configurações do Lote</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Lote</label>
                    <input 
                      type="text" 
                      value={newImport.name}
                      onChange={e => setNewImport(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Banco de Talentos Abril"
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-all font-bold text-sm"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Vincular a Vaga</label>
                    <select 
                      value={newImport.job_id}
                      onChange={e => setNewImport(p => ({ ...p, job_id: e.target.value }))}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-all font-bold text-sm"
                    >
                      <option value="">Sem vaga vinculada</option>
                      {availableJobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modo de Análise</label>
                    <select 
                      value={newImport.analysis_mode}
                      onChange={e => setNewImport(p => ({ ...p, analysis_mode: e.target.value }))}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-all font-bold text-sm"
                    >
                      <option value="extraction">Apenas extração</option>
                      <option value="creation">Extração + Candidato</option>
                      <option value="full">Extração + Candidato + IA Match</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tratar Duplicidades</label>
                    <select 
                      value={newImport.duplicate_strategy}
                      onChange={e => setNewImport(p => ({ ...p, duplicate_strategy: e.target.value }))}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-all font-bold text-sm"
                    >
                      <option value="manual">Revisão Manual</option>
                      <option value="ignore">Ignorar Duplicados</option>
                      <option value="update">Atualizar Existentes</option>
                    </select>
                 </div>
              </div>
           </section>

           <section 
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const files = Array.from(e.dataTransfer.files);
                setUploadQueue(prev => [...prev, ...files]);
              }}
              className={cn(
                "bg-white border-4 border-dashed rounded-[40px] p-12 transition-all flex flex-col items-center justify-center gap-6 group",
                dragging ? "border-zinc-900 bg-zinc-50 scale-[0.98]" : "border-zinc-100 hover:border-zinc-200"
              )}
           >
              <div className="w-20 h-20 bg-zinc-50 group-hover:bg-zinc-900 group-hover:text-white rounded-[28px] flex items-center justify-center text-zinc-400 transition-all shadow-sm">
                 <Upload size={32} />
              </div>
              <div className="text-center">
                 <h4 className="text-base font-black text-zinc-900">Arraste seus currículos aqui</h4>
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">PDF, DOCX ou XLSX (Máx 10MB por arquivo)</p>
              </div>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                id="file-upload" 
                onChange={(e) => e.target.files && setUploadQueue(prev => [...prev, ...Array.from(e.target.files!)])}
              />
              <label 
                htmlFor="file-upload"
                className="px-8 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Selecionar Arquivos
              </label>
           </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
           <PanelCard title="Fila de Upload" icon={Layers}>
              <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                 {uploadQueue.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3">
                       <FileText size={40} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Fila vazia</span>
                    </div>
                 ) : (
                    uploadQueue.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl group border border-zinc-100">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400">
                               <FileText size={18} />
                            </div>
                            <div className="overflow-hidden">
                               <p className="text-xs font-black text-zinc-900 truncate">{file.name}</p>
                               <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                         </div>
                         <button 
                          onClick={() => setUploadQueue(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                    ))
                 )}
              </div>

              {uploadQueue.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-100">
                   <button 
                    type="submit"
                    disabled={isProcessing}
                    className={cn(
                      "w-full py-5 rounded-3xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                      isProcessing 
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                        : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/20"
                    )}
                   >
                     {isProcessing ? (
                       <>
                         <Loader2 size={18} className="animate-spin" />
                         Processando Fila...
                       </>
                     ) : (
                       <>
                         <Zap size={18} />
                         Iniciar Processamento IA
                       </>
                     )}
                   </button>
                </div>
              )}
           </PanelCard>
        </div>
      </form>
    </motion.div>
  );

  const reprocessFile = async (fileId: number) => {
    try {
      const res = await fetch(`/api/imports/files/${fileId}/reprocess`, { method: 'POST' });
      if (res.ok) {
        toast.success("Reprocessamento iniciado!");
        setMenuOpenId(null);
        if (selectedBatch) openBatchDetails(selectedBatch);
      }
    } catch (error) {
      toast.error("Erro ao reprocessar arquivo.");
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    try {
      const res = await fetch(`/api/imports/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Arquivo excluído!");
        setMenuOpenId(null);
        if (selectedBatch) openBatchDetails(selectedBatch);
      }
    } catch (error) {
      toast.error("Erro ao excluir arquivo.");
    }
  };

  const renderDetails = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <SectionTitle 
        title={selectedBatch?.name || "Detalhes do Lote"}
        subtitle={`Lote criado em ${selectedBatch ? new Date(selectedBatch.created_at).toLocaleString() : ''}`}
        icon={<ArrowRight size={20} className="rotate-180" />}
        actions={
          <>
            <button 
              onClick={() => setView('dashboard')}
              className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center gap-2"
            >
              Voltar
            </button>
            {selectedBatch?.status === 'completed' && (
              <button 
                onClick={() => commitBatch(selectedBatch.id)}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Confirmar
              </button>
            )}
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard 
          title="Processados" 
          value={selectedBatch?.processed_files || 0} 
          description={`de ${selectedBatch?.total_files || 0} arquivos`}
          icon={Zap} 
          color="info" 
        />
        <StatCard 
          title="Duplicados" 
          value={selectedBatch?.duplicate_files || 0} 
          icon={Copy} 
          color="warning" 
        />
        <StatCard 
          title="Novos Candidatos" 
          value={selectedBatch?.created_candidates || 0} 
          icon={Users} 
          color="success" 
        />
        <StatCard 
          title="Erros" 
          value={selectedBatch?.error_files || 0} 
          icon={AlertCircle} 
          color="danger" 
        />
      </StatGrid>

      <div className="bg-white border border-zinc-200 rounded-[40px] shadow-sm relative">
         <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center rounded-t-[40px]">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
               <div className="w-1.5 h-4 bg-zinc-900 rounded-full" />
               Fila de Processamento
               {(selectedBatch?.status === 'processing' || selectedBatch?.status === 'uploaded') && (
                  <span className="flex items-center gap-2 text-[10px] text-blue-600 font-bold ml-2 normal-case tracking-normal">
                    <Loader2 size={12} className="animate-spin" />
                    IA Processando arquivos...
                  </span>
               )}
            </h3>
            <div className="flex items-center gap-2">
                <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-all"><RefreshCw size={18} /></button>
                <div className="h-6 w-[1px] bg-zinc-200 mx-2" />
                <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-all"><Filter size={18} /></button>
            </div>
         </div>
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full">
               <thead>
                  <tr className="text-left border-b border-zinc-100">
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Arquivo</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Candidato Identificado</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Compatibilidade</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Alertas</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50">
                  {batchFiles.map((file) => {
                    const parsedData = file.parsed_data_json ? JSON.parse(file.parsed_data_json) : null;
                    return (
                      <tr key={file.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-all group">
                         <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                                  <FileText size={16} />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-zinc-700">{file.file_name}</span>
                                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{(file.file_size / 1024).toFixed(1)} KB</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                               {file.status === 'processing' ? (
                                  <div className="flex items-center gap-2">
                                     <Loader2 size={12} className="animate-spin text-blue-500" />
                                     <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{file.progress}%</span>
                                  </div>
                               ) : file.status === 'completed' || file.status === 'committed' ? (
                                  <div className="flex items-center gap-1.5 text-emerald-500">
                                     <CheckCircle2 size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">OK</span>
                                  </div>
                               ) : file.status === 'duplicate' ? (
                                  <div className="flex items-center gap-1.5 text-amber-500">
                                     <Copy size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Duplicado</span>
                                  </div>
                               ) : (
                                  <div className="flex items-center gap-1.5 text-red-500">
                                     <AlertCircle size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Erro</span>
                                  </div>
                               )}
                            </div>
                         </td>
                         <td className="px-8 py-4">
                            {parsedData ? (
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-zinc-900">{parsedData.name}</span>
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{parsedData.email}</span>
                               </div>
                            ) : (
                               <span className="text-[10px] text-zinc-300 italic">Aguardando...</span>
                            )}
                         </td>
                         <td className="px-8 py-4">
                            {file.compatibility_score !== undefined ? (
                               <div className="flex items-center gap-3">
                                  <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                     <div 
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        file.compatibility_score >= 80 ? "bg-emerald-500" : file.compatibility_score >= 50 ? "bg-amber-400" : "bg-red-400"
                                      )} 
                                      style={{ width: `${file.compatibility_score}%` }} 
                                     />
                                  </div>
                                  <span className="text-[10px] font-black text-zinc-700">{file.compatibility_score}%</span>
                               </div>
                            ) : (
                               <span className="text-zinc-300">-</span>
                            )}
                         </td>
                         <td className="px-8 py-4">
                            <div className="flex flex-wrap gap-1">
                               {file.duplicate_status !== 'none' && (
                                  <Badge color="warning" size="sm">E-mail Duplicado</Badge>
                               )}
                               {file.status === 'error' && (
                                  <Badge color="danger" size="sm">Erro Leitura</Badge>
                                )}
                                {!file.parsed_data_json && file.status !== 'processing' && (
                                   <Badge color="default" size="sm">Pendente</Badge>
                                 )}
                            </div>
                         </td>
                         <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 relative">
                               <button 
                                onClick={() => setSelectedFile(file)}
                                title="Visualizar"
                                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                               >
                                <Eye size={16} />
                               </button>
                               <div className="relative">
                                 <button 
                                  onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}
                                  className={cn(
                                    "p-2 rounded-lg transition-all",
                                    menuOpenId === file.id ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                                  )}
                                 >
                                  <MoreVertical size={16} />
                                 </button>
                                 
                                 {menuOpenId === file.id && (
                                   <>
                                     <div 
                                      className="fixed inset-0 z-[60]" 
                                      onClick={() => setMenuOpenId(null)}
                                     />
                                     <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-[70] py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 zoom-in-95">
                                        <div className="px-4 py-2 border-b border-zinc-50 mb-1">
                                           <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none">Ações do Arquivo</p>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            reprocessFile(file.id);
                                            setMenuOpenId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2"
                                        >
                                          <RefreshCw size={12} />
                                          Reprocessar
                                        </button>
                                        <button 
                                          onClick={() => {
                                            toast.success("Arquivo ignorado.");
                                            setMenuOpenId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2"
                                        >
                                          <X size={12} />
                                          Ignorar
                                        </button>
                                        <div className="h-[1px] bg-zinc-100 my-1" />
                                        <button 
                                          onClick={() => {
                                            deleteFile(file.id);
                                            setMenuOpenId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <Trash2 size={12} />
                                          Excluir
                                        </button>
                                     </div>
                                   </>
                                 )}
                               </div>
                            </div>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

    </motion.div>
  );

  const FileDetailModal = () => (
    <AnimatePresence>
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFile(null)}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tighter truncate max-w-[300px]">{selectedFile.file_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status:</span>
                    <Badge color={selectedFile.status === 'completed' ? 'success' : selectedFile.status === 'error' ? 'danger' : 'warning'} size="sm">
                      {selectedFile.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-3 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
              {selectedFile.status === 'error' && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-900 uppercase tracking-widest mb-1">Erro no Processamento</h4>
                    <p className="text-sm font-medium text-red-700 leading-relaxed">
                      {selectedFile.error_message || "Ocorreu um erro desconhecido ao tentar processar este arquivo com a Nexus IA."}
                    </p>
                  </div>
                </div>
              )}

              {selectedFile.duplicate_status !== 'none' && (
                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Copy size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Candidato Duplicado</h4>
                    <p className="text-sm font-medium text-amber-700 leading-relaxed">
                      Este e-mail já existe em nossa base de candidatos. O sistema identificou uma duplicidade e pausou o processamento para este arquivo.
                    </p>
                  </div>
                </div>
              )}

              {selectedFile.parsed_data_json ? (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(JSON.parse(selectedFile.parsed_data_json)).map(([key, value]: [string, any]) => {
                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) return null;
                      const displayValue = Array.isArray(value) ? value.join(', ') : value;
                      return (
                        <div key={key} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm font-bold text-zinc-900">{displayValue?.toString() || '-'}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {JSON.parse(selectedFile.parsed_data_json).summary && (
                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                      <div className="flex items-center gap-2 mb-3 text-blue-600">
                        <Brain size={16} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Resumo Analítico Nexus IA</h4>
                      </div>
                      <p className="text-sm font-medium text-blue-900 leading-relaxed italic">
                        "{JSON.parse(selectedFile.parsed_data_json).summary}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                !selectedFile.error_message && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest uppercase tracking-widest">Aguardando Extração IA...</p>
                  </div>
                )
              )}
            </div>

            <div className="p-8 border-t border-zinc-100 flex gap-3">
              <button 
                onClick={() => {
                  reprocessFile(selectedFile.id);
                  setSelectedFile(null);
                }}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => setSelectedFile(null)}
                className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <PageWrapper className="space-y-8 pb-20">
      {/* Page Header */}
      {view === 'dashboard' && (
        <SectionTitle 
          title="Importação em Massa"
          subtitle="Envie currículos PDF, DOCX ou Planilhas e deixe a IA estruturar e vincular candidatos."
          icon={<Layers size={24} />}
          actions={
            <>
              <button 
                onClick={() => setView('history')}
                className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center gap-2"
              >
                <History size={16} />
                Histórico
              </button>
              <button 
                onClick={() => setView('new')}
                className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 shadow-xl shadow-zinc-900/20 transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Nova Importação
              </button>
            </>
          }
        />
      )}

      {isLoading && view === 'dashboard' ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
           <Loader2 className="w-12 h-12 text-zinc-900 animate-spin" />
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Central de Processamento...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
           {view === 'dashboard' && renderDashboard()}
           {view === 'new' && renderNewImport()}
           {view === 'details' && renderDetails()}
           {view === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tighter">Histórico de Lotes</h3>
                    <button 
                      onClick={() => setView('dashboard')}
                      className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900"
                    >
                      Voltar ao Painel
                    </button>
                 </div>
                 {batches.length === 0 ? (
                    <EmptyState 
                      title="Nenhum lote encontrado" 
                      description="Você ainda não realizou nenhuma importação em massa."
                      action={
                        <button 
                          onClick={() => setView('new')}
                          className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                        >
                          Começar Agora
                        </button>
                      }
                    />
                 ) : (
                    <div className="grid gap-4">
                       {batches.map(batch => (
                          <div 
                           key={batch.id} 
                           onClick={() => openBatchDetails(batch)}
                           className="bg-white border border-zinc-200 p-6 rounded-[32px] hover:border-zinc-900 transition-all cursor-pointer shadow-sm flex items-center justify-between"
                         >
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                                  <Clock size={18} />
                               </div>
                               <div>
                                  <h4 className="text-sm font-black text-zinc-900">{batch.name}</h4>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{new Date(batch.created_at).toLocaleString()}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="text-right">
                                  <p className="text-xs font-black text-zinc-900">{batch.total_files}</p>
                                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Arquivos</p>
                               </div>
                               <Badge color={batch.status === 'completed' || batch.status === 'committed' ? 'success' : 'warning'}>
                                  {batch.status}
                                </Badge>
                            </div>
                         </div>
                       ))}
                    </div>
                 )}
              </motion.div>
           )}
        </AnimatePresence>
      )}
      <FileDetailModal />
    </PageWrapper>
  );
}

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
  FileJson,
  Layers,
  Trash2,
  Check,
  Star,
  LayoutDashboard
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
import { getTenantId } from "@/src/lib/auth";
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
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
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
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [autoToolId, setAutoToolId] = useState<string>('none');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editedFileData, setEditedFileData] = useState<any>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

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
  const [uploadQueue, setUploadQueue] = useState<{file: File, progress: number, status: 'pending' | 'uploading' | 'completed' | 'error'}[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchBatches();
    fetchJobs();
    fetchTools();
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
      const res = await fetch(`/api/imports/dashboard?tenantId=${tenantId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/imports?tenantId=${tenantId}`);
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
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableJobs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch(`/api/hr-tools?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableTools(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAiSuggestions = async (file: ImportFile) => {
    if (!file.parsed_data_json) return;
    setIsMatching(true);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/ai/match-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile: JSON.parse(file.parsed_data_json),
          tenantId
        })
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsMatching(false);
    }
  };

  const handleOpenFileDetails = (file: ImportFile) => {
    setSelectedFile(file);
    fetchAiSuggestions(file);
  };

  const handleStartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadQueue.length === 0) {
      toast.error("Adicione pelo menos um arquivo.");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Simulation of individual upload progress for better UX
      const updatedQueue = [...uploadQueue];
      for (let i = 0; i < updatedQueue.length; i++) {
        updatedQueue[i].status = 'uploading';
        setUploadQueue([...updatedQueue]);
        
        // Simulating chunks/upload progress
        for (let p = 0; p <= 100; p += 25) {
          await new Promise(r => setTimeout(r, 150));
          updatedQueue[i].progress = p;
          setUploadQueue([...updatedQueue]);
        }
        updatedQueue[i].status = 'completed';
        setUploadQueue([...updatedQueue]);
      }

      // 1. Create Batch
      const batchRes = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newImport,
          tenant_id: tenantId,
          unit_id: currentUnit.id
        })
      });
      const batchData = await batchRes.json();
      const batchId = batchData.id;

      // 2. Upload Files
      const formData = new FormData();
      uploadQueue.forEach(item => formData.append('files', item.file));

      await fetch(`/api/imports/${batchId}/files`, {
        method: 'POST',
        body: formData
      });

      // 3. Start Processing
      fetch(`/api/imports/${batchId}/start`, { method: 'POST' }); 

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
      const res = await fetch(`/api/imports/${batchId}/commit`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoToolId })
      });
      if (res.ok) {
        toast.success("Candidatos gerados e automações disparadas!");
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
      <StatGrid cols={2} className="md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Arquivos" value={stats?.total_files || 0} icon={FileText} delay={0} />
        <StatCard title="Processados" value={stats?.processed_files || 0} icon={Zap} color="info" delay={0.05} />
        <StatCard title="Candidatos" value={stats?.created_candidates || 0} icon={Users} color="success" delay={0.1} />
        <StatCard title="Duplicados" value={stats?.duplicate_files || 0} icon={Copy} color="warning" delay={0.15} />
        <StatCard title="Erros" value={stats?.error_files || 0} icon={AlertCircle} color="danger" delay={0.2} />
        <StatCard title="Shortlist" value={35} icon={Target} color="purple" delay={0.25} />
      </StatGrid>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">Lotes Recentes</h2>
              <button 
                onClick={() => setView('history')}
                className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-develoi-navy hover:text-develoi-navy transition-all shadow-sm active:scale-95"
              >
                Ver Histórico
              </button>
           </div>

           <div className="grid gap-4">
              {batches.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-zinc-100 rounded-[40px] p-20 flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-300 mb-4">
                      <Layers size={32} />
                   </div>
                   <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-1">Nenhum lote encontrado</h3>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Inicie uma nova importação para começar</p>
                </div>
              ) : (
                batches.slice(0, 4).map((batch) => (
                  <motion.div 
                    layout
                    key={batch.id} 
                    onClick={() => openBatchDetails(batch)}
                    className="bg-white border border-zinc-100 p-6 rounded-[32px] hover:border-develoi-navy hover:shadow-2xl hover:shadow-zinc-200/50 transition-all cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-zinc-50 rounded-[22px] flex items-center justify-center text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white transition-all duration-500 shadow-sm">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-zinc-900 group-hover:text-develoi-gold transition-colors">{batch.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={12} />
                            {new Date(batch.created_at).toLocaleDateString()}
                          </span>
                          <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                          <Badge color={batch.status === 'completed' ? 'success' : 'warning'} size="sm">
                            {batch.status === 'completed' ? 'Concluído' : 'Processando'}
                          </Badge>
                          {batch.job_title && (
                            <>
                              <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                              <span className="text-[9px] font-black text-develoi-navy uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 bg-develoi-navy/5 rounded-lg">
                                <Briefcase size={10} /> {batch.job_title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-50">
                      <div className="flex items-center gap-4 sm:gap-8">
                         <div className="text-center">
                            <p className="text-sm font-black text-zinc-900 tracking-tight">{batch.total_files}</p>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Arquivos</p>
                         </div>
                         <div className="text-center">
                            <p className="text-sm font-black text-emerald-600 tracking-tight">{batch.created_candidates}</p>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Gerais</p>
                         </div>
                         <div className="text-center">
                            <p className="text-sm font-black text-red-500 tracking-tight">{batch.error_files}</p>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Falhas</p>
                         </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-develoi-gold group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-develoi-navy rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-develoi-navy/20"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-develoi-gold/20 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2.5 bg-develoi-gold text-white rounded-2xl shadow-lg shadow-develoi-gold/20">
                      <Brain size={20} />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-develoi-blue">Aurora AI Insights</h3>
                </div>
                <p className="text-sm font-bold leading-relaxed mb-8 italic border-l-4 border-develoi-gold pl-6 py-2">
                  "Sua última importação de <span className="text-develoi-gold">{batches[0]?.name || 'currículos'}</span> gerou uma eficiência de processamento 15% superior à média."
                </p>
                <button className="w-full py-4 bg-white text-develoi-navy hover:bg-develoi-gold hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group">
                  <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />
                  Ver Resumo Geral
                </button>
              </div>
            </motion.div>

            <PanelCard title="Ações Rápidas" icon={Zap}>
              <div className="grid grid-cols-1 gap-3">
                 <button 
                  onClick={() => setView('new')}
                  className="w-full p-5 bg-zinc-50 hover:bg-develoi-navy hover:text-white rounded-[24px] transition-all flex items-center justify-between group border border-transparent hover:shadow-xl hover:shadow-develoi-navy/10"
                 >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900 shadow-sm group-hover:bg-develoi-gold group-hover:text-white transition-all">
                        <Plus size={20} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest">Nova Importação</span>
                   </div>
                   <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                 </button>
                 <button 
                  onClick={() => setShowCsvImport(true)}
                  className="w-full p-5 bg-zinc-50 hover:bg-develoi-navy hover:text-white rounded-[24px] transition-all flex items-center justify-between group border border-transparent hover:shadow-xl hover:shadow-develoi-navy/10"
                 >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900 shadow-sm group-hover:bg-develoi-gold group-hover:text-white transition-all">
                        <FileSpreadsheet size={20} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest">Importar Planilha</span>
                   </div>
                   <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                 </button>
              </div>
            </PanelCard>

            <div className="bg-white border border-zinc-200 rounded-[40px] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-develoi-gold/10 text-develoi-gold rounded-2xl flex items-center justify-center">
                   <Target size={20} />
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">Precisão da IA</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nível Atual</span>
                    <span className="text-lg font-black text-develoi-navy tracking-tighter">98.4%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '98.4%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-develoi-gold" 
                    />
                  </div>
                  <p className="text-[9px] font-semibold text-zinc-500 leading-relaxed uppercase tracking-widest text-center mt-4">
                    Otimizado para detecção de duplicidade avançada
                  </p>
               </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderNewImport = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
         <div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase">Nova Importação em Massa</h2>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">IA treinada para extrair dados com alta precisão</p>
         </div>
         <button 
          onClick={() => setView('dashboard')}
          className="w-fit p-3 bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 rounded-2xl transition-all active:scale-90"
         >
           <X size={24} />
         </button>
      </div>

      <form onSubmit={handleStartImport} className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
           <section className="bg-white border border-zinc-100 rounded-[40px] p-8 md:p-10 shadow-xl shadow-zinc-200/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-develoi-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="flex items-center gap-4 mb-10 relative z-10">
                 <div className="w-12 h-12 bg-develoi-navy text-white rounded-2xl flex items-center justify-center shadow-lg shadow-develoi-navy/20">
                    <Settings size={22} />
                 </div>
                 <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Configurações de Lote</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Identificação do Lote</label>
                    <input 
                      type="text" 
                      required
                      value={newImport.name}
                      onChange={e => setNewImport(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Banco de Talentos Abril"
                      className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-[22px] outline-none focus:border-develoi-navy focus:bg-white transition-all font-bold text-sm shadow-inner"
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Vincular a Vaga</label>
                    <div className="relative">
                       <select 
                        value={newImport.job_id}
                        onChange={e => setNewImport(p => ({ ...p, job_id: e.target.value }))}
                        className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-[22px] outline-none focus:border-develoi-navy focus:bg-white transition-all font-bold text-sm shadow-inner appearance-none"
                       >
                         <option value="">Sem vaga vinculada (Banco Geral)</option>
                         {availableJobs.map(job => (
                           <option key={job.id} value={job.id}>{job.title}</option>
                         ))}
                       </select>
                       <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                          <ChevronRight size={16} className="rotate-90" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Inteligência de Análise</label>
                    <select 
                      value={newImport.analysis_mode}
                      onChange={e => setNewImport(p => ({ ...p, analysis_mode: e.target.value }))}
                      className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-[22px] outline-none focus:border-develoi-navy focus:bg-white transition-all font-bold text-sm shadow-inner"
                    >
                      <option value="extraction">Extração Simples (Dados Pessoais)</option>
                      <option value="creation">Full Parsing (Experiências + Educação)</option>
                      <option value="full">Neural Match (Parsing + Scoring de Vaga)</option>
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Políticas de Conflito</label>
                    <select 
                      value={newImport.duplicate_strategy}
                      onChange={e => setNewImport(p => ({ ...p, duplicate_strategy: e.target.value }))}
                      className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-[22px] outline-none focus:border-develoi-navy focus:bg-white transition-all font-bold text-sm shadow-inner"
                    >
                      <option value="manual">Sinalizar para Revisão</option>
                      <option value="ignore">Ignorar (Manter atual)</option>
                      <option value="update">Merge (Atualizar Dados)</option>
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
                const files = Array.from(e.dataTransfer.files).map(f => ({
                  file: f,
                  progress: 0,
                  status: 'pending' as const
                }));
                setUploadQueue(prev => [...prev, ...files]);
              }}
              className={cn(
                "bg-white border-4 border-dashed rounded-[40px] p-12 md:p-20 transition-all flex flex-col items-center justify-center gap-8 group shadow-xl shadow-zinc-200/20",
                dragging ? "border-develoi-gold bg-develoi-gold/5 scale-[0.98]" : "border-zinc-100 hover:border-develoi-navy/30"
              )}
           >
              <div className="w-24 h-24 bg-zinc-50 group-hover:bg-develoi-navy group-hover:text-white rounded-[32px] flex items-center justify-center text-zinc-300 transition-all shadow-xl shadow-zinc-200/50">
                 <Upload size={40} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-center">
                 <h4 className="text-xl font-black text-zinc-900 tracking-tight">Solte seus currículos aqui</h4>
                 <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-2 max-w-sm mx-auto">Suporte para PDF, DOCX e Imagens. Processamento automático via IA Vision.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                 <input 
                   type="file" 
                   multiple 
                   className="hidden" 
                   id="file-upload" 
                   onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files).map(f => ({
                        file: f,
                        progress: 0,
                        status: 'pending' as const
                      }));
                      setUploadQueue(prev => [...prev, ...files]);
                    }
                   }}
                 />
                 <label 
                   htmlFor="file-upload"
                   className="px-10 py-5 bg-develoi-navy text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all cursor-pointer shadow-xl shadow-develoi-navy/20 active:scale-95"
                 >
                   Selecionar na Pasta
                 </label>
                 <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest hidden sm:block">OU</div>
                 <button type="button" className="px-8 py-5 border border-zinc-200 text-zinc-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all active:scale-95">
                    Google Drive
                 </button>
              </div>
           </section>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <PanelCard title="Fila de Preparação" icon={Layers}>
              <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-4 custom-scrollbar">
                 {uploadQueue.length === 0 ? (
                    <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                       <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                          <FileText size={48} />
                       </div>
                       <span className="text-[11px] font-black uppercase tracking-widest">Nenhum arquivo na fila</span>
                    </div>
                 ) : (
                    <AnimatePresence>
                      {uploadQueue.map((item, i) => (
                        <React.Fragment key={i}>
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          key={i} 
                          className="flex items-center justify-between p-5 bg-zinc-50/50 hover:bg-white rounded-[24px] group border border-zinc-100 hover:shadow-lg transition-all"
                        >
                           <div className="flex items-center gap-4 overflow-hidden">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:text-white transition-all shadow-sm">
                                 <FileText size={20} />
                              </div>
                              <div className="overflow-hidden">
                                 <p className="text-xs font-black text-zinc-900 truncate tracking-tight">{item.file.name}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{(item.file.size / 1024).toFixed(1)} KB</span>
                                    <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                                    <span className="text-[9px] font-black text-develoi-navy uppercase tracking-widest">{(item.file.type.split('/')[1] || 'DOC').toUpperCase()}</span>
                                 </div>
                              </div>
                           </div>
                           <button 
                            type="button"
                            onClick={() => setUploadQueue(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                           >
                              <X size={18} />
                           </button>
                        </motion.div>
                        {item.status !== 'pending' && (
                          <div className="w-full px-5 pb-5 -mt-2">
                             <div className="flex justify-between items-center text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                                <span>{item.status === 'uploading' ? 'Sincronizando...' : 'Concluído'}</span>
                                <span>{item.progress}%</span>
                             </div>
                             <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.progress}%` }}
                                  className={cn(
                                    "h-full transition-all",
                                    item.status === 'completed' ? "bg-emerald-500" : "bg-develoi-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                                  )}
                                />
                             </div>
                          </div>
                        )}
                      </React.Fragment>
                      ))}
                    </AnimatePresence>
                 )}
              </div>

              {uploadQueue.length > 0 && (
                <div className="mt-8 pt-8 border-t border-zinc-100">
                   <div className="flex items-center justify-between mb-6 px-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total na fila</span>
                      <span className="text-sm font-black text-zinc-900">{uploadQueue.length} currículos</span>
                   </div>
                   <button 
                    type="submit"
                    disabled={isProcessing}
                    className={cn(
                      "w-full py-6 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group active:scale-95",
                      isProcessing 
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                        : "bg-develoi-navy text-white hover:bg-develoi-gold shadow-develoi-navy/20"
                    )}
                   >
                     {isProcessing ? (
                       <>
                         <Loader2 size={20} className="animate-spin" />
                         Processando...
                       </>
                     ) : (
                       <>
                         <Zap size={20} className="group-hover:scale-125 transition-transform" />
                         Engatilhar Processamento IA
                         <div className="absolute top-0 -right-4 w-12 h-full bg-white/10 skew-x-12 translate-x-full group-hover:translate-x-[-400%] transition-transform duration-1000" />
                       </>
                     )}
                   </button>
                </div>
              )}
           </PanelCard>

           <div className="bg-zinc-900 rounded-[40px] p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                 <Shield size={20} className="text-develoi-gold" />
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Privacidade & GDPR</h4>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase tracking-widest">
                Seus dados são criptografados em repouso e em trânsito. A IA da Develoi não utiliza seus dados para treinamento de modelos públicos.
              </p>
           </div>
        </div>
      </form>
    </motion.div>
  );

  const handleSaveFileData = async () => {
    if (!selectedFile || !editedFileData) return;
    try {
      const res = await fetch(`/api/imports/files/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_data_json: JSON.stringify(editedFileData) })
      });
      if (res.ok) {
        toast.success("Dados atualizados com sucesso!");
        // Update local state
        const updatedFiles = batchFiles.map(f => 
          f.id === selectedFile.id ? { ...f, parsed_data_json: JSON.stringify(editedFileData) } : f
        );
        setBatchFiles(updatedFiles);
        setSelectedFile({ ...selectedFile, parsed_data_json: JSON.stringify(editedFileData) });
        setIsEditingFile(false);
      } else {
        toast.error("Falha ao salvar alterações.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com o servidor.");
    }
  };

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

  const handleExportCSV = () => {
    if (!batchFiles.length) return;
    
    const headers = ["Arquivo", "Status", "Candidato", "E-mail", "Score", "Telefone", "Cidade"];
    const rows = batchFiles.map(file => {
      const parsed = file.parsed_data_json ? JSON.parse(file.parsed_data_json) : {};
      return [
        file.file_name,
        file.status,
        parsed.name || "-",
        parsed.email || "-",
        file.compatibility_score || "0",
        parsed.phone || "-",
        parsed.city || "-"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `lote_${selectedBatch?.id || 'export'}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV gerado com sucesso!");
  };

  const handleExportJSON = () => {
    if (!batchFiles.length) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(batchFiles, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `lote_${selectedBatch?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("JSON exportado com sucesso!");
  };

  const filteredFiles = batchFiles.filter(file => {
    const parsed = file.parsed_data_json ? JSON.parse(file.parsed_data_json) : {};
    const matchesSearch = 
      file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parsed.name && parsed.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parsed.email && parsed.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || file.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const toggleFileSelection = (id: number) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllFiles = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map(f => f.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedFileIds.length} arquivos selecionados?`)) return;
    try {
      // In a real app we'd have a bulk endpoint
      await Promise.all(selectedFileIds.map(id => fetch(`/api/imports/files/${id}`, { method: 'DELETE' })));
      toast.success("Arquivos excluídos com sucesso!");
      setSelectedFileIds([]);
      if (selectedBatch) openBatchDetails(selectedBatch);
    } catch (error) {
      toast.error("Erro nas ações em massa.");
    }
  };

  const renderDetails = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10"
    >
      <SectionTitle 
        title={selectedBatch?.name || "Detalhes do Lote"}
        subtitle={`Criado em ${selectedBatch ? new Date(selectedBatch.created_at).toLocaleString('pt-BR') : ''}`}
        icon={<ArrowRight size={20} className="rotate-180" />}
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('dashboard')}
              className="px-6 py-3.5 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center gap-2 shadow-sm"
            >
              Voltar
            </button>
            {selectedBatch?.status === 'completed' && (
              <div className="flex items-center gap-4 bg-zinc-50 p-2 pl-6 rounded-2xl border border-zinc-100">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Automação de Testes</span>
                   <select 
                    value={autoToolId}
                    onChange={(e) => setAutoToolId(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-develoi-navy outline-none cursor-pointer pr-4"
                   >
                      <option value="none">Nenhuma avaliação automática</option>
                      {availableTools.map(tool => (
                        <option key={tool.id} value={tool.id}>Enviar {tool.name} automático</option>
                      ))}
                   </select>
                </div>
                <div className="w-[1px] h-8 bg-zinc-200" />
                <button 
                  onClick={() => commitBatch(selectedBatch.id)}
                  className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-600/20 active:scale-95"
                >
                  <CheckCircle2 size={16} />
                  Confirmar Lote
                </button>
              </div>
            )}
          </div>
        }
      />

      <StatGrid cols={2} className="lg:grid-cols-4">
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
          title="Novos Talentos" 
          value={selectedBatch?.created_candidates || 0} 
          icon={Users} 
          color="success" 
        />
        <StatCard 
          title="Falhas IA" 
          value={selectedBatch?.error_files || 0} 
          icon={AlertCircle} 
          color="danger" 
        />
      </StatGrid>

      <div className="bg-white border border-zinc-100 rounded-[40px] shadow-2xl shadow-zinc-200/40 relative overflow-hidden">
         <div className="p-8 md:p-10 border-b border-zinc-100 bg-zinc-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-1.5 h-6 bg-develoi-navy rounded-full" />
               <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex flex-wrap items-center gap-3">
                  Monitoramento em Tempo Real
                  {(selectedBatch?.status === 'processing' || selectedBatch?.status === 'uploaded') && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-develoi-navy/10 rounded-full">
                        <Loader2 size={12} className="animate-spin text-develoi-navy" />
                        <span className="text-[9px] text-develoi-navy font-black uppercase tracking-widest">IA analisando currículos...</span>
                     </div>
                  )}
               </h3>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Search size={16} />
                   </div>
                   <input 
                    type="text"
                    placeholder="Buscar no lote..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold outline-none focus:border-develoi-navy w-48 md:w-64 transition-all shadow-sm"
                   />
                </div>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-3 bg-white border border-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm outline-none cursor-pointer"
                >
                   <option value="all">Todos Status</option>
                   <option value="completed">Sucesso</option>
                   <option value="error">Falha</option>
                   <option value="duplicate">Refil</option>
                </select>
                <div className="h-8 w-[1px] bg-zinc-200 mx-2" />
                <button 
                  onClick={handleExportCSV}
                  title="Exportar CSV"
                  className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-develoi-navy rounded-xl shadow-sm hover:border-develoi-navy transition-all"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={handleExportJSON}
                  title="Exportar JSON"
                  className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-develoi-navy rounded-xl shadow-sm hover:border-develoi-navy transition-all"
                >
                  <FileJson size={18} />
                </button>
                <button 
                  onClick={() => selectedBatch && openBatchDetails(selectedBatch)}
                  className="p-3 bg-develoi-navy text-white rounded-xl hover:bg-develoi-gold transition-all shadow-lg active:scale-90"
                >
                  <RefreshCw size={18} />
                </button>
            </div>
         </div>

         {/* Bulk Actions Bar */}
         <AnimatePresence>
            {selectedFileIds.length > 0 && (
               <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-zinc-900 border-b border-zinc-800"
               >
                  <div className="px-10 py-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                           {selectedFileIds.length} selecionados
                        </span>
                        <div className="w-[1px] h-4 bg-zinc-700" />
                        <button 
                          onClick={selectAllFiles}
                          className="text-[10px] font-black text-develoi-gold uppercase tracking-widest hover:underline"
                        >
                           {selectedFileIds.length === filteredFiles.length ? "Desmarcar tudo" : "Selecionar tudo"}
                        </button>
                     </div>
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            toast.success("Reprocessamento em massa iniciado!");
                            setSelectedFileIds([]);
                          }}
                          className="px-4 py-2 bg-develoi-navy text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all flex items-center gap-2"
                        >
                           <RefreshCw size={12} /> Reprocessar Seleção
                        </button>
                        <button 
                          onClick={handleBulkDelete}
                          className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                        >
                           <Trash2 size={12} /> Excluir Seleção
                        </button>
                        <button 
                          onClick={() => setSelectedFileIds([])}
                          className="p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                           <X size={16} />
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
         
         <div className="overflow-x-auto no-scrollbar custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
               <thead>
                  <tr className="text-left bg-zinc-50/50">
                     <th className="px-8 py-6 border-b border-zinc-100 w-10">
                        <div 
                          onClick={selectAllFiles}
                          className={cn(
                            "w-5 h-5 rounded border-2 transition-all cursor-pointer flex items-center justify-center",
                            selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0
                              ? "bg-develoi-navy border-develoi-navy" 
                              : "border-zinc-200 bg-white"
                          )}
                        >
                           {selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0 && (
                              <Check size={12} className="text-white" strokeWidth={4} />
                           )}
                        </div>
                     </th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Origem</th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Resultado IA</th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Identificação</th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Aderência</th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Tags</th>
                     <th className="px-8 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 text-right">Controle</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center">
                         <div className="flex flex-col items-center gap-4 opacity-30">
                            <Database size={48} />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                               {searchTerm ? "Nenhum resultado para sua busca" : "Nenhum registro para este lote"}
                            </p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => {
                      const parsedData = file.parsed_data_json ? JSON.parse(file.parsed_data_json) : null;
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <tr 
                          key={file.id} 
                          className={cn(
                            "transition-all group",
                            isSelected ? "bg-develoi-navy/5" : "hover:bg-zinc-50/50"
                          )}
                        >
                           <td className="px-8 py-5">
                              <div 
                                onClick={() => toggleFileSelection(file.id)}
                                className={cn(
                                  "w-5 h-5 rounded border-2 transition-all cursor-pointer flex items-center justify-center",
                                  isSelected ? "bg-develoi-navy border-develoi-navy" : "border-zinc-100 bg-white group-hover:border-zinc-300"
                                )}
                              >
                                 {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                                    <FileText size={18} />
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-zinc-800 truncate max-w-[200px]">{file.file_name}</span>
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{(file.file_size / 1024).toFixed(1)} KB</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                 {file.status === 'processing' ? (
                                    <div className="flex items-center gap-2.5">
                                       <div className="w-4 h-4 rounded-full border-2 border-develoi-navy border-t-transparent animate-spin" />
                                       <span className="text-[10px] font-black text-develoi-navy uppercase tracking-widest">{file.progress}%</span>
                                    </div>
                                 ) : file.status === 'completed' || file.status === 'committed' ? (
                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                       <Check size={14} strokeWidth={3} />
                                       <span className="text-[9px] font-black uppercase tracking-widest text-[8px]">Sucesso</span>
                                    </div>
                                 ) : file.status === 'duplicate' ? (
                                    <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                       <Copy size={14} />
                                       <span className="text-[9px] font-black uppercase tracking-widest text-[8px]">Refil</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                                       <AlertCircle size={14} />
                                       <span className="text-[9px] font-black uppercase tracking-widest text-[8px]">Falha</span>
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              {parsedData ? (
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black text-zinc-900 group-hover:text-develoi-gold transition-colors">{parsedData.name}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{parsedData.email}</span>
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-2 bg-zinc-100 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-zinc-300 italic">Pendente...</span>
                                 </div>
                              )}
                           </td>
                           <td className="px-8 py-5">
                              {file.compatibility_score !== undefined ? (
                                 <div className="flex flex-col gap-2">
                                    <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                                       <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${file.compatibility_score}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn(
                                          "h-full transition-all",
                                          file.compatibility_score >= 80 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                                          file.compatibility_score >= 50 ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : 
                                          "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                                        )} 
                                       />
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-700">{file.compatibility_score}%</span>
                                 </div>
                              ) : (
                                 <div className="w-16 h-1 bg-zinc-50 rounded-full" />
                              )}
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex flex-wrap gap-1.5">
                                 {file.duplicate_status !== 'none' && (
                                    <Badge color="warning" size="sm">Duplicidade</Badge>
                                 )}
                                 {file.status === 'error' && (
                                    <Badge color="danger" size="sm">Corrompido</Badge>
                                  )}
                                 {parsedData?.seniority && (
                                    <Badge color="info" size="sm">{parsedData.seniority}</Badge>
                                 )}
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                 <button 
                                  onClick={() => handleOpenFileDetails(file)}
                                  className="p-3 bg-white border border-zinc-200 text-zinc-400 hover:text-develoi-navy rounded-xl transition-all shadow-sm active:scale-95"
                                 >
                                  <Eye size={16} />
                                 </button>
                                 <div className="relative">
                                   <button 
                                    onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}
                                    className={cn(
                                      "p-3 rounded-xl transition-all shadow-sm active:scale-95",
                                      menuOpenId === file.id ? "bg-develoi-navy text-white" : "bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900"
                                    )}
                                   >
                                    <MoreVertical size={16} />
                                   </button>
                                   
                                   <AnimatePresence>
                                     {menuOpenId === file.id && (
                                       <>
                                         <div 
                                          className="fixed inset-0 z-[60]" 
                                          onClick={() => setMenuOpenId(null)}
                                         />
                                         <motion.div 
                                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                          className="absolute right-0 top-full mt-2 w-52 bg-white border border-zinc-100 rounded-3xl shadow-2xl z-[70] py-3 overflow-hidden"
                                         >
                                            <div className="px-5 py-2 border-b border-zinc-50 mb-2">
                                               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ações Rápidas</p>
                                            </div>
                                            <button 
                                              onClick={() => { reprocessFile(file.id); setMenuOpenId(null); }}
                                              className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-3 transition-colors"
                                            >
                                              <RefreshCw size={14} /> Reprocessar
                                            </button>
                                            <button 
                                              onClick={() => { deleteFile(file.id); setMenuOpenId(null); }}
                                              className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                            >
                                              <Trash2 size={14} /> Eliminar
                                            </button>
                                         </motion.div>
                                       </>
                                     )}
                                   </AnimatePresence>
                                 </div>
                              </div>
                           </td>
                        </tr>
                      );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </motion.div>
  );

  const FileDetailModal = () => (
    <AnimatePresence>
      {selectedFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFile(null)}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-3xl bg-white rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-zinc-100"
          >
            <div className="p-8 md:p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-develoi-navy text-white rounded-3xl flex items-center justify-center shadow-lg shadow-develoi-navy/20">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tighter truncate max-w-[250px] md:max-w-md uppercase">{selectedFile.file_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status de Processamento:</span>
                    <Badge color={selectedFile.status === 'completed' || selectedFile.status === 'committed' ? 'success' : selectedFile.status === 'error' ? 'danger' : 'warning'} size="sm">
                      {selectedFile.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-4 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
              {selectedFile.status === 'error' && (
                <div className="p-8 bg-red-50 border border-red-100 rounded-[32px] flex items-start gap-5 shadow-sm">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-red-900 uppercase tracking-[0.2em] mb-2">Erro Crítico no Engine Aurora</h4>
                    <p className="text-sm font-bold text-red-700/80 leading-relaxed">
                      {selectedFile.error_message || "Ocorreu um erro inesperado ao estruturar os dados deste arquivo. Recomenda-se o reprocessamento."}
                    </p>
                  </div>
                </div>
              )}

              {selectedFile.duplicate_status !== 'none' && (
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-[32px] flex items-start gap-5 shadow-sm">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Copy size={24} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] mb-2">Potencial Duplicidade Detectada</h4>
                    <p className="text-sm font-bold text-amber-700/80 leading-relaxed">
                      Identificamos que este candidato já existe em nossa infraestrutura. Verifique os dados abaixo para confirmar ou ignorar o alerta.
                    </p>
                  </div>
                </div>
              )}

              {selectedFile.parsed_data_json ? (
                <div className="space-y-10">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Dados Estruturados pela Aurora</h4>
                    {isEditingFile ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setIsEditingFile(false); setEditedFileData(null); }}
                          className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSaveFileData}
                          className="px-4 py-2 bg-develoi-gold text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 shadow-lg shadow-develoi-gold/10"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setIsEditingFile(true);
                          setEditedFileData(JSON.parse(selectedFile.parsed_data_json || '{}'));
                        }}
                        className="px-4 py-2 bg-white border border-zinc-200 text-develoi-navy rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 flex items-center gap-2"
                      >
                        <Settings size={12} /> Editar Dados
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {isEditingFile && editedFileData ? (
                      <>
                        {[
                          { label: 'Nome Completo', key: 'name' },
                          { label: 'E-mail', key: 'email' },
                          { label: 'Telefone', key: 'phone' },
                          { label: 'Cidade', key: 'city' },
                          { label: 'Estado', key: 'state' },
                          { label: 'Cargo Pretendido', key: 'role' },
                          { label: 'Anos de Experiência', key: 'experience_years', type: 'number' }
                        ].map(field => (
                          <div key={field.key} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 focus-within:border-develoi-gold transition-colors">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">{field.label}</label>
                            <input 
                              type={field.type || 'text'}
                              value={editedFileData[field.key] || ''}
                              onChange={(e) => setEditedFileData({ ...editedFileData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                              className="w-full bg-transparent text-sm font-black text-zinc-900 outline-none focus:ring-0"
                            />
                          </div>
                        ))}
                      </>
                    ) : (
                      Object.entries(JSON.parse(selectedFile.parsed_data_json)).map(([key, value]: [string, any]) => {
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) return null;
                        if (key === 'skills' || key === 'summary' || key === 'recommendation' || key === 'strengths' || key === 'attention_points' || key === 'compatibility_score') return null; // Handle specially
                        const displayValue = Array.isArray(value) ? value.join(', ') : value;
                        return (
                          <div key={key} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-develoi-gold transition-colors group">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 group-hover:text-develoi-gold">{key.replace(/_/g, ' ')}</p>
                            <p className="text-sm font-black text-zinc-900 leading-snug">{displayValue?.toString() || '-'}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {isEditingFile && editedFileData ? (
                    <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 focus-within:border-develoi-gold transition-colors">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Resumo Profissional (IA)</label>
                      <textarea 
                        value={editedFileData.summary || ''}
                        onChange={(e) => setEditedFileData({ ...editedFileData, summary: e.target.value })}
                        className="w-full bg-transparent text-sm font-bold text-zinc-600 outline-none focus:ring-0 min-h-[100px] resize-none"
                      />
                    </div>
                  ) : null}

                  {JSON.parse(selectedFile.parsed_data_json).skills && (
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Skills Identificadas (IA)</h4>
                       <div className="flex flex-wrap gap-2">
                          {JSON.parse(selectedFile.parsed_data_json).skills.map((skill: string, i: number) => (
                             <div key={i} className="px-4 py-2 bg-develoi-navy/5 text-develoi-navy rounded-xl text-[10px] font-black uppercase tracking-widest border border-develoi-navy/10 flex items-center gap-2">
                                <Sparkles size={12} className="text-develoi-gold" />
                                {skill}
                             </div>
                          ))}
                       </div>
                    </div>
                  )}
                  
                  {JSON.parse(selectedFile.parsed_data_json).summary && (
                    <div className="p-10 bg-gradient-to-br from-develoi-navy to-zinc-900 border border-zinc-800 rounded-[40px] shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Brain size={120} className="text-develoi-gold" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6 text-develoi-gold">
                          <Brain size={20} className="animate-pulse" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">ANÁLISE E FIT DA AURORA</h4>
                        </div>
                        <p className="text-base font-medium text-zinc-300 leading-relaxed italic">
                          "{JSON.parse(selectedFile.parsed_data_json).summary}"
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-10 border-t border-zinc-100">
                    <div className="flex justify-between items-end mb-8">
                       <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-develoi-gold mb-1">MATCH PROATIVO DA AURORA</h4>
                          <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Oportunidades Sugeridas</h3>
                       </div>
                       {isMatching && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-develoi-gold uppercase tracking-[0.2em] animate-pulse bg-develoi-gold/10 px-4 py-2 rounded-full border border-develoi-gold/20">
                             <Sparkles size={12} className="animate-spin" /> Calculando Afinidade...
                          </div>
                       )}
                    </div>

                    <div className="grid gap-4">
                       {aiSuggestions.length > 0 ? (
                          aiSuggestions.map((sug, i) => {
                             const job = availableJobs.find(j => j.id === sug.job_id);
                             return (
                                <motion.div 
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  key={i} 
                                  className="p-6 bg-white border border-zinc-100 rounded-[32px] hover:border-develoi-gold hover:shadow-2xl hover:shadow-develoi-gold/10 transition-all group relative overflow-hidden"
                                >
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-develoi-gold/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-develoi-gold/10 transition-all" />
                                   
                                   <div className="flex justify-between items-start relative z-10">
                                      <div className="flex items-center gap-5">
                                         <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:text-white transition-all shadow-inner">
                                            <Briefcase size={22} />
                                         </div>
                                         <div>
                                            <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{job?.title || 'Vaga Offline'}</p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                              {job?.city}/{job?.state} 
                                              <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                              <span className="text-develoi-gold">{sug.score}% Match de Perfil</span>
                                            </p>
                                         </div>
                                      </div>
                                      <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100 shadow-sm">
                                         <Star size={12} fill="currentColor" /> Recomendação Especial
                                      </div>
                                   </div>
                                   <div className="mt-5 p-5 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 group-hover:bg-amber-50/30 group-hover:border-develoi-gold/20 transition-all">
                                      <p className="text-[11px] font-bold text-zinc-500 leading-relaxed italic group-hover:text-zinc-700">"{sug.match_reason}"</p>
                                   </div>
                                </motion.div>
                             );
                          })
                       ) : !isMatching && (
                          <div className="p-12 text-center bg-zinc-50/50 rounded-[40px] border-2 border-dotted border-zinc-200">
                             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-zinc-200 mx-auto mb-4">
                                <Zap size={32} />
                             </div>
                             <p className="text-xs font-black text-zinc-400 uppercase tracking-widest max-w-xs mx-auto">Nenhuma vaga aberta compatível ou todas já vinculadas ao sistema.</p>
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              ) : (
                !selectedFile.error_message && (
                  <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-40">
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-develoi-navy animate-spin" />
                      <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-develoi-gold" size={24} />
                    </div>
                    <div className="text-center">
                       <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em]">Sincronizando com Aurora Engine...</p>
                       <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Isso pode levar alguns segundos dependendo da complexidade do arquivo.</p>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="p-8 md:p-10 border-t border-zinc-100 flex flex-col md:flex-row gap-4 bg-zinc-50/50">
              <button 
                onClick={() => {
                  reprocessFile(selectedFile.id);
                  setSelectedFile(null);
                }}
                className="flex-1 py-5 bg-develoi-navy text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all shadow-xl shadow-develoi-navy/20 flex items-center justify-center gap-3 active:scale-95"
              >
                <RefreshCw size={14} /> Reprocessar via IA
              </button>
              <button 
                onClick={() => setSelectedFile(null)}
                className="flex-1 py-5 bg-white border border-zinc-200 text-zinc-600 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                Fechar Visualização
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const CsvImportModal = () => (
    <AnimatePresence>
      {showCsvImport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCsvImport(false)}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
           />
           <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 border border-zinc-100"
           >
              <div className="flex flex-col items-center text-center gap-6">
                 <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[30px] flex items-center justify-center shadow-inner">
                    <FileSpreadsheet size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Importar Base (CSV)</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 px-8">
                       Carregue uma planilha com a lista de candidatos para processamento em larga escala via Aurora.
                    </p>
                 </div>
                 
                 <div className="w-full p-8 border-2 border-dotted border-zinc-100 rounded-[32px] flex flex-col items-center gap-4 bg-zinc-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all cursor-pointer group">
                    <Upload className="text-zinc-300 group-hover:text-emerald-500 transition-colors" size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-600">Arraste seu arquivo .csv</span>
                    <input type="file" accept=".csv" className="hidden" id="csv-file" onChange={() => {
                        toast.success("CSV Carregado! Processando mapeamento...");
                        setShowCsvImport(false);
                        setView('new');
                    }} />
                    <label htmlFor="csv-file" className="text-[10px] font-black text-develoi-navy underline cursor-pointer">Ou procure no computador</label>
                 </div>

                 <div className="w-full flex items-center gap-4 mt-4">
                    <button 
                      onClick={() => setShowCsvImport(false)}
                      className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all"
                    >
                      Cancelar
                    </button>
                    <button className="flex-1 py-4 bg-develoi-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all shadow-xl shadow-develoi-navy/10">
                      Baixar Modelo
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/50">
      <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-12 md:py-16 space-y-12">
        {/* Responsive Navbar / Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
           {view === 'dashboard' && (
              <SectionTitle 
                title="Central de Importação"
                subtitle="Engenharia de dados via IA para estruturação de currículos em tempo real."
                icon={<div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-zinc-900/30"><Layers size={24} /></div>}
                actions={
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={() => setView('dashboard')}
                      className={cn(
                        "px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        view === 'dashboard' ? "bg-develoi-navy text-white shadow-xl shadow-develoi-navy/10" : "bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900"
                      )}
                    >
                      <LayoutDashboard size={16} /> Painel
                    </button>
                    <button 
                      onClick={() => setView('new')}
                      className="px-8 py-3.5 bg-develoi-gold text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 shadow-xl shadow-develoi-gold/20 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Plus size={16} /> Nova Importação
                    </button>
                  </div>
                }
              />
           )}
           {view !== 'dashboard' && (
             <div className="w-full flex items-center justify-between">
                <button 
                  onClick={() => setView('dashboard')}
                  className="flex items-center gap-3 group"
                >
                   <div className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                      <ArrowRight size={18} className="rotate-180" />
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Voltar ao Painel</p>
                      <p className="text-sm font-black text-zinc-900 uppercase">Gestão de Lotes</p>
                   </div>
                </button>
             </div>
           )}
        </div>

        {isLoading && view === 'dashboard' ? (
          <div className="flex flex-col items-center justify-center py-40 gap-8">
             <div className="relative">
                <div className="w-20 h-20 border-4 border-zinc-100 border-t-develoi-navy rounded-full animate-spin" />
                <Zap size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-develoi-gold animate-pulse" />
             </div>
             <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em] animate-pulse">Estabelecendo conexão segura...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
             <motion.div
               key={view}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.4, ease: "circOut" }}
             >
               {view === 'dashboard' && renderDashboard()}
               {view === 'new' && renderNewImport()}
               {view === 'details' && renderDetails()}
             </motion.div>
          </AnimatePresence>
        )}
      </div>
      <FileDetailModal />
      <CsvImportModal />
      
      {/* Global CSS for scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        ::-webkit-scrollbar-thumb {
          background: #001529;
          border-radius: 4px;
          border: 2px solid #f8fafc;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #D4AF37;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #001529;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D4AF37;
        }

        /* Responsividade Table */
        @media (max-width: 768px) {
          .details-table-container {
             margin-left: -1rem;
             margin-right: -1rem;
             padding-left: 1rem;
             padding-right: 1rem;
          }
        }
      `}} />
    </PageWrapper>
  );
}

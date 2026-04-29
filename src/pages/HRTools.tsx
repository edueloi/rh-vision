import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Settings, 
  Bell, 
  Shield, 
  Wand2, 
  Brain, 
  Target, 
  FileText, 
  Layout, 
  Plus, 
  Copy, 
  Link as LinkIcon, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  BarChart3,
  Users,
  Clock,
  PieChart as PieChartIcon,
  Filter,
  ArrowRight,
  ClipboardCheck,
  Search,
  CalendarDays,
  Zap,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { PanelCard, Switch, TokenTextarea, useToast } from "@/src/components/ui";
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

const DISC_COLORS: Record<string, string> = {
  'Dominância': '#ef4444',
  'Influência': '#eab308',
  'Estabilidade': '#22c55e',
  'Conformidade': '#3b82f6'
};

const STATUS_COLORS: Record<string, string> = {
  'Pendente': '#94a3b8',
  'Em andamento': '#3b82f6',
  'Concluído': '#22c55e',
  'Expirado': '#ef4444'
};

export default function HRTools() {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'tools' | 'responses' | 'config'>('tools');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    type: 'DISC',
    questions: [] as any[]
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchTools();
    if (activeTab === 'responses') {
      fetchResponses();
    }
  }, [currentUnit, activeTab]);

  const fetchResponses = async () => {
    try {
      setIsResponsesLoading(true);
      const res = await fetch(`/api/hr-tools/all/responses?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllResponses(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsResponsesLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/hr-tools/dashboard?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      if (data && !data.error) {
        setDashboardData(data);
      } else {
        console.error('Dashboard API Error:', data?.error);
        toast.error('Erro ao carregar dados do dashboard');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão ao carregar dashboard');
    }
  };

  const fetchTools = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/hr-tools?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTools(data);
      } else {
        console.error('Tools API Error:', data?.error);
        setTools([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar ferramentas');
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/public/tools/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado com sucesso!");
  };

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/hr-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTool,
          tenant_id: 'fadel',
          unit_id: currentUnit.id
        })
      });

      if (res.ok) {
        toast.success("Ferramenta criada com sucesso!");
        setShowCreateModal(false);
        setNewTool({ name: '', description: '', type: 'DISC', questions: [] });
        fetchTools();
      } else {
        toast.error("Erro ao criar ferramenta");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro de conexão");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTool = async (id: number) => {
    try {
      const res = await fetch(`/api/hr-tools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Ferramenta removida.");
        setShowDeleteModal(null);
        fetchTools();
      }
    } catch (error) {
      toast.error("Erro ao remover.");
    }
  };

  const addQuestion = () => {
    setNewTool({
      ...newTool,
      questions: [
        ...newTool.questions,
        { question_text: '', question_type: 'text', is_required: true }
      ]
    });
  };

  const updateQuestion = (index: number, fields: any) => {
    const q = [...newTool.questions];
    q[index] = { ...q[index], ...fields };
    setNewTool({ ...newTool, questions: q });
  };

  const removeQuestion = (index: number) => {
    setNewTool({
      ...newTool,
      questions: newTool.questions.filter((_, i) => i !== index)
    });
  };

  const renderDashboard = () => {
    // Calculando métricas caso o dashboardData esteja incompleto
    const stats = [
      { 
        label: 'Ferramentas Ativas', 
        value: tools.length.toString(), 
        icon: Brain, 
        color: 'text-zinc-900', 
        bg: 'bg-zinc-50' 
      },
      { 
        label: 'Respostas Recebidas', 
        value: allResponses.length.toString(), 
        icon: Users, 
        color: 'text-amber-600', 
        bg: 'bg-amber-50' 
      },
      { 
        label: 'Taxa de Conclusão', 
        value: tools.length > 0 ? '82%' : '--', 
        icon: BarChart3, 
        color: 'text-zinc-600', 
        bg: 'bg-zinc-50' 
      },
      { 
        label: 'Tempo Médio', 
        value: '12m', 
        icon: Target, 
        color: 'text-amber-500', 
        bg: 'bg-amber-50' 
      },
    ];

    if (!dashboardData || !dashboardData.charts) {
      return (
        <div className="space-y-12">
          {/* Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="bg-white border border-zinc-100 p-6 rounded-[32px] group hover:border-zinc-900 hover:shadow-xl hover:shadow-zinc-200/40 transition-all shadow-sm"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110", stat.bg, stat.color)}>
                  <stat.icon size={24} />
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="py-20 text-center bg-zinc-50 rounded-[40px] border border-dashed border-zinc-200">
             <RefreshCw size={40} className="mx-auto text-zinc-300 animate-spin mb-4" />
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando métricas e análises...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {/* Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="bg-white border border-zinc-100 p-6 rounded-[32px] group hover:border-zinc-900 hover:shadow-xl hover:shadow-zinc-200/40 transition-all shadow-sm"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-zinc-900 tracking-tighter">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-1">Distribuição DISC</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Perfís predominantes no banco de talentos</p>
              </div>
              <PieChartIcon className="text-zinc-300" size={20} />
            </div>
            <div className="h-[250px] w-full">
              {(dashboardData.charts.disc?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.charts.disc} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="predominant_profile" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {dashboardData.charts.disc.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={DISC_COLORS[entry.predominant_profile] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-300 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-zinc-100 rounded-3xl">
                  Sem dados DISC disponíveis
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900 text-white rounded-[32px] p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl -mr-16 -mt-16" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-amber-400">Insights Nexus AI</h3>
               <p className="text-sm font-bold leading-relaxed mb-6 italic opacity-90">
                 "Candidatos com perfil <span className="text-green-400">Estável (S)</span> possuem maior retenção em unidades com alto volume de entregas metropolitanas."
               </p>
               <button className="w-full py-4 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                 <Sparkles size={14} />
                 Análise Comportamental
               </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Uso de Ferramentas</h4>
                <div className="space-y-3">
                  {(dashboardData.charts.usage?.length || 0) > 0 ? (
                    dashboardData.charts.usage.slice(0, 3).map((tool: any, i: number) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                          <span>{tool.name}</span>
                          <span>{tool.count}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-zinc-900 transition-all duration-1000" 
                            style={{ width: `${(tool.count / (dashboardData.indicators.sent || 1)) * 100 || 0}%` }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-zinc-200 text-[10px] font-black uppercase tracking-widest italic">Nenhum uso registrado</div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTools = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool) => (
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          key={tool.id} 
          className="bg-white border border-zinc-200 rounded-[32px] p-8 flex flex-col hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-50 transition-colors" />
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200/50 group-hover:bg-zinc-900 group-hover:text-white transition-all",
              tool.type === 'DISC' ? 'bg-amber-100 text-amber-600' : 
              tool.type === 'culture-fit' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-600'
            )}>
              {tool.type === 'DISC' ? <Brain size={24} /> : 
               tool.type === 'culture-fit' ? <Target size={24} /> : <FileText size={24} />}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[8px] font-black uppercase tracking-widest">Ativo</span>
            </div>
          </div>

          <div className="flex-1 relative z-10">
            <h3 className="text-base font-black text-zinc-900 mb-2">{tool.name}</h3>
            <p className="text-xs font-bold text-zinc-500 leading-relaxed line-clamp-3 mb-6">
              {tool.description}
            </p>
          </div>

          <div className="mt-auto space-y-4 relative z-10">
             <div className="flex items-center gap-6 pt-4 border-t border-zinc-50">
                <div className="flex flex-col">
                   <span className="text-sm font-black text-zinc-900">45</span>
                   <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Respostas</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-black text-zinc-900">82%</span>
                   <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Taxa</span>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopyLink(tool.public_slug)}
                  className="flex-1 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  <LinkIcon size={14} />
                  Gerar Link
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === tool.id ? null : tool.id)}
                    className={cn(
                      "p-3 bg-zinc-100 text-zinc-400 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all",
                      activeMenu === tool.id && "bg-zinc-900 text-white"
                    )}
                  >
                    <MoreVertical size={16} />
                  </button>

                  <AnimatePresence>
                    {activeMenu === tool.id && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]" onClick={() => setActiveMenu(null)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-3 w-56 bg-white border border-zinc-100 rounded-3xl shadow-2xl shadow-zinc-900/20 z-50 overflow-hidden py-3"
                        >
                          <button 
                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 transition-all"
                            onClick={() => { toast.info("Visualização em desenvolvimento"); setActiveMenu(null); }}
                          >
                            <Eye size={14} className="text-zinc-400" /> Pré-visualizar
                          </button>
                          <button 
                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 transition-all"
                            onClick={() => { toast.info("Duplicação em desenvolvimento"); setActiveMenu(null); }}
                          >
                            <Copy size={14} className="text-zinc-400" /> Clonar
                          </button>
                          <div className="h-px bg-zinc-100 my-1 mx-3" />
                          <button 
                            onClick={() => { setShowDeleteModal(tool.id); setActiveMenu(null); }}
                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 flex items-center gap-3 transition-all"
                          >
                            <AlertCircle size={14} /> Remover Ferramenta
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
             </div>
          </div>
        </motion.div>
      ))}

      {/* Add Tool Card */}
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowCreateModal(true)}
        className="bg-white border-2 border-dashed border-zinc-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 hover:border-zinc-900 transition-all group min-h-[350px]"
      >
        <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
          <Plus size={32} />
        </div>
        <div className="text-center">
          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Nova Ferramenta</h4>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Criar formulário personalizado</p>
        </div>
      </motion.button>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-900 text-white rounded-xl">
              <ClipboardCheck size={24} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Ferramentas RH</h1>
          </div>
          <p className="text-sm font-bold text-zinc-500 max-w-xl">
            Avaliações, formulários inteligentes e análises comportamentais para apoiar suas decisões de contratação.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm grow-0 shrink-0">
          <button 
            onClick={() => setActiveTab('tools')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'tools' ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            Dashboard & Ferramentas
          </button>
          <button 
            onClick={() => setActiveTab('responses')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'responses' ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            Respostas & Análises
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'config' ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            Ajustes
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tools' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {renderDashboard()}
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900 tracking-tighter">Ferramentas Disponíveis</h2>
              <div className="flex items-center gap-2">
                 <button className="p-2 text-zinc-400 hover:text-zinc-900"><Filter size={18} /></button>
                 <button className="p-2 text-zinc-400 hover:text-zinc-900"><Search size={18} /></button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[350px] bg-zinc-50 animate-pulse rounded-[32px] border border-zinc-100" />
                ))}
              </div>
            ) : renderTools()}
          </motion.div>
        )}

        {activeTab === 'responses' && (
          <motion.div 
            key="responses"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-sm">
              <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Últimas Interações</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Acompanhe as respostas e gere pareceres com IA</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <select className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none">
                      <option>Todas Ferramentas</option>
                      <option>DISC</option>
                      <option>Fit Cultural</option>
                    </select>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left">
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Candidato</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ferramenta</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Resultado</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isResponsesLoading ? (
                      [1, 2, 3].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={6} className="h-16 bg-zinc-50 border-b border-zinc-100" />
                        </tr>
                      ))
                    ) : allResponses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">Nenhuma resposta disponível ainda</p>
                        </td>
                      </tr>
                    ) : (
                      allResponses.map((item) => (
                        <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors group">
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-black text-zinc-500 text-[10px]">
                                  {item.candidate_name?.substring(0, 2).toUpperCase() || 'AN'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-zinc-900">{item.candidate_name || 'Anônimo'}</span>
                                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{item.job_title || 'Application Geral'}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-4">
                             <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                               {item.tool_name}
                             </span>
                          </td>
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", item.status === 'Concluído' ? 'bg-green-500' : 'bg-amber-500')} />
                                <span className="text-[10px] font-bold text-zinc-600">{item.status || 'Finalizado'}</span>
                             </div>
                          </td>
                          <td className="px-8 py-4 text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                             {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-8 py-4">
                             <div className="flex flex-col">
                                <span className={cn(
                                  "text-xs font-black",
                                  (item.score || 0) >= 70 ? "text-green-600" : "text-amber-600"
                                )}>
                                  {item.score || '--'}/100
                                </span>
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                  {(item.score || 0) >= 70 ? 'Alto Fit' : 'Analisar'}
                                </span>
                             </div>
                          </td>
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-2">
                               <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><Eye size={16} /></button>
                               <button 
                                onClick={() => toast.info("IA está analisando os dados comportamentais...")}
                                className="p-2 text-zinc-400 hover:text-amber-500 transition-colors"
                              >
                                <Wand2 size={16} />
                              </button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-zinc-50/30 text-center border-t border-zinc-50">
                 <button className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors">Ver todas as respostas vinculadas</button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div 
            key="config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            <PanelCard 
              title="Ajuste de Algoritmo"
              icon={Settings}
              description="Configure pesos e critérios globais para análises de IA"
            >
              <div className="space-y-6">
                {[
                  { label: 'Peso Cultura Fadel', value: 80, desc: 'Importância dos valores organizacionais' },
                  { label: 'Rigor Técnico', value: 65, desc: 'Nível de exigência para competências técnicas' },
                  { label: 'Tolerância comportamental', value: 40, desc: 'Flexibilidade em traços de personalidade' },
                  { label: 'Match de Experiência', value: 90, desc: 'Importância do tempo de casa/segmento' }
                ].map((s, i) => (
                  <div key={i} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{s.label}</span>
                        <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{s.desc}</p>
                      </div>
                      <span className="text-[10px] font-black text-zinc-900 tracking-tighter">{s.value}%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 shadow-[0_0_10px_rgba(0,0,0,0.1)]" style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
            
            <div className="space-y-6">
              <PanelCard 
                title="Configurações de Fluxo"
                icon={Bell}
              >
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-all">
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 uppercase">Notificar por E-mail</span>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Ao receber resposta DISC</p>
                      </div>
                      <Switch checked={true} onCheckedChange={() => {}} />
                    </div>
                    <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-all">
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 uppercase">Parecer Automático</span>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">IA gera análise ao concluir Triagem</p>
                      </div>
                      <Switch checked={false} onCheckedChange={() => {}} />
                    </div>
                    <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-all">
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 uppercase">Privacidade de Respostas</span>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Tornar respostas anônimas por padrão</p>
                      </div>
                      <Switch checked={false} onCheckedChange={() => {}} />
                    </div>
                 </div>
              </PanelCard>

              <div className="bg-amber-50 border border-amber-200 rounded-[32px] p-8 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-300 transition-all" />
                 <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
                       <Zap size={24} />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-amber-950 uppercase tracking-widest mb-1">Nexus Pro Intelligence</h3>
                       <p className="text-xs text-amber-800/70 font-bold leading-relaxed">
                          Habilite automações avançadas de triagem e integração com WhatsApp para aumentar a taxa de conversão em 40%.
                       </p>
                       <button className="mt-4 px-6 py-3 bg-amber-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                          Ver Planos
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Tool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
               <div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Nova Ferramenta</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Configure campos e critérios</p>
               </div>
               <button onClick={() => setShowCreateModal(false)} className="p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-900 transition-all">
                  <Plus size={20} className="rotate-45" />
               </button>
            </div>
            
            <form onSubmit={handleCreateTool} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                    <Zap size={16} />
                  </div>
                  <h4 className="text-[10px] font-black text-amber-950 uppercase tracking-widest">Modelos Rápidos</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewTool({
                      ...newTool,
                      name: 'Avaliação DISC',
                      description: 'Análise comportamental baseada na metodologia DISC.',
                      type: 'DISC',
                      questions: [
                        { question_text: 'Qual seu nível de dominância em situações de estresse?', question_type: 'select', is_required: true },
                        { question_text: 'Como você prefere se comunicar com a equipe?', question_type: 'select', is_required: true }
                      ]
                    })}
                    className="p-4 bg-white border border-amber-200 rounded-2xl text-[9px] font-black text-zinc-600 uppercase tracking-widest hover:border-amber-500 transition-all text-center"
                  >
                    Perfil DISC
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewTool({
                      ...newTool,
                      name: 'Teste de Hard Skills',
                      description: 'Avaliação técnica para validar conhecimentos específicos.',
                      type: 'test',
                      questions: [
                        { question_text: 'Descreva sua experiência com a tecnologia X.', question_type: 'long_text', is_required: true },
                        { question_text: 'De 0 a 10, quanto você domina Y?', question_type: 'number', is_required: true }
                      ]
                    })}
                    className="p-4 bg-white border border-amber-200 rounded-2xl text-[9px] font-black text-zinc-600 uppercase tracking-widest hover:border-amber-500 transition-all text-center"
                  >
                    Teste Técnico
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome da Ferramenta</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Avaliação de Hard Skills"
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all shadow-sm"
                    value={newTool.name}
                    onChange={e => setNewTool({...newTool, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Tipo de Ferramenta</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all shadow-sm appearance-none"
                    value={newTool.type}
                    onChange={e => setNewTool({...newTool, type: e.target.value})}
                  >
                    <option value="DISC">Análise de Perfil (DISC)</option>
                    <option value="culture-fit">Fit Cultural (Valores)</option>
                    <option value="test">Teste Técnico (Hard Skills)</option>
                    <option value="survey">Pesquisa de Engajamento</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Descrição</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Para que serve esta ferramenta?"
                  className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all shadow-sm resize-none"
                  value={newTool.description}
                  onChange={e => setNewTool({...newTool, description: e.target.value})}
                />
              </div>

              {/* Question Builder */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest italic">Campos & Perguntas</h4>
                  <button 
                    type="button" 
                    onClick={addQuestion}
                    className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-all"
                  >
                    <Plus size={14} /> Adicionar Campo
                  </button>
                </div>

                {newTool.questions.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-zinc-100 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Nenhum campo personalizado adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newTool.questions.map((q, idx) => (
                      <div key={idx} className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl relative group/q animate-in slide-in-from-top-2 duration-300">
                        <button 
                          type="button" 
                          onClick={() => removeQuestion(idx)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-zinc-200 text-zinc-400 rounded-full flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-all opacity-0 group-hover/q:opacity-100 shadow-sm"
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                        
                        <div className="grid md:grid-cols-12 gap-4">
                          <div className="md:col-span-8 flex flex-col gap-2">
                             <input 
                              type="text" 
                              placeholder="Enunciado da pergunta..."
                              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-zinc-900 transition-all"
                              value={q.question_text}
                              onChange={e => updateQuestion(idx, { question_text: e.target.value })}
                             />
                          </div>
                          <div className="md:col-span-4 select-none">
                            <select 
                              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                              value={q.question_type}
                              onChange={e => updateQuestion(idx, { question_type: e.target.value })}
                            >
                              <option value="text">Texto Curto</option>
                              <option value="long_text">Parágrafo</option>
                              <option value="number">Número</option>
                              <option value="select">Múltipla Escolha</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex gap-4">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="px-8 py-5 bg-white border border-zinc-200 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTool}
                type="button"
                disabled={isCreating}
                className="flex-1 py-5 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] shadow-xl shadow-zinc-900/10"
              >
                {isCreating ? 'Finalizando...' : (
                  <>
                    Publicar Ferramenta
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Remover?</h2>
              <p className="text-sm text-zinc-500 font-medium mb-8">
                Esta ação irá remover permanentemente esta ferramenta e todas as suas respostas vinculadas.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 py-4 bg-zinc-50 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteTool(showDeleteModal)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

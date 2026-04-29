import React, { useState, useEffect } from "react";
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Plus, 
  Search, 
  Sparkles, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Brain, 
  FileText, 
  Layers, 
  Target, 
  Wand2, 
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  ExternalLink,
  MessageSquare,
  MapPin,
  Table
} from "lucide-react";
import { 
  StatCard, 
  PanelCard, 
  Badge, 
  useToast 
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
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/src/lib/utils";
import { useUnit, Unit } from "@/src/lib/useUnit";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { currentUnit, units } = useUnit();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(currentUnit.id);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/overview?tenantId=fadel&unitId=${selectedUnit}&period=${period}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedUnit, period]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <RefreshCw className="w-12 h-12 text-zinc-900 animate-spin" />
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Inteligência Nexus...</p>
      </div>
    );
  }

  if (!data || data.error || !data.stats) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center">
          <AlertCircle size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Erro na Matrix</h2>
          <p className="text-sm font-medium text-zinc-500 max-w-xs leading-relaxed uppercase tracking-widest">
            {data?.error || "Ocorreu um erro ao carregar os dados do dashboard de inteligência."}
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const COLORS = ['#0a1c3e', '#cc1f26', '#6cb4e4', '#10b981', '#f5a623', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Dashboard</h1>
           <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Visão Geral do Ecossistema de Recrutamento</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-2xl shadow-sm">
              <div className="px-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100">
                <Filter size={12} /> Filtros
              </div>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-900 pr-4"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="all">Todo histórico</option>
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-2xl shadow-sm">
              <div className="px-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100">
                <Building2 size={12} /> Unidade
              </div>
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-900 pr-4"
              >
                <option value="master">Todas as unidades</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={fetchDashboardData}
                className="p-3 bg-white border border-zinc-200 text-zinc-400 rounded-2xl hover:text-fadel-navy hover:border-fadel-navy transition-all shadow-sm"
              >
                 <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <Link 
                to="/vagas"
                className="px-6 py-3 bg-fadel-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-fadel-navy/10"
              >
                 <Plus size={16} /> Nova Vaga
              </Link>
           </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Vagas Ativas', value: data.stats.active_jobs, icon: Briefcase, color: 'navy' as const, trend: '+12%' },
          { label: 'Candidatos', value: data.stats.total_candidates, icon: Users, color: 'navy' as const, trend: '+8%' },
          { label: 'Novos no Período', value: data.stats.new_candidates, icon: UserCheck, color: 'success' as const, trend: '+24%' },
          { label: 'Compatíveis (>80%)', value: data.stats.compatible_candidates, icon: Target, color: 'red' as const, trend: '+5%' },
          { label: 'DISC Respondidos', value: data.stats.tool_responses, icon: Brain, color: 'red' as const, trend: '+18%' },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            <StatCard 
              title={stat.label}
              value={stat.value.toString()}
              icon={stat.icon}
              description="Este mês"
              trend={{ value: parseInt(stat.trend), isUp: true }}
              color={stat.color}
              delay={i * 0.1}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Alertas Inteligentes */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.alerts.map((alert: any, i: number) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className={cn(
                "p-4 rounded-3xl border flex items-start gap-4 shadow-sm",
                alert.type === 'danger' ? "bg-red-50 border-red-100 text-red-900" : "bg-emerald-50 border-emerald-100 text-emerald-900"
              )}
            >
               <div className={cn(
                 "p-2 rounded-xl mt-1 shrink-0",
                 alert.type === 'danger' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
               )}>
                  {alert.type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
               </div>
               <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{alert.title}</p>
                  <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
                  <button className="mt-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                    {alert.action} <ArrowRight size={10} />
                  </button>
               </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Recruitment Funnel & Charts */}
        <div className="lg:col-span-8 space-y-8">
           <PanelCard title="Funil de Recrutamento" icon={TrendingUp} description="Distribuição de candidatos por etapa do processo">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 py-4">
                 {[
                   { label: 'Triagem', count: data.funnel.find((f: any) => f.status === 'Triagem')?.count || 0, color: 'bg-zinc-100' },
                   { label: 'IA Match', count: data.funnel.find((f: any) => f.status === 'IA Match')?.count || 0, color: 'bg-blue-50 text-blue-600' },
                   { label: 'Entrevista', count: data.funnel.find((f: any) => f.status === 'Entrevista')?.count || 0, color: 'bg-purple-50 text-purple-600' },
                   { label: 'Finalista', count: data.funnel.find((f: any) => f.status === 'Finalista')?.count || 0, color: 'bg-fadel-navy/5 text-fadel-navy border border-fadel-navy/10' },
                   { label: 'Aprovado', count: data.funnel.find((f: any) => f.status === 'Aprovado')?.count || 0, color: 'bg-emerald-50 text-emerald-600' },
                   { label: 'Contratado', count: data.funnel.find((f: any) => f.status === 'Contratado')?.count || 0, color: 'bg-zinc-900 text-white' },
                 ].map((stage, i) => (
                   <div key={i} className="text-center group">
                      <div className={cn("h-14 rounded-2xl flex items-center justify-center font-black text-lg mb-2 shadow-sm transition-all group-hover:scale-105", stage.color)}>
                        {stage.count}
                      </div>
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{stage.label}</p>
                   </div>
                 ))}
              </div>
           </PanelCard>

           <div className="grid md:grid-cols-2 gap-6">
              <PanelCard title="Compatibilidade Média" icon={BarChart3} description="Desempenho da IA por vaga aberta">
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.compatibilityMédia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} />
                        <YAxis fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} unit="%" />
                        <Tooltip 
                           contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                           cursor={{ fill: '#fafafa' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                           {data.charts.compatibilityMédia.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </PanelCard>

              <PanelCard title="Perfis DISC" icon={Brain} description="Distribuição predominante de comportamento">
                 <div className="h-[250px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.charts.discDistribution}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.charts.discDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
              </PanelCard>
           </div>

           <PanelCard title="Vagas Recentes" icon={Briefcase}>
              <div className="space-y-4">
                 {data.recentJobs.map((job: any) => (
                   <div key={job.id} className="bg-white border border-zinc-100 p-4 rounded-3xl hover:border-zinc-900 transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                            <Briefcase size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-zinc-900">{job.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                 <MapPin size={10} /> {job.city}, {job.state}
                               </span>
                               <Badge color={job.status === 'Aberta' ? 'success' : 'default'} size="sm">{job.status}</Badge>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-6">
                         <div className="text-right">
                            <p className="text-xs font-black text-zinc-900">{job.candidates_count}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Inscritos</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-emerald-600">{job.compatible_count}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Compatíveis</p>
                         </div>
                         <Link to={`/vagas/${job.id}`} className="p-2 text-zinc-300 hover:text-zinc-900">
                           <ChevronRight size={20} />
                         </Link>
                      </div>
                   </div>
                 ))}
                 {data.recentJobs.length === 0 && (
                   <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3 border-2 border-dashed border-zinc-200 rounded-[40px]">
                      <Briefcase size={40} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma vaga cadastrada</span>
                      <Link to="/vagas" className="text-blue-600 underline">Criar Vaga</Link>
                   </div>
                 )}
              </div>
           </PanelCard>
        </div>

        {/* AI Insights & Recommended */}
        <div className="lg:col-span-4 space-y-8">
           
           <div className="bg-fadel-navy rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-fadel-blue/10 rounded-full blur-3xl opacity-50 -mr-20 -mt-20" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-fadel-blue">
                      <Sparkles size={20} />
                   </div>
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-fadel-blue">Nexus AI Advisor</h3>
                      <p className="text-[9px] font-bold text-white/40">ANÁLISE EM TEMPO REAL</p>
                   </div>
                </div>
                
                <div className="space-y-6 mb-8">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-xs font-bold leading-relaxed italic opacity-90 text-white">
                        "Sua taxa de conversão de <span className="text-fadel-blue">Pendente</span> para <span className="text-fadel-blue">Entrevista</span> aumentou 15% após a última triagem automática."
                      </p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-xs font-bold leading-relaxed italic opacity-90 text-white">
                        "A vaga <span className="text-fadel-red">Analista Financeiro</span> está com excesso de candidatos abaixo de 60% de compatibilidade."
                      </p>
                   </div>
                </div>

                <Link to="/nexusai" className="w-full py-4 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 shadow-lg">
                  <MessageSquare size={16} /> Abrir Consultoria Completa
                </Link>
              </div>
           </div>

           <PanelCard title="Talentos Recomendados" icon={Target} description="Top matchings recentes">
              <div className="space-y-4">
                 {data.recommendations.map((rec: any) => (
                   <div key={rec.id} className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl hover:border-zinc-900 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-black text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all text-[10px]">
                               {rec.full_name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                               <h5 className="text-[11px] font-black text-zinc-900">{rec.full_name}</h5>
                               <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{rec.job_title}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="text-xs font-black text-blue-600">{rec.compatibility_score}%</span>
                         </div>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 grayscale opacity-60">
                            {[1, 2, 3].map(tagId => (
                               <React.Fragment key={tagId}>
                                  <Badge size="sm" color="default">Tag {tagId}</Badge>
                               </React.Fragment>
                            ))}
                         </div>
                         <Link to={`/candidatos/${rec.id}`} className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 flex items-center gap-1">
                            Perfil <ChevronRight size={10} />
                         </Link>
                      </div>
                   </div>
                 ))}
                 {data.recommendations.length === 0 && (
                    <div className="py-12 text-center text-zinc-300 italic text-[10px]">
                      Nenhum candidato de alto fit encontrado
                    </div>
                 )}
              </div>
           </PanelCard>

           <PanelCard title="Importações Recentes" icon={Layers}>
              <div className="space-y-4">
                 {data.recentImports.map((imp: any) => (
                   <div key={imp.id} className="flex items-center justify-between group cursor-pointer" onClick={() => window.location.href='/importar'}>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-50 rounded-xl text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                            <FileText size={16} />
                         </div>
                         <div>
                            <h5 className="text-[11px] font-bold text-zinc-800 truncate max-w-[120px]">{imp.name}</h5>
                            <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest">{new Date(imp.created_at).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-zinc-900">{imp.processed_files}/{imp.total_files}</p>
                         <div className="w-16 h-1 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all" 
                              style={{ width: `${(imp.processed_files / imp.total_files) * 100}%` }} 
                            />
                         </div>
                      </div>
                   </div>
                 ))}
                 <Link to="/importar" className="block text-center text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline pt-2">
                    Gerenciar Importações
                 </Link>
              </div>
           </PanelCard>

           <div className="p-6 bg-white border border-zinc-200 rounded-[32px]">
              <div className="flex items-center gap-2 mb-4">
                 <Zap size={14} className="text-amber-500" />
                 <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Próximas Ações</h4>
              </div>
              <ul className="space-y-3">
                 {[
                   "Revisar candidatos Caminhoneiro",
                   "Confirmar 10 duplicidades em 'Lote Abril'",
                   "Enviar DISC para 15 candidatos novos",
                   "Atualizar requisitos da vaga CTO"
                 ].map((todo, i) => (
                   <li key={i} className="flex items-start gap-2 group cursor-pointer">
                      <div className="w-4 h-4 rounded border border-zinc-200 mt-0.5 flex items-center justify-center group-hover:border-zinc-900 transition-all shrink-0">
                         <Check size={10} className="text-zinc-900 opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900">{todo}</span>
                   </li>
                 ))}
              </ul>
           </div>

        </div>
      </div>

      {/* Unit Summary Table */}
      {data.unitSummary && data.unitSummary.length > 0 && (
         <PanelCard title="Resumo por Unidade" icon={Table} description="Visão consolidada do ecossistema por unidade de negócio">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-zinc-100">
                        <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Unidade</th>
                        <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Vagas Ativas</th>
                        <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Candidatos</th>
                        <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Contratações</th>
                        <th className="py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                     {data.unitSummary.map((unit: any) => (
                        <tr key={unit.id} className="group hover:bg-zinc-50 transition-colors">
                           <td className="py-4">
                              <p className="text-xs font-black text-zinc-900">{unit.name}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ID: {unit.id}</p>
                           </td>
                           <td className="py-4">
                              <span className="text-xs font-bold text-zinc-600">{unit.active_jobs}</span>
                           </td>
                           <td className="py-4">
                              <span className="text-xs font-bold text-zinc-600">{unit.total_candidates}</span>
                           </td>
                           <td className="py-4">
                              <span className="text-xs font-bold text-emerald-600">+{unit.hires}</span>
                           </td>
                           <td className="py-4">
                              <Badge color="success" size="sm">Ativa</Badge>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </PanelCard>
      )}
    </div>
  );
}

function Check({ className, size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRight({ className, size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  TrendingUp, 
  Plus, 
  RefreshCw, 
  Brain, 
  Target, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  MapPin,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Layers,
  FileText,
  Zap,
  Table
} from "lucide-react";
import { 
  StatCard, 
  PanelCard, 
  Badge, 
  Button,
  useToast 
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
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
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { currentUnit, units } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(queryUnitId);

  useEffect(() => {
    setSelectedUnit(queryUnitId);
  }, [queryUnitId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/overview?tenantId=${tenantId}&unitId=${selectedUnit}&period=${period}`);
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
        <RefreshCw className="w-10 h-10 text-develoi-navy animate-spin" />
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Iniciando Aurora Intelligence...</p>
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
          <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-tight">Erro na Matrix</h2>
          <p className="text-[10px] font-medium text-zinc-400 max-w-xs leading-relaxed uppercase tracking-widest">
            {data?.error || "Ocorreu um erro ao carregar os dados do dashboard de inteligência."}
          </p>
        </div>
        <Button onClick={fetchDashboardData}>Tentar Novamente</Button>
      </div>
    );
  }

  const COLORS = ['#07152B', '#C5A04D', '#6CB4E4', '#10B981', '#F5A623', '#8B5CF6'];

  return (
    <div className="space-y-8 pb-20 px-8 py-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-1">
        <div>
           <h1 className="text-xl font-bold text-develoi-navy dark:text-white tracking-tight">Dashboard</h1>
           <p className="text-[9px] font-semibold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-1">Visão Geral do Ecossistema</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm transition-colors">
              <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100 dark:border-white/5">
                <TrendingUp size={12} /> Filtros
              </div>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-semibold text-zinc-900 dark:text-white pr-2 cursor-pointer"
              >
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
                <option value="all">Histórico</option>
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm transition-colors">
              <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5 border-r border-zinc-100 dark:border-white/5">
                <Table size={12} /> Unidade
              </div>
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-semibold text-zinc-900 dark:text-white pr-2 cursor-pointer"
              >
                <option value="master">Todas</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={fetchDashboardData}
                className="p-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-400 rounded-2xl hover:text-develoi-navy transition-all shadow-sm cursor-pointer"
              >
                 <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <Link 
                to="/vagas/nova"
                className="px-5 py-3 bg-develoi-navy dark:bg-develoi-gold text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                 <Plus size={16} /> Nova Vaga
              </Link>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Vagas Ativas', value: data.stats.active_jobs, icon: Briefcase, color: 'navy' as const, trend: '+12%' },
          { label: 'Candidatos', value: data.stats.total_candidates, icon: Users, color: 'navy' as const, trend: '+8%' },
          { label: 'Novos no Período', value: data.stats.new_candidates, icon: UserCheck, color: 'success' as const, trend: '+24%' },
          { label: 'Compatíveis (>80%)', value: data.stats.compatible_candidates, icon: Target, color: 'gold' as any, trend: '+5%' },
          { label: 'DISC Respondidos', value: data.stats.tool_responses, icon: Brain, color: 'gold' as any, trend: '+18%' },
        ].map((stat, i) => (
          <StatCard 
            key={stat.label}
            title={stat.label}
            value={stat.value.toString()}
            icon={stat.icon}
            description="Este mês"
            trend={{ value: parseInt(stat.trend), isUp: true }}
            color={stat.color}
            delay={i * 0.1}
          />
        ))}
      </div>

      {/* AI Insights - Using PanelCard and custom layouts */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8">
           {/* Funnel Section */}
           <PanelCard title="Funil de Recrutamento" icon={TrendingUp} description="Etapas do processo seletivo em tempo real">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 py-4">
                 {[
                   { label: 'Triagem', count: data.funnel.find((f: any) => f.status === 'Triagem')?.count || 0, color: 'bg-zinc-100 dark:bg-white/5' },
                   { label: 'IA Match', count: data.funnel.find((f: any) => f.status === 'IA Match')?.count || 0, color: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20' },
                   { label: 'Entrevista', count: data.funnel.find((f: any) => f.status === 'Entrevista')?.count || 0, color: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20' },
                   { label: 'Finalista', count: data.funnel.find((f: any) => f.status === 'Finalista')?.count || 0, color: 'bg-develoi-navy/5 text-develoi-navy border border-develoi-navy/10 dark:bg-develoi-gold/10 dark:text-develoi-gold' },
                   { label: 'Aprovado', count: data.funnel.find((f: any) => f.status === 'Aprovado')?.count || 0, color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
                   { label: 'Contratado', count: data.funnel.find((f: any) => f.status === 'Contratado')?.count || 0, color: 'bg-develoi-navy text-white shadow-lg dark:bg-develoi-gold' },
                 ].map((stage, i) => (
                   <div key={i} className="text-center group">
                      <div className={cn("h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-2 transition-all group-hover:scale-105", stage.color)}>
                        {stage.count}
                      </div>
                      <p className="text-[8px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">{stage.label}</p>
                   </div>
                 ))}
              </div>
           </PanelCard>

           <div className="grid md:grid-cols-2 gap-6">
              <PanelCard title="Compatibilidade Média" icon={BarChart3} description="Score médio da IA por vaga">
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.compatibilityMedia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-white/5" />
                        <XAxis dataKey="name" fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} />
                        <YAxis fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} unit="%" />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                           {data.charts.compatibilityMedia.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </PanelCard>

              <PanelCard title="Perfis DISC" icon={Brain} description="Predominância comportamental">
                 <div className="h-[250px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.charts.discDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                   <div key={job.id} className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/5 p-4 rounded-3xl hover:border-zinc-900 transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-zinc-50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                            <Briefcase size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{job.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                               <span className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest flex items-center gap-1">
                                 <MapPin size={10} /> {job.city}, {job.state}
                               </span>
                               <Badge color={job.status === 'Aberta' ? 'success' : 'default'} size="sm">{job.status}</Badge>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-6">
                         <div className="text-right">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">{job.candidates_count}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Inscritos</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-bold text-emerald-600">{job.compatible_count}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Compatíveis</p>
                         </div>
                         <Link to={`/vagas/${job.id}`} className="p-2 text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
                           <ChevronRight size={20} />
                         </Link>
                      </div>
                   </div>
                 ))}
              </div>
           </PanelCard>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-develoi-navy dark:bg-[#0d1b3e] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-develoi-blue/10 rounded-full blur-3xl opacity-50 -mr-20 -mt-20" />
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-develoi-gold">
                       <Sparkles size={20} />
                    </div>
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-develoi-gold">Aurora AI Advisor</h3>
                       <p className="text-[9px] font-bold text-white/40 uppercase">Inteligência Artificial</p>
                    </div>
                 </div>
                 <div className="space-y-4 mb-8">
                    <p className="text-xs font-bold leading-relaxed italic opacity-90">
                      "Sua taxa de conversão de Pendente para Entrevista aumentou 15%."
                    </p>
                    <p className="text-xs font-bold leading-relaxed italic opacity-90">
                      "Analista Financeiro com excesso de candidatos abaixo de 60%."
                    </p>
                 </div>
                 <Button className="w-full bg-white text-zinc-900 hover:bg-zinc-100" iconLeft={<MessageSquare size={16} />}>
                   Consultoria Completa
                 </Button>
              </div>
           </div>

           <PanelCard title="Talentos Recomendados" icon={Target}>
              <div className="space-y-4">
                 {data.recommendations.map((rec: any) => (
                   <div key={rec.id} className="p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl hover:border-zinc-900 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-zinc-200 flex items-center justify-center font-black text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all text-[10px]">
                               {rec.full_name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                               <h5 className="text-[11px] font-black text-zinc-900 dark:text-white">{rec.full_name}</h5>
                               <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{rec.job_title}</p>
                            </div>
                         </div>
                         <span className="text-xs font-black text-blue-600 dark:text-develoi-gold">{rec.compatibility_score}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className="flex gap-1">
                            <Badge size="sm">Tag 1</Badge>
                            <Badge size="sm">Tag 2</Badge>
                         </div>
                         <Link to={`/candidatos/${rec.id}`} className="text-[9px] font-bold uppercase text-zinc-400 hover:text-zinc-900 flex items-center gap-1">
                            Perfil <ChevronRight size={10} />
                          </Link>
                      </div>
                   </div>
                 ))}
              </div>
           </PanelCard>

           <div className="p-6 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-[32px]">
              <div className="flex items-center gap-2 mb-4">
                 <Zap size={14} className="text-amber-500" />
                 <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Próximas Ações</h4>
              </div>
              <ul className="space-y-3">
                 {["Revisar candidatos Caminhoneiro", "Confirmar duplicidades Lote Abril"].map((todo, i) => (
                   <li key={i} className="flex items-start gap-2 group cursor-pointer">
                      <div className="w-4 h-4 rounded border border-zinc-200 dark:border-white/20 mt-0.5 flex items-center justify-center group-hover:border-zinc-900">
                         <div className="w-2 h-2 bg-zinc-900 opacity-0 group-hover:opacity-100 rounded-sm" />
                      </div>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-white/60">{todo}</span>
                   </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>

      {data.unitSummary && data.unitSummary.length > 0 && (
         <PanelCard title="Resumo por Unidade" icon={Table}>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-zinc-100 dark:border-white/5">
                        <th className="py-4 text-[9px] font-black uppercase text-zinc-400">Unidade</th>
                        <th className="py-4 text-[9px] font-black uppercase text-zinc-400">Vagas</th>
                        <th className="py-4 text-[9px] font-black uppercase text-zinc-400">Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {data.unitSummary.map((unit: any) => (
                        <tr key={unit.id} className="border-b border-zinc-50 dark:border-white/5">
                           <td className="py-4">
                              <p className="text-xs font-black text-zinc-900 dark:text-white">{unit.name}</p>
                           </td>
                           <td className="py-4 text-xs font-bold text-zinc-600 dark:text-white/60">{unit.active_jobs}</td>
                           <td className="py-4"><Badge color="success" size="sm">Ativa</Badge></td>
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

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Users,
  UserCheck,
  Target,
  Brain,
  TrendingUp,
  Plus,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Layers,
  FileText,
  Zap,
  ChevronRight,
  MapPin,
  BarChart3,
  Building2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  StatCard,
  PanelCard,
  Badge,
  Button,
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
  Legend,
} from "recharts";
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";
import { Link } from "react-router-dom";

const COLORS = ["#07152B", "#C5A04D", "#6CB4E4", "#10B981", "#F5A623", "#8B5CF6"];

const FUNNEL_STAGES = [
  { key: "Triagem",    label: "Triagem",    color: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-white/60" },
  { key: "IA Match",  label: "IA Match",   color: "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  { key: "Entrevista",label: "Entrevista", color: "bg-violet-50 text-violet-600 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
  { key: "Finalista", label: "Finalista",  color: "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-develoi-gold/10 dark:text-develoi-gold dark:border-develoi-gold/20" },
  { key: "Aprovado",  label: "Aprovado",   color: "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  { key: "Contratado",label: "Contratado", color: "bg-develoi-navy text-white shadow-md dark:bg-develoi-gold dark:text-develoi-navy" },
];

export default function Dashboard() {
  const { currentUnit, units } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(queryUnitId);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => { setSelectedUnit(queryUnitId); }, [queryUnitId]);

  const fetchData = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const res = await fetch(
        `/api/dashboard/overview?tenantId=${tenantId}&unitId=${selectedUnit}&period=${period}`
      );
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedUnit, period]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-8 h-8 text-develoi-navy animate-spin" />
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Carregando inteligência...
        </p>
      </div>
    );
  }

  if (!data || data.error || !data.stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
          <RefreshCw size={28} />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
            Erro ao carregar
          </h2>
          <p className="text-[10px] font-medium text-zinc-400 max-w-xs uppercase tracking-widest">
            {data?.error || "Não foi possível buscar os dados do dashboard."}
          </p>
        </div>
        <Button onClick={() => fetchData()}>Tentar Novamente</Button>
      </div>
    );
  }

  const { stats, funnel, recentJobs, recommendations, recentImports, charts, unitSummary } = data;
  const funnelTotal = FUNNEL_STAGES.reduce(
    (sum, s) => sum + (funnel.find((f: any) => f.status === s.key)?.count || 0), 0
  );

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 py-6 pb-20">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase leading-none">
            Dashboard
          </h1>
          <p className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest mt-1">
            {currentUnit.name} · Visão geral do recrutamento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="flex items-center gap-0 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            {[
              { v: "7d",  label: "7d" },
              { v: "30d", label: "30d" },
              { v: "90d", label: "90d" },
              { v: "all", label: "Hist." },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setPeriod(opt.v)}
                className={cn(
                  "px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  period === opt.v
                    ? "bg-develoi-navy text-white dark:bg-develoi-gold dark:text-develoi-navy"
                    : "text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Unidade (apenas quando admin-mestre com múltiplas unidades) */}
          {units.length > 1 && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="h-9 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-[10px] font-black text-zinc-700 dark:text-white px-3 outline-none cursor-pointer"
            >
              <option value="master">Todas</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 w-9 flex items-center justify-center rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-400 hover:text-develoi-navy dark:hover:text-develoi-gold transition-all"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>

          {/* Nova Vaga */}
          <Link
            to="/vagas/nova"
            className="h-9 px-4 flex items-center gap-2 rounded-2xl bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-develoi-navy/20 dark:shadow-develoi-gold/20"
          >
            <Plus size={14} /> Nova Vaga
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Vagas Ativas",     value: stats.active_jobs,          icon: Briefcase,  color: "navy"    as const, trend: { value: 12, isUp: true },  desc: "abertas agora" },
          { label: "Candidatos",       value: stats.total_candidates,     icon: Users,      color: "navy"    as const, trend: { value: 8,  isUp: true },  desc: "cadastrados" },
          { label: "Novos no Período", value: stats.new_candidates,       icon: UserCheck,  color: "success" as const, trend: { value: 24, isUp: true }, desc: "no período" },
          { label: "Compatíveis >80%", value: stats.compatible_candidates,icon: Target,     color: "gold"    as any,   trend: { value: 5,  isUp: true },  desc: "alto fit" },
          { label: "DISC Respondidos", value: stats.tool_responses,       icon: Brain,      color: "purple"  as const, trend: { value: 18, isUp: true }, desc: "avaliações" },
        ].map((s, i) => (
          <StatCard
            key={s.label}
            title={s.label}
            value={s.value?.toString() ?? "0"}
            icon={s.icon}
            description={s.desc}
            trend={s.trend}
            color={s.color}
            delay={i * 0.07}
          />
        ))}
      </div>

      {/* ── FUNIL ── */}
      <PanelCard
        title="Funil de Recrutamento"
        icon={TrendingUp}
        description="Distribuição de candidatos por etapa do processo"
        action={
          <span className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest">
            {funnelTotal} candidatos mapeados
          </span>
        }
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 py-2">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = funnel.find((f: any) => f.status === stage.key)?.count || 0;
            const pct = funnelTotal > 0 ? Math.round((count / funnelTotal) * 100) : 0;
            return (
              <div key={i} className="flex flex-col items-center gap-2 group">
                <div className={cn(
                  "w-full h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-black transition-all group-hover:scale-105",
                  stage.color
                )}>
                  <span className="text-base sm:text-lg leading-none">{count}</span>
                  {funnelTotal > 0 && (
                    <span className="text-[8px] opacity-60">{pct}%</span>
                  )}
                </div>
                <p className="text-[8px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-wider text-center whitespace-nowrap">
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </PanelCard>

      {/* ── GRID PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna larga (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Compatibilidade por vaga */}
            <PanelCard title="Score IA por Vaga" icon={BarChart3} description="Média de compatibilidade">
              {charts.compatibilityMedia.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-300 dark:text-white/20 text-[11px] font-bold uppercase tracking-widest">
                  Sem dados ainda
                </div>
              ) : (
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.compatibilityMedia} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa" }} />
                      <YAxis fontSize={8} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa" }} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgb(0 0 0 / 0.12)", fontSize: "10px", fontWeight: "700" }}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Score"]}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {charts.compatibilityMedia.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </PanelCard>

            {/* DISC */}
            <PanelCard title="Perfis DISC" icon={Brain} description="Distribuição comportamental">
              {charts.discDistribution.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-300 dark:text-white/20 text-[11px] font-bold uppercase tracking-widest">
                  Sem avaliações ainda
                </div>
              ) : (
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.discDistribution} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {charts.discDistribution.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", fontSize: "10px", fontWeight: "700" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "9px", fontWeight: "700", paddingTop: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </PanelCard>
          </div>

          {/* Vagas recentes */}
          <PanelCard
            title="Vagas Recentes"
            icon={Briefcase}
            description="Últimas vagas abertas"
            action={
              <Link to="/vagas" className="text-[10px] font-black text-develoi-navy dark:text-develoi-gold uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity">
                Ver todas <ChevronRight size={12} />
              </Link>
            }
          >
            <div className="divide-y divide-zinc-50 dark:divide-white/5">
              {recentJobs.length === 0 ? (
                <div className="py-12 text-center text-zinc-300 dark:text-white/20 text-[11px] font-bold uppercase tracking-widest">
                  Nenhuma vaga cadastrada
                </div>
              ) : recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center gap-3 py-3 group">
                  <div className="w-9 h-9 bg-zinc-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-zinc-300 dark:text-white/20 group-hover:bg-develoi-navy group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-zinc-900 dark:text-white truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-white/30 flex items-center gap-1">
                        <MapPin size={9} /> {job.city}, {job.state}
                      </span>
                      <Badge color={job.status === "Aberta" ? "success" : "default"} size="sm">{job.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[12px] font-black text-zinc-900 dark:text-white">{job.candidates_count}</p>
                      <p className="text-[8px] font-black text-zinc-400 dark:text-white/30 uppercase">Inscritos</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[12px] font-black text-emerald-600 dark:text-emerald-400">{job.compatible_count}</p>
                      <p className="text-[8px] font-black text-zinc-400 dark:text-white/30 uppercase">Compatíveis</p>
                    </div>
                    <Link to={`/vagas/${job.id}`} className="p-1.5 text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Tabela de unidades (só quando master/admin) */}
          {unitSummary && unitSummary.length > 1 && (
            <PanelCard title="Resumo por Unidade" icon={Building2} description="Desempenho consolidado por unidade">
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="w-full min-w-[480px] text-left px-4 sm:px-6">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-white/5">
                      {["Unidade", "Vagas Ativas", "Candidatos", "Contratações", "Status"].map(h => (
                        <th key={h} className="py-3 px-4 sm:px-6 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-white/30 first:pl-4 sm:first:pl-6">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
                    {unitSummary.map((unit: any) => (
                      <tr key={unit.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <p className="text-[11px] font-black text-zinc-900 dark:text-white">{unit.name}</p>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-[11px] font-bold text-zinc-600 dark:text-white/60">{unit.active_jobs}</td>
                        <td className="py-3 px-4 sm:px-6 text-[11px] font-bold text-zinc-600 dark:text-white/60">{unit.total_candidates}</td>
                        <td className="py-3 px-4 sm:px-6 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">+{unit.hires}</td>
                        <td className="py-3 px-4 sm:px-6"><Badge color="success" size="sm">Ativa</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          )}
        </div>

        {/* Coluna estreita (1/3) */}
        <div className="space-y-6">

          {/* Aurora AI Advisor */}
          <div className="relative overflow-hidden rounded-3xl bg-develoi-navy dark:bg-[#0a1628] p-6 text-white shadow-2xl shadow-develoi-navy/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-develoi-gold/10 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-2xl bg-develoi-gold/15 flex items-center justify-center">
                  <Sparkles size={18} className="text-develoi-gold" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-develoi-gold uppercase tracking-widest leading-none">Aurora AI</p>
                  <p className="text-[9px] text-white/30 font-bold mt-0.5">ANÁLISE EM TEMPO REAL</p>
                </div>
              </div>
              <div className="space-y-3 mb-5">
                <div className="rounded-2xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[11px] font-semibold leading-relaxed text-white/80 italic">
                    "Sua taxa de conversão de{" "}
                    <span className="text-develoi-gold not-italic font-black">Triagem</span> para{" "}
                    <span className="text-develoi-gold not-italic font-black">Entrevista</span>{" "}
                    está {stats.new_candidates > 0 ? "acima" : "abaixo"} da média."
                  </p>
                </div>
                {stats.compatible_candidates > 0 && (
                  <div className="rounded-2xl bg-white/5 border border-white/8 p-3">
                    <p className="text-[11px] font-semibold leading-relaxed text-white/80 italic">
                      "{stats.compatible_candidates} candidatos com{" "}
                      <span className="text-develoi-gold not-italic font-black">+80% de fit</span>{" "}
                      aguardam revisão."
                    </p>
                  </div>
                )}
              </div>
              <Link
                to="/aurora-ai"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white text-develoi-navy text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all"
              >
                <MessageSquare size={14} /> Consultoria Completa
              </Link>
            </div>
          </div>

          {/* Talentos recomendados */}
          <PanelCard
            title="Talentos em Destaque"
            icon={Target}
            description="Maiores compatibilidades"
            action={
              <Link to="/candidatos" className="text-[10px] font-black text-develoi-navy dark:text-develoi-gold uppercase tracking-widest flex items-center gap-1 hover:opacity-70">
                Ver todos <ChevronRight size={12} />
              </Link>
            }
          >
            <div className="space-y-2">
              {recommendations.length === 0 ? (
                <div className="py-8 text-center text-zinc-300 dark:text-white/20 text-[11px] font-bold uppercase tracking-widest">
                  Nenhum candidato de alto fit
                </div>
              ) : recommendations.map((rec: any, i: number) => {
                const score = rec.compatibility_score ?? 0;
                const scoreColor =
                  score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                  score >= 75 ? "text-blue-600 dark:text-blue-400" :
                  "text-zinc-600 dark:text-white/60";
                return (
                  <Link
                    key={rec.id}
                    to={`/candidatos/${rec.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-[9px] font-black text-zinc-500 dark:text-white/50 group-hover:bg-develoi-navy group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all shrink-0">
                      {rec.full_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">{rec.full_name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-wider truncate">{rec.job_title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-[13px] font-black", scoreColor)}>{score}%</p>
                      <div className="w-10 h-1 bg-zinc-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-develoi-navy dark:bg-develoi-gold rounded-full" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </PanelCard>

          {/* Importações recentes */}
          <PanelCard
            title="Importações Recentes"
            icon={Layers}
            description="Últimos lotes de CVs"
            action={
              <Link to="/importar-cvs" className="text-[10px] font-black text-develoi-navy dark:text-develoi-gold uppercase tracking-widest flex items-center gap-1 hover:opacity-70">
                Gerenciar <ChevronRight size={12} />
              </Link>
            }
          >
            <div className="space-y-3">
              {(!recentImports || recentImports.length === 0) ? (
                <div className="py-8 text-center text-zinc-300 dark:text-white/20 text-[11px] font-bold uppercase tracking-widest">
                  Nenhuma importação ainda
                </div>
              ) : recentImports.map((imp: any) => {
                const pct = imp.total_files > 0 ? Math.round((imp.processed_files / imp.total_files) * 100) : 0;
                const isDone = pct >= 100;
                return (
                  <Link key={imp.id} to="/importar-cvs" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-white/30 group-hover:bg-develoi-navy group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all shrink-0">
                      <FileText size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-zinc-800 dark:text-white/90 truncate">{imp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isDone ? "bg-emerald-500" : "bg-develoi-navy dark:bg-develoi-gold")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn("text-[9px] font-black shrink-0", isDone ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-white/30")}>
                          {imp.processed_files}/{imp.total_files}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </PanelCard>

          {/* Checklist */}
          {(() => {
            const jobsSemCandidatos = recentJobs.filter((j: any) => j.candidates_count === 0 && j.status === "Aberta").length;
            const importacoesIncompletas = (recentImports || []).filter((i: any) => i.processed_files < i.total_files).length;
            const topTalentos = recommendations.filter((r: any) => r.compatibility_score >= 90).length;

            const items: { key: string; label: string; done: boolean; to?: string; icon: React.ElementType }[] = [
              {
                key: "vagas_ativas",
                label: stats.active_jobs > 0 ? `${stats.active_jobs} vaga${stats.active_jobs > 1 ? "s" : ""} ativa${stats.active_jobs > 1 ? "s" : ""} publicada${stats.active_jobs > 1 ? "s" : ""}` : "Publicar ao menos 1 vaga",
                done: stats.active_jobs > 0,
                to: "/vagas",
                icon: Briefcase,
              },
              {
                key: "candidatos_cadastrados",
                label: stats.total_candidates > 0 ? `${stats.total_candidates} candidato${stats.total_candidates > 1 ? "s" : ""} cadastrado${stats.total_candidates > 1 ? "s" : ""}` : "Importar candidatos",
                done: stats.total_candidates > 0,
                to: "/importar-cvs",
                icon: Users,
              },
              {
                key: "sem_candidatos",
                label: jobsSemCandidatos > 0 ? `${jobsSemCandidatos} vaga${jobsSemCandidatos > 1 ? "s" : ""} sem candidatos — revisar` : "Todas as vagas têm candidatos",
                done: jobsSemCandidatos === 0,
                to: "/vagas",
                icon: Target,
              },
              {
                key: "importacoes",
                label: importacoesIncompletas > 0 ? `${importacoesIncompletas} lote${importacoesIncompletas > 1 ? "s" : ""} com processamento pendente` : "Importações em dia",
                done: importacoesIncompletas === 0,
                to: "/importar-cvs",
                icon: FileText,
              },
              {
                key: "top_talentos",
                label: topTalentos > 0 ? `${topTalentos} talento${topTalentos > 1 ? "s" : ""} +90% aguardando revisão` : "Rodar análise de compatibilidade",
                done: topTalentos > 0,
                to: "/candidatos",
                icon: Brain,
              },
              {
                key: "disc",
                label: stats.tool_responses > 0 ? `${stats.tool_responses} avaliação DISC respondida${stats.tool_responses > 1 ? "s" : ""}` : "Enviar DISC aos candidatos",
                done: stats.tool_responses > 0,
                to: "/ferramentas",
                icon: Zap,
              },
            ];

            const doneCount = items.filter(i => i.done).length;

            return (
              <div className="rounded-3xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-develoi-gold/10 flex items-center justify-center">
                      <Zap size={13} className="text-amber-500 dark:text-develoi-gold" />
                    </div>
                    <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Checklist</h4>
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 dark:text-white/30 tabular-nums">
                    {doneCount}/{items.length}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-develoi-navy dark:bg-develoi-gold rounded-full transition-all duration-500"
                    style={{ width: `${(doneCount / items.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const content = (
                      <div
                        key={item.key}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all group",
                          item.done
                            ? "opacity-50"
                            : "hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer"
                        )}
                      >
                        <div className="shrink-0">
                          {item.done ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <Circle size={16} className="text-zinc-300 dark:text-white/20 group-hover:text-develoi-navy dark:group-hover:text-develoi-gold transition-colors" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon size={12} className={cn(
                            "shrink-0 transition-colors",
                            item.done ? "text-emerald-400" : "text-zinc-400 dark:text-white/30 group-hover:text-develoi-navy dark:group-hover:text-develoi-gold"
                          )} />
                          <span className={cn(
                            "text-[11px] font-semibold truncate transition-colors",
                            item.done
                              ? "line-through text-zinc-400 dark:text-white/30"
                              : "text-zinc-700 dark:text-white/70 group-hover:text-zinc-900 dark:group-hover:text-white"
                          )}>
                            {item.label}
                          </span>
                        </div>
                        {!item.done && (
                          <ChevronRight size={12} className="shrink-0 text-zinc-300 dark:text-white/20 group-hover:text-zinc-500 transition-colors" />
                        )}
                      </div>
                    );

                    return item.to && !item.done ? (
                      <Link key={item.key} to={item.to}>{content}</Link>
                    ) : (
                      <div key={item.key}>{content}</div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

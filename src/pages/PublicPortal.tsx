import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapPin, Briefcase, Globe, FileText, Send, CheckCircle2,
  ArrowLeft, Search, Sparkles, Clock, ChevronRight, Award,
  GraduationCap, DollarSign, X, Filter, Phone,
  Building2, Zap, Star, Heart, Users
} from "lucide-react";
import { Badge, Button, Input, Combobox } from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";

// ── SEO ───────────────────────────────────────────────────────────────────────

function useSEO(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const set = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    set("description", description);
    set("robots", "index, follow");
    set("og:title", title, true);
    set("og:description", description, true);
    set("og:type", "website", true);
    set("og:url", window.location.href, true);
    set("twitter:card", "summary_large_image");
    set("twitter:title", title);
    set("twitter:description", description);
  }, [title, description]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toSlug = (title: string, id: number) =>
  `${title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${id}`;

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return "A combinar";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  return `Até ${fmt(max!)}`;
}

function timeAgo(date?: string) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  if (d < 7) return `${d} dias atrás`;
  if (d < 30) return `${Math.floor(d / 7)} sem. atrás`;
  return `${Math.floor(d / 30)} meses atrás`;
}

function workModelColor(model?: string) {
  if (model === "Remoto") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (model === "Híbrido") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-zinc-200 hover:border-develoi-gold/50 hover:shadow-lg hover:shadow-develoi-gold/8 transition-all duration-200 p-6 relative overflow-hidden"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-develoi-gold/0 via-develoi-gold/0 to-develoi-gold/4 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center gap-5">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 group-hover:bg-develoi-navy group-hover:text-develoi-gold group-hover:border-develoi-navy transition-all shrink-0 shadow-sm">
          <Building2 size={22} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.department && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-develoi-gold/10 text-develoi-gold border border-develoi-gold/20">
                {job.department}
              </span>
            )}
            {job.work_model && (
              <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", workModelColor(job.work_model))}>
                {job.work_model}
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-zinc-900 group-hover:text-develoi-navy leading-tight truncate">
            {job.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1 font-medium">
              <MapPin size={11} className="text-develoi-gold shrink-0" /> {job.city}, {job.state}
            </span>
            {(job.salary_min || job.salary_max) && (
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                <DollarSign size={11} className="text-emerald-500 shrink-0" /> {formatSalary(job.salary_min, job.salary_max)}
              </span>
            )}
            {(job as any).created_at && (
              <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                <Clock size={10} /> {timeAgo((job as any).created_at)}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="w-9 h-9 rounded-full border-2 border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:border-develoi-gold group-hover:text-white transition-all shrink-0">
          <ChevronRight size={15} />
        </div>
      </div>
    </motion.button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PublicPortal() {
  const tenantId = getTenantId();
  const navigate = useNavigate();
  const detailMatch = useMatch("/portal/vagas/:slug");
  const routeJobId = detailMatch ? Number(detailMatch.params.slug!.split("-").pop()) : null;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCities, setSearchCities] = useState<string[]>([]);
  const [searchModel, setSearchModel] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useSEO(
    selectedJob
      ? `${selectedJob.title} — ${selectedJob.city}, ${selectedJob.state} | ${tenantInfo?.name || "Portal de Vagas"}`
      : `Vagas abertas | ${tenantInfo?.company_name || tenantInfo?.name || "Portal de Vagas"}`,
    selectedJob
      ? `${selectedJob.title} em ${selectedJob.city}/${selectedJob.state}. ${selectedJob.work_model}. Candidate-se agora.`
      : `Explore as vagas abertas em ${tenantInfo?.name || "nossas empresas"}. Candidate-se diretamente pelo portal.`
  );

  useEffect(() => {
    fetch(`/api/public/tenants/${tenantId}`).then(r => r.json()).then(setTenantInfo).catch(() => {});
    fetch(`/api/jobs?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(d => setJobs(d.filter((j: any) => j.is_public)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!routeJobId) { setSelectedJob(null); return; }
    const match = jobs.find(j => Number(j.id) === routeJobId) || null;
    setSelectedJob(match);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [jobs, routeJobId]);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/jobs/${selectedJob.id}/apply`, {
        method: "POST", body: new FormData(e.currentTarget)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro ao enviar candidatura."); return; }
      setApplied(true);
    } catch { alert("Erro de conexão."); }
    finally { setSubmitting(false); }
  };

  const uniqueCities = useMemo(() =>
    Array.from(new Set(jobs.map(j => j.city).filter(Boolean))).sort().map(c => ({ value: c, label: c })),
    [jobs]);
  const uniqueModels = useMemo(() => Array.from(new Set(jobs.map(j => j.work_model).filter(Boolean))).sort(), [jobs]);

  const filtered = useMemo(() => jobs.filter(j => {
    const q = searchQuery.toLowerCase();
    return (!q || j.title.toLowerCase().includes(q) || (j.department || "").toLowerCase().includes(q) || (j.city || "").toLowerCase().includes(q))
      && (!searchCities.length || searchCities.includes(j.city))
      && (!searchModel || j.work_model === searchModel);
  }), [jobs, searchQuery, searchCities, searchModel]);

  const hasFilters = !!(searchQuery || searchCities.length || searchModel);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-develoi-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Carregando vagas…</p>
      </div>
    </div>
  );

  const companyName = tenantInfo?.company_name || tenantInfo?.name || "Portal de Vagas";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => navigate("/portal")} className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-develoi-navy rounded-xl flex items-center justify-center shadow-lg shadow-develoi-navy/20">
              <Sparkles size={16} className="text-develoi-gold" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-black text-develoi-navy uppercase tracking-tight leading-none">{companyName}</p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Portal de Vagas</p>
            </div>
          </button>

          {/* Search (desktop) */}
          <div className="flex-1 max-w-md hidden md:block">
            <Input
              placeholder="Buscar cargo ou área…"
              icon={<Search size={14} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              containerClassName="w-full"
            />
          </div>

          {/* Spacer placeholder to keep logo left-aligned */}
          <div className="w-24 hidden sm:block" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatePresence mode="wait">

          {/* ── LIST ── */}
          {!selectedJob ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Hero */}
              <section className="py-16 sm:py-20 text-center space-y-8 relative">
                <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-develoi-navy/[0.03] to-transparent rounded-b-3xl pointer-events-none" />
                <div className="relative space-y-5">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 bg-develoi-gold/10 text-develoi-gold border border-develoi-gold/25 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    <Zap size={10} /> {jobs.length} oportunidade{jobs.length !== 1 ? "s" : ""} abertas agora
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="text-3xl sm:text-5xl font-black text-develoi-navy tracking-tight leading-[1.1]"
                  >
                    Encontre sua próxima<br />
                    <span className="text-develoi-gold">grande oportunidade</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed"
                  >
                    {companyName !== "Portal de Vagas"
                      ? `${companyName} está contratando. Candidate-se diretamente e faça parte do nosso time.`
                      : "Explore vagas abertas e candidate-se em poucos cliques."}
                  </motion.p>
                </div>

                {/* Search bar */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="max-w-2xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-lg shadow-zinc-200/60 p-2.5 flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder="Cargo, palavra-chave ou departamento…"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-develoi-gold/30 transition-all placeholder:text-zinc-400"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="sm:w-52">
                    <Combobox
                      options={uniqueCities}
                      value={searchCities}
                      onChange={v => setSearchCities(v as string[])}
                      placeholder="Todas as cidades"
                      searchPlaceholder="Buscar cidade…"
                      multiple
                      size="sm"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="sm"
                    iconLeft={<Filter size={13} />}
                    onClick={() => setShowFilters(v => !v)}
                    className="relative"
                  >
                    Filtros
                    {searchModel && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-develoi-gold rounded-full border border-white" />}
                  </Button>
                </motion.div>

                {/* Extra filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden max-w-2xl mx-auto"
                    >
                      <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modelo:</span>
                        {["", ...uniqueModels].map(m => (
                          <button
                            key={m || "todos"}
                            onClick={() => setSearchModel(m)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              searchModel === m
                                ? "bg-develoi-navy text-white border-develoi-navy"
                                : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-develoi-navy/30"
                            )}
                          >
                            {m || "Todos"}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Results */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  {hasFilters ? "Resultados" : "Vagas abertas"}
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full normal-case tracking-normal">
                    {filtered.length}
                  </span>
                </h2>
                {hasFilters && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchCities([]); setSearchModel(""); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                  >
                    <X size={11} /> Limpar
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                  <Briefcase size={36} className="mx-auto text-zinc-200 mb-4" />
                  <p className="text-sm font-black text-zinc-700">Nenhuma vaga encontrada</p>
                  <p className="text-xs text-zinc-400 mt-1">Tente outros termos ou remova os filtros.</p>
                  <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSearchCities([]); setSearchModel(""); }} className="mt-4">
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 pb-20">
                  {filtered.map((job, i) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <JobCard job={job} onClick={() => navigate(`/portal/vagas/${toSlug(job.title, job.id)}`)} />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Value props */}
              <div className="grid sm:grid-cols-3 gap-4 py-16 border-t border-zinc-200">
                {[
                  { icon: Zap, label: "Processo ágil", desc: "Candidate-se em menos de 2 minutos, direto pelo portal." },
                  { icon: Heart, label: "Cultura forte", desc: "Valorizamos pessoas e o crescimento profissional de cada um." },
                  { icon: Award, label: "Oportunidades reais", desc: "Vagas com propósito para quem quer fazer a diferença." },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-3 p-6 bg-white rounded-2xl border border-zinc-100">
                    <div className="w-10 h-10 bg-develoi-gold/10 rounded-xl flex items-center justify-center">
                      <Icon size={17} className="text-develoi-gold" />
                    </div>
                    <p className="text-sm font-black text-zinc-900">{label}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          ) : (

            /* ── DETAIL ── */
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-8 space-y-5">

              {/* Back */}
              <Button
                variant="outline"
                size="sm"
                iconLeft={<ArrowLeft size={13} />}
                onClick={() => navigate("/portal")}
              >
                Voltar para vagas
              </Button>

              {/* Hero */}
              <div className="bg-develoi-navy rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-develoi-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="relative z-10 p-8 sm:p-12 flex flex-col sm:flex-row justify-between gap-8 items-start sm:items-end">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge color="gold" size="sm">Vaga Aberta</Badge>
                      {selectedJob.department && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                          {selectedJob.department}
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">{selectedJob.title}</h1>
                    <div className="flex flex-wrap gap-4">
                      <span className="text-[11px] font-bold text-white/70 flex items-center gap-1.5 uppercase tracking-wider">
                        <MapPin size={13} className="text-develoi-gold" /> {selectedJob.city}, {selectedJob.state}
                      </span>
                      {selectedJob.work_model && (
                        <span className="text-[11px] font-bold text-white/70 flex items-center gap-1.5 uppercase tracking-wider">
                          <Globe size={13} className="text-develoi-gold" /> {selectedJob.work_model}
                        </span>
                      )}
                      {selectedJob.contract_type && (
                        <span className="text-[11px] font-bold text-white/70 flex items-center gap-1.5 uppercase tracking-wider">
                          <FileText size={13} className="text-develoi-gold" /> {selectedJob.contract_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-5 text-center shrink-0 min-w-[150px]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-develoi-gold mb-1.5">Remuneração</p>
                    <p className="text-xl font-black text-white">{formatSalary(selectedJob.salary_min, selectedJob.salary_max)}</p>
                    {(selectedJob as any).created_at && (
                      <p className="text-[9px] text-white/40 font-medium mt-2 flex items-center justify-center gap-1">
                        <Clock size={9} /> {timeAgo((selectedJob as any).created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick info chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: MapPin, label: `${selectedJob.city}, ${selectedJob.state}` },
                  selectedJob.work_model && { icon: Globe, label: selectedJob.work_model },
                  selectedJob.contract_type && { icon: FileText, label: selectedJob.contract_type },
                  (selectedJob as any).min_experience_years && { icon: Award, label: `${(selectedJob as any).min_experience_years}+ anos exp.` },
                  (selectedJob as any).education_level && { icon: GraduationCap, label: (selectedJob as any).education_level },
                ].filter(Boolean).map((item: any, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-full shadow-sm">
                    <item.icon size={11} className="text-develoi-gold" /> {item.label}
                  </span>
                ))}
              </div>

              {/* Content grid */}
              <div className="grid lg:grid-cols-5 gap-5 items-start pb-20">

                {/* Left: descriptions */}
                <div className="lg:col-span-3 space-y-4">
                  {[
                    { icon: FileText, title: "Sobre a vaga", html: selectedJob.description },
                    { icon: CheckCircle2, title: "Responsabilidades", html: selectedJob.responsibilities },
                    { icon: Briefcase, title: "Requisitos", html: (selectedJob as any).technical_requirements || (selectedJob as any).mandatory_requirements },
                    { icon: GraduationCap, title: "Diferenciais", html: (selectedJob as any).desirable_requirements },
                    { icon: Star, title: "Benefícios", html: (selectedJob as any).benefits },
                  ].filter(s => s.html).map(({ icon: Icon, title, html }) => (
                    <div key={title} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Icon size={12} className="text-develoi-gold" /> {title}
                      </p>
                      <div
                        className="text-sm text-zinc-600 leading-relaxed prose prose-sm prose-zinc max-w-none"
                        dangerouslySetInnerHTML={{ __html: html! }}
                      />
                    </div>
                  ))}
                </div>

                {/* Right: application */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/40 overflow-hidden sticky top-24">
                    {/* Form header */}
                    <div className="bg-develoi-navy px-6 py-5">
                      <p className="text-base font-black text-white">Candidatar-se</p>
                      <p className="text-[10px] text-white/50 font-medium mt-0.5">Preencha abaixo para participar da seleção</p>
                    </div>

                    <div className="p-6">
                      <AnimatePresence mode="wait">
                        {applied ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-10 flex flex-col items-center gap-4 text-center"
                          >
                            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                              <CheckCircle2 size={28} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-zinc-900">Candidatura enviada!</p>
                              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                                Recebemos seus dados. Fique atento ao<br />seu e-mail para os próximos passos.
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconLeft={<ArrowLeft size={13} />}
                              onClick={() => { setApplied(false); navigate("/portal"); }}
                            >
                              Ver outras vagas
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.form
                            key="form"
                            ref={formRef}
                            onSubmit={handleApply}
                            className="space-y-3"
                          >
                            <Input
                              label="Nome completo"
                              name="full_name"
                              type="text"
                              placeholder="Seu nome completo"
                              required
                              disabled={submitting}
                              icon={<Users size={13} />}
                            />
                            <Input
                              label="E-mail"
                              name="email"
                              type="email"
                              placeholder="seu@email.com"
                              required
                              disabled={submitting}
                              icon={<Send size={13} />}
                            />
                            <Input
                              label="Telefone / WhatsApp"
                              name="phone"
                              type="tel"
                              placeholder="(11) 99999-9999"
                              disabled={submitting}
                              icon={<Phone size={13} />}
                            />
                            <Input
                              label="LinkedIn (opcional)"
                              name="linkedin"
                              type="url"
                              placeholder="linkedin.com/in/seu-perfil"
                              disabled={submitting}
                              icon={<Globe size={13} />}
                            />

                            {/* File upload */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none flex items-center gap-1">
                                Currículo (PDF) <span className="text-red-500">*</span>
                              </label>
                              <label className="flex items-center justify-between w-full px-3.5 py-2.5 bg-white border-2 border-dashed border-zinc-200 hover:border-develoi-gold rounded-xl cursor-pointer transition-all group">
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-600">Selecionar arquivo PDF</span>
                                <div className="w-7 h-7 rounded-lg bg-develoi-gold/10 flex items-center justify-center shrink-0">
                                  <Send size={12} className="text-develoi-gold" />
                                </div>
                                <input required name="resume" type="file" accept=".pdf" className="hidden" disabled={submitting} />
                              </label>
                            </div>

                            <Button
                              type="submit"
                              variant="primary"
                              size="lg"
                              fullWidth
                              loading={submitting}
                              iconLeft={!submitting ? <Zap size={15} /> : undefined}
                              className="mt-2 !bg-develoi-gold !border-develoi-gold hover:!bg-develoi-gold/90 !text-white shadow-lg shadow-develoi-gold/25"
                            >
                              {submitting ? "Enviando…" : "Enviar candidatura"}
                            </Button>

                            <p className="text-[9px] text-zinc-400 text-center leading-relaxed font-medium pt-1">
                              Seus dados são utilizados exclusivamente para este processo seletivo.
                            </p>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-develoi-navy text-white mt-8">
        {/* CTA strip */}
        <div className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-lg font-black text-white leading-tight">
                Não encontrou a vaga ideal?
              </p>
              <p className="text-xs text-white/50 font-medium">
                Novas oportunidades surgem regularmente. Volte sempre para conferir.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              iconLeft={<Search size={14} />}
              onClick={() => { navigate("/portal"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="!border-develoi-gold !text-develoi-gold hover:!bg-develoi-gold hover:!text-develoi-navy shrink-0"
            >
              Ver todas as vagas
            </Button>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid sm:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Sparkles size={18} className="text-develoi-gold" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight leading-none">{companyName}</p>
                <p className="text-[9px] text-white/35 font-bold uppercase tracking-widest mt-0.5">Portal de Vagas</p>
              </div>
            </div>
            <p className="text-xs text-white/45 leading-relaxed">
              Conectamos talentos a oportunidades reais. Candidate-se diretamente e faça parte de um time que valoriza cada pessoa.
            </p>
            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/8 border border-white/10 px-3 py-1.5 rounded-full text-white/60">
                <Briefcase size={10} className="text-develoi-gold" /> {jobs.length} vagas abertas
              </span>
              {uniqueCities.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/8 border border-white/10 px-3 py-1.5 rounded-full text-white/60">
                  <MapPin size={10} className="text-develoi-gold" /> {uniqueCities.length} {uniqueCities.length === 1 ? "cidade" : "cidades"}
                </span>
              )}
            </div>
          </div>

          {/* Nav */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Navegação</p>
            <div className="space-y-2.5">
              {[
                { label: "Todas as vagas", action: () => navigate("/portal") },
                ...(uniqueModels.map(m => ({ label: `Vagas ${m}`, action: () => { navigate("/portal"); setSearchModel(m); } }))),
              ].slice(0, 5).map(({ label, action }) => (
                <button key={label} onClick={action} className="block text-xs text-white/50 hover:text-develoi-gold transition-colors font-medium text-left">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Contato</p>
            <div className="space-y-3">
              {tenantInfo?.email && (
                <a href={`mailto:${tenantInfo.email}`} className="flex items-center gap-2.5 text-xs text-white/50 hover:text-develoi-gold transition-colors font-medium group">
                  <div className="w-7 h-7 bg-white/8 border border-white/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-develoi-gold/20 group-hover:border-develoi-gold/30 transition-colors">
                    <Send size={11} className="text-develoi-gold" />
                  </div>
                  {tenantInfo.email}
                </a>
              )}
              {tenantInfo?.phone && (
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-medium">
                  <div className="w-7 h-7 bg-white/8 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <Phone size={11} className="text-develoi-gold" />
                  </div>
                  {tenantInfo.phone}
                </div>
              )}
              {!tenantInfo?.email && !tenantInfo?.phone && (
                <p className="text-xs text-white/30 font-medium italic">Sem contato configurado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[9px] text-white/20 font-medium uppercase tracking-widest">
              © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
            </p>
            <p className="text-[9px] text-white/15 font-medium uppercase tracking-widest">Powered by Recrute IA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

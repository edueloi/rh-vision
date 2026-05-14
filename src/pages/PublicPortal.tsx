import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, MapPin, Briefcase, Globe, FileText, Send,
  CheckCircle2, ArrowLeft, Search, Sparkles, Clock,
  ChevronRight, Users, Star, Zap, Heart, Coffee,
  GraduationCap, Award, Laptop, DollarSign, X, Filter,
  Phone, Linkedin as LinkedinIcon, ChevronDown
} from "lucide-react";
import { getTenantId } from "@/src/lib/auth";
import { Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";

// ── SEO helpers ────────────────────────────────────────────────────────────────

function useSEO(title: string, description: string, url?: string) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", description);
    setMeta("robots", "index, follow");
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    if (url) setMeta("og:url", url, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
  }, [title, description, url]);
}

// ── Slug helpers ───────────────────────────────────────────────────────────────

const generateSlug = (title: string, id: number) =>
  `${title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${id}`;

// ── Work model badge colors ────────────────────────────────────────────────────

function WorkModelBadge({ model }: { model?: string }) {
  if (!model) return null;
  const cfg =
    model === "Remoto" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    model === "Híbrido" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg}`}>
      <Globe size={10} /> {model}
    </span>
  );
}

// ── Format salary ──────────────────────────────────────────────────────────────

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return "A combinar";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  return `Até ${fmt(max!)}`;
}

// ── Time ago ───────────────────────────────────────────────────────────────────

function timeAgo(date?: string) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group w-full bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 hover:border-develoi-gold/60 hover:shadow-xl hover:shadow-develoi-gold/8 transition-all text-left relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-develoi-gold/0 to-develoi-gold/3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center justify-between">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 group-hover:bg-develoi-navy group-hover:text-develoi-gold group-hover:border-develoi-navy transition-all shrink-0 shadow-sm">
            <Building2 size={24} />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {job.department && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-develoi-gold/10 text-develoi-gold border border-develoi-gold/20">
                  {job.department}
                </span>
              )}
              <WorkModelBadge model={job.work_model} />
              {job.contract_type && (
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{job.contract_type}</span>
              )}
            </div>
            <h3 className="text-lg font-black text-zinc-900 group-hover:text-develoi-navy leading-tight">{job.title}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                <MapPin size={12} className="text-develoi-gold" /> {job.city}, {job.state}
              </span>
              {(job.salary_min || job.salary_max) && (
                <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <DollarSign size={12} className="text-emerald-500" /> {formatSalary(job.salary_min, job.salary_max)}
                </span>
              )}
              {(job as any).created_at && (
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                  <Clock size={10} /> {timeAgo((job as any).created_at)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 sm:shrink-0">
          <span className="hidden sm:flex text-[10px] font-black text-develoi-gold uppercase tracking-widest items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            Ver vaga <ChevronRight size={12} />
          </span>
          <div className="w-10 h-10 rounded-full border-2 border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:border-develoi-gold group-hover:text-white transition-all">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PublicPortal() {
  const tenantId = getTenantId();
  const navigate = useNavigate();
  const detailMatch = useMatch("/portal/vagas/:jobSlug");
  const routeJobSlug = detailMatch?.params.jobSlug;
  const routeJobId = routeJobSlug ? Number(routeJobSlug.split("-").pop()) : null;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [applied, setApplied] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchModel, setSearchModel] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // SEO
  useSEO(
    selectedJob
      ? `${selectedJob.title} — ${selectedJob.city}, ${selectedJob.state} | ${tenantInfo?.name || "Portal de Vagas"}`
      : `Vagas abertas em ${tenantInfo?.name || "nossas empresas"} | Portal de Oportunidades`,
    selectedJob
      ? `Vaga para ${selectedJob.title} em ${selectedJob.city}/${selectedJob.state}. ${selectedJob.work_model}. ${selectedJob.description?.replace(/<[^>]+>/g, "").substring(0, 120) || ""}...`
      : `Explore as vagas abertas em ${tenantInfo?.name || "nossas empresas parceiras"}. Candidature-se agora e encontre sua próxima grande oportunidade.`,
    window.location.href
  );

  useEffect(() => {
    fetch(`/api/public/tenants/${tenantId}`)
      .then(r => r.json()).then(setTenantInfo).catch(() => {});

    fetch(`/api/jobs?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => setJobs(data.filter((j: any) => j.is_public)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!routeJobId) { setSelectedJob(null); return; }
    const match = jobs.find(j => Number(j.id) === routeJobId) || null;
    setSelectedJob(match);
    if (match) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [jobs, routeJobId]);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;
    setLoadingSubmit(true);
    try {
      const res = await fetch(`/api/public/jobs/${selectedJob.id}/apply`, {
        method: "POST", body: new FormData(e.currentTarget)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro ao enviar candidatura"); return; }
      setApplied(true);
      formRef.current?.reset();
    } catch { alert("Erro de conexão."); }
    finally { setLoadingSubmit(false); }
  };

  const uniqueCities = useMemo(() =>
    Array.from(new Set(jobs.map(j => j.city).filter(Boolean))).sort(), [jobs]);

  const uniqueModels = useMemo(() =>
    Array.from(new Set(jobs.map(j => j.work_model).filter(Boolean))).sort(), [jobs]);

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || job.title.toLowerCase().includes(q) || (job.department || "").toLowerCase().includes(q) || (job.city || "").toLowerCase().includes(q);
    const matchCity = !searchCity || job.city === searchCity;
    const matchModel = !searchModel || job.work_model === searchModel;
    return matchQ && matchCity && matchModel;
  }), [jobs, searchQuery, searchCity, searchModel]);

  const hasFilters = searchQuery || searchCity || searchModel;

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Carregando vagas...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-10 h-16 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/portal")} className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-develoi-navy rounded-xl flex items-center justify-center shadow-lg shadow-develoi-navy/25">
              <Sparkles size={17} className="text-develoi-gold" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-develoi-navy uppercase tracking-tight leading-none">
                {tenantInfo?.company_name || tenantInfo?.name || "Portal de Vagas"}
              </p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Oportunidades</p>
            </div>
          </button>

          <div className="flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Buscar vaga..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full hidden sm:block">
              {jobs.length} {jobs.length === 1 ? "vaga" : "vagas"} abertas
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-5 sm:px-10">
        <AnimatePresence mode="wait">

          {/* LIST VIEW */}
          {!selectedJob ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Hero */}
              <div className="py-16 sm:py-20 text-center space-y-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-develoi-navy/3 to-transparent rounded-3xl -mx-10" />
                <div className="relative space-y-4">
                  <div className="inline-flex items-center gap-2 bg-develoi-gold/10 text-develoi-gold border border-develoi-gold/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Zap size={11} /> {jobs.length} oportunidade{jobs.length !== 1 ? "s" : ""} disponív{jobs.length !== 1 ? "eis" : "el"}
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black text-develoi-navy tracking-tight leading-tight">
                    Encontre sua próxima<br />
                    <span className="text-develoi-gold">grande oportunidade</span>
                  </h1>
                  <p className="text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">
                    {tenantInfo?.company_name || tenantInfo?.name
                      ? `${tenantInfo.company_name || tenantInfo.name} está contratando. Candidate-se agora e faça parte do nosso time.`
                      : "Explore as vagas abertas e candidate-se diretamente pelo portal."}
                  </p>
                </div>

                {/* Search bar */}
                <div className="relative max-w-2xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50 p-2 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Cargo, palavra-chave ou área..."
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-develoi-gold transition-all"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative sm:w-52">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <select
                      className="w-full pl-10 pr-8 py-3 bg-zinc-50 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-develoi-gold transition-all appearance-none cursor-pointer"
                      value={searchCity}
                      onChange={e => setSearchCity(e.target.value)}
                    >
                      <option value="">Todas as cidades</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                  </div>
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`sm:w-auto px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? "bg-develoi-navy text-white border-develoi-navy" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}
                  >
                    <Filter size={13} /> Filtros
                    {searchModel && <span className="w-1.5 h-1.5 bg-develoi-gold rounded-full" />}
                  </button>
                </div>

                {/* Extra filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="max-w-2xl mx-auto"
                    >
                      <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-wrap gap-2 mt-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest self-center mr-2">Modelo:</span>
                        {["", ...uniqueModels].map(m => (
                          <button
                            key={m || "todos"}
                            onClick={() => setSearchModel(m)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${searchModel === m ? "bg-develoi-navy text-white border-develoi-navy" : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"}`}
                          >
                            {m || "Todos"}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-black text-zinc-900">
                    {hasFilters ? "Resultados da busca" : "Vagas abertas"}
                  </h2>
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    {filteredJobs.length} {filteredJobs.length === 1 ? "vaga" : "vagas"}
                  </span>
                </div>
                {hasFilters && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchCity(""); setSearchModel(""); }}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-red-500 transition-colors uppercase tracking-widest"
                  >
                    <X size={12} /> Limpar filtros
                  </button>
                )}
              </div>

              {/* Job list */}
              {filteredJobs.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
                  <Briefcase size={40} className="mx-auto text-zinc-200 mb-4" />
                  <h3 className="text-base font-black text-zinc-900">Nenhuma vaga encontrada</h3>
                  <p className="text-sm text-zinc-400 mt-2">Tente ajustar os filtros ou volte em breve.</p>
                  <button onClick={() => { setSearchQuery(""); setSearchCity(""); setSearchModel(""); }} className="mt-6 text-xs font-bold text-develoi-gold hover:underline">
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 pb-20">
                  {filteredJobs.map((job, i) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <JobCard job={job} onClick={() => navigate(`/portal/vagas/${generateSlug(job.title, job.id)}`)} />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Value props */}
              <div className="py-20 grid sm:grid-cols-3 gap-6 border-t border-zinc-200 mt-8">
                {[
                  { icon: Zap, title: "Processo ágil", desc: "Candidature-se em menos de 2 minutos. Sem burocracia." },
                  { icon: Heart, title: "Cultura forte", desc: "Valorizamos as pessoas e o crescimento profissional." },
                  { icon: Award, title: "Oportunidades reais", desc: "Vagas com propósito, para quem quer fazer a diferença." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex flex-col items-center text-center gap-3 p-6 bg-white rounded-2xl border border-zinc-100">
                    <div className="w-10 h-10 bg-develoi-gold/10 rounded-xl flex items-center justify-center">
                      <Icon size={18} className="text-develoi-gold" />
                    </div>
                    <h3 className="text-sm font-black text-zinc-900">{title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          ) : (

            /* DETAIL VIEW */
            <motion.div key="detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-8 space-y-6">

              {/* Back */}
              <button
                onClick={() => navigate("/portal")}
                className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-develoi-navy transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-zinc-200 shadow-sm hover:shadow-md w-fit"
              >
                <ArrowLeft size={14} /> Voltar para vagas
              </button>

              {/* Job hero */}
              <div className="bg-develoi-navy rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-develoi-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
                <div className="relative z-10 p-8 sm:p-12 flex flex-col sm:flex-row justify-between gap-8 items-start sm:items-center">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-develoi-gold/20 text-develoi-gold border border-develoi-gold/30">
                        Vaga Aberta
                      </span>
                      {selectedJob.department && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">
                          {selectedJob.department}
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">{selectedJob.title}</h1>
                    <div className="flex flex-wrap gap-5">
                      <span className="text-[11px] font-bold text-white/70 flex items-center gap-2 uppercase tracking-widest">
                        <MapPin size={14} className="text-develoi-gold" /> {selectedJob.city}, {selectedJob.state}
                      </span>
                      {selectedJob.work_model && (
                        <span className="text-[11px] font-bold text-white/70 flex items-center gap-2 uppercase tracking-widest">
                          <Globe size={14} className="text-develoi-gold" /> {selectedJob.work_model}
                        </span>
                      )}
                      {selectedJob.contract_type && (
                        <span className="text-[11px] font-bold text-white/70 flex items-center gap-2 uppercase tracking-widest">
                          <FileText size={14} className="text-develoi-gold" /> {selectedJob.contract_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center min-w-[160px] shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-develoi-gold mb-2">Remuneração</p>
                    <p className="text-xl font-black text-white">{formatSalary(selectedJob.salary_min, selectedJob.salary_max)}</p>
                    {(selectedJob as any).created_at && (
                      <p className="text-[9px] text-white/40 font-medium mt-2 flex items-center justify-center gap-1">
                        <Clock size={9} /> {timeAgo((selectedJob as any).created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content grid */}
              <div className="grid lg:grid-cols-5 gap-6 items-start">

                {/* Left: job info */}
                <div className="lg:col-span-3 space-y-6">

                  {/* Quick info pills */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: MapPin, label: `${selectedJob.city}, ${selectedJob.state}` },
                      selectedJob.work_model && { icon: Globe, label: selectedJob.work_model },
                      selectedJob.contract_type && { icon: FileText, label: selectedJob.contract_type },
                      (selectedJob as any).min_experience_years && { icon: Award, label: `${(selectedJob as any).min_experience_years}+ anos de exp.` },
                      (selectedJob as any).education_level && { icon: GraduationCap, label: (selectedJob as any).education_level },
                    ].filter(Boolean).map((item: any, i) => (
                      <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-full shadow-sm">
                        <item.icon size={12} className="text-develoi-gold" /> {item.label}
                      </span>
                    ))}
                  </div>

                  {/* Sections */}
                  {[
                    { icon: FileText, title: "Sobre a vaga", content: selectedJob.description },
                    { icon: CheckCircle2, title: "Responsabilidades", content: selectedJob.responsibilities },
                    { icon: Briefcase, title: "Requisitos", content: (selectedJob as any).technical_requirements || (selectedJob as any).mandatory_requirements },
                    { icon: GraduationCap, title: "Diferenciais", content: (selectedJob as any).desirable_requirements },
                    { icon: Star, title: "Benefícios", content: (selectedJob as any).benefits },
                  ].filter(s => s.content).map(({ icon: Icon, title, content }) => (
                    <div key={title} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Icon size={13} className="text-develoi-gold" /> {title}
                      </h3>
                      <div
                        className="text-sm text-zinc-600 leading-relaxed prose prose-sm prose-zinc max-w-none"
                        dangerouslySetInnerHTML={{ __html: content! }}
                      />
                    </div>
                  ))}
                </div>

                {/* Right: application form */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/40 overflow-hidden sticky top-24">
                    <div className="bg-develoi-navy px-6 py-5">
                      <h2 className="text-base font-black text-white">Candidatar-se</h2>
                      <p className="text-[10px] text-white/50 font-medium mt-0.5">Preencha os dados abaixo para participar da seleção</p>
                    </div>

                    <div className="p-6">
                      <AnimatePresence mode="wait">
                        {applied ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-10 flex flex-col items-center gap-4 text-center"
                          >
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                              <CheckCircle2 size={32} />
                            </div>
                            <div>
                              <p className="text-base font-black text-zinc-900">Candidatura enviada!</p>
                              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                                Recebemos seus dados. Fique atento ao<br />seu e-mail para os próximos passos.
                              </p>
                            </div>
                            <button
                              onClick={() => { setApplied(false); navigate("/portal"); }}
                              className="mt-2 text-xs font-bold text-develoi-gold hover:underline flex items-center gap-1"
                            >
                              <ArrowLeft size={12} /> Ver outras vagas
                            </button>
                          </motion.div>
                        ) : (
                          <motion.form
                            key="form"
                            ref={formRef}
                            onSubmit={handleApply}
                            className="space-y-4"
                          >
                            {[
                              { name: "full_name", label: "Nome completo", type: "text", placeholder: "Seu nome completo", icon: Users, required: true },
                              { name: "email", label: "E-mail", type: "email", placeholder: "seu@email.com", icon: Send, required: true },
                              { name: "phone", label: "Telefone / WhatsApp", type: "tel", placeholder: "(11) 99999-9999", icon: Phone, required: false },
                              { name: "linkedin", label: "LinkedIn (opcional)", type: "url", placeholder: "linkedin.com/in/seu-perfil", icon: LinkedinIcon, required: false },
                            ].map(field => (
                              <div key={field.name} className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                  <field.icon size={10} /> {field.label}
                                  {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  name={field.name}
                                  type={field.type}
                                  placeholder={field.placeholder}
                                  required={field.required}
                                  disabled={loadingSubmit}
                                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold focus:bg-white transition-all placeholder:text-zinc-300 disabled:opacity-50"
                                />
                              </div>
                            ))}

                            {/* Resume upload */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                <FileText size={10} /> Currículo (PDF) <span className="text-red-500">*</span>
                              </label>
                              <label className="flex items-center justify-between gap-3 w-full px-4 py-3 bg-zinc-50 border-2 border-dashed border-zinc-200 hover:border-develoi-gold rounded-xl cursor-pointer transition-all group">
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-600">Selecionar arquivo PDF</span>
                                <div className="w-7 h-7 rounded-lg bg-develoi-gold/10 flex items-center justify-center shrink-0">
                                  <Send size={12} className="text-develoi-gold" />
                                </div>
                                <input required name="resume" type="file" accept=".pdf" className="hidden" disabled={loadingSubmit} />
                              </label>
                            </div>

                            <button
                              type="submit"
                              disabled={loadingSubmit}
                              className="w-full py-4 bg-develoi-gold hover:bg-develoi-gold/90 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-develoi-gold/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                            >
                              {loadingSubmit ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <><Zap size={15} /> Enviar candidatura</>
                              )}
                            </button>

                            <p className="text-[9px] text-zinc-400 text-center leading-relaxed font-medium">
                              Seus dados são tratados com segurança e utilizados exclusivamente para este processo seletivo.
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

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="mt-16 bg-develoi-navy text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-10 py-14 grid sm:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Sparkles size={17} className="text-develoi-gold" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">{tenantInfo?.company_name || tenantInfo?.name || "Empresa"}</p>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Portal de Vagas</p>
              </div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Encontre sua próxima oportunidade e faça parte de um time que valoriza pessoas.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Navegação</p>
            {[
              { label: "Ver todas as vagas", action: () => navigate("/portal") },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} className="block text-xs text-white/60 hover:text-develoi-gold transition-colors font-medium">
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Contato</p>
            {tenantInfo?.email && (
              <a href={`mailto:${tenantInfo.email}`} className="block text-xs text-white/60 hover:text-develoi-gold transition-colors font-medium">
                {tenantInfo.email}
              </a>
            )}
            {tenantInfo?.phone && (
              <p className="text-xs text-white/60 font-medium">{tenantInfo.phone}</p>
            )}
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[9px] text-white/30 font-medium uppercase tracking-widest">
              © {new Date().getFullYear()} {tenantInfo?.company_name || tenantInfo?.name}. Todos os direitos reservados.
            </p>
            <p className="text-[9px] text-white/20 font-medium uppercase tracking-widest">
              Powered by Recrute IA
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

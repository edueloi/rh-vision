import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Globe, 
  FileText, 
  Send, 
  CheckCircle2, 
  ArrowLeft,
  Search,
  Sparkles
} from "lucide-react";
import { Badge, useToast, Input } from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { useMatch, useNavigate } from "react-router-dom";

// Helper for generating slugs
const generateSlug = (title: string, id: number) => {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`;
};

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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/public/tenants/${tenantId}`)
      .then(res => res.json())
      .then(data => setTenantInfo(data))
      .catch(() => console.warn("Tenant info not found"));

    fetch(`/api/jobs?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setJobs(data.filter((j: any) => j.is_public)))
      .catch(() => toast.error("Erro ao carregar vagas."))
      .finally(() => setLoading(false));
  }, [tenantId, toast]);

  useEffect(() => {
    if (!routeJobId) {
      setSelectedJob(null);
      return;
    }

    const matchedJob = jobs.find((job) => Number(job.id) === routeJobId) || null;
    setSelectedJob(matchedJob);
  }, [jobs, routeJobId]);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;

    setLoadingSubmit(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/public/jobs/${selectedJob.id}/apply`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar candidatura");
        return;
      }

      setApplied(true);
      toast.success("Candidatura enviada com sucesso!");
      setTimeout(() => {
        setApplied(false);
        navigate("/portal");
      }, 3000);
    } catch (error) {
      toast.error("Erro de conexão ao enviar candidatura");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Extract unique cities for the filter
  const uniqueCities = useMemo(() => {
    const cities = jobs.map(j => j.city).filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchQuery = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase()));
        
      const matchCity = !searchCity || job.city === searchCity;
      
      return matchQuery && matchCity;
    });
  }, [jobs, searchQuery, searchCity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Public Header */}
      <header className="h-20 bg-white border-b border-zinc-200 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/portal")}>
            <div className="w-10 h-10 bg-gradient-to-br from-develoi-navy to-develoi-navy/80 rounded-xl flex items-center justify-center text-develoi-gold shadow-lg shadow-develoi-navy/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-develoi-navy tracking-tight leading-none uppercase">
                Recrute IA
              </h1>
              <p className="text-[10px] text-develoi-gold font-bold uppercase tracking-widest mt-0.5">
                {tenantInfo?.name || "Portal de Vagas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="px-5 py-2 bg-develoi-gold text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-develoi-gold/20 hover:bg-develoi-gold/90">
              Área do Candidato
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 sm:p-10 py-12 space-y-12">
        <AnimatePresence mode="wait">
          {!selectedJob ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* Hero & Search */}
              <div className="bg-develoi-navy rounded-[40px] p-10 sm:p-16 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-develoi-navy/20">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    Encontre sua próxima<br/><span className="text-develoi-gold">grande oportunidade</span>
                  </h2>
                  <p className="text-xs md:text-sm text-white/60 font-medium max-w-2xl mx-auto leading-relaxed tracking-wide">
                    Explore as vagas disponíveis em {tenantInfo?.name || "nossas empresas parceiras"}.
                    Utilize os filtros abaixo para encontrar a posição ideal para o seu perfil.
                  </p>
                </div>

                <div className="relative z-10 max-w-3xl mx-auto bg-white p-3 rounded-2xl flex flex-col md:flex-row gap-3 shadow-xl shadow-black/10">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Busque por cargo, palavra-chave ou departamento..." 
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-develoi-gold transition-all"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="md:w-64 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <select 
                      className="w-full pl-12 pr-10 py-3 bg-zinc-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-develoi-gold transition-all appearance-none cursor-pointer text-zinc-700"
                      value={searchCity}
                      onChange={e => setSearchCity(e.target.value)}
                    >
                      <option value="">Todas as cidades</option>
                      {uniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Jobs List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Vagas Abertas</h3>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'resultado' : 'resultados'}
                  </span>
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[32px] border border-zinc-200 border-dashed">
                    <Briefcase size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-900">Nenhuma vaga encontrada</h3>
                    <p className="text-sm text-zinc-500 mt-2">Tente ajustar os filtros de busca para ver mais resultados.</p>
                    <button 
                      onClick={() => { setSearchQuery(""); setSearchCity(""); }}
                      className="mt-6 text-sm font-bold text-develoi-gold hover:underline"
                    >
                      Limpar todos os filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredJobs.map(job => (
                      <button 
                        key={job.id}
                        onClick={() => navigate(`/portal/vagas/${generateSlug(job.title, job.id)}`)}
                        className="group bg-white p-6 sm:p-8 rounded-[32px] border border-zinc-200 hover:border-develoi-gold/50 hover:shadow-xl hover:shadow-develoi-gold/5 transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 w-full">
                          <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold/10 group-hover:text-develoi-gold transition-colors shrink-0">
                            <Building2 size={28} />
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {job.department && (
                                <Badge color="gold" size="sm" pill>{job.department}</Badge>
                              )}
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-full">
                                <Globe size={12} /> {job.work_model || "Presencial"}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 group-hover:text-develoi-navy transition-colors leading-tight">
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                              <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                                <MapPin size={14} className="text-develoi-gold" /> {job.city}, {job.state}
                              </span>
                              {job.contract_type && (
                                <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                                  <FileText size={14} className="text-develoi-gold" /> {job.contract_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-end sm:justify-center border-t sm:border-t-0 border-zinc-100 pt-4 sm:pt-0">
                          <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:border-develoi-gold group-hover:text-white transition-all shadow-sm">
                            <ArrowLeft size={18} className="rotate-135" style={{ transform: 'rotate(135deg)' }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => navigate("/portal")}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-develoi-navy transition-colors bg-white px-4 py-2 rounded-full border border-zinc-200 w-fit shadow-sm hover:shadow-md"
              >
                <ArrowLeft size={16} /> Voltar para lista
              </button>

              <div className="bg-white rounded-[40px] border border-zinc-200 overflow-hidden shadow-2xl shadow-zinc-200/50">
                <div className="p-8 sm:p-12 border-b border-zinc-100 bg-develoi-navy flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex gap-2">
                      <Badge color="gold" size="sm">Vaga Aberta</Badge>
                      {selectedJob.department && (
                        <Badge color="default" size="sm" className="bg-white/10 border-white/10 text-white">{selectedJob.department}</Badge>
                      )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">{selectedJob.title}</h2>
                    <div className="flex flex-wrap gap-4">
                       <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={16} className="text-develoi-gold" /> {selectedJob.city}, {selectedJob.state}
                      </span>
                      <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={16} className="text-develoi-gold" /> {selectedJob.work_model}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl text-white text-center min-w-[160px] border border-white/10 relative z-10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-develoi-gold mb-1">Remuneração</p>
                    <p className="text-xl font-black">{selectedJob.salary_min ? `R$ ${selectedJob.salary_min}` : 'A combinar'}</p>
                  </div>
                </div>

                <div className="p-8 sm:p-12 grid lg:grid-cols-5 gap-12">
                  <div className="space-y-10 lg:col-span-3">
                    <section>
                      <h4 className="text-xs font-black text-develoi-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-develoi-gold" /> Descrição da Vaga
                      </h4>
                      <div className="text-sm text-zinc-600 leading-loose prose prose-zinc max-w-none" 
                        dangerouslySetInnerHTML={{ __html: selectedJob.description || "Não especificado." }} 
                      />
                    </section>

                    {selectedJob.responsibilities && (
                      <section>
                        <h4 className="text-xs font-black text-develoi-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-develoi-gold" /> Responsabilidades
                        </h4>
                        <div className="text-sm text-zinc-600 leading-loose prose prose-zinc max-w-none" 
                          dangerouslySetInnerHTML={{ __html: selectedJob.responsibilities }} 
                        />
                      </section>
                    )}

                    {selectedJob.technical_requirements && (
                      <section>
                        <h4 className="text-xs font-black text-develoi-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Briefcase size={16} className="text-develoi-gold" /> Requisitos Técnicos
                        </h4>
                        <div className="text-sm text-zinc-600 leading-loose prose prose-zinc max-w-none" 
                          dangerouslySetInnerHTML={{ __html: selectedJob.technical_requirements }} 
                        />
                      </section>
                    )}
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-[32px] space-y-6 sticky top-28">
                      <h4 className="text-lg font-black text-develoi-navy tracking-tight text-center">Inscrição Rápida</h4>
                      <p className="text-[11px] font-medium text-zinc-500 text-center uppercase tracking-widest">
                        Envie seus dados para participar da seleção
                      </p>
                      
                      {applied ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 bg-develoi-gold text-white rounded-full flex items-center justify-center shadow-lg shadow-develoi-gold/30">
                            <CheckCircle2 size={32} />
                          </div>
                          <p className="text-lg font-black text-zinc-900">Candidatura Enviada!</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                            Fique atento ao seu e-mail e WhatsApp<br/>para os próximos passos.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleApply} className="space-y-4 pt-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input required name="full_name" type="text" className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold transition-all placeholder:text-zinc-400" placeholder="Seu nome completo" disabled={loadingSubmit} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                            <input required name="email" type="email" className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold transition-all placeholder:text-zinc-400" placeholder="exemplo@email.com" disabled={loadingSubmit} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Currículo (PDF)</label>
                            <div className="relative">
                              <input required name="resume" type="file" accept=".pdf" className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 file:hidden cursor-pointer focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold outline-none" disabled={loadingSubmit} />
                              <Send size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                            </div>
                          </div>
                          <button type="submit" disabled={loadingSubmit} className="w-full py-4 bg-develoi-gold hover:bg-develoi-gold/90 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-develoi-gold/20 active:scale-[0.98] mt-6 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loadingSubmit ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <><Send size={16} /> Enviar Candidatura</>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Public Footer */}
      <footer className="py-12 mt-12 border-t border-zinc-200 text-center space-y-6 bg-white">
        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-develoi-navy mx-auto border border-zinc-100">
          <Sparkles size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">© 2026 {tenantInfo?.name || "Empresa Parceira"}</p>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Tecnologia RECRUTE IA</p>
        </div>
      </footer>
    </div>
  );
}

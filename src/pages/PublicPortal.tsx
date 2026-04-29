import React, { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Globe, 
  FileText, 
  Send, 
  CheckCircle2, 
  ArrowLeft 
} from "lucide-react";
import { PanelCard, Badge, useToast } from "@/src/components/ui";
import { Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";

export default function PublicPortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/jobs?tenantId=fadel')
      .then(res => res.json())
      .then(data => setJobs(data.filter((j: any) => j.is_public)))
      .catch(() => toast.error("Erro ao carregar vagas."))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(true);
    toast.success("Candidatura enviada com sucesso!");
    setTimeout(() => {
      setApplied(false);
      setSelectedJob(null);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Public Header */}
      <header className="h-24 bg-white border-b border-zinc-200 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center text-amber-950 shadow-lg shadow-amber-400/20">
              <Building2 size={22} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 tracking-tighter leading-none">FADEL CARREIRAS</h1>
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-0.5">Portal de Oportunidades</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Sobre a Fadel</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Nossas Unidades</a>
            <button className="px-5 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Área do Candidato</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 sm:p-10 py-12 space-y-12">
        <AnimatePresence mode="wait">
          {!selectedJob ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Encontre seu próximo desafio</h2>
                <p className="text-sm text-zinc-500 font-bold max-w-xl mx-auto leading-relaxed">
                  Trabalhe em uma das maiores operadoras logísticas do Brasil. Venha fazer parte do time Fadel!
                </p>
              </div>

              <div className="grid gap-4">
                {jobs.map(job => (
                  <button 
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="group bg-white p-6 rounded-3xl border border-zinc-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/5 transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors shrink-0">
                        <Briefcase size={28} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-zinc-900 group-hover:text-amber-600 transition-colors leading-tight">{job.title}</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <MapPin size={12} /> {job.city}, {job.state}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Globe size={12} /> {job.work_model}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <FileText size={12} /> {job.contract_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge color="default" className="hidden lg:flex">{job.department || "Geral"}</Badge>
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-100 flex items-center justify-center text-zinc-300 group-hover:border-amber-400 group-hover:text-amber-600 transition-all">
                        <Send size={18} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <button 
                onClick={() => setSelectedJob(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar para lista
              </button>

              <div className="bg-white rounded-[40px] border border-zinc-200 overflow-hidden shadow-2xl shadow-zinc-200/50">
                <div className="p-10 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-4">
                    <Badge color="success" size="sm">Candidaturas Abertas</Badge>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">{selectedJob.title}</h2>
                    <div className="flex flex-wrap gap-4">
                       <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={16} className="text-amber-500" /> {selectedJob.city}, {selectedJob.state}
                      </span>
                      <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={16} className="text-amber-500" /> {selectedJob.work_model}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-900 rounded-3xl text-white text-center min-w-[140px]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Salário</p>
                    <p className="text-lg font-black">{selectedJob.salary_min ? `R$ ${selectedJob.salary_min}` : 'A combinar'}</p>
                  </div>
                </div>

                <div className="p-10 grid lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <section>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Descrição e Responsabilidades</h4>
                      <div className="text-sm font-bold text-zinc-600 leading-relaxed prose prose-zinc" 
                        dangerouslySetInnerHTML={{ __html: selectedJob.responsibilities || selectedJob.description || "Não especificado." }} 
                      />
                    </section>
                    <section>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Requisitos Principais</h4>
                      <div className="text-sm font-bold text-zinc-600 leading-relaxed prose prose-zinc" 
                        dangerouslySetInnerHTML={{ __html: selectedJob.technical_requirements || "Ver descrição acima." }} 
                      />
                    </section>
                  </div>

                  <div className="space-y-8">
                    <div className="p-8 bg-zinc-900 rounded-[32px] text-white space-y-6">
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">Candidate-se Agora</h4>
                      
                      {applied ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/20">
                            <CheckCircle2 size={32} />
                          </div>
                          <p className="text-sm font-black">Candidatura Enviada!</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Fique atento ao seu e-mail e WhatsApp.</p>
                        </div>
                      ) : (
                        <form onSubmit={handleApply} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-zinc-600" placeholder="Seu nome..." />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                            <input required type="email" className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-zinc-600" placeholder="exemplo@email.com" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Currículo (PDF)</label>
                            <div className="relative">
                              <input required type="file" className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 file:hidden cursor-pointer" />
                              <Globe size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-400/10 active:scale-[0.98] mt-4">
                            Enviar Currículo
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
      <footer className="py-20 px-10 border-t border-zinc-200 text-center space-y-6">
        <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 mx-auto">
          <Building2 size={24} />
        </div>
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">© 2026 Fadel Transportes • Central de Recrutamento & Seleção</p>
      </footer>
    </div>
  );
}

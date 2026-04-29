import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Linkedin, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Star, 
  FileText, 
  Calendar, 
  Edit, 
  Trash2, 
  Plus, 
  Sparkles, 
  BarChart3, 
  History, 
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Building2,
  Download,
  ClipboardCheck,
  Wand2,
  Brain,
  Eye
} from "lucide-react";
import { PanelCard, Badge, useToast } from "@/src/components/ui";
import { Candidate, Job, CandidateJobMatch } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";

interface CandidateDetailsProps {
  candidate: Candidate;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

export default function CandidateDetails({ candidate, onClose, onEdit, onRefresh }: CandidateDetailsProps) {
  const toast = useToast();
  const { currentUnit } = useUnit();
  const [activeTab, setActiveTab] = useState<'summary' | 'resume' | 'jobs' | 'ai' | 'disc' | 'history'>('summary');
  const [loading, setLoading] = useState(false);
  const [showLinkJob, setShowLinkJob] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<any[]>([]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/hr-tools`);
      const data = await res.json();
      setEvaluations(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (candidate.id && activeTab === 'evaluations') {
      fetchEvaluations();
    }
  }, [candidate.id, activeTab]);

  const TABS = [
    { id: 'summary', label: 'Resumo', icon: User },
    { id: 'resume', label: 'Currículo', icon: FileText },
    { id: 'jobs', label: 'Vagas', icon: Briefcase },
    { id: 'evaluations', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'ai', label: 'Análise IA', icon: Sparkles },
    { id: 'disc', label: 'DISC', icon: BarChart3 },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  const fetchAvailableJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=fadel&status=Aberta`);
      const data = await res.json();
      setAvailableJobs(data);
    } catch (err) {
      toast.error("Erro ao carregar vagas disponíveis.");
    }
  };

  const handleLinkJob = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/link-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId, tenant_id: 'fadel' })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao vincular vaga.");
      }
      toast.success("Candidato vinculado com sucesso!");
      setShowLinkJob(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (jobId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/analyze-job/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'fadel' })
      });
      if (!res.ok) throw new Error("Falha na análise IA.");
      toast.success("Análise IA concluída!");
      onRefresh();
    } catch (err) {
      toast.error("Erro ao processar análise com Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = async () => {
    if (!confirm("Deseja realmente remover este talento?")) return;
    try {
      await fetch(`/api/candidates/${candidate.id}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      onClose();
      onRefresh();
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    }
  };

  return (
    <div className="h-full bg-white border-l border-zinc-100 flex flex-col shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-zinc-900/10">
              {candidate.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900">{candidate.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge color="default" size="sm" className="bg-white border-zinc-200">
                  {candidate.status}
                </Badge>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {candidate.city}, {candidate.state}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={onEdit}
              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-xl transition-all border border-transparent hover:border-zinc-200"
            >
              <Edit size={18} />
            </button>
            <button 
              onClick={deleteCandidate}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 overflow-x-auto pb-1 no-scrollbar">
           <div className="flex items-center gap-1 shrink-0"><Mail size={12} className="text-zinc-300" /> {candidate.email}</div>
           <div className="flex items-center gap-1 shrink-0"><Phone size={12} className="text-zinc-300" /> {candidate.phone || "N/A"}</div>
           <div className="flex items-center gap-1 shrink-0"><Linkedin size={12} className="text-zinc-300" /> LinkedIn</div>
           <div className="flex items-center gap-1 shrink-0"><Calendar size={12} className="text-zinc-300" /> {new Date(candidate.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex px-4 border-b border-zinc-100 overflow-x-auto no-scrollbar bg-white sticky top-0 z-10">
        {TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 shrink-0",
              activeTab === tab.id ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="candidate-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
        {activeTab === 'evaluations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instrumentos Aplicados</h4>
               <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                 <Plus size={10} /> Enviar Nova
               </button>
            </div>

            {evaluations.length === 0 ? (
               <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4 bg-white">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                    <ClipboardCheck size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-zinc-900">Nenhuma avaliação</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">O candidato ainda não respondeu nenhum instrumento de RH.</p>
                  </div>
               </div>
            ) : (
              <div className="space-y-4">
                 {evaluations.map((evalItem) => (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={evalItem.id} 
                    className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:border-zinc-900 transition-all group"
                   >
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-zinc-50 rounded-xl text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                              {evalItem.tool_type === 'DISC' ? <Brain size={18} /> : <FileText size={18} />}
                           </div>
                           <div>
                              <h5 className="text-xs font-black text-zinc-900">{evalItem.tool_name}</h5>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                Concluído em {new Date(evalItem.completed_at).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                        <Badge color={evalItem.score >= 80 ? 'success' : evalItem.score >= 50 ? 'warning' : 'default'} size="sm">
                          {evalItem.score ? `${evalItem.score}%` : 'N/A'}
                        </Badge>
                     </div>

                     <div className="bg-zinc-50 p-4 rounded-2xl mb-4 border border-zinc-100">
                        <div className="flex items-center gap-1.5 mb-2 text-zinc-400">
                           <Sparkles size={12} className="text-amber-500" />
                           <span className="text-[9px] font-black uppercase tracking-widest">Parecer IA</span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-600 leading-relaxed italic">
                           "{evalItem.ai_summary || "Análise de IA ainda não gerada para esta resposta."}"
                        </p>
                     </div>

                     <div className="flex items-center gap-2">
                        <button className="flex-1 py-3 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                           <Eye size={14} /> Ver Detalhes
                        </button>
                        {!evalItem.ai_analysis_json && (
                          <button className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
                             <Wand2 size={14} /> Analisar com IA
                          </button>
                        )}
                     </div>
                   </motion.div>
                 ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Resumo Profissional</h4>
              <p className="text-sm font-bold text-zinc-600 leading-relaxed">
                {candidate.professional_summary || "Candidato sem resumo profissional cadastrado."}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Pretensão Salarial</p>
                <p className="text-sm font-black text-zinc-900">{candidate.desired_salary ? `R$ ${candidate.desired_salary}` : "Não informada"}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Anos de Experiência</p>
                <p className="text-sm font-black text-zinc-900">{candidate.experience_years ? `${candidate.experience_years} anos` : "Não informado"}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Escolaridade</p>
                <p className="text-sm font-black text-zinc-900">{candidate.education_level || "Não informado"}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Modelo Desejado</p>
                <p className="text-sm font-black text-zinc-900">{candidate.desired_work_model || "Indiferente"}</p>
              </div>
            </div>

            <section className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Principais Skills</h4>
               <div className="flex flex-wrap gap-2">
                 {candidate.hard_skills?.split(',').map((skill, i) => (
                   <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                     {skill.trim()}
                   </span>
                 )) || <p className="text-[10px] font-bold text-zinc-400">Nenhuma skill listada.</p>}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-6">
            <PanelCard title="Currículo Extraído" icon={FileText}>
              <div className="prose prose-zinc max-w-none text-sm font-bold text-zinc-600 leading-relaxed bg-zinc-50 p-6 rounded-3xl border border-zinc-100 max-h-[500px] overflow-y-auto">
                {candidate.professional_experiences || candidate.professional_summary || "Texto do currículo não disponível."}
              </div>
            </PanelCard>
            
            <div className="flex gap-3">
              <button className="flex-1 py-3.5 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                <Download size={16} /> Baixar PDF Original
              </button>
               <button className="flex-1 py-3.5 bg-white border border-zinc-200 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm hover:bg-zinc-50 active:scale-95 transition-all">
                <ExternalLink size={16} /> Ver Arquivo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Processos Seletivos</h4>
              {!showLinkJob && (
                <button 
                  onClick={() => { setShowLinkJob(true); fetchAvailableJobs(); }}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 hover:text-amber-950 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus size={14} /> Vincular a Vaga
                </button>
              )}
            </div>

            <AnimatePresence>
              {showLinkJob && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white p-6 rounded-3xl border-2 border-fadel-navy/20 overflow-hidden"
                >
                  <p className="text-[10px] font-black text-fadel-navy uppercase tracking-widest mb-4">Selecionar Oportunidade</p>
                  <div className="flex gap-3">
                    <select 
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="flex-1 px-4 py-3 bg-zinc-100 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-fadel-navy"
                    >
                      <option value="">Escolha a vaga...</option>
                      {availableJobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title} ({j.city}/{j.state})</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleLinkJob}
                      disabled={loading || !selectedJobId}
                      className="px-6 py-3 bg-fadel-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                    >
                      Vincular
                    </button>
                    <button 
                      onClick={() => setShowLinkJob(false)}
                      className="p-3 bg-zinc-100 text-zinc-400 hover:text-zinc-900 rounded-xl transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {candidate.matches?.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-zinc-200 rounded-[32px] space-y-3">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                    <Briefcase size={24} />
                  </div>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Nenhuma vaga vinculada.</p>
                </div>
              ) : (
                candidate.matches?.map(match => (
                  <div key={match.id} className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-4 group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-900 group-hover:text-fadel-red transition-colors">{match.job_title}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{match.job_city}/{match.job_state}</p>
                        </div>
                      </div>
                      <Badge color="default" size="sm">{match.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-50 pt-4">
                       <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                           <span className={cn(
                             "text-sm font-black",
                             match.compatibility_score && match.compatibility_score >= 80 ? "text-emerald-600" :
                             match.compatibility_score && match.compatibility_score >= 60 ? "text-amber-600" :
                             "text-zinc-400"
                           )}>
                             {match.compatibility_score ? `${match.compatibility_score}%` : "--"}
                           </span>
                           <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Score IA</span>
                         </div>
                       </div>
                       <button 
                        onClick={() => runAiAnalysis(match.job_id)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-fadel-navy/5 hover:bg-fadel-navy hover:text-white text-fadel-navy rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-fadel-navy/10"
                       >
                         <Sparkles size={14} /> 
                         {match.compatibility_score ? "Refazer Análise" : "Rodar Análise IA"}
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
           <div className="space-y-8">
             <div className="bg-fadel-red/5 p-6 rounded-3xl border border-fadel-red/20">
               <div className="flex items-center gap-3 mb-4 text-fadel-navy">
                 <Sparkles size={20} className="text-fadel-red" />
                 <h4 className="text-xs font-black uppercase tracking-widest">Relatório Gemini AI</h4>
               </div>
               <p className="text-[11px] font-bold text-zinc-500 leading-relaxed">
                 O Gemini analisa currículos, disc e requisitos das vagas para gerar insights profundos sobre o fit cultural e técnico.
               </p>
             </div>

             {candidate.matches?.some(m => m.compatibility_score) ? (
               candidate.matches.filter(m => m.compatibility_score).map(match => (
                 <PanelCard key={match.id} title={`Análise: ${match.job_title}`} icon={Briefcase}>
                   <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Compatibilidade</p>
                         <p className="text-lg font-black text-zinc-900">{match.compatibility_score}%</p>
                       </div>
                       <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Classificação</p>
                         <p className="text-sm font-black text-zinc-900">{match.compatibility_classification}</p>
                       </div>
                     </div>
                     
                     <div className="space-y-4">
                       <div>
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Pontos Fortes</p>
                         <ul className="space-y-1">
                           {JSON.parse(match.strengths || '[]').map((s: string, i: number) => (
                             <li key={i} className="text-xs font-bold text-zinc-600 flex items-start gap-2">
                               <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" /> {s}
                             </li>
                           ))}
                         </ul>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Pontos de Atenção</p>
                         <ul className="space-y-1">
                           {JSON.parse(match.attention_points || '[]').map((s: string, i: number) => (
                             <li key={i} className="text-xs font-bold text-zinc-600 flex items-start gap-2">
                               <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" /> {s}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>

                     <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Resumo Executivo</p>
                        <p className="text-xs font-bold text-zinc-600 leading-relaxed">{match.compatibility_summary}</p>
                     </div>

                     <div className="bg-zinc-900 p-6 rounded-3xl text-white">
                        <div className="flex items-center gap-2 mb-4 text-amber-400">
                          <MessageCircle size={16} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Perguntas Sugeridas para Entrevista</p>
                        </div>
                        <div className="space-y-3">
                           {JSON.parse(match.interview_questions || '[]').map((q: string, i: number) => (
                             <div key={i} className="p-3 bg-white/5 rounded-xl text-xs font-medium border border-white/5 italic">
                               "{q}"
                             </div>
                           ))}
                        </div>
                     </div>
                   </div>
                 </PanelCard>
               ))
             ) : (
               <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4">
                 <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                   <Sparkles size={32} />
                 </div>
                 <div className="space-y-1">
                   <p className="text-sm font-black text-zinc-900">Nenhuma análise disponível</p>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vincule o candidato a uma vaga para rodar a análise Gemini.</p>
                 </div>
               </div>
             )}
           </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Linha do Tempo</h4>
               <button className="text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900">Ver Todas</button>
            </div>
            
            <div className="space-y-6 relative ml-3">
              <div className="absolute top-0 bottom-0 left-0 w-px bg-zinc-100" />
              
              {candidate.history?.map((event, i) => (
                <div key={event.id} className="relative pl-8">
                  <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-zinc-200 border-2 border-white" />
                  <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-[11px] font-black text-zinc-900">{event.title}</span>
                       <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                         {new Date(event.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">{event.description}</p>
                    {event.created_by && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-4 h-4 bg-zinc-500 rounded-full" />
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{event.created_by}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="relative pl-8 text-fadel-navy">
                <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-fadel-navy" />
                <div className="bg-fadel-navy/5 p-4 rounded-2xl border border-fadel-navy/10">
                  <div className="flex items-center gap-2 mb-2 text-fadel-navy">
                    <Plus size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Nota</span>
                  </div>
                  <textarea 
                    placeholder="Escreva uma observação interna..."
                    className="w-full bg-white border border-fadel-navy/10 rounded-xl p-3 text-[11px] font-bold focus:ring-2 focus:ring-fadel-navy outline-none min-h-[80px]"
                  />
                  <button className="mt-3 px-4 py-2 bg-fadel-navy text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-fadel-navy/20 active:scale-95 transition-all">
                    Salvar Nota
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistence overlay for loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center flex-col gap-4">
           <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Processando Inteligência...</p>
        </div>
      )}
    </div>
  );
}

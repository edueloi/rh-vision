import React, { useState, useEffect } from "react";
import { 
  X, 
  Globe, 
  Sparkles, 
  Copy, 
  Check, 
  MessageCircle, 
  Linkedin, 
  Share2, 
  Clock, 
  Building2, 
  MapPin, 
  Briefcase,
  Target,
  FileText,
  Users,
  Edit,
  User,
  ChevronRight
} from "lucide-react";
import { PanelCard, Badge, useToast } from "@/src/components/ui";
import { Job, CandidateJobMatch } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
  onEdit: () => void;
}

export default function JobDetails({ job, onClose, onEdit }: JobDetailsProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'ai' | 'candidates'>('details');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<{ title?: string; content?: string; text?: string }>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [appliedCandidates, setAppliedCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchAppliedCandidates();
    }
  }, [activeTab]);

  const fetchAppliedCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/candidates`);
      const data = await res.json();
      setAppliedCandidates(data);
    } catch (err) {
      toast.error("Erro ao carregar candidatos.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const generateAIText = async (channel: string) => {
    setAiLoading(true);
    setAiOutput({});
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-publication-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, tone: 'atrativo' })
      });
      const data = await res.json();
      setAiOutput(data);
      setActiveTab('ai');
    } catch (err) {
      toast.error("Erro ao gerar texto com IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 leading-tight">{job.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={job.status === 'Aberta' ? 'success' : 'default'} size="sm">{job.status}</Badge>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{job.department || "Geral"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
             <button onClick={onEdit} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
               <Edit size={20} />
             </button>
             <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex px-6 border-b border-zinc-100 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('details')}
            className={cn(
              "px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0",
              activeTab === 'details' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Detalhes
            {activeTab === 'details' && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('candidates')}
            className={cn(
              "px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2",
              activeTab === 'candidates' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Users size={14} /> Candidatos
            {activeTab === 'candidates' && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2",
              activeTab === 'ai' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Sparkles size={14} /> Divulgação IA
            {activeTab === 'ai' && <motion.div layoutId="job-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-zinc-50/20">
          {activeTab === 'details' && (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Localização', val: `${job.city}, ${job.state}`, icon: MapPin },
                  { label: 'Contrato', val: job.contract_type, icon: FileText },
                  { label: 'Modelo', val: job.work_model, icon: Globe },
                  { label: 'Salário', val: job.salary_min ? `R$ ${job.salary_min}` : 'A combinar', icon: Target },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                    <item.icon size={14} className="text-zinc-400 mb-2" />
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{item.label}</p>
                    <p className="text-xs font-black text-zinc-900 mt-1 truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              {/* Sections */}
              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={14} /> Descrição da Vaga
                  </h4>
                  <div className="text-sm font-bold text-zinc-700 leading-relaxed bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm prose prose-zinc" 
                    dangerouslySetInnerHTML={{ __html: job.description || job.responsibilities || "Nenhuma descrição detalhada fornecida." }} 
                  />
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                  <section>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Requisitos Técnicos</h4>
                    <div className="p-5 bg-white rounded-3xl text-xs font-bold text-zinc-600 leading-relaxed border border-zinc-100 shadow-sm" 
                      dangerouslySetInnerHTML={{ __html: job.technical_requirements || "Ver descrição geral." }}
                    />
                  </section>
                  <section>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Critérios de IA</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Score Mínimo</span>
                        <span className="text-xs font-black text-amber-600">{job.compatibility_threshold}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Peso Hard Skills</span>
                        <span className="text-xs font-black text-zinc-900">{job.weight_technical}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Anos de Experiência</span>
                        <span className="text-xs font-black text-zinc-900">{job.min_experience_years || 0}a</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{appliedCandidates.length} Candidatos</span>
                  </div>
                  <button 
                    onClick={fetchAppliedCandidates}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors"
                  >
                    <Clock size={16} />
                  </button>
               </div>

               {loadingCandidates ? (
                 <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Buscando candidatos...</p>
                 </div>
               ) : appliedCandidates.length === 0 ? (
                 <div className="py-20 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-zinc-100 rounded-[40px]">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
                      <User size={24} />
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nenhum candidato inscrito ainda.</p>
                 </div>
               ) : (
                 <div className="grid gap-3">
                    {appliedCandidates.map(match => (
                       <div key={match.id} className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between group hover:border-zinc-300 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center font-black text-zinc-400 text-[10px]">
                               {match.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                             </div>
                             <div>
                               <p className="text-xs font-black text-zinc-900">{match.full_name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <Badge color="default" size="sm">{match.status}</Badge>
                                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{match.compatibility_score}% Match IA</span>
                               </div>
                             </div>
                          </div>
                          <button className="p-2 text-zinc-200 group-hover:text-zinc-900 transition-colors">
                            <ChevronRight size={18} />
                          </button>
                       </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8">
              <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles size={20} className="text-amber-600" />
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-widest">Divulgação com IA</h4>
                </div>
                <p className="text-[11px] font-bold text-amber-800 mb-6 leading-relaxed">
                  Gere textos atraentes para diferentes canais usando o Gemini.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600' },
                    { id: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500' },
                    { id: 'Indeed/Infojobs', icon: Globe, color: 'bg-indigo-600' },
                    { id: 'Instagram', icon: Share2, color: 'bg-pink-500' },
                  ].map(c => (
                    <button 
                      key={c.id}
                      onClick={() => generateAIText(c.id)}
                      disabled={aiLoading}
                      className="flex flex-col items-center gap-2 p-3 bg-white hover:bg-zinc-50 rounded-2xl border border-amber-100 transition-all active:scale-95 group shadow-sm"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-all", c.color)}>
                        <c.icon size={20} />
                      </div>
                      <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">{c.id.split('/')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {aiLoading && (
                <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                   <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gemini está trabalhando...</p>
                </div>
              )}

              {aiOutput.text && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-6"
                 >
                   <PanelCard 
                    title="Anúncio Sugerido" 
                    icon={Sparkles}
                    action={
                      <button 
                        onClick={() => handleCopy(aiOutput.text!, 'full')}
                        className="p-2 text-zinc-400 hover:text-amber-500 transition-colors"
                      >
                        {copied === 'full' ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    }
                   >
                     <div className="whitespace-pre-wrap text-xs font-bold text-zinc-600 leading-relaxed bg-zinc-50 p-6 rounded-3xl border border-zinc-100 max-h-96 overflow-y-auto">
                        {aiOutput.text}
                     </div>
                   </PanelCard>
                 </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
          <button 
            onClick={() => window.open(`/portal/vagas/${job.id}`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-zinc-200 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all font-sans"
          >
            <Share2 size={16} /> Link Público
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]"
          >
            <Check size={16} /> Publicar Vaga
          </button>
        </div>
      </motion.div>
    </div>
  );
}


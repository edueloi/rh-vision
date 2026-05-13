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
  Eye,
  PlayCircle,
  PauseCircle,
  XCircle
} from "lucide-react";
import { 
  PanelCard, 
  Badge, 
  useToast,
  Button,
  IconButton,
  ContentCard,
  Select,
  Textarea
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Candidate, Job, CandidateJobMatch } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";

interface CandidateDetailsProps {
  candidate: Candidate;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  hideHeader?: boolean;
}

export default function CandidateDetails({ candidate, onClose, onEdit, onRefresh, hideHeader }: CandidateDetailsProps) {
  const toast = useToast();
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const [activeTab, setActiveTab] = useState<'summary' | 'resume' | 'jobs' | 'evaluations' | 'ai' | 'disc' | 'history'>('summary');
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
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableJobs(data);
    } catch (err) {
      toast.error("Erro ao carregar vagas disponíveis.");
    }
  };

  const handleCandidateFileAction = (mode: 'view' | 'download') => {
    const primaryFile = candidate.files?.[0];

    if (!primaryFile?.id) {
      toast.error("Nenhum currículo anexado para este candidato.");
      return;
    }

    const url = `/api/candidates/${candidate.id}/files/${primaryFile.id}${mode === 'download' ? '?download=1' : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLinkJob = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/link-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId, tenant_id: tenantId })
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
        body: JSON.stringify({ tenant_id: tenantId })
      });
      if (!res.ok) throw new Error("Falha na análise IA.");
      toast.success("Análise IA concluída!");
      onRefresh();
    } catch (err) {
      toast.error("Erro ao processar análise com a Aurora AI.");
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
    <div className="h-full bg-white flex flex-col overflow-hidden relative">
      {/* Header */}
      {!hideHeader && (
        <div className="p-8 border-b border-zinc-100 bg-zinc-50/30 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-develoi-navy text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-develoi-navy/20">
                {candidate.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">{candidate.full_name}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge color={
                    candidate.status === 'Novo' ? 'primary' :
                    candidate.status === 'Compatível' ? 'success' :
                    candidate.status === 'Entrevista' ? 'warning' :
                    candidate.status === 'Reprovado' ? 'danger' : 'info'
                  } size="sm">
                    {candidate.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    <MapPin size={12} className="text-zinc-300" />
                    {candidate.city}, {candidate.state}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton 
                onClick={onEdit}
                variant="outline"
                className="bg-white"
                aria-label="Editar candidato"
              >
                <Edit size={18} />
              </IconButton>
              <IconButton 
                onClick={deleteCandidate}
                variant="outline"
                className="bg-white text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
                aria-label="Excluir candidato"
              >
                <Trash2 size={18} />
              </IconButton>
              <div className="w-px h-8 bg-zinc-200 mx-2" />
              <IconButton 
                onClick={onClose}
                variant="ghost"
                aria-label="Fechar detalhes"
              >
                <X size={24} />
              </IconButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
               <Mail size={14} className="text-zinc-300" /> 
               <span className="text-zinc-600">{candidate.email}</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
               <Phone size={14} className="text-zinc-300" /> 
               <span className="text-zinc-600">{candidate.phone || "N/A"}</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
               <Linkedin size={14} className="text-[#0077B5]" /> 
               <span className="text-zinc-600">LinkedIn</span>
             </div>
             <div className="flex items-center gap-2 ml-auto shrink-0">
               <Calendar size={14} className="text-zinc-300" /> 
               <span>CRIADO EM {new Date(candidate.created_at).toLocaleDateString('pt-BR')}</span>
             </div>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex px-6 border-b border-zinc-100 overflow-x-auto no-scrollbar bg-white sticky top-0 z-20">
        {TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 shrink-0",
              activeTab === tab.id ? "text-develoi-navy" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-develoi-navy" : "text-zinc-300"} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="candidate-tab-active" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-develoi-navy" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-zinc-50/20 no-scrollbar">
        {hideHeader && (
          <div className="flex flex-col gap-6 mb-2">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-develoi-navy text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-develoi-navy/20">
                {candidate.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">{candidate.full_name}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge color={
                    candidate.status === 'Novo' ? 'primary' :
                    candidate.status === 'Compatível' ? 'success' :
                    candidate.status === 'Entrevista' ? 'warning' :
                    candidate.status === 'Reprovado' ? 'danger' : 'info'
                  } size="sm">
                    {candidate.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    <MapPin size={12} className="text-zinc-300" />
                    {candidate.city}, {candidate.state}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
                 <Mail size={14} className="text-zinc-300" /> 
                 <span className="text-zinc-600">{candidate.email}</span>
               </div>
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
                 <Phone size={14} className="text-zinc-300" /> 
                 <span className="text-zinc-600">{candidate.phone || "N/A"}</span>
               </div>
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm shrink-0">
                 <Linkedin size={14} className="text-[#0077B5]" /> 
                 <span className="text-zinc-600">LinkedIn</span>
               </div>
            </div>
            <div className="h-px bg-zinc-100 w-full" />
          </div>
        )}

        {activeTab === 'evaluations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instrumentos Aplicados</h4>
               <Button variant="outline" size="sm" iconLeft={<Plus size={14} />}>
                 Enviar Nova
               </Button>
            </div>

            {evaluations.length === 0 ? (
               <div className="p-20 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4 bg-white">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                    <ClipboardCheck size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-zinc-900">Nenhuma avaliação</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                      O candidato ainda não respondeu nenhum instrumento de RH.
                    </p>
                  </div>
               </div>
            ) : (
              <div className="grid gap-6">
                 {evaluations.map((evalItem) => (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={evalItem.id} 
                    className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:border-develoi-navy/30 transition-all group"
                   >
                     <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-zinc-50 rounded-2xl text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white transition-all shadow-sm">
                              {evalItem.tool_type === 'DISC' ? <Brain size={20} /> : <FileText size={20} />}
                           </div>
                           <div>
                              <h5 className="text-sm font-black text-zinc-900">{evalItem.tool_name}</h5>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                Concluído em {new Date(evalItem.completed_at).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                        <Badge color={evalItem.score >= 80 ? 'success' : evalItem.score >= 50 ? 'warning' : 'default'} size="sm">
                          {evalItem.score ? `${evalItem.score}%` : 'N/A'}
                        </Badge>
                     </div>

                     <div className="bg-zinc-50/50 p-5 rounded-2xl mb-6 border border-zinc-100 italic">
                        <div className="flex items-center gap-1.5 mb-2 text-amber-600">
                           <Sparkles size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest">Parecer Aurora IA</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-600 leading-relaxed">
                           "{evalItem.ai_summary || "Análise de IA ainda não gerada para esta resposta."}"
                        </p>
                     </div>

                     <div className="flex items-center gap-3">
                        <Button variant="primary" fullWidth iconLeft={<Eye size={16} />}>
                           Ver Detalhes
                        </Button>
                        {!evalItem.ai_analysis_json && (
                          <Button variant="outline" fullWidth iconLeft={<Wand2 size={16} />}>
                             Analisar IA
                          </Button>
                        )}
                     </div>
                   </motion.div>
                 ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-10">
            <section className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-develoi-navy">
                <FileText size={16} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Resumo Profissional</h4>
              </div>
              <p className="text-sm font-semibold text-zinc-600 leading-relaxed">
                {candidate.professional_summary || "Candidato sem resumo profissional cadastrado."}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-6">
              <ContentCard className="flex flex-col gap-1.5" padding="md">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pretensão Salarial</p>
                <p className="text-base font-black text-zinc-900">{candidate.desired_salary ? `R$ ${candidate.desired_salary}` : "Não informada"}</p>
              </ContentCard>
              <ContentCard className="flex flex-col gap-1.5" padding="md">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Anos de Experiência</p>
                <p className="text-base font-black text-zinc-900">{candidate.experience_years ? `${candidate.experience_years} anos` : "Não informado"}</p>
              </ContentCard>
              <ContentCard className="flex flex-col gap-1.5" padding="md">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Escolaridade</p>
                <p className="text-base font-black text-zinc-900 truncate">{candidate.education_level || "Não informado"}</p>
              </ContentCard>
              <ContentCard className="flex flex-col gap-1.5" padding="md">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Modelo Desejado</p>
                <p className="text-base font-black text-zinc-900">{candidate.desired_work_model || "Indiferente"}</p>
              </ContentCard>
            </div>

            <section className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm space-y-6">
               <div className="flex items-center gap-2 text-develoi-navy">
                 <Sparkles size={16} />
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Principais Competências</h4>
               </div>
               <div className="flex flex-wrap gap-2.5">
                 {candidate.hard_skills_json ? (
                   JSON.parse(candidate.hard_skills_json).map((skill: string, i: number) => (
                     <span key={i} className="px-4 py-2 bg-develoi-navy/5 border border-develoi-navy/10 text-develoi-navy text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-develoi-navy hover:text-white transition-all cursor-default">
                       {skill}
                     </span>
                   ))
                 ) : candidate.hard_skills?.split(',').map((skill, i) => (
                   <span key={i} className="px-4 py-2 bg-zinc-50 border border-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-develoi-navy hover:text-white hover:border-develoi-navy transition-all cursor-default">
                     {skill.trim()}
                   </span>
                 )) || <p className="text-[10px] font-bold text-zinc-400 italic">Nenhuma skill listada.</p>}
               </div>
            </section>

            {candidate.experiences_json && JSON.parse(candidate.experiences_json).length > 0 && (
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={14} /> Histórico Profissional
                </h4>
                <div className="grid gap-4">
                  {JSON.parse(candidate.experiences_json).map((exp: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:border-develoi-navy/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-black text-zinc-900">{exp.role}</p>
                        <Badge color="default" size="sm">{exp.period}</Badge>
                      </div>
                      <p className="text-xs font-bold text-develoi-navy mb-3">{exp.company}</p>
                      <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {candidate.education_json && JSON.parse(candidate.education_json).length > 0 && (
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} /> Formação Acadêmica
                </h4>
                <div className="grid gap-4">
                  {JSON.parse(candidate.education_json).map((edu: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{edu.course}</p>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{edu.institution}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-develoi-navy uppercase tracking-widest">{edu.status}</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{edu.period}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-8">
            <PanelCard 
              title="Currículo Extraído" 
              icon={FileText}
              className="bg-white shadow-sm border-zinc-100"
            >
              <div className="prose prose-zinc max-w-none text-sm font-semibold text-zinc-600 leading-relaxed bg-zinc-50/50 p-8 rounded-[32px] border border-zinc-100 max-h-[600px] overflow-y-auto whitespace-pre-wrap no-scrollbar">
                {candidate.professional_experiences || candidate.files?.[0]?.extracted_text || candidate.professional_summary || "Texto do currículo não disponível."}
              </div>
            </PanelCard>
            
            <div className="flex gap-4">
              <Button
                onClick={() => handleCandidateFileAction('download')}
                disabled={!candidate.files?.length}
                fullWidth
                size="lg"
                variant="primary"
                iconLeft={<Download size={18} />}
              >
                Baixar PDF Original
              </Button>
              <Button
                onClick={() => handleCandidateFileAction('view')}
                disabled={!candidate.files?.length}
                fullWidth
                size="lg"
                variant="outline"
                className="bg-white"
                iconLeft={<ExternalLink size={18} />}
              >
                Ver Arquivo
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Processos Seletivos</h4>
              {!showLinkJob && (
                <Button 
                  onClick={() => { setShowLinkJob(true); fetchAvailableJobs(); }}
                  size="sm"
                  iconLeft={<Plus size={14} />}
                >
                  Vincular a Vaga
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showLinkJob && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-develoi-navy/5 p-6 rounded-[32px] border border-develoi-navy/10 overflow-hidden space-y-4"
                >
                  <p className="text-[10px] font-black text-develoi-navy uppercase tracking-widest">Vincular Nova Oportunidade</p>
                  <div className="flex gap-3">
                    <Select 
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="bg-white"
                    >
                      <option value="">Escolha a vaga...</option>
                      {availableJobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title} ({j.city}/{j.state})</option>
                      ))}
                    </Select>
                    <Button 
                      onClick={handleLinkJob}
                      disabled={loading || !selectedJobId}
                      variant="primary"
                    >
                      Vincular
                    </Button>
                    <IconButton 
                      onClick={() => setShowLinkJob(false)}
                      variant="ghost"
                      className="bg-white border border-zinc-200"
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4">
              {candidate.matches?.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-zinc-200 rounded-[40px] space-y-4 bg-white">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                    <Briefcase size={32} />
                  </div>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Nenhuma vaga vinculada.</p>
                </div>
              ) : (
                candidate.matches?.map(match => (
                  <ContentCard key={match.id} className="group hover:border-develoi-navy/30 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-navy/10 group-hover:text-develoi-navy transition-all">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 tracking-tight">{match.job_title}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{match.job_city}/{match.job_state}</p>
                        </div>
                      </div>
                      <Badge color="default" size="sm">{match.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-50 pt-5">
                       <div className="flex items-center gap-4">
                         <div className="flex flex-col">
                           <span className={cn(
                             "text-lg font-black tracking-tight",
                             match.compatibility_score && match.compatibility_score >= 80 ? "text-emerald-600" :
                             match.compatibility_score && match.compatibility_score >= 60 ? "text-amber-600" :
                             "text-zinc-400"
                           )}>
                             {match.compatibility_score ? `${match.compatibility_score}%` : "--"}
                           </span>
                           <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Match Aurora AI</span>
                         </div>
                       </div>
                       <Button 
                        onClick={() => runAiAnalysis(match.job_id)}
                        disabled={loading}
                        variant="ghost"
                        size="sm"
                        className="bg-develoi-navy/5 text-develoi-navy hover:bg-develoi-navy hover:text-white"
                        iconLeft={<Sparkles size={14} />}
                       >
                         {match.compatibility_score ? "Refazer Análise" : "Rodar Análise IA"}
                       </Button>
                    </div>
                  </ContentCard>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
           <div className="space-y-10">
             <div className="bg-develoi-navy p-8 rounded-[40px] text-white shadow-xl shadow-develoi-navy/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-3">
                   <Sparkles size={24} className="text-develoi-gold" />
                   <h4 className="text-sm font-black uppercase tracking-widest tracking-[0.2em]">Relatório Aurora AI</h4>
                 </div>
                 <p className="text-xs font-medium text-develoi-navy-light leading-relaxed max-w-lg opacity-80">
                   Análise automatizada de compatibilidade baseada em competências técnicas, fit cultural e perfil comportamental.
                 </p>
               </div>
             </div>

             {candidate.matches?.some(m => m.compatibility_score) ? (
               candidate.matches.filter(m => m.compatibility_score).map(match => (
                 <PanelCard 
                  key={match.id} 
                  title={`Análise de Fit: ${match.job_title}`} 
                  icon={Briefcase}
                  className="bg-white border-zinc-100"
                 >
                   <div className="space-y-10">
                     <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col gap-1">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Score de Compatibilidade</p>
                         <p className="text-3xl font-black text-zinc-900">{match.compatibility_score}%</p>
                       </div>
                       <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col gap-1">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Classificação de Fit</p>
                         <p className="text-xl font-black text-develoi-navy">{match.compatibility_classification}</p>
                       </div>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                           <Check size={14} /> Pontos de Destaque
                         </p>
                         <ul className="space-y-3">
                           {JSON.parse(match.strengths || '[]').map((s: string, i: number) => (
                             <li key={i} className="text-xs font-semibold text-zinc-600 flex items-start gap-2.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> {s}
                             </li>
                           ))}
                         </ul>
                       </div>
                       <div className="space-y-4">
                         <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                           <PauseCircle size={14} /> Riscos e Atenção
                         </p>
                         <ul className="space-y-3">
                           {JSON.parse(match.attention_points || '[]').map((s: string, i: number) => (
                             <li key={i} className="text-xs font-semibold text-zinc-600 flex items-start gap-2.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /> {s}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>

                     <section className="bg-zinc-50 p-8 rounded-[32px] border border-zinc-100 space-y-4">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resumo da Inteligência</p>
                        <p className="text-sm font-semibold text-zinc-600 leading-relaxed italic">
                          "{match.compatibility_summary}"
                        </p>
                     </section>

                     <section className="bg-develoi-navy p-8 rounded-[40px] text-white space-y-6">
                        <div className="flex items-center gap-3 text-develoi-gold">
                          <MessageCircle size={20} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Perguntas Sugeridas para Entrevista</p>
                        </div>
                        <div className="grid gap-3">
                           {JSON.parse(match.interview_questions || '[]').map((q: string, i: number) => (
                             <div key={i} className="p-5 bg-white/5 rounded-2xl text-xs font-semibold border border-white/5 italic leading-relaxed hover:bg-white/10 transition-all">
                               "{q}"
                             </div>
                           ))}
                        </div>
                     </section>
                   </div>
                 </PanelCard>
               ))
             ) : (
               <div className="p-24 text-center border-2 border-dashed border-zinc-200 rounded-[48px] space-y-6 bg-white">
                 <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto">
                   <Sparkles size={40} />
                 </div>
                 <div className="space-y-2 max-w-xs mx-auto">
                   <p className="text-base font-black text-zinc-900 leading-tight">Nenhuma análise disponível</p>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                     Vincule o candidato a uma vaga para rodar a análise comportamental da Aurora AI.
                   </p>
                 </div>
               </div>
             )}
           </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Linha do Tempo</h4>
               <button className="text-[9px] font-black text-develoi-navy uppercase tracking-widest hover:underline">Ver Todas</button>
            </div>
            
            <div className="space-y-8 relative ml-4">
              <div className="absolute top-0 bottom-0 left-[-16px] w-0.5 bg-zinc-100" />
              
              {candidate.history?.map((event, i) => (
                <div key={event.id} className="relative">
                  <div className="absolute left-[-20.5px] top-2 w-3 h-3 rounded-full bg-white border-2 border-zinc-200 group-hover:border-develoi-navy transition-all" />
                  <div className="bg-white p-6 rounded-[28px] border border-zinc-100 shadow-sm hover:border-zinc-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-black text-zinc-900">{event.title}</span>
                       <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                         {new Date(event.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">{event.description}</p>
                    {event.created_by && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-5 h-5 bg-zinc-100 rounded-full border border-zinc-200 flex items-center justify-center text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                          {event.created_by[0]}
                        </div>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{event.created_by}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="relative">
                <div className="absolute left-[-20.5px] top-2 w-3 h-3 rounded-full bg-develoi-navy ring-4 ring-develoi-navy/10" />
                <div className="bg-white p-8 rounded-[32px] border-2 border-develoi-navy/10 shadow-xl shadow-develoi-navy/5 space-y-6">
                  <div className="flex items-center gap-3 text-develoi-navy">
                    <Plus size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Adicionar Nota Interna</span>
                  </div>
                  <Textarea 
                    placeholder="Escreva uma observação para a equipe de recrutamento..."
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button variant="primary" iconLeft={<Plus size={16} />}>
                      Salvar Observação
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistence overlay for loading */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/60 backdrop-blur-md z-[100] flex items-center justify-center flex-col gap-6"
          >
             <div className="w-16 h-16 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin shadow-xl" />
             <div className="text-center space-y-1">
               <p className="text-xs font-black text-develoi-navy uppercase tracking-[0.3em]">Aurora AI</p>
               <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Processando Inteligência de Fit...</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  X,
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  FileText,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  BarChart3,
  History,
  ExternalLink,
  MessageCircle,
  Check,
  Building2,
  Download,
  ClipboardCheck,
  Wand2,
  Brain,
  Eye,
  PauseCircle,
  ArrowLeft
} from "lucide-react";
import {
  PanelCard,
  Badge,
  useToast,
  Button,
  IconButton,
  ContentCard,
  Select,
  Textarea,
  Modal
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Candidate, Job } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useUnit } from "@/src/lib/useUnit";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { decodeId, encodeId } from "@/src/lib/hashid";

export default function CandidateDetailsPage() {
  const { candidateId: candidateSlug } = useParams<{ candidateId: string }>();
  const candidateId = candidateSlug ? String(decodeId(candidateSlug)) : undefined;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const initialTab = (searchParams.get('tab') as any) || 'summary';
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'resume' | 'jobs' | 'evaluations' | 'ai' | 'disc' | 'history'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [showLinkJob, setShowLinkJob] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    setPageLoading(true);
    fetch(`/api/candidates/${candidateId}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setCandidate)
      .catch(() => {
        toast.error("Candidato não encontrado.");
        navigate("/candidatos", { replace: true });
      })
      .finally(() => setPageLoading(false));
  }, [candidateId, navigate, toast]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/hr-tools`);
      const data = await res.json();
      setEvaluations(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (candidateId && activeTab === 'evaluations') {
      fetchEvaluations();
    }
  }, [candidateId, activeTab]);

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
    const primaryFile = candidate?.files?.[0];
    if (!primaryFile?.id) {
      toast.error("Nenhum currículo anexado para este candidato.");
      return;
    }
    const url = `/api/candidates/${candidateId}/files/${primaryFile.id}${mode === 'download' ? '?download=1' : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLinkJob = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/link-job`, {
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
      // refresh candidate
      const updated = await fetch(`/api/candidates/${candidateId}`).then(r => r.json());
      setCandidate(updated);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (jobId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/analyze-job/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      });
      if (!res.ok) throw new Error("Falha na análise IA.");
      toast.success("Análise IA concluída!");
      const updated = await fetch(`/api/candidates/${candidateId}`).then(r => r.json());
      setCandidate(updated);
    } catch (err) {
      toast.error("Erro ao processar análise com a Aurora AI.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      navigate("/candidatos");
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'summary', label: 'Resumo', icon: User },
    { id: 'resume', label: 'Currículo', icon: FileText },
    { id: 'jobs', label: 'Vagas', icon: Briefcase },
    { id: 'evaluations', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'ai', label: 'Análise IA', icon: Sparkles },
    { id: 'disc', label: 'DISC', icon: BarChart3 },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy border-t-transparent" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando candidato...</p>
      </div>
    );
  }

  if (!candidate) return null;

  const statusBadgeColor = () => {
    if (candidate.status === 'Novo') return 'primary';
    if (candidate.status === 'Compatível') return 'success';
    if (candidate.status === 'Entrevista') return 'warning';
    if (candidate.status === 'Reprovado') return 'danger';
    return 'info';
  };

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      <div className="w-full">

        {/* Back navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/candidatos")}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Gestão de Talentos
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Edit size={14} />}
              onClick={() => navigate(`/candidatos/${encodeId(Number(candidateId))}/editar`)}
            >
              Editar
            </Button>
            <IconButton
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="text-zinc-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
              aria-label="Excluir candidato"
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-4 items-start">

          {/* LEFT — Perfil fixo */}
          <div className="w-64 shrink-0 hidden lg:flex flex-col gap-3">
            {/* Avatar + nome */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-5 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-develoi-navy text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-develoi-navy/20">
                {candidate.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h1 className="text-sm font-black text-zinc-900 leading-tight">{candidate.full_name}</h1>
                {candidate.desired_position && (
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{candidate.desired_position}</p>
                )}
                <div className="mt-2">
                  <Badge color={statusBadgeColor()} size="sm">{candidate.status}</Badge>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-4 space-y-2.5">
              {candidate.city && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <MapPin size={13} className="text-zinc-300 shrink-0" />
                  <span>{candidate.city}{candidate.state ? `, ${candidate.state}` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Mail size={13} className="text-zinc-300 shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Phone size={13} className="text-zinc-300 shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-50">
                <Calendar size={13} className="text-zinc-300 shrink-0" />
                <span>{new Date(candidate.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Nav abas vertical */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-[11px] font-bold transition-all relative border-b border-zinc-50 last:border-0",
                    activeTab === tab.id
                      ? "text-develoi-navy bg-develoi-navy/5"
                      : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  {activeTab === tab.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-develoi-navy rounded-r" />
                  )}
                  <tab.icon size={14} className={activeTab === tab.id ? "text-develoi-navy" : "text-zinc-300"} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — Conteúdo */}
          <div className="flex-1 min-w-0">

            {/* Mobile: header compacto */}
            <div className="lg:hidden bg-white border border-zinc-100 rounded-2xl shadow-sm p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-develoi-navy text-white rounded-xl flex items-center justify-center font-black text-base shrink-0">
                  {candidate.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm font-black text-zinc-900">{candidate.full_name}</h1>
                    <Badge color={statusBadgeColor()} size="sm">{candidate.status}</Badge>
                  </div>
                  {candidate.desired_position && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">{candidate.desired_position}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: tabs horizontais */}
            <div className="lg:hidden bg-white border border-zinc-100 rounded-2xl shadow-sm mb-4 overflow-x-auto no-scrollbar">
              <div className="flex">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 shrink-0",
                      activeTab === tab.id ? "text-develoi-navy" : "text-zinc-400"
                    )}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="candidate-tab-mobile" className="absolute bottom-0 left-0 right-0 h-0.5 bg-develoi-navy" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">

            {activeTab === 'summary' && (
              <div className="space-y-8">
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
                        <Button onClick={handleLinkJob} disabled={loading || !selectedJobId} variant="primary">
                          Vincular
                        </Button>
                        <IconButton onClick={() => setShowLinkJob(false)} variant="ghost" className="bg-white border border-zinc-200">
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
                </div>

                <div className="space-y-8 relative ml-4">
                  <div className="absolute top-0 bottom-0 left-[-16px] w-0.5 bg-zinc-100" />

                  {candidate.history?.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute left-[-20.5px] top-2 w-3 h-3 rounded-full bg-white border-2 border-zinc-200" />
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
                            <div className="w-5 h-5 bg-zinc-100 rounded-full border border-zinc-200 flex items-center justify-center text-[8px] font-black text-zinc-400 uppercase">
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

            {activeTab === 'disc' && (
              <div className="p-24 text-center border-2 border-dashed border-zinc-200 rounded-[48px] space-y-6 bg-white">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto">
                  <BarChart3 size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black text-zinc-900">Perfil DISC</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    Nenhuma avaliação DISC disponível para este candidato.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex items-center justify-center flex-col gap-6"
          >
            <div className="w-16 h-16 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin shadow-xl" />
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-develoi-navy uppercase tracking-[0.3em]">Aurora AI</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Processando...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
        title="Excluir Candidato"
        description="Esta ação remove o talento permanentemente."
        icon={<Trash2 size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={loading}>
              Remover
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Deseja realmente remover <span className="font-black text-zinc-900">{candidate.full_name}</span> permanentemente?
        </p>
      </Modal>
    </div>
  );
}

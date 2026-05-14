import React, { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Linkedin, 
  Briefcase, 
  Save, 
  FileText,
  DollarSign,
  ArrowLeft,
  Loader2,
  Check,
  X as CloseIcon,
  MapPin,
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  Target,
  CheckCircle2,
  Languages,
  Award,
  Rocket,
  ChevronRight
} from "lucide-react";
import { 
  useToast,
  Button,
  IconButton,
  Badge,
  Input,
  Select,
  Textarea,
  FormRow,
  Modal,
  SplitterLine
} from "@/src/components/ui";
import { Candidate } from "@/src/types";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CandidateFormProps {
  candidate?: Candidate | null;
  onBack: () => void;
  onSuccess: () => void;
}

// --- List Item Interfaces ---

interface Experience {
  company: string;
  role: string;
  period: string;
  location?: string;
  description: string;
}

interface Education {
  course: string;
  institution: string;
  period?: string;
  degree_type?: string;
  start_date?: string;
  end_date?: string;
  status: string;
}

interface Certification {
  name: string;
  institution?: string;
  year?: string;
}

interface Project {
  name: string;
  description: string;
  technologies?: string;
}

interface Language {
  language: string;
  level: string;
}

const Section = ({ title, icon: Icon, children, rightNode, className }: { title: string, icon: any, children: React.ReactNode, rightNode?: React.ReactNode, className?: string }) => (
  <div className={cn("mb-6 last:mb-0", className)}>
    <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-zinc-50 to-white border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-develoi-navy/10 rounded-lg text-develoi-navy">
            <Icon size={16} />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">{title}</h3>
        </div>
        {rightNode}
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  </div>
);

export default function CandidateForm({ candidate, onBack, onSuccess }: CandidateFormProps) {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // States for lists
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [hardSkillsList, setHardSkillsList] = useState<string[]>([]);
  const [softSkillsList, setSoftSkillsList] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Candidate>>({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    linkedin_url: "",
    desired_position: "",
    desired_salary: undefined,
    experience_years: undefined,
    education_level: "",
    professional_summary: "",
    hard_skills: "",
    soft_skills: "",
    source: "Manual",
    status: "Novo",
    desired_work_model: "Presencial",
    cnh_category: "Não possui",
    has_cnh: false
  });

  useEffect(() => {
    if (candidate) {
      setFormData(candidate);
      try {
        if (candidate.experiences_json) setExperiences(JSON.parse(candidate.experiences_json));
        if (candidate.education_json) setEducation(JSON.parse(candidate.education_json));
        if (candidate.certifications_json) setCertifications(JSON.parse(candidate.certifications_json));
        if (candidate.projects_json) setProjects(JSON.parse(candidate.projects_json));
        if (candidate.languages_json) setLanguages(JSON.parse(candidate.languages_json));
        if (candidate.hard_skills_json) setHardSkillsList(JSON.parse(candidate.hard_skills_json));
        if (candidate.soft_skills_json) setSoftSkillsList(JSON.parse(candidate.soft_skills_json));
        if (candidate.objectives_json) setObjectives(JSON.parse(candidate.objectives_json));
      } catch (e) {
        console.error("Erro ao converter dados estruturados", e);
      }
    }
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Salvando candidato, aguarde...");
    try {
      const url = candidate ? `/api/candidates/${candidate.id}` : '/api/candidates';
      const method = candidate ? 'PUT' : 'POST';

      const updatedFormData = {
        ...formData,
        hard_skills: hardSkillsList.join(', '),
        soft_skills: softSkillsList.join(', '),
        languages: languages.map(l => `${l.language} (${l.level})`).join(', ')
      };

      const payload = {
        ...updatedFormData,
        tenant_id: tenantId,
        unit_id: currentUnit.id,
        experiences_json: JSON.stringify(experiences),
        education_json: JSON.stringify(education),
        certifications_json: JSON.stringify(certifications),
        projects_json: JSON.stringify(projects),
        languages_json: JSON.stringify(languages),
        hard_skills_json: JSON.stringify(hardSkillsList),
        soft_skills_json: JSON.stringify(softSkillsList),
        objectives_json: JSON.stringify(objectives)
      };

      const dbPayload: any = {};
      const excludedKeys = ['files', 'matches', 'disc', 'history', 'units', 'tenant'];

      Object.keys(payload).forEach(key => {
        if (!excludedKeys.includes(key) && payload[key as keyof typeof payload] !== undefined) {
          dbPayload[key] = payload[key as keyof typeof payload];
        }
      });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      if (!res.ok) throw new Error("Erro ao salvar candidato");

      toast.dismiss(toastId);
      toast.success(candidate ? "Candidato atualizado com sucesso!" : "Candidato cadastrado com sucesso!");
      onSuccess();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Ocorreu um erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error("Por favor, envie apenas arquivos PDF.");
      return;
    }

    setIsParsing(true);
    const toastId = toast.loading("Processando currículo com Aurora AI, aguarde...");
    try {
      const body = new FormData();
      body.append('resume', file);

      const res = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        body
      });

      if (!res.ok) throw new Error("Falha na análise");

      const data = await res.json();
      toast.dismiss(toastId);
      setParsedPreview(data);
      toast.success("Currículo analisado com sucesso!");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Erro ao analisar currículo.");
    } finally {
      setIsParsing(false);
    }
  };

  const confirmParsedData = () => {
    if (!parsedPreview) return;
    const d = parsedPreview;

    setFormData(prev => ({
      ...prev,
      full_name: d.full_name || prev.full_name,
      email: d.email || prev.email,
      phone: d.phone || prev.phone,
      city: d.city || prev.city,
      state: d.state || prev.state,
      linkedin_url: d.linkedin_url || prev.linkedin_url,
      desired_position: d.desired_position || prev.desired_position,
      desired_salary: d.desired_salary || prev.desired_salary,
      experience_years: d.experience_years || prev.experience_years,
      education_level: d.education_level || prev.education_level,
      professional_summary: d.professional_summary || prev.professional_summary,
      cnh_category: d.cnh_category || prev.cnh_category,
      has_cnh: d.has_cnh ?? prev.has_cnh,
    }));

    if (d.experiences_list) setExperiences(d.experiences_list);
    if (d.education_list) setEducation(d.education_list);
    if (d.certifications_list) setCertifications(d.certifications_list);
    if (d.projects_list) setProjects(d.projects_list);
    if (d.languages_list) setLanguages(d.languages_list);
    if (d.hard_skills) setHardSkillsList(d.hard_skills.split(',').map((s: string) => s.trim()));
    if (d.soft_skills) setSoftSkillsList(d.soft_skills.split(',').map((s: string) => s.trim()));
    if (d.objectives) setObjectives(Array.isArray(d.objectives) ? d.objectives : [d.objectives]);

    setParsedPreview(null);
  };

  return (
    <div className="w-full">
        {/* Enhanced Top Control Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
          <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconButton onClick={onBack} variant="outline" className="h-8 w-8 border-zinc-200 hover:bg-zinc-50">
                <ArrowLeft size={16} />
              </IconButton>
              <div className="h-5 w-px bg-zinc-200" />
              <div>
                <h1 className="text-base font-bold text-develoi-navy truncate">
                  {candidate ? candidate.full_name : 'Novo Talento'}
                </h1>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                  Matriz - Fadel • Candidatos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-widest">Sincronizado</span>
               </div>
               <Button 
                 form="candidate-form"
                 type="submit"
                 disabled={loading || isParsing}
                 className="h-8 px-4 rounded-lg bg-develoi-navy hover:bg-develoi-navy/95 text-[9px] font-bold uppercase tracking-wider text-white"
                 iconLeft={loading ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
               >
                 {candidate ? 'Salvar' : 'Finalizar'}
               </Button>
            </div>
          </div>

          {/* Quick Controls Bar */}
          <div className="w-full px-4 sm:px-6 py-2.5 bg-zinc-50/50 border-t border-zinc-100 flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2">
               <span className="text-[8px] font-bold text-zinc-400 uppercase">Status:</span>
               <Select 
                 value={formData.status} 
                 onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                 className="h-9 text-xs bg-white border-zinc-200 rounded-lg text-zinc-600 font-medium"
               >
                 {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </Select>
             </div>
             
             <div className="flex items-center gap-2">
               <span className="text-[8px] font-bold text-zinc-400 uppercase">Modelo:</span>
               <Select 
                 value={formData.desired_work_model} 
                 onChange={e => setFormData(f => ({ ...f, desired_work_model: e.target.value as any }))}
                 className="h-9 text-xs bg-white border-zinc-200 rounded-lg text-zinc-600 font-medium"
               >
                 <option>Presencial</option>
                 <option>Híbrido</option>
                 <option>Home Office</option>
               </Select>
             </div>

             <div className="flex items-center gap-2">
               <span className="text-[8px] font-bold text-zinc-400 uppercase">Pretensão:</span>
               <div className="relative">
                 <DollarSign size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                 <Input 
                   type="number"
                   value={formData.desired_salary || ''}
                   onChange={e => setFormData(f => ({ ...f, desired_salary: Number(e.target.value) || undefined }))}
                   className="h-9 pl-6 w-24 text-xs bg-white border-zinc-200 rounded-lg"
                   placeholder="0.00"
                 />
               </div>
             </div>

             <div className="flex-1" />

             <button 
               onClick={() => fileInputRef.current?.click()} 
               type="button" 
               className="flex items-center gap-1.5 px-3 py-1.5 bg-develoi-navy/10 border border-develoi-navy/20 rounded-lg cursor-pointer hover:bg-develoi-navy/15 transition-all text-develoi-navy text-[9px] font-bold uppercase"
             >
                <Sparkles size={11} />
                Importar CV
                <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} accept=".pdf" className="hidden" />
             </button>
          </div>
        </div>

        <form id="candidate-form" onSubmit={handleSubmit} className="w-full px-4 sm:px-6 py-4">
          {/* Grid Layout - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Core Info */}
            <div className="lg:col-span-2">
              <Section title="Dados de Contato" icon={User}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input required label="Nome Completo" value={formData.full_name} onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))} className="h-9 bg-white text-sm" />
                    <Input required type="email" label="E-mail" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} className="h-9 bg-white text-sm" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Telefone" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="h-9 bg-white text-sm" placeholder="(11) 99999-9999" />
                    <Input label="LinkedIn" value={formData.linkedin_url} onChange={e => setFormData(f => ({ ...f, linkedin_url: e.target.value }))} className="h-9 bg-white text-sm" placeholder="linkedin.com/in/..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input label="Cidade" value={formData.city} onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} className="h-9 bg-white text-sm" />
                    <Input label="Estado (UF)" value={formData.state} onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} maxLength={2} className="h-9 bg-white text-sm uppercase text-center" />
                    <Select label="CNH" value={formData.cnh_category || "Não possui"} onChange={e => {
                      const val = e.target.value;
                      setFormData(f => ({ ...f, cnh_category: val, has_cnh: val !== "Não possui" }));
                    }} className="h-9 bg-white text-sm">
                      <option>Não possui</option>
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>D</option>
                      <option>E</option>
                      <option>AB</option>
                      <option>AC</option>
                    </Select>
                  </div>
                </div>
              </Section>

              <Section title="Objetivos" icon={Rocket}>
                <div className="space-y-2">
                  <Input
                    placeholder="Pressione Enter para adicionar..."
                    className="h-8 bg-white text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !objectives.includes(val)) {
                          setObjectives(prev => [...prev, val]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {objectives.map((obj, i) => (
                      <span key={i} className="inline-flex items-start gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold break-words max-w-full">
                        <span className="break-words">{obj}</span>
                        <button type="button" onClick={() => setObjectives(prev => prev.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-amber-200 rounded transition-colors text-amber-400 shrink-0 mt-px">
                          <CloseIcon size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {objectives.length === 0 && (
                    <p className="text-center text-[10px] text-zinc-400 py-3">Nenhum objetivo adicionado</p>
                  )}
                </div>
              </Section>

              <Section title="Resumo Profissional" icon={FileText}>
                <Textarea 
                  label="Biografia"
                  value={formData.professional_summary}
                  onChange={e => setFormData(f => ({ ...f, professional_summary: e.target.value }))}
                  placeholder="Descreva a trajetória profissional do candidato..."
                  rows={4}
                  className="text-xs bg-white border-zinc-200 p-4 rounded-lg"
                />
              </Section>

              <Section title="Habilidades" icon={Target}>
                <div className="space-y-5">
                   {/* Hard Skills */}
                   <div>
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-bold text-zinc-600 uppercase">Hard Skills</label>
                        <span className="text-[10px] text-zinc-400 font-medium">{hardSkillsList.length}</span>
                     </div>
                     <div className="relative mb-2">
                       <Input 
                         placeholder="Digite e pressione Enter..."
                         className="h-8 bg-white pr-12 text-xs"
                         onKeyDown={e => { 
                           if (e.key === 'Enter') { 
                             e.preventDefault(); 
                             const v = e.currentTarget.value.trim(); 
                             if (v && !hardSkillsList.includes(v)) { 
                               setHardSkillsList(p => [...p, v]); 
                               e.currentTarget.value = ''; 
                             } 
                           } 
                         }}
                       />
                     </div>
                     <div className="flex flex-wrap gap-2">
                        <AnimatePresence mode="popLayout">
                          {hardSkillsList.map((skill, i) => (
                            <motion.div key={skill+i} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                              className="pl-2.5 pr-1 py-1 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-1.5 group transition-all"
                            >
                              <span className="text-[9px] font-semibold text-blue-700">{skill}</span>
                              <button type="button" onClick={() => setHardSkillsList(p => p.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-blue-100 rounded text-blue-300 hover:text-blue-600 transition-colors">
                                <CloseIcon size={10} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                     </div>
                   </div>

                   {/* Soft Skills */}
                   <div>
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-bold text-zinc-600 uppercase">Soft Skills</label>
                        <span className="text-[10px] text-zinc-400 font-medium">{softSkillsList.length}</span>
                     </div>
                     <div className="relative mb-2">
                       <Input 
                         placeholder="Digite e pressione Enter..."
                         className="h-8 bg-white pr-12 text-xs"
                         onKeyDown={e => { 
                           if (e.key === 'Enter') { 
                             e.preventDefault(); 
                             const v = e.currentTarget.value.trim(); 
                             if (v && !softSkillsList.includes(v)) { 
                               setSoftSkillsList(p => [...p, v]); 
                               e.currentTarget.value = ''; 
                             } 
                           } 
                         }}
                       />
                     </div>
                     <div className="flex flex-wrap gap-2">
                        <AnimatePresence mode="popLayout">
                          {softSkillsList.map((skill, i) => (
                            <motion.div key={skill+i} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                              className="pl-2.5 pr-1 py-1 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-1.5"
                            >
                              <span className="text-[9px] font-semibold text-purple-700">{skill}</span>
                              <button type="button" onClick={() => setSoftSkillsList(p => p.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-purple-100 rounded text-purple-300 hover:text-purple-600 transition-colors">
                                <CloseIcon size={10} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                     </div>
                   </div>
                </div>
              </Section>

              <Section 
                title="Experiência Profissional" 
                icon={Briefcase}
                rightNode={
                  <Button type="button" onClick={() => setExperiences([...experiences, { company: '', role: '', period: '', description: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1 px-3 rounded-lg text-zinc-600 font-bold text-xs" iconLeft={<Plus size={12} />}>
                    Adicionar
                  </Button>
                }
              >
                <div className="space-y-5">
                  <AnimatePresence mode="popLayout">
                    {experiences.map((exp, i) => (
                      <motion.div key={i} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-zinc-50 rounded-lg group relative border border-zinc-200 hover:border-zinc-300 transition-colors">
                        <button onClick={() => setExperiences(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1.5 bg-white rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <Input label="Empresa" value={exp.company} onChange={e => {
                            const n = [...experiences]; n[i].company = e.target.value; setExperiences(n);
                          }} className="h-8 bg-white text-xs" />
                          <Input label="Cargo" value={exp.role} onChange={e => {
                            const n = [...experiences]; n[i].role = e.target.value; setExperiences(n);
                          }} className="h-8 bg-white text-xs" />
                          <Input label="Período" value={exp.period} onChange={e => {
                            const n = [...experiences]; n[i].period = e.target.value; setExperiences(n);
                          }} className="h-8 bg-white text-xs" placeholder="ex: 01/2020 - 12/2023" />
                        </div>
                        <Textarea label="Descrição" value={exp.description} rows={2} onChange={e => {
                          const n = [...experiences]; n[i].description = e.target.value; setExperiences(n);
                        }} className="text-xs bg-white p-3 rounded" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {experiences.length === 0 && (
                    <div className="text-center py-6 text-zinc-400">
                      <Briefcase size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Nenhuma experiência adicionada ainda</p>
                    </div>
                  )}
                </div>
              </Section>

              <Section 
                title="Formação Acadêmica" 
                icon={GraduationCap}
                rightNode={
                  <Button type="button" onClick={() => setEducation([...education, { course: '', institution: '', status: 'Concluído', degree_type: '', start_date: '', end_date: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1 px-3 rounded-lg text-zinc-600 font-bold text-xs" iconLeft={<Plus size={12} />}>
                    Adicionar
                  </Button>
                }
              >
                <div className="space-y-5">
                     {education.map((edu, i) => (
                        <div key={i} className="p-4 bg-zinc-50 rounded-lg relative group border border-zinc-200 hover:border-zinc-300 transition-colors">
                           <button onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1.5 bg-white rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                             <Trash2 size={14} />
                           </button>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                             <Input label="Curso" value={edu.course} onChange={e => {
                               const n = [...education]; n[i].course = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs" />
                             <Select label="Tipo" value={edu.degree_type || ''} onChange={e => {
                               const n = [...education]; n[i].degree_type = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs">
                               <option value="">Selecione...</option>
                               <option value="Bacharelado">Bacharelado</option>
                               <option value="Especialização">Especialização</option>
                               <option value="MBA">MBA</option>
                               <option value="Mestrado">Mestrado</option>
                               <option value="Técnico">Técnico</option>
                               <option value="Outro">Outro</option>
                             </Select>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                             <Input label="Instituição" value={edu.institution} onChange={e => {
                               const n = [...education]; n[i].institution = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs" />
                             <Select label="Status" value={edu.status} onChange={e => {
                               const n = [...education]; n[i].status = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs">
                               <option value="Concluído">Concluído</option>
                               <option value="Em andamento">Em andamento</option>
                               <option value="Trancado">Trancado</option>
                             </Select>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <Input label="Início" value={edu.start_date || ''} onChange={e => {
                               const n = [...education]; n[i].start_date = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs" placeholder="MM/YYYY" />
                             <Input label="Fim/Previsão" value={edu.end_date || ''} onChange={e => {
                               const n = [...education]; n[i].end_date = e.target.value; setEducation(n);
                             }} className="h-8 bg-white text-xs" placeholder="MM/YYYY" />
                           </div>
                        </div>
                     ))}
                     {education.length === 0 && (
                        <div className="text-center py-6 text-zinc-400">
                          <GraduationCap size={24} className="mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Nenhuma formação adicionada ainda</p>
                        </div>
                     )}
                </div>
              </Section>

              <Section 
                title="Idiomas" 
                icon={Languages}
                rightNode={
                  <Button type="button" onClick={() => setLanguages([...languages, { language: '', level: 'Intermediário' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1 px-3 rounded-lg text-zinc-600 font-bold text-xs" iconLeft={<Plus size={12} />}>
                    Adicionar
                  </Button>
                }
              >
                <div className="space-y-3">
                     {languages.map((lang, i) => (
                        <div key={i} className="p-3 bg-zinc-50 rounded-lg relative group flex items-end gap-3 border border-zinc-200">
                           <div className="flex-1 grid grid-cols-2 gap-3">
                             <Input label="Idioma" value={lang.language} onChange={e => {
                               const n = [...languages]; n[i].language = e.target.value; setLanguages(n);
                             }} className="h-8 bg-white text-xs" />
                             <Select label="Nível" value={lang.level} onChange={e => {
                               const n = [...languages]; n[i].level = e.target.value; setLanguages(n);
                             }} className="h-8 bg-white text-xs">
                               <option value="Básico">Básico</option>
                               <option value="Intermediário">Intermediário</option>
                               <option value="Avançado">Avançado</option>
                               <option value="Fluente">Fluente</option>
                             </Select>
                           </div>
                           <button onClick={() => setLanguages(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                             <Trash2 size={14} />
                           </button>
                        </div>
                     ))}
                     {languages.length === 0 && (
                        <div className="text-center py-4 text-zinc-400">
                          <Languages size={20} className="mx-auto mb-1 opacity-30" />
                          <p className="text-xs">Nenhum idioma adicionado ainda</p>
                        </div>
                     )}
                </div>
              </Section>

            </div>

            {/* Right Column - Quick Info */}
            <div className="lg:col-span-1">
              <Section title="Posição Almejada" icon={Target}>
                <div className="space-y-3">
                  <Input 
                    label="Cargo Desejado"
                    value={formData.desired_position} 
                    onChange={e => setFormData(f => ({ ...f, desired_position: e.target.value }))}
                    className="h-9 bg-white text-sm"
                    placeholder="ex: Gerente de Projetos"
                  />
                  <Input 
                    type="number"
                    label="Anos de Experiência"
                    value={formData.experience_years || ''} 
                    onChange={e => setFormData(f => ({ ...f, experience_years: Number(e.target.value) || undefined }))}
                    className="h-9 bg-white text-sm"
                    placeholder="5"
                  />
                  <Select 
                    label="Nível de Formação"
                    value={formData.education_level} 
                    onChange={e => setFormData(f => ({ ...f, education_level: e.target.value }))}
                    className="h-9 bg-white text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="Fundamental">Fundamental</option>
                    <option value="Médio">Ensino Médio</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Superior">Superior</option>
                    <option value="Especialização">Especialização</option>
                    <option value="MBA">MBA</option>
                  </Select>
                  <Select 
                    label="Origem"
                    value={formData.source} 
                    onChange={e => setFormData(f => ({ ...f, source: e.target.value }))}
                    className="h-9 bg-white text-sm"
                  >
                    <option value="Manual">Manual</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Portal">Portal</option>
                    <option value="Outro">Outro</option>
                  </Select>
                </div>
              </Section>

              <Section title="Certificações" icon={Award} rightNode={<Button type="button" onClick={() => setCertifications([...certifications, { name: '', institution: '', year: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1 px-3 rounded-lg text-zinc-600 font-bold text-xs" iconLeft={<Plus size={12} />}>
                Adicionar
              </Button>}>
                <div className="space-y-3">
                  {certifications.map((cert, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-lg relative group border border-zinc-200 flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Input label="Certificação" value={cert.name} onChange={e => {
                          const n = [...certifications]; n[i].name = e.target.value; setCertifications(n);
                        }} className="h-8 bg-white text-xs" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input label="Instituição" value={cert.institution || ''} onChange={e => {
                            const n = [...certifications]; n[i].institution = e.target.value; setCertifications(n);
                          }} className="h-8 bg-white text-xs" />
                          <Input label="Ano" value={cert.year || ''} onChange={e => {
                            const n = [...certifications]; n[i].year = e.target.value; setCertifications(n);
                          }} className="h-8 bg-white text-xs" placeholder="2023" />
                        </div>
                      </div>
                      <button onClick={() => setCertifications(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {certifications.length === 0 && (
                     <div className="text-center py-3 text-zinc-400">
                       <Award size={20} className="mx-auto mb-1 opacity-30" />
                       <p className="text-[10px]">Nenhuma certificação</p>
                     </div>
                  )}
                </div>
              </Section>

              <Section title="Projetos" icon={Rocket} rightNode={<Button type="button" onClick={() => setProjects([...projects, { name: '', description: '', technologies: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1 px-3 rounded-lg text-zinc-600 font-bold text-xs" iconLeft={<Plus size={12} />}>
                Adicionar
              </Button>}>
                <div className="space-y-3">
                  {projects.map((proj, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-lg relative group border border-zinc-200">
                      <button onClick={() => setProjects(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={13} />
                      </button>
                      <Input label="Projeto" value={proj.name} onChange={e => {
                        const n = [...projects]; n[i].name = e.target.value; setProjects(n);
                      }} className="h-8 bg-white text-xs mb-2" />
                      <Input label="Tecnologias" value={proj.technologies || ''} onChange={e => {
                        const n = [...projects]; n[i].technologies = e.target.value; setProjects(n);
                      }} className="h-8 bg-white text-xs mb-2" placeholder="ex: React, Node.js" />
                      <Textarea label="Descrição" value={proj.description} rows={2} onChange={e => {
                        const n = [...projects]; n[i].description = e.target.value; setProjects(n);
                      }} className="text-xs bg-white p-2 rounded" />
                    </div>
                  ))}
                  {projects.length === 0 && (
                     <div className="text-center py-3 text-zinc-400">
                       <p className="text-[10px]">Nenhum projeto adicionado</p>
                     </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </form>
        <PreviewModal open={Boolean(parsedPreview)} data={parsedPreview} onConfirm={confirmParsedData} onCancel={() => setParsedPreview(null)} />
    </div>
  );
}

// --- Helper Preview Modal Component ---
function PreviewModal({ open, data, onConfirm, onCancel }: { open: boolean, data: any, onConfirm: () => void, onCancel: () => void }) {
  if (!data) return null;
  return (
    <Modal open={open} onClose={onCancel} size="lg" title="Pré-análise Aurora AI" description="Confirme as informações extraídas do currículo" icon={<Sparkles size={24} />}
      footer={
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={onCancel} variant="outline" fullWidth>Descartar</Button>
          <Button onClick={onConfirm} variant="primary" fullWidth iconLeft={<Check size={18} />}>Confirmar Tudo</Button>
        </div>
      }
    >
      <div className="space-y-8">
         <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">DADOS BÁSICOS</p>
              <div className="text-xs font-bold text-zinc-900">{data.full_name}</div>
              <div className="text-xs text-zinc-500">{data.email} | {data.phone}</div>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">RESUMO</p>
              <p className="text-[11px] text-zinc-600 italic leading-relaxed">"{data.professional_summary?.substring(0, 150)}..."</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-6">
           <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
             <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">EXPERIÊNCIAS ({data.experiences_list?.length || 0})</p>
             {data.experiences_list?.slice(0, 2).map((exp: any, i: number) => (
               <div key={i} className="mb-2 last:mb-0">
                 <p className="text-[11px] font-black text-zinc-900">{exp.role} @ {exp.company}</p>
                 <p className="text-[10px] text-zinc-400">{exp.period}</p>
               </div>
             ))}
           </div>
           <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
             <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">FORMAÇÃO ({data.education_list?.length || 0})</p>
             {data.education_list?.slice(0, 2).map((edu: any, i: number) => (
               <div key={i} className="mb-2 last:mb-0">
                 <p className="text-[11px] font-black text-zinc-900">{edu.course}</p>
                 <p className="text-[10px] text-zinc-500">{edu.institution}</p>
               </div>
             ))}
           </div>
         </div>
      </div>
    </Modal>
  );
}

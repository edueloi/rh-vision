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
  PageWrapper,
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
  <div className={cn("py-8 last:border-0", className)}>
    <SplitterLine 
      label={title} 
      icon={<Icon size={16} />} 
      rightNode={rightNode} 
      className="mb-8" 
    />
    {children}
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
      
      toast.success(candidate ? "Candidato atualizado!" : "Candidato cadastrado!");
      onSuccess();
    } catch (err) {
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
    try {
      const body = new FormData();
      body.append('resume', file);

      const res = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        body
      });

      if (!res.ok) throw new Error("Falha na análise");

      const data = await res.json();
      setParsedPreview(data);
      toast.success("Currículo analisado!");
    } catch (error) {
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
    <PageWrapper className="min-h-screen bg-white">
      <div className="w-full max-w-full mx-auto">
        {/* Unified Top Control Bar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-zinc-100">
          <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <IconButton onClick={onBack} variant="outline" className="h-8 w-8 border-zinc-200 hover:bg-zinc-50">
                <ArrowLeft size={16} />
              </IconButton>
              <div className="h-6 w-px bg-zinc-200" />
              <div>
                <h1 className="text-lg font-bold text-develoi-navy tracking-tight">
                  {candidate ? candidate.full_name : 'Novo Talento'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                    Matriz - Fadel <ChevronRight size={10} className="inline mx-0.5" /> Candidatos
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200/60">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sincronizado</span>
               </div>
               <Button 
                 form="candidate-form"
                 type="submit"
                 disabled={loading || isParsing}
                 className="h-9 px-6 rounded-lg bg-develoi-navy hover:bg-develoi-navy/95 text-[10px] font-bold uppercase tracking-wider shadow-md"
                 iconLeft={loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
               >
                 {candidate ? 'Salvar Alterações' : 'Finalizar Cadastro'}
               </Button>
            </div>
          </div>

          {/* Sleek Horizontal Status Bar */}
          <div className="px-8 py-2.5 bg-zinc-50/50 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-zinc-100/50">
             <div className="flex items-center gap-3">
               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Status:</span>
               <Select 
                 value={formData.status} 
                 onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                 className="h-8 min-w-[140px] text-[11px] font-semibold bg-white border-zinc-200 rounded shadow-sm"
               >
                 {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </Select>
             </div>
             
             <div className="flex items-center gap-3">
               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Modelo:</span>
               <Select 
                 value={formData.desired_work_model} 
                 onChange={e => setFormData(f => ({ ...f, desired_work_model: e.target.value as any }))}
                 className="h-8 min-w-[120px] text-[11px] font-semibold bg-white border-zinc-200 rounded shadow-sm"
               >
                 <option value="Presencial">Presencial</option>
                 <option value="Híbrido">Híbrido</option>
                 <option value="Home Office">Home Office</option>
               </Select>
             </div>

             <div className="flex items-center gap-3">
               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Pretensão:</span>
               <div className="relative">
                 <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                 <Input 
                   type="number"
                   value={formData.desired_salary}
                   onChange={e => setFormData(f => ({ ...f, desired_salary: Number(e.target.value) }))}
                   className="h-8 pl-7 w-28 text-[11px] font-semibold bg-white border-zinc-200 rounded shadow-sm"
                   placeholder="0.00"
                 />
               </div>
             </div>

             <div className="flex-1" />

             <button onClick={() => fileInputRef.current?.click()} type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-develoi-navy/20 rounded-md cursor-pointer hover:bg-develoi-navy/5 transition-all text-develoi-navy shadow-sm">
                <Sparkles size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Análise Aurora AI</span>
                <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} accept=".pdf" className="hidden" />
             </button>
          </div>
        </div>

        <form id="candidate-form" onSubmit={handleSubmit} className="px-8 lg:px-12 py-8 max-w-[1200px] mx-auto">
          <Section title="Dados de Contato" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <Input required label="Nome Completo" value={formData.full_name} onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))} className="h-10 bg-white" />
              <Input required type="email" label="E-mail" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} className="h-10 bg-white" />
              <Input label="Telefone" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="h-10 bg-white" />
              <Input label="LinkedIn" value={formData.linkedin_url} onChange={e => setFormData(f => ({ ...f, linkedin_url: e.target.value }))} className="h-10 bg-white" />
              <Input label="Cidade" value={formData.city} onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} className="h-10 bg-white" />
              <Input label="Estado (UF)" value={formData.state} onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} maxLength={2} className="h-10 bg-white uppercase text-center" />
              <Select label="Categoria CNH" value={formData.cnh_category || "Não possui"} onChange={e => {
                const val = e.target.value;
                setFormData(f => ({ ...f, cnh_category: val, has_cnh: val !== "Não possui" }));
              }} className="h-10 bg-white">
                <option value="Não possui">Não possui</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="AB">AB</option>
                <option value="AC">AC</option>
                <option value="AD">AD</option>
                <option value="AE">AE</option>
              </Select>
            </div>
          </Section>

          <Section title="Habilidades & Especialidades" icon={Target}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
               {/* Hard Skills */}
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hard Skills</p>
                    <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200">{hardSkillsList.length}</Badge>
                 </div>
                 <div className="relative">
                   <Input 
                     placeholder="Digite uma habilidade técnica e pressione Enter..."
                     className="h-10 bg-white pr-16"
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
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-300 uppercase tracking-widest pointer-events-none">
                     Enter ↵
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-2 pt-2">
                    <AnimatePresence mode="popLayout">
                      {hardSkillsList.map((skill, i) => (
                        <motion.div key={skill+i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="pl-3 pr-1 py-1.5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-2 group transition-all"
                        >
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">{skill}</span>
                          <button type="button" onClick={() => setHardSkillsList(p => p.filter((_, idx) => idx !== i))} className="p-1 hover:bg-blue-100 rounded-md text-blue-400 hover:text-blue-700 transition-colors">
                            <CloseIcon size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
               </div>

               {/* Soft Skills */}
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Soft Skills</p>
                    <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200">{softSkillsList.length}</Badge>
                 </div>
                 <div className="relative">
                   <Input 
                     placeholder="Digite uma habilidade comportamental e pressione Enter..."
                     className="h-10 bg-white pr-16"
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
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-300 uppercase tracking-widest pointer-events-none">
                     Enter ↵
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-2 pt-2">
                    <AnimatePresence mode="popLayout">
                      {softSkillsList.map((skill, i) => (
                        <motion.div key={skill+i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="pl-3 pr-1 py-1.5 bg-purple-50/50 border border-purple-100 rounded-lg flex items-center gap-2 group transition-all"
                        >
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-tight">{skill}</span>
                          <button type="button" onClick={() => setSoftSkillsList(p => p.filter((_, idx) => idx !== i))} className="p-1 hover:bg-purple-100 rounded-md text-purple-400 hover:text-purple-700 transition-colors">
                            <CloseIcon size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
               </div>
            </div>
          </Section>

          <Section title="Resumo Profissional" icon={FileText}>
            <div className="space-y-10">
              <Textarea 
                label="Biografia"
                value={formData.professional_summary}
                onChange={e => setFormData(f => ({ ...f, professional_summary: e.target.value }))}
                placeholder="Descreva a trajetória do candidato..."
                rows={5}
                className="text-xs bg-white border-zinc-200 p-5 rounded-2xl"
              />
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 block">Objetivos Profissionais</label>
                <div className="relative max-w-2xl">
                   <Input 
                     placeholder="Digite um objetivo profissional e pressione Enter..."
                     className="h-10 bg-white pr-16"
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
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-300 uppercase tracking-widest pointer-events-none">
                     Enter ↵
                   </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                   {objectives.map((obj, i) => (
                     <Badge key={i} className="pl-3 pr-1 py-1.5 rounded-lg bg-zinc-50 text-zinc-700 border-zinc-200 flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase">{obj}</span>
                       <button type="button" onClick={() => setObjectives(prev => prev.filter((_, idx) => idx !== i))} className="p-1 hover:bg-zinc-200 rounded-md transition-colors text-zinc-400 hover:text-red-500">
                         <CloseIcon size={12} />
                       </button>
                     </Badge>
                   ))}
                </div>
              </div>
            </div>
          </Section>

          <Section 
            title="Experiência Profissional" 
            icon={Briefcase}
            rightNode={
              <Button type="button" onClick={() => setExperiences([...experiences, { company: '', role: '', period: '', description: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1.5 px-4 rounded-full text-zinc-600 font-bold text-xs" iconLeft={<Plus size={14} />}>
                Adicionar Experiência
              </Button>
            }
          >
            <div className="space-y-8">
              <AnimatePresence mode="popLayout">
                {experiences.map((exp, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-4 group relative">
                    <button onClick={() => setExperiences(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-6 right-6 p-2 bg-white rounded-xl shadow-sm text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
                      <Input label="Empresa" value={exp.company} onChange={e => {
                        const n = [...experiences]; n[i].company = e.target.value; setExperiences(n);
                      }} className="h-11 bg-white" />
                      <Input label="Cargo" value={exp.role} onChange={e => {
                        const n = [...experiences]; n[i].role = e.target.value; setExperiences(n);
                      }} className="h-11 bg-white" />
                      <Input label="Período" value={exp.period} onChange={e => {
                        const n = [...experiences]; n[i].period = e.target.value; setExperiences(n);
                      }} className="h-11 bg-white" />
                    </div>
                    <Textarea label="Descrição das Atividades" value={exp.description} rows={3} onChange={e => {
                      const n = [...experiences]; n[i].description = e.target.value; setExperiences(n);
                    }} className="text-xs bg-white p-4" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Section>

          <Section 
            title="Formação Acadêmica" 
            icon={GraduationCap}
            rightNode={
              <Button type="button" onClick={() => setEducation([...education, { course: '', institution: '', status: 'Concluído', degree_type: '', start_date: '', end_date: '' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1.5 px-4 rounded-full text-zinc-600 font-bold text-xs" iconLeft={<Plus size={14} />}>
                Adicionar Formação
              </Button>
            }
          >
            <div className="space-y-6">
                 {education.map((edu, i) => (
                    <div key={i} className="py-4 relative group">
                       <button onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <Trash2 size={16} />
                       </button>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                         <Input label="Curso" value={edu.course} onChange={e => {
                           const n = [...education]; n[i].course = e.target.value; setEducation(n);
                         }} className="h-10 bg-white" />
                         <Select label="Tipo de Formação" value={edu.degree_type || ''} onChange={e => {
                           const n = [...education]; n[i].degree_type = e.target.value; setEducation(n);
                         }} className="h-10 bg-white">
                           <option value="">Selecione...</option>
                           <option value="Bacharelado">Bacharelado</option>
                           <option value="Licenciatura">Licenciatura</option>
                           <option value="Tecnólogo">Tecnólogo</option>
                           <option value="Especialização">Especialização</option>
                           <option value="MBA">MBA</option>
                           <option value="Mestrado">Mestrado</option>
                           <option value="Doutorado">Doutorado</option>
                           <option value="Técnico">Técnico</option>
                           <option value="Outro">Outro</option>
                         </Select>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                         <Input label="Instituição" value={edu.institution} onChange={e => {
                           const n = [...education]; n[i].institution = e.target.value; setEducation(n);
                         }} className="h-10 bg-white" />
                         <Select label="Status" value={edu.status} onChange={e => {
                           const n = [...education]; n[i].status = e.target.value; setEducation(n);
                         }} className="h-10 bg-white">
                           <option value="Concluído">Concluído</option>
                           <option value="Em andamento">Em andamento</option>
                           <option value="Trancado">Trancado</option>
                           <option value="Incompleto">Incompleto</option>
                         </Select>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Input label="Início (Mês/Ano)" value={edu.start_date || ''} onChange={e => {
                           const n = [...education]; n[i].start_date = e.target.value; setEducation(n);
                         }} className="h-10 bg-white" placeholder="Ex: 02/2018" />
                         <Input label="Término / Previsão" value={edu.end_date || ''} onChange={e => {
                           const n = [...education]; n[i].end_date = e.target.value; setEducation(n);
                         }} className="h-10 bg-white" placeholder="Ex: 12/2022" />
                       </div>
                    </div>
                 ))}
            </div>
          </Section>

          <Section 
            title="Idiomas" 
            icon={Languages}
            rightNode={
              <Button type="button" onClick={() => setLanguages([...languages, { language: '', level: 'Intermediário' }])} className="bg-zinc-100 hover:bg-zinc-200 border-0 py-1.5 px-4 rounded-full text-zinc-600 font-bold text-xs" iconLeft={<Plus size={14} />}>
                Adicionar Idioma
              </Button>
            }
          >
            <div className="space-y-6">
                 {languages.map((lang, i) => (
                    <div key={i} className="py-4 relative group">
                       <button onClick={() => setLanguages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 size={16} />
                       </button>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Input label="Idioma" value={lang.language} onChange={e => {
                           const n = [...languages]; n[i].language = e.target.value; setLanguages(n);
                         }} className="h-10 bg-white" />
                         <Select label="Nível" value={lang.level} onChange={e => {
                           const n = [...languages]; n[i].level = e.target.value; setLanguages(n);
                         }} className="h-10 bg-white">
                           <option value="Básico">Básico</option>
                           <option value="Intermediário">Intermediário</option>
                           <option value="Avançado">Avançado</option>
                           <option value="Fluente">Fluente</option>
                         </Select>
                       </div>
                    </div>
                 ))}
            </div>
          </Section>
        </form>
        <PreviewModal open={Boolean(parsedPreview)} data={parsedPreview} onConfirm={confirmParsedData} onCancel={() => setParsedPreview(null)} />
      </div>
    </PageWrapper>
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

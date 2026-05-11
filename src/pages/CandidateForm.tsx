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
  GraduationCap
} from "lucide-react";
import { useToast } from "@/src/components/ui";
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

export default function CandidateForm({ candidate, onBack, onSuccess }: CandidateFormProps) {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
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
    source: "Manual",
    status: "Novo",
    desired_work_model: "Presencial"
  });

  useEffect(() => {
    if (candidate) {
      setFormData(candidate);
    }
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = candidate ? `/api/candidates/${candidate.id}` : '/api/candidates';
      const method = candidate ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        tenant_id: tenantId,
        unit_id: currentUnit.id
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      toast.success("Currículo analisado! Confira os dados abaixo.");
    } catch (error) {
      toast.error("Erro ao analisar currículo. Tente preencher manualmente.");
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const confirmParsedData = () => {
    if (!parsedPreview) return;
    const d = parsedPreview;

    console.log('[CONFIRM] Dados recebidos da IA:', JSON.stringify(d, null, 2));

    // Converte arrays estruturados em texto formatado para o banco
    const expText = d.experiences_list?.map((e: any) =>
      `${e.role} — ${e.company}\n${e.period}${e.location ? ` | ${e.location}` : ''}\n${e.description}`
    ).join('\n\n') || null;

    const eduText = d.education_list?.map((e: any) =>
      `${e.course} — ${e.institution}${e.period ? ` (${e.period})` : ''} [${e.status}]`
    ).join('\n') || null;

    const certText = d.certifications_list?.map((c: any) =>
      `${c.name}${c.institution ? ` — ${c.institution}` : ''}${c.year ? ` (${c.year})` : ''}`
    ).join('\n') || null;

    const projText = d.projects_list?.map((p: any) =>
      `${p.name}: ${p.description}${p.technologies ? ` [${p.technologies}]` : ''}`
    ).join('\n') || null;

    const langText = d.languages_list?.map((l: any) =>
      `${l.language} - ${l.level}`
    ).join(', ') || null;

    // Junta projetos com certificações se existir
    const fullCert = [certText, projText].filter(Boolean).join('\n\n--- Projetos Relevantes ---\n');

    // Junta highlights com resumo se existir
    const fullSummary = [d.professional_summary, d.highlights ? `\nDestaques: ${d.highlights}` : null].filter(Boolean).join('');

    setFormData(prev => ({
      ...prev,
      full_name: d.full_name || prev.full_name,
      email: d.email || prev.email,
      phone: d.phone || prev.phone,
      cpf: d.cpf || prev.cpf,
      birth_date: d.birth_date || prev.birth_date,
      city: d.city || prev.city,
      state: d.state || prev.state,
      address: d.address || prev.address,
      linkedin_url: d.linkedin_url || prev.linkedin_url,
      portfolio_url: d.portfolio_url || prev.portfolio_url,
      desired_position: d.desired_position || prev.desired_position,
      desired_area: d.desired_area || prev.desired_area,
      desired_salary: d.desired_salary || prev.desired_salary,
      experience_years: d.experience_years || prev.experience_years,
      education_level: d.education_level || prev.education_level,
      hard_skills: d.hard_skills || prev.hard_skills,
      soft_skills: d.soft_skills || prev.soft_skills,
      languages: langText || prev.languages,
      professional_summary: fullSummary || prev.professional_summary,
      professional_experiences: expText || prev.professional_experiences,
      academic_education: eduText || prev.academic_education,
      courses_certifications: fullCert || prev.courses_certifications,
      has_cnh: d.has_cnh ?? prev.has_cnh,
      cnh_category: d.cnh_category || prev.cnh_category,
      available_to_travel: d.available_to_travel ?? prev.available_to_travel,
      available_to_relocate: d.available_to_relocate ?? prev.available_to_relocate,
      desired_work_model: d.desired_work_model || prev.desired_work_model,
      desired_contract_type: d.desired_contract_type || prev.desired_contract_type,
    }));

    setParsedPreview(null);
    toast.success("Todos os campos foram preenchidos com sucesso!");
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const PreviewField = ({ icon, label, value, truncate }: { icon: React.ReactNode; label: string; value: string | null | undefined; truncate?: boolean }) => (
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">{icon} {label}</p>
      <p className={cn("text-sm font-bold text-zinc-900", truncate && "truncate max-w-[200px]")}>{value || '-'}</p>
    </div>
  );

  const PreviewModal = () => (
    <AnimatePresence>
      {parsedPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setParsedPreview(null)}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] p-10 max-w-2xl w-full relative z-10 shadow-2xl border border-zinc-100 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-develoi-gold/10 text-develoi-gold rounded-2xl flex items-center justify-center shadow-inner">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Pré-análise Aurora AI</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Confirme as informações extraídas</p>
                </div>
              </div>
              <button 
                onClick={() => setParsedPreview(null)}
                className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-300 hover:text-zinc-900 transition-all"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="space-y-6 mb-10 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <PreviewField icon={<User size={10} />} label="Nome" value={parsedPreview.full_name} />
                    <PreviewField icon={<Mail size={10} />} label="E-mail" value={parsedPreview.email} />
                    <PreviewField icon={<Phone size={10} />} label="Telefone" value={parsedPreview.phone} />
                    <PreviewField icon={<MapPin size={10} />} label="Localização" value={parsedPreview.city ? `${parsedPreview.city}/${parsedPreview.state || ''}` : null} />
                    <PreviewField icon={<Linkedin size={10} />} label="LinkedIn" value={parsedPreview.linkedin_url} truncate />
                  </div>
                  <div className="space-y-3">
                    <PreviewField icon={<Briefcase size={10} />} label="Cargo Sugerido" value={parsedPreview.desired_position} />
                    <PreviewField icon={<GraduationCap size={10} />} label="Escolaridade" value={parsedPreview.education_level} />
                    <PreviewField icon={<Briefcase size={10} />} label="Experiência" value={parsedPreview.experience_years ? `${parsedPreview.experience_years} anos` : null} />
                    <PreviewField icon={<FileText size={10} />} label="Idiomas" value={parsedPreview.languages} />
                    <PreviewField icon={<FileText size={10} />} label="Área Desejada" value={parsedPreview.desired_area} />
                  </div>
               </div>

               {parsedPreview.professional_summary && (
                 <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-1">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Resumo Profissional</p>
                   <p className="text-xs font-medium text-zinc-600 leading-relaxed whitespace-pre-line">{parsedPreview.professional_summary}</p>
                 </div>
               )}

               {parsedPreview.hard_skills && (
                 <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hard Skills</p>
                   <div className="flex flex-wrap gap-1.5">
                     {parsedPreview.hard_skills.split(',').map((s: string, i: number) => (
                       <span key={i} className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-700">{s.trim()}</span>
                     ))}
                   </div>
                 </div>
               )}

               {parsedPreview.soft_skills && (
                 <div className="bg-develoi-gold/5 p-5 rounded-2xl border border-develoi-gold/10 space-y-2">
                   <p className="text-[9px] font-bold text-develoi-gold uppercase tracking-widest">Soft Skills</p>
                   <div className="flex flex-wrap gap-1.5">
                     {parsedPreview.soft_skills.split(',').map((s: string, i: number) => (
                       <span key={i} className="px-2.5 py-1 bg-white border border-develoi-gold/20 rounded-lg text-[10px] font-bold text-zinc-700">{s.trim()}</span>
                     ))}
                   </div>
                 </div>
               )}

               {parsedPreview.experiences_list?.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Experiências Profissionais ({parsedPreview.experiences_list.length})</p>
                   {parsedPreview.experiences_list.map((exp: any, i: number) => (
                     <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-1">
                       <div className="flex items-start justify-between gap-2">
                         <p className="text-sm font-black text-zinc-900">{exp.role}</p>
                         <span className="text-[9px] font-bold text-zinc-400 bg-white px-2 py-0.5 rounded-lg border border-zinc-100 shrink-0">{exp.period}</span>
                       </div>
                       <p className="text-xs font-bold text-develoi-navy">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                       <p className="text-[11px] text-zinc-500 leading-relaxed">{exp.description}</p>
                     </div>
                   ))}
                 </div>
               )}

               {parsedPreview.education_list?.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Formação Acadêmica ({parsedPreview.education_list.length})</p>
                   {parsedPreview.education_list.map((edu: any, i: number) => (
                     <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex items-center justify-between gap-3">
                       <div>
                         <p className="text-sm font-bold text-zinc-900">{edu.course}</p>
                         <p className="text-xs text-zinc-500">{edu.institution}{edu.period ? ` · ${edu.period}` : ''}</p>
                       </div>
                       <span className={cn(
                         "text-[9px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0",
                         edu.status === 'Em andamento' ? "bg-develoi-gold/10 text-develoi-gold" : "bg-emerald-50 text-emerald-600"
                       )}>{edu.status}</span>
                     </div>
                   ))}
                 </div>
               )}

               {parsedPreview.certifications_list?.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cursos e Certificações ({parsedPreview.certifications_list.length})</p>
                   <div className="flex flex-wrap gap-2">
                     {parsedPreview.certifications_list.map((c: any, i: number) => (
                       <div key={i} className="bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                         <p className="text-xs font-bold text-zinc-800">{c.name}</p>
                         <p className="text-[10px] text-zinc-400">{c.institution}{c.year ? ` · ${c.year}` : ''}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {parsedPreview.languages_list?.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Idiomas</p>
                   <div className="flex flex-wrap gap-2">
                     {parsedPreview.languages_list.map((l: any, i: number) => (
                       <div key={i} className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-2">
                         <span className="text-xs font-bold text-zinc-800">{l.language}</span>
                         <span className="text-[9px] font-bold text-blue-500 uppercase">{l.level}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {parsedPreview.projects_list?.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Projetos Relevantes ({parsedPreview.projects_list.length})</p>
                   {parsedPreview.projects_list.map((p: any, i: number) => (
                     <div key={i} className="bg-violet-50 p-4 rounded-2xl border border-violet-100 space-y-1">
                       <p className="text-sm font-black text-zinc-900">{p.name}</p>
                       <p className="text-[11px] text-zinc-600 leading-relaxed">{p.description}</p>
                       {p.technologies && <p className="text-[10px] font-bold text-violet-500">{p.technologies}</p>}
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setParsedPreview(null)}
                className="py-5 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Descartar e Preencher Manual
              </button>
              <button 
                onClick={confirmParsedData}
                className="py-5 bg-develoi-gold text-white hover:bg-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-develoi-gold/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Confirmar Informações
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 rounded-2xl transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              {candidate ? 'Editar Talento' : 'Novo Talento'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              Cadastro manual de currículo
            </p>
          </div>
        </div>
        <button 
          form="candidate-form"
          type="submit"
          disabled={loading || isParsing}
          className="px-6 py-3 bg-develoi-navy text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-develoi-navy/10 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {candidate ? 'Salvar Alterações' : 'Cadastrar Candidato'}
        </button>
      </div>

      <form id="candidate-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-2 space-y-8">
           {/* Seção Dados Básicos */}
           <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <User size={16} /> Informações Pessoais
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
                   <input 
                    required
                    type="text" 
                    value={formData.full_name}
                    onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="Ex: João da Silva"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail Corporativo/Pessoal</label>
                   <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="email@exemplo.com"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                   <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="(00) 00000-0000"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">LinkedIn URL</label>
                   <input 
                    type="text" 
                    value={formData.linkedin_url}
                    onChange={e => setFormData(f => ({ ...f, linkedin_url: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="linkedin.com/in/..."
                   />
                 </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cidade</label>
                   <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Estado</label>
                   <input 
                    type="text" 
                    value={formData.state}
                    onChange={e => setFormData(f => ({ ...f, state: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="SP"
                    maxLength={2}
                   />
                 </div>
              </div>
           </div>

           {/* Seção Acadêmica/Profissional */}
           <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Briefcase size={16} /> Experiência e Formação
              </h3>

              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cargo Atual / Alvo</label>
                   <input 
                    type="text" 
                    value={formData.desired_position}
                    onChange={e => setFormData(f => ({ ...f, desired_position: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Escolaridade</label>
                   <select 
                    value={formData.education_level}
                    onChange={e => setFormData(f => ({ ...f, education_level: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   >
                     <option value="">Selecione...</option>
                     <option value="Ensino Fundamental">Ensino Fundamental</option>
                     <option value="Ensino Médio">Ensino Médio</option>
                     <option value="Técnico">Técnico</option>
                     <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                     <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                     <option value="Pós / MBA / Mestrado">Pós / MBA / Mestrado</option>
                   </select>
                 </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Anos de Experiência</label>
                   <input 
                    type="number" 
                    value={formData.experience_years || ""}
                    onChange={e => setFormData(f => ({ ...f, experience_years: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Pretensão Salarial</label>
                   <div className="relative">
                      <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="number" 
                        value={formData.desired_salary || ""}
                        onChange={e => setFormData(f => ({ ...f, desired_salary: parseFloat(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                        placeholder="0.00"
                      />
                   </div>
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Hard Skills (separadas por vírgula)</label>
                <textarea 
                  value={formData.hard_skills}
                  onChange={e => setFormData(f => ({ ...f, hard_skills: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                  placeholder="React, SQL, Gestão de Equipes, Excel..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Resumo Profissional</label>
                <textarea 
                  value={formData.professional_summary}
                  onChange={e => setFormData(f => ({ ...f, professional_summary: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[140px]"
                  placeholder="Conte um pouco sobre a trajetória..."
                />
              </div>
           </div>

           {/* Seção Detalhes Extras (preenchida pela IA) */}
           <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <GraduationCap size={16} /> Detalhes Complementares
              </h3>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Experiências Profissionais</label>
                <textarea 
                  value={formData.professional_experiences || ''}
                  onChange={e => setFormData(f => ({ ...f, professional_experiences: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[120px]"
                  placeholder="Preenchido automaticamente pela IA..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Formação Acadêmica</label>
                <textarea 
                  value={formData.academic_education || ''}
                  onChange={e => setFormData(f => ({ ...f, academic_education: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                  placeholder="Preenchido automaticamente pela IA..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cursos e Certificações</label>
                <textarea 
                  value={formData.courses_certifications || ''}
                  onChange={e => setFormData(f => ({ ...f, courses_certifications: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                  placeholder="Preenchido automaticamente pela IA..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Soft Skills</label>
                  <textarea 
                    value={formData.soft_skills || ''}
                    onChange={e => setFormData(f => ({ ...f, soft_skills: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                    placeholder="Liderança, Comunicação..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Idiomas</label>
                  <textarea 
                    value={formData.languages || ''}
                    onChange={e => setFormData(f => ({ ...f, languages: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                    placeholder="Inglês - Intermediário..."
                  />
                </div>
              </div>
           </div>
        </div>

        {/* Sidebar do Formulário */}
        <div className="space-y-8">
           <div className="bg-zinc-900 p-8 rounded-[40px] text-white space-y-6">
              <h3 className="text-xs font-bold text-develoi-gold uppercase tracking-widest flex items-center gap-2">
                Status e Controle
              </h3>
              
              <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Status do Processo</label>
                   <select 
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-fadel-navy transition-all"
                   >
                     {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Modelo Desejado</label>
                   <select 
                    value={formData.desired_work_model}
                    onChange={e => setFormData(f => ({ ...f, desired_work_model: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-fadel-navy transition-all"
                   >
                     <option value="Presencial">Presencial</option>
                     <option value="Híbrido">Híbrido</option>
                     <option value="Home Office">Home Office</option>
                     <option value="Indiferente">Indiferente</option>
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Origem do Candidato</label>
                   <select 
                    value={formData.source}
                    onChange={e => setFormData(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-fadel-navy transition-all"
                   >
                     <option value="Manual">Cadastro Manual</option>
                     <option value="Portal">Portal de Vagas</option>
                     <option value="LinkedIn">LinkedIn</option>
                     <option value="Indicação">Indicação</option>
                     <option value="Sólides">Sólides</option>
                     <option value="Importação">Importação Massiva</option>
                   </select>
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                Anexar Currículo
              </h3>
              
              <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  accept=".pdf"
                  className="hidden"
               />

               <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer group",
                    isParsing 
                      ? "border-develoi-gold bg-develoi-gold/5 pointer-events-none" 
                      : "border-zinc-100 hover:border-develoi-navy hover:bg-develoi-navy/5"
                  )}
               >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    isParsing ? "bg-develoi-gold text-white" : "bg-zinc-50 text-zinc-300 group-hover:text-develoi-navy"
                  )}>
                    {isParsing ? <Loader2 className="animate-spin" size={24} /> : <FileText size={24} />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">
                      {isParsing ? "Processando..." : "Arraste seu PDF"}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {isParsing ? "Aguarde um momento" : "Máximo 10MB"}
                    </p>
                  </div>
               </div>

              <p className="text-[10px] font-bold text-zinc-400 leading-relaxed text-center px-4">
                {isParsing 
                   ? "Nossa IA está lendo o currículo para você. Isso pode levar alguns segundos..." 
                   : "Currículos em PDF são processados automaticamente pelo Gemini AI para preencher os campos."}
              </p>
           </div>
        </div>
      </form>
      <PreviewModal />
    </div>
  );
}

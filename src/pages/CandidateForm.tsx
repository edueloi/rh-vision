import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Linkedin, 
  Briefcase, 
  GraduationCap, 
  Save, 
  Globe, 
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Award,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { useToast, Badge } from "@/src/components/ui";
import { Candidate } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CandidateFormProps {
  candidate?: Candidate | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function CandidateForm({ candidate, onBack, onSuccess }: CandidateFormProps) {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Candidate>>({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
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
        tenant_id: 'fadel',
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
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
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
          disabled={loading}
          className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-400 hover:text-amber-950 transition-all active:scale-95 shadow-lg shadow-zinc-900/10 disabled:opacity-50"
        >
          <Save size={16} /> {candidate ? 'Salvar Alterações' : 'Cadastrar Candidato'}
        </button>
      </div>

      <form id="candidate-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-2 space-y-8">
           {/* Seção Dados Básicos */}
           <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <User size={16} /> Informações Pessoais
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
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
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail Corporativo/Pessoal</label>
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
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                   <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                    placeholder="(00) 00000-0000"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">LinkedIn URL</label>
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
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cidade</label>
                   <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Estado</label>
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
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Briefcase size={16} /> Experiência e Formação
              </h3>

              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cargo Atual / Alvo</label>
                   <input 
                    type="text" 
                    value={formData.desired_position}
                    onChange={e => setFormData(f => ({ ...f, desired_position: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Escolaridade</label>
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
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Anos de Experiência</label>
                   <input 
                    type="number" 
                    value={formData.experience_years || ""}
                    onChange={e => setFormData(f => ({ ...f, experience_years: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pretensão Salarial</label>
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
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Hard Skills (separadas por vírgula)</label>
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
        </div>

        {/* Sidebar do Formulário */}
        <div className="space-y-8">
           <div className="bg-zinc-900 p-8 rounded-[40px] text-white space-y-6">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                Status e Controle
              </h3>
              
              <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status do Processo</label>
                   <select 
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                   >
                     {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Modelo Desejado</label>
                   <select 
                    value={formData.desired_work_model}
                    onChange={e => setFormData(f => ({ ...f, desired_work_model: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                   >
                     <option value="Presencial">Presencial</option>
                     <option value="Híbrido">Híbrido</option>
                     <option value="Home Office">Home Office</option>
                     <option value="Indiferente">Indiferente</option>
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Origem do Candidato</label>
                   <select 
                    value={formData.source}
                    onChange={e => setFormData(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
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
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                Anexar Currículo
              </h3>
              <div className="border-2 border-dashed border-zinc-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-amber-400 hover:bg-amber-50/10 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 group-hover:text-amber-500 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Arraste seu PDF</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Máximo 10MB</p>
                  </div>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 leading-relaxed text-center px-4">
                Currículos em PDF são processados automaticamente pelo Gemini AI para preencher os campos.
              </p>
           </div>
        </div>
      </form>
    </div>
  );
}

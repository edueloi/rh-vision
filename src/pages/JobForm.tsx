import React, { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Target, 
  ShieldCheck, 
  FileText, 
  Globe, 
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Info,
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCcw
} from "lucide-react";
import { PanelCard, RichTextEditor, useToast, Badge } from "@/src/components/ui";
import { Job } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import { cn } from "@/src/lib/utils";

interface JobFormProps {
  job?: Job | null;
  initialData?: Partial<Job> | null;
  onBack: () => void;
  onSuccess: () => void;
}

const SECTIONS = [
  { id: 'info', label: 'Info Geral', icon: Building2 },
  { id: 'content', label: 'Requisitos', icon: FileText },
  { id: 'location', label: 'Local/Contrato', icon: MapPin },
  { id: 'ia', label: 'Critérios IA', icon: Sparkles },
  { id: 'internal', label: 'Interno', icon: ShieldCheck },
];

export default function JobForm({ job, initialData, onBack, onSuccess }: JobFormProps) {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState('info');
  const [loading, setLoading] = useState(false);
  const [importMode, setImportMode] = useState<boolean>(!!initialData?.["_importMode" as any]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidence, setConfidence] = useState<any>(null);

  const [formData, setFormData] = useState<Partial<Job>>({
    title: "",
    department: "",
    description: "",
    responsibilities: "",
    technical_requirements: "",
    mandatory_requirements: "",
    desirable_requirements: "",
    eliminatory_criteria: "",
    benefits: "",
    city: currentUnit.id === 'master' ? "" : currentUnit.location.split(',')[0],
    state: currentUnit.id === 'master' ? "" : currentUnit.location.split(',')[1]?.trim(),
    work_model: "Presencial" as any,
    contract_type: "CLT" as any,
    seniority_level: "Pleno",
    education_level: "Superior Completo",
    min_experience_years: 0,
    salary_min: 0,
    salary_max: 0,
    workload: "",
    work_schedule: "",
    requires_cnh: false,
    cnh_category: "",
    requires_travel: false,
    requires_relocation: false,
    status: "Rascunho" as any,
    compatibility_threshold: 80,
    max_compatible_candidates: 20,
    weight_technical: 20,
    weight_experience: 20,
    weight_education: 20,
    weight_location: 10,
    weight_soft_skills: 15,
    weight_culture: 15,
    internal_notes: "",
    tags: "",
    ...job,
    ...initialData
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
       // 1. Create Import Record
       const res = await fetch('/api/jobs/import', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           tenant_id: 'fadel',
           unit_id: currentUnit.id === 'master' ? 'tatui' : currentUnit.id,
           file_name: file.name,
           file_type: file.type,
           file_size: file.size
         })
       });
       const { id } = await res.json();

       // 2. Analyze with AI
       const analyzeRes = await fetch(`/api/jobs/import/${id}/analyze`, { method: 'POST' });
       const { data } = await analyzeRes.json();

       // 3. Update Form
       setFormData(prev => ({
         ...prev,
         ...data
       }));
       setConfidence(data.confidence);
       setImportMode(false);
       toast.success("Vaga interpretada com sucesso! Verifique os campos highlighted.");
    } catch (err) {
       toast.error("Erro ao analisar arquivo.");
    } finally {
       setIsAnalyzing(false);
    }
  };

  const renderConfidenceBadge = (field: string) => {
    if (!confidence || !confidence[field]) return null;
    const level = confidence[field];
    return (
       <div className={cn(
         "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
         level === 'Alta' ? "bg-emerald-50 text-emerald-600" :
         level === 'Média' ? "bg-amber-50 text-amber-600" :
         "bg-red-50 text-red-600 border border-red-100"
       )}>
          {level === 'Alta' ? <CheckCircle2 size={10} /> : level === 'Média' ? <Info size={10} /> : <AlertCircle size={10} />}
          {level} Confiança
       </div>
    );
  };

  const handleChange = (field: keyof Job, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (isPublic: boolean = false) => {
    if (!formData.title || !formData.city || !formData.state) {
      toast.error("Preencha os campos obrigatórios: Título, Cidade e Estado.");
      setActiveSection('info');
      return;
    }

    setLoading(true);
    try {
      const url = job ? `/api/jobs/${job.id}` : '/api/jobs';
      const method = job ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_public: isPublic ? 1 : (formData.is_public ? 1 : 0),
          tenant_id: 'fadel',
          unit_id: currentUnit.id === 'master' ? 'tatui' : currentUnit.id // Default to tatui if master creating
        })
      });

      if (!response.ok) throw new Error("Erro ao salvar vaga");
      
      toast.success(job ? "Vaga atualizada!" : "Vaga criada com sucesso!");
      onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              {job ? "Editar Vaga" : "Cadastrar Nova Vaga"}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
              Configure os detalhes e parâmetros da IA
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {formData.ai_summary && (
            <button 
              onClick={() => setImportMode(true)}
              disabled={loading}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-amber-400 hover:text-amber-950 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all md:flex items-center gap-2 hidden"
            >
              <RefreshCcw size={14} /> Reprocessar
            </button>
          )}
          <button 
            onClick={() => handleSave(false)}
            disabled={loading}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Salvar Rascunho
          </button>
          <button 
            onClick={() => handleSave(true)}
            disabled={loading}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-400/20"
          >
            {loading ? "Salvando..." : "Salvar e Publicar"}
          </button>
        </div>
      </div>
      
      {!job && (
        <div className="flex bg-zinc-100 p-1 rounded-2xl w-fit">
          <button 
            onClick={() => setImportMode(false)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              !importMode ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Cadastrar Manualmente
          </button>
          <button 
            onClick={() => setImportMode(true)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              importMode ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Importar por Arquivo
          </button>
        </div>
      )}

      {importMode ? (
        <div className="max-w-4xl mx-auto py-12">
           <PanelCard title="Importar vaga por arquivo" icon={FileUp}>
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl mx-auto flex items-center justify-center text-zinc-300 group-hover:border-amber-400 group-hover:text-amber-500 transition-all">
                    {isAnalyzing ? (
                       <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                       <Upload size={32} />
                    )}
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-lg font-black text-zinc-900">Arraste a descrição da vaga</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest max-w-sm mx-auto">
                       Envie arquivos em PDF, Word, Texto ou Planilha (XLSX) para que a IA estruture as informações automaticamente.
                    </p>
                 </div>

                 <div className="pt-4">
                    <label className={cn(
                       "inline-flex items-center gap-2 px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95",
                       isAnalyzing && "opacity-50 pointer-events-none"
                    )}>
                       <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" onChange={handleFileUpload} />
                       {isAnalyzing ? "Analisando..." : "Selecionar Arquivo"}
                    </label>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto pt-8 opacity-40">
                    {['PDF', 'DOC', 'DOCX', 'TXT', 'XLS', 'XLSX'].map(ext => (
                       <div key={ext} className="px-3 py-2 border border-zinc-200 rounded-xl text-[9px] font-black text-zinc-400">.{ext}</div>
                    ))}
                 </div>
              </div>
           </PanelCard>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3">
          <div className="bg-white border border-zinc-200 rounded-3xl p-3 sticky top-32 space-y-3">
            {formData.ai_summary && (
              <>
                <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-zinc-900 uppercase tracking-tighter truncate">Doc Importado</p>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Via Gemini IA</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      toast.info("Texto extraído exibido no console (simulação)");
                      console.log(formData.description); // Using description as extracted text for now or whatever is available
                    }}
                    className="w-full py-2 bg-white border border-zinc-200 rounded-xl text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:bg-zinc-100 transition-all"
                  >
                    Ver Texto Bruto
                  </button>
                </div>

                <div className="p-4 bg-zinc-900 text-white rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-amber-400">
                    <Sparkles size={12} /> Resumo da IA
                  </div>
                  <p className="text-[11px] font-bold opacity-80 leading-relaxed italic">
                    "{formData.ai_summary}"
                  </p>
                </div>
              </>
            )}
            <nav className="space-y-1">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group",
                      active 
                        ? "bg-amber-400 text-amber-950 font-black shadow-lg shadow-amber-400/5" 
                        : "text-zinc-500 hover:bg-zinc-50 font-bold"
                    )}
                  >
                    <Icon size={18} className={cn("transition-colors", active ? "text-amber-950" : "text-zinc-400 group-hover:text-zinc-700")} />
                    <span className="text-[11px] uppercase tracking-widest">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {activeSection === 'info' && (
            <PanelCard title="Informações Gerais" icon={Building2}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Título da Vaga *</label>
                    {renderConfidenceBadge('title')}
                  </div>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Ex: Motorista Carreteiro" 
                    className={cn(
                      "w-full px-4 py-3 bg-zinc-50 border rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all",
                      confidence?.title === 'Baixa' ? "border-red-200 bg-red-50/30" : "border-zinc-200"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Departamento</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="Ex: Logística" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nível de Senioridade</label>
                  <select 
                    value={formData.seniority_level}
                    onChange={(e) => handleChange('seniority_level', e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all appearance-none"
                  >
                    <option>Operacional</option>
                    <option>Auxiliar</option>
                    <option>Júnior</option>
                    <option>Pleno</option>
                    <option>Sênior</option>
                    <option>Coordenação</option>
                    <option>Gerência</option>
                    <option>Diretoria</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Descrição Breve (Resumo)</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Uma pequena introdução que aparece nos cards de listagem..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all min-h-24"
                  />
                </div>
              </div>
            </PanelCard>
          )}

          {activeSection === 'content' && (
            <PanelCard title="Responsabilidades e Requisitos" icon={FileText}>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Responsabilidades</label>
                  <RichTextEditor 
                    value={formData.responsibilities || ""} 
                    onChange={(v) => handleChange('responsibilities', v)} 
                    placeholder="O que o colaborador fará no dia a dia..." 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 text-amber-600">Requisitos Técnicos (Base para IA)</label>
                    {renderConfidenceBadge('requirements')}
                  </div>
                  <div className={cn(
                    "rounded-2xl overflow-hidden border transition-all",
                    confidence?.requirements === 'Baixa' ? "border-red-200 ring-2 ring-red-50" : "border-zinc-200"
                  )}>
                    <RichTextEditor 
                      value={formData.technical_requirements || ""} 
                      onChange={(v) => handleChange('technical_requirements', v)} 
                      placeholder="Habilidades técnicas, softwares, certificações..." 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Escolaridade Mínima</label>
                    <select 
                      value={formData.education_level}
                      onChange={(e) => handleChange('education_level', e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all"
                    >
                      <option>Fundamental</option>
                      <option>Ensino Médio</option>
                      <option>Técnico</option>
                      <option>Superior Incompleto</option>
                      <option>Superior Completo</option>
                      <option>Pós/MBA</option>
                      <option>Mestrado/Doutorado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Anos de Experiência Mínima</label>
                    <input 
                      type="number" 
                      value={formData.min_experience_years}
                      onChange={(e) => handleChange('min_experience_years', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 text-red-500">Critérios Eliminatórios</label>
                  <textarea 
                    value={formData.eliminatory_criteria}
                    onChange={(e) => handleChange('eliminatory_criteria', e.target.value)}
                    placeholder="Ex: Possuir CNH D ativa, Disponibilidade para viagens longas..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-red-400 transition-all min-h-24"
                  />
                </div>
              </div>
            </PanelCard>
          )}

          {activeSection === 'location' && (
            <PanelCard title="Localização e Contrato" icon={MapPin}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cidade *</label>
                    {renderConfidenceBadge('city')}
                  </div>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Ex: Tatuí" 
                    className={cn(
                      "w-full px-4 py-3 bg-zinc-50 border rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all",
                      confidence?.city === 'Baixa' ? "border-red-200 bg-red-50/30" : "border-zinc-200"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Estado *</label>
                  <input 
                    type="text" 
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Ex: SP" 
                    maxLength={2}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modelo de Trabalho</label>
                  <select 
                    value={formData.work_model}
                    onChange={(e) => handleChange('work_model', e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all"
                  >
                    <option>Presencial</option>
                    <option>Híbrido</option>
                    <option>Home Office</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Contrato</label>
                  <select 
                    value={formData.contract_type}
                    onChange={(e) => handleChange('contract_type', e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all"
                  >
                    <option>CLT</option>
                    <option>PJ</option>
                    <option>Estágio</option>
                    <option>Temporário</option>
                    <option>Freelancer</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Salário Mínimo</label>
                    {renderConfidenceBadge('salary')}
                  </div>
                  <input 
                    type="number" 
                    value={formData.salary_min}
                    onChange={(e) => handleChange('salary_min', parseFloat(e.target.value))}
                    className={cn(
                      "w-full px-4 py-3 bg-zinc-50 border rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all",
                      confidence?.salary === 'Baixa' ? "border-red-200 bg-red-50/30" : "border-zinc-200"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Salário Máximo</label>
                  <input 
                    type="number" 
                    value={formData.salary_max}
                    onChange={(e) => handleChange('salary_max', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                  />
                </div>
              </div>
            </PanelCard>
          )}

          {activeSection === 'ia' && (
            <PanelCard title="Critérios de Compatibilidade IA" icon={Sparkles}>
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase tracking-widest">
                    Estes pesos definem como o Gemini AI irá priorizar os candidatos. O total não precisa somar 100, os valores são relativos.
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: 'weight_technical', label: 'Requisitos Técnicos' },
                    { id: 'weight_experience', label: 'Experiência' },
                    { id: 'weight_education', label: 'Formação Acadêmica' },
                    { id: 'weight_location', label: 'Localização' },
                    { id: 'weight_soft_skills', label: 'Soft Skills' },
                    { id: 'weight_culture', label: 'Aderência Cultural' },
                  ].map(w => (
                    <div key={w.id} className="space-y-1.5 p-3 rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden relative">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{w.label}</label>
                        {confidence && (
                           <Sparkles size={10} className="text-amber-400" />
                        )}
                      </div>
                      <input 
                        type="number" 
                        value={formData[w.id as keyof Job] as number}
                        onChange={(e) => handleChange(w.id as keyof Job, parseInt(e.target.value))}
                        className="w-full bg-transparent border-none p-0 text-sm font-black outline-none focus:ring-0" 
                      />
                      {confidence && (
                         <div className="absolute top-0 right-0 w-1 h-full bg-amber-400"></div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Margem de Corte (%)</label>
                    <input 
                      type="number" 
                      value={formData.compatibility_threshold}
                      onChange={(e) => handleChange('compatibility_threshold', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Sugestão Máxima de Ranking</label>
                    <input 
                      type="number" 
                      value={formData.max_compatible_candidates}
                      onChange={(e) => handleChange('max_compatible_candidates', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                    />
                  </div>
                </div>
              </div>
            </PanelCard>
          )}

          {activeSection === 'internal' && (
            <PanelCard title="Dados Internos do RH" icon={ShieldCheck}>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Observações Privadas</label>
                  <textarea 
                    value={formData.internal_notes}
                    onChange={(e) => handleChange('internal_notes', e.target.value)}
                    placeholder="Notas que apenas o RH da unidade consegue ver..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all min-h-32"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tags / Palavras-chave</label>
                  <input 
                    type="text" 
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="Separe por vírgulas: Urgente, PJ, Disponibilidade..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-400 transition-all" 
                  />
                </div>
              </div>
            </PanelCard>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button 
              onClick={onBack}
              className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancelar Alterações
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-[0.98]"
            >
              {loading ? "Processando..." : (job ? "Salvar Vaga" : "Salvar Agora")}
            </button>
          </div>
        </div>
      </div>
     )}
    </div>
  );
}

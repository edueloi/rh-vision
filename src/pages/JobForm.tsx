import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  FileSearch,
  FileText,
  FileUp,
  Info,
  Loader2,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Combobox,
  ComboboxOption,
  ContentCard,
  Divider,
  FormRow,
  IconButton,
  Input,
  Modal,
  PageWrapper,
  PanelCard,
  RichTextEditor,
  SectionTitle,
  Select,
  Switch,
  Textarea,
  useToast,
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { cn } from "@/src/lib/utils";
import { Job } from "@/src/types";

interface JobFormProps {
  job?: Job | null;
  initialData?: Partial<Job> | null;
  onBack: () => void;
  onSuccess: () => void;
}

interface ImportedJobReview {
  importId: number;
  fileName: string;
  data: Partial<Job> & { confidence?: Record<string, string | null> };
}

type SectionId = "info" | "content" | "location" | "ia" | "internal";
type ConfidenceLevel = "Alta" | "Média" | "Baixa";

const MAX_BATCH_IMPORT_FILES = 10;

const SECTION_META: Array<{
  id: SectionId;
  navLabel: string;
  title: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "info",
    navLabel: "Info Geral",
    title: "Informações Gerais",
    description: "Defina o posicionamento básico da vaga e o resumo público da oportunidade.",
    icon: Building2,
  },
  {
    id: "content",
    navLabel: "Requisitos",
    title: "Responsabilidades e Requisitos",
    description: "Organize o texto que será usado pela Aurora AI para leitura, triagem e publicação.",
    icon: FileText,
  },
  {
    id: "location",
    navLabel: "Local / Contrato",
    title: "Localização e Contrato",
    description: "Concentre os dados operacionais da vaga sem inventar informações que não existam no documento.",
    icon: MapPin,
  },
  {
    id: "ia",
    navLabel: "Critérios IA",
    title: "Critérios de Compatibilidade",
    description: "Ajuste como a Aurora AI vai ponderar experiência, técnica, localização e aderência cultural.",
    icon: Sparkles,
  },
  {
    id: "internal",
    navLabel: "Interno",
    title: "Dados Internos do RH",
    description: "Registre observações privadas e contexto interno da vaga para a equipe de recrutamento.",
    icon: ShieldCheck,
  },
];

const STATE_OPTIONS: ComboboxOption[] = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
].map(([value, subtitle]) => ({
  value,
  label: value,
  subtitle,
  group: "Estados",
}));

const DEPARTMENT_OPTIONS: ComboboxOption[] = [
  { value: "Administrativo", label: "Administrativo", group: "Corporativo" },
  { value: "Comercial", label: "Comercial", group: "Corporativo" },
  { value: "Financeiro", label: "Financeiro", group: "Corporativo" },
  { value: "Fiscal", label: "Fiscal", group: "Corporativo" },
  { value: "Jurídico", label: "Jurídico", group: "Corporativo" },
  { value: "Marketing", label: "Marketing", group: "Corporativo" },
  { value: "Recursos Humanos", label: "Recursos Humanos", group: "Corporativo" },
  { value: "Tecnologia", label: "Tecnologia", group: "Corporativo" },
  { value: "Logística", label: "Logística", group: "Operações" },
  { value: "Manutenção", label: "Manutenção", group: "Operações" },
  { value: "Produção", label: "Produção", group: "Operações" },
  { value: "Qualidade", label: "Qualidade", group: "Operações" },
  { value: "Transportes", label: "Transportes", group: "Operações" },
];

const SENIORITY_OPTIONS = [
  "Não informado",
  "Operacional",
  "Auxiliar",
  "Júnior",
  "Pleno",
  "Sênior",
  "Coordenação",
  "Gerência",
  "Diretoria",
];

const WORK_MODEL_OPTIONS = ["Não informado", "Presencial", "Híbrido", "Home Office"];
const CONTRACT_TYPE_OPTIONS = ["Não informado", "CLT", "PJ", "Estágio", "Temporário", "Freelancer", "Outro"];
const EDUCATION_OPTIONS = [
  "Não informado",
  "Fundamental",
  "Ensino Médio",
  "Técnico",
  "Superior Incompleto",
  "Superior Completo",
  "Pós/MBA",
  "Mestrado/Doutorado",
];

const IA_WEIGHT_FIELDS: Array<{ field: keyof Job; label: string; description: string }> = [
  {
    field: "weight_technical",
    label: "Requisitos Técnicos",
    description: "Peso para conhecimentos e ferramentas obrigatórias.",
  },
  {
    field: "weight_experience",
    label: "Experiência",
    description: "Peso para tempo de atuação e histórico profissional.",
  },
  {
    field: "weight_education",
    label: "Formação Acadêmica",
    description: "Peso para escolaridade e certificações formais.",
  },
  {
    field: "weight_location",
    label: "Localização",
    description: "Peso para cidade, estado e disponibilidade geográfica.",
  },
  {
    field: "weight_soft_skills",
    label: "Soft Skills",
    description: "Peso para competências comportamentais.",
  },
  {
    field: "weight_culture",
    label: "Aderência Cultural",
    description: "Peso para fit cultural e postura esperada.",
  },
];

function normalizeLegacyOptionValue(value?: string | null) {
  if (!value) return "";

  const legacyMap: Record<string, string> = {
    "Híbrido": "Híbrido",
    "HÃ­brido": "Híbrido",
    "HÃƒÂ­brido": "Híbrido",
    "Estágio": "Estágio",
    "EstÃ¡gio": "Estágio",
    "EstÃƒÂ¡gio": "Estágio",
    "Temporário": "Temporário",
    "TemporÃ¡rio": "Temporário",
    "TemporÃƒÂ¡rio": "Temporário",
    "Júnior": "Júnior",
    "JÃºnior": "Júnior",
    "JÃƒÂºnior": "Júnior",
    "Sênior": "Sênior",
    "SÃªnior": "Sênior",
    "SÃƒÂªnior": "Sênior",
    "Coordenação": "Coordenação",
    "CoordenaÃ§Ã£o": "Coordenação",
    "CoordenaÃƒÂ§ÃƒÂ£o": "Coordenação",
    "Gerência": "Gerência",
    "GerÃªncia": "Gerência",
    "GerÃƒÂªncia": "Gerência",
    "Ensino Médio": "Ensino Médio",
    "Ensino MÃ©dio": "Ensino Médio",
    "Ensino MÃƒÂ©dio": "Ensino Médio",
    "Técnico": "Técnico",
    "TÃ©cnico": "Técnico",
    "TÃƒÂ©cnico": "Técnico",
    "Pós/MBA": "Pós/MBA",
    "PÃ³s/MBA": "Pós/MBA",
    "PÃƒÂ³s/MBA": "Pós/MBA",
  };

  return legacyMap[value] ?? value;
}

function normalizeConfidenceLevel(value?: string | null): ConfidenceLevel | null {
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower.includes("alta")) return "Alta";
  if (lower.includes("baixa")) return "Baixa";
  if (lower.includes("dia")) return "Média";

  return null;
}

function toOptionalInteger(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalFloat(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FieldHeader({
  label,
  required = false,
  badge,
}: {
  label: string;
  required?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {badge}
    </div>
  );
}

export default function JobForm({ job, initialData, onBack, onSuccess }: JobFormProps) {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const toast = useToast();
  const isMasterUnit = currentUnit.is_master === 1;
  const startsInImportMode = Boolean(initialData?.["_importMode" as keyof typeof initialData]);
  const unitCity = isMasterUnit ? "" : currentUnit.location.split(",")[0] || "";
  const unitState = isMasterUnit ? "" : currentUnit.location.split(",")[1]?.trim() || "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createBaseFormData = (
    mode: "manual" | "import",
    source?: Partial<Job> | null
  ): Partial<Job> => {
    const safeSource = Object.fromEntries(
      Object.entries(source || {}).filter(([key]) => !key.startsWith("_"))
    ) as Partial<Job>;

    return {
      title: "",
      department: "",
      description: "",
      responsibilities: "",
      technical_requirements: "",
      mandatory_requirements: "",
      desirable_requirements: "",
      eliminatory_criteria: "",
      benefits: "",
      city: mode === "manual" ? unitCity : "",
      state: mode === "manual" ? unitState : "",
      work_model: mode === "manual" ? "Presencial" : "",
      contract_type: mode === "manual" ? "CLT" : "",
      seniority_level: mode === "manual" ? "Pleno" : "",
      education_level: mode === "manual" ? "Superior Completo" : "",
      min_experience_years: mode === "manual" ? 0 : undefined,
      salary_min: undefined,
      salary_max: undefined,
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
      ...safeSource,
    };
  };

  const normalizeImportedJobData = (data: Partial<Job> & { confidence?: Record<string, string | null> }) =>
    createBaseFormData("import", {
      title: data.title ?? "",
      department: data.department ?? "",
      description: data.description ?? "",
      responsibilities: data.responsibilities ?? "",
      technical_requirements: data.technical_requirements ?? "",
      mandatory_requirements: data.mandatory_requirements ?? "",
      desirable_requirements: data.desirable_requirements ?? "",
      eliminatory_criteria: data.eliminatory_criteria ?? "",
      benefits: data.benefits ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      work_model: normalizeLegacyOptionValue(data.work_model),
      contract_type: normalizeLegacyOptionValue(data.contract_type),
      seniority_level: normalizeLegacyOptionValue(data.seniority_level),
      education_level: normalizeLegacyOptionValue(data.education_level),
      min_experience_years: data.min_experience_years ?? undefined,
      salary_min: data.salary_min ?? undefined,
      salary_max: data.salary_max ?? undefined,
      workload: data.workload ?? "",
      work_schedule: data.work_schedule ?? "",
      requires_cnh: Boolean(data.requires_cnh),
      cnh_category: data.cnh_category ?? "",
      requires_travel: Boolean(data.requires_travel),
      requires_relocation: Boolean(data.requires_relocation),
      status: "Rascunho" as any,
      compatibility_threshold: data.compatibility_threshold ?? 80,
      max_compatible_candidates: 20,
      weight_technical: data.weight_technical ?? 20,
      weight_experience: data.weight_experience ?? 20,
      weight_education: data.weight_education ?? 20,
      weight_location: data.weight_location ?? 10,
      weight_soft_skills: data.weight_soft_skills ?? 15,
      weight_culture: data.weight_culture ?? 15,
      internal_notes: "",
      tags: data.tags ?? "",
      ai_summary: data.ai_summary ?? "",
    });

  const buildJobPayload = (data: Partial<Job>) => ({
    title: data.title ?? "",
    department: data.department ?? "",
    description: data.description ?? "",
    responsibilities: data.responsibilities ?? "",
    technical_requirements: data.technical_requirements ?? "",
    mandatory_requirements: data.mandatory_requirements ?? "",
    desirable_requirements: data.desirable_requirements ?? "",
    eliminatory_criteria: data.eliminatory_criteria ?? "",
    benefits: data.benefits ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    work_model: data.work_model ?? "",
    contract_type: data.contract_type ?? "",
    seniority_level: data.seniority_level ?? "",
    education_level: data.education_level ?? "",
    min_experience_years: data.min_experience_years ?? null,
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    workload: data.workload ?? "",
    work_schedule: data.work_schedule ?? "",
    requires_cnh: Boolean(data.requires_cnh),
    cnh_category: data.cnh_category ?? "",
    requires_travel: Boolean(data.requires_travel),
    requires_relocation: Boolean(data.requires_relocation),
    status: data.status ?? "Rascunho",
    compatibility_threshold: data.compatibility_threshold ?? 80,
    max_compatible_candidates: data.max_compatible_candidates ?? 20,
    weight_technical: data.weight_technical ?? 20,
    weight_experience: data.weight_experience ?? 20,
    weight_education: data.weight_education ?? 20,
    weight_location: data.weight_location ?? 10,
    weight_soft_skills: data.weight_soft_skills ?? 15,
    weight_culture: data.weight_culture ?? 15,
    internal_notes: data.internal_notes ?? "",
    tags: data.tags ?? "",
  });

  const [activeSection, setActiveSection] = useState<SectionId>("info");
  const [loading, setLoading] = useState(false);
  const [importMode, setImportMode] = useState<boolean>(startsInImportMode);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [confidence, setConfidence] = useState<Record<string, string | null> | null>(null);
  const [importedReviews, setImportedReviews] = useState<ImportedJobReview[]>([]);
  const [currentImportId, setCurrentImportId] = useState<number | null>(null);
  const [rawImportOpen, setRawImportOpen] = useState(false);
  const [rawImportLoading, setRawImportLoading] = useState(false);
  const [rawImportError, setRawImportError] = useState("");
  const [rawImportTexts, setRawImportTexts] = useState<Record<number, string>>({});
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [formData, setFormData] = useState<Partial<Job>>(() =>
    createBaseFormData(startsInImportMode ? "import" : "manual", { ...job, ...initialData })
  );

  const currentImportedReview =
    importedReviews.find((review) => review.importId === currentImportId) || null;

  useEffect(() => {
    if (job || initialData) {
      setFormData(createBaseFormData(startsInImportMode ? "import" : "manual", { ...job, ...initialData }));
    }
  }, [job, initialData, startsInImportMode]);

  const loadImportedReview = (review: ImportedJobReview) => {
    setCurrentImportId(review.importId);
    setConfidence(review.data.confidence || null);
    setFormData(normalizeImportedJobData(review.data));
    setImportMode(false);
    setActiveSection("info");
  };

  const hasImportedValueForField = (field: string) => {
    const sourceData = currentImportedReview?.data || formData;

    switch (field) {
      case "title":
        return Boolean(sourceData.title?.trim());
      case "city":
        return Boolean(sourceData.city?.trim() || sourceData.state?.trim());
      case "salary":
        return (
          (sourceData.salary_min !== undefined && sourceData.salary_min !== null) ||
          (sourceData.salary_max !== undefined && sourceData.salary_max !== null)
        );
      case "requirements":
        return Boolean(
          sourceData.technical_requirements?.trim() ||
            sourceData.mandatory_requirements?.trim() ||
            sourceData.desirable_requirements?.trim() ||
            sourceData.tags?.trim()
        );
      default:
        return Boolean((sourceData as any)?.[field]);
    }
  };

  const getConfidenceBadge = (field: string) => {
    const level = normalizeConfidenceLevel(confidence?.[field]);
    if (!level || !hasImportedValueForField(field)) {
      return null;
    }

    const color =
      level === "Alta" ? "success" : level === "Média" ? "warning" : "danger";
    const icon =
      level === "Alta" ? <CheckCircle2 size={10} /> : level === "Média" ? <Info size={10} /> : <AlertCircle size={10} />;

    return (
      <Badge color={color} icon={icon} pill className="tracking-[0.16em]">
        {level} confiança
      </Badge>
    );
  };

  const fieldHasLowConfidence = (field: string) =>
    normalizeConfidenceLevel(confidence?.[field]) === "Baixa" && hasImportedValueForField(field);

  const getFieldClassName = (field: string) =>
    cn(fieldHasLowConfidence(field) && "border-red-300 bg-red-50/50 focus-visible:border-red-500 focus-visible:ring-red-500/20");

  const handleChange = (field: keyof Job, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleComboboxChange = (field: keyof Job, value: string | string[]) => {
    handleChange(field, Array.isArray(value) ? value[0] || "" : value);
  };

  const processImportedFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    const filesToProcess = files.slice(0, MAX_BATCH_IMPORT_FILES);
    if (files.length > MAX_BATCH_IMPORT_FILES) {
      toast.info(`Limite de ${MAX_BATCH_IMPORT_FILES} arquivos por lote. Os demais foram ignorados.`);
    }

    const loadingToastId = toast.loading(
      filesToProcess.length === 1
        ? `Aurora IA analisando "${filesToProcess[0].name}"…`
        : `Aurora IA iniciando análise de ${filesToProcess.length} arquivos…`
    );

    const batchResults: ImportedJobReview[] = [];
    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setAnalyzeProgress({ current: i + 1, total: filesToProcess.length, fileName: file.name });

        if (filesToProcess.length > 1) {
          toast.dismiss(loadingToastId);
          toast.loading(`Aurora IA analisando ${i + 1} de ${filesToProcess.length}: "${file.name}"…`);
        }

        const body = new FormData();
        body.append("file", file);
        body.append("tenant_id", String(tenantId));
        body.append("unit_id", String(currentUnit.id));

        const importRes = await fetch("/api/jobs/import", { method: "POST", body });
        const importResponse = await importRes.json();
        if (!importRes.ok) {
          throw new Error(importResponse.error || `Erro ao enviar o arquivo ${file.name}.`);
        }

        const analyzeRes = await fetch(`/api/jobs/import/${importResponse.id}/analyze`, { method: "POST" });
        const analyzeResponse = await analyzeRes.json();
        if (!analyzeRes.ok) {
          throw new Error(analyzeResponse.error || `Erro ao interpretar o arquivo ${file.name}.`);
        }

        batchResults.push({ importId: importResponse.id, fileName: file.name, data: analyzeResponse.data });
      }

      if (batchResults.length === 0) throw new Error("Nenhuma vaga foi importada.");

      toast.dismiss(loadingToastId);
      setImportedReviews((prev) => [...prev, ...batchResults]);
      if (!currentImportId) {
        loadImportedReview(batchResults[0]);
      }

      toast.success(
        batchResults.length === 1
          ? "Vaga importada com sucesso. Revise os campos antes de salvar."
          : `${batchResults.length} vagas importadas para revisão no lote atual.`
      );
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar arquivo.");
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(null);
      setIsDropActive(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await processImportedFiles(files);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    await processImportedFiles(files);
  };

  const openRawImportModal = async () => {
    if (!currentImportId) return;

    setRawImportOpen(true);
    setRawImportError("");

    if (rawImportTexts[currentImportId] !== undefined) {
      return;
    }

    setRawImportLoading(true);
    try {
      const response = await fetch(`/api/jobs/import/${currentImportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar o texto importado.");
      }

      setRawImportTexts((prev) => ({
        ...prev,
        [currentImportId]: data.extracted_text || "",
      }));
    } catch (error) {
      setRawImportError(error instanceof Error ? error.message : "Não foi possível carregar o texto importado.");
    } finally {
      setRawImportLoading(false);
    }
  };

  const handleBatchAutoSave = async () => {
    if (importedReviews.length === 0) return;
    setIsBatchSaving(true);
    const total = importedReviews.length;
    let saved = 0;
    let failed = 0;
    const remaining: typeof importedReviews = [];

    for (let i = 0; i < importedReviews.length; i++) {
      const review = importedReviews[i];
      setBatchSaveProgress({ current: i + 1, total });
      try {
        const payload = buildJobPayload(normalizeImportedJobData(review.data));
        const response = await fetch(`/api/jobs/import/${review.importId}/create-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error();
        saved++;
      } catch {
        failed++;
        remaining.push(review);
      }
    }

    setIsBatchSaving(false);
    setBatchSaveProgress(null);
    setImportedReviews(remaining);

    if (remaining.length === 0) {
      setCurrentImportId(null);
      setConfidence(null);
      toast.success(`${saved} vaga${saved !== 1 ? 's' : ''} salva${saved !== 1 ? 's' : ''} automaticamente.`);
      onSuccess();
    } else {
      loadImportedReview(remaining[0]);
      toast.error(`${saved} salvas, ${failed} falharam — revise as restantes manualmente.`);
    }
  };

  const handleSave = async (isPublic = false) => {
    if (!formData.title || !formData.city || !formData.state) {
      toast.error("Preencha os campos obrigatórios: Título, Cidade e Estado.");
      setActiveSection("info");
      return;
    }

    setLoading(true);
    try {
      const basePayload = {
        ...buildJobPayload(formData),
        is_public: isPublic ? 1 : formData.is_public ? 1 : 0,
        status: isPublic && formData.status === "Rascunho" ? "Aberta" : formData.status,
      };

      const isImportedDraft = !job && currentImportId !== null;
      const payload = isImportedDraft
        ? basePayload
        : {
            ...basePayload,
            tenant_id: tenantId,
            unit_id: currentUnit.id,
          };

      const url = isImportedDraft
        ? `/api/jobs/import/${currentImportId}/create-job`
        : job
          ? `/api/jobs/${job.id}`
          : "/api/jobs";

      const method = job ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar vaga");
      }

      if (isImportedDraft) {
        const remainingReviews = importedReviews.filter((review) => review.importId !== currentImportId);
        setImportedReviews(remainingReviews);
        setRawImportOpen(false);

        if (remainingReviews.length > 0) {
          loadImportedReview(remainingReviews[0]);
          toast.success("Vaga salva. A próxima vaga do lote foi carregada para revisão.");
        } else {
          setCurrentImportId(null);
          setConfidence(null);
          toast.success("Lote finalizado. Todas as vagas importadas foram salvas.");
          onSuccess();
        }
        return;
      }

      toast.success(job ? "Vaga atualizada!" : "Vaga criada com sucesso!");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ocorreu um erro ao salvar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const renderImportSummary = () => {
    if (!currentImportedReview) return null;

    return (
      <PanelCard
        title="Documento importado"
        description={currentImportedReview.fileName}
        icon={FileSearch}
        action={
          <Button
            variant="outline"
            size="sm"
            iconLeft={<FileText size={14} />}
            onClick={openRawImportModal}
          >
            Ver texto bruto
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge color="primary" pill>
              Importação #{currentImportedReview.importId}
            </Badge>
            <Badge color="gold" pill>
              Via Aurora AI
            </Badge>
            {importedReviews.length > 1 && (
              <Badge color="info" pill>
                {importedReviews.length} vagas no lote
              </Badge>
            )}
          </div>

          {formData.ai_summary && (
            <ContentCard className="bg-zinc-900 text-white" padding="sm">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-develoi-gold">
                <Sparkles size={12} />
                Resumo da IA
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-100">{formData.ai_summary}</p>
            </ContentCard>
          )}
        </div>
      </PanelCard>
    );
  };

  const renderQueueCard = () => {
    if (importedReviews.length === 0) return null;

    return (
      <ContentCard className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black tracking-tight text-zinc-900">Lote importado</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                {importedReviews.length} vagas aguardando revisão
              </p>
            </div>
            <Badge color="info" pill>
              Limite {MAX_BATCH_IMPORT_FILES}
            </Badge>
          </div>

          <p className="text-sm leading-relaxed text-zinc-500">
            Cada vaga permanece em fila até você revisar e salvar. Os campos vazios continuam vazios quando o documento não traz a informação.
          </p>

          {importedReviews.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              disabled={isBatchSaving}
              onClick={handleBatchAutoSave}
              iconLeft={isBatchSaving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            >
              {isBatchSaving && batchSaveProgress
                ? `Salvando ${batchSaveProgress.current} de ${batchSaveProgress.total}…`
                : `Salvar todas (${importedReviews.length}) automaticamente`}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {importedReviews.map((review, index) => {
            const isActive = review.importId === currentImportId;
            return (
              <Button
                key={review.importId}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                fullWidth
                className="h-auto min-w-0 justify-start px-3 py-3"
                onClick={() => loadImportedReview(review)}
              >
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                      Vaga {index + 1}
                    </p>
                    <p className="truncate text-sm font-bold">{review.fileName}</p>
                    {review.data?.title && (
                      <p className="truncate text-[11px] text-zinc-500">
                        {review.data.title} {review.data.city ? `• ${review.data.city}` : ""}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <Badge color="gold" pill className="shrink-0">
                      Editando
                    </Badge>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </ContentCard>
    );
  };

  const renderImportMode = () => (
    <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
      <div className="space-y-6">
        {renderQueueCard()}

        {currentImportedReview && (
          <ContentCard className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-black tracking-tight text-zinc-900">Revisão pronta</p>
              <p className="text-sm leading-relaxed text-zinc-500">
                O lote já contém vaga em análise. Você pode importar mais arquivos agora ou voltar para a revisão manual.
              </p>
            </div>

            <Button
              variant="secondary"
              fullWidth
              iconLeft={<ArrowLeft size={14} />}
              onClick={() => setImportMode(false)}
            >
              Voltar para revisão
            </Button>
          </ContentCard>
        )}
      </div>

      <PanelCard
        title="Importação assistida por IA"
        description="Use arquivos reais da vaga. A plataforma vai estruturar apenas os campos com evidência textual."
        icon={FileUp}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDropActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDropActive(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-all sm:px-10 sm:py-14",
            isDropActive
              ? "border-develoi-navy bg-develoi-navy/5"
              : "border-zinc-200 bg-zinc-50/70"
          )}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-zinc-200 bg-white text-zinc-300 shadow-sm">
            {isAnalyzing ? (
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-gold border-t-transparent" />
            ) : (
              <Upload size={30} />
            )}
          </div>

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-auto mt-6 max-w-2xl space-y-4"
              >
                <div className="flex items-center justify-center gap-3 rounded-2xl bg-develoi-navy px-6 py-4 text-white shadow-lg">
                  <Sparkles size={16} className="text-develoi-gold shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-black">Aurora IA está analisando seu documento</p>
                    {analyzeProgress && (
                      <p className="mt-0.5 text-[11px] text-white/60 truncate max-w-xs">
                        {analyzeProgress.total > 1
                          ? `Arquivo ${analyzeProgress.current} de ${analyzeProgress.total}: ${analyzeProgress.fileName}`
                          : analyzeProgress.fileName}
                      </p>
                    )}
                  </div>
                  <Loader2 size={16} className="animate-spin text-white/50 shrink-0" />
                </div>
                <p className="text-sm text-zinc-400">Estruturando campos da vaga a partir do documento…</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-auto mt-6 max-w-2xl space-y-3"
              >
                <h3 className="text-2xl font-black tracking-tight text-zinc-900">Arraste a descrição da vaga</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  Envie até {MAX_BATCH_IMPORT_FILES} arquivos por lote em PDF, Word, texto ou planilha.
                  A IA organiza os campos e deixa vazio tudo o que não estiver claramente no documento.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              onChange={handleFileUpload}
            />

            <Button
              size="lg"
              loading={isAnalyzing}
              iconLeft={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
            >
              {isAnalyzing ? "Analisando arquivos…" : "Selecionar arquivos"}
            </Button>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Limite de {MAX_BATCH_IMPORT_FILES} arquivos por lote
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {["PDF", "DOC", "DOCX", "TXT", "CSV", "XLS", "XLSX"].map((extension) => (
              <Badge key={extension} color="default" pill>
                .{extension}
              </Badge>
            ))}
          </div>
        </div>
      </PanelCard>
    </div>
  );

  const renderInfoSection = () => (
    <div className="space-y-6">
      <FormRow cols={2}>
        <div className="md:col-span-2 space-y-1.5">
          <FieldHeader label="Título da vaga" required badge={getConfidenceBadge("title")} />
          <Input
            value={formData.title ?? ""}
            onChange={(event) => handleChange("title", event.target.value)}
            placeholder="Ex: Coordenador de Frota"
            className={getFieldClassName("title")}
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Departamento" badge={getConfidenceBadge("department")} />
          <Combobox
            options={DEPARTMENT_OPTIONS}
            value={formData.department ?? ""}
            onChange={(value) => handleComboboxChange("department", value)}
            allowCustom
            onCustomAdd={(value) => handleChange("department", value)}
            placeholder="Selecione ou digite o departamento"
            searchPlaceholder="Buscar departamento"
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Nível de senioridade" badge={getConfidenceBadge("seniority_level")} />
          <Select
            value={formData.seniority_level ?? ""}
            onChange={(event) => handleChange("seniority_level", event.target.value === "Não informado" ? "" : event.target.value)}
          >
            {SENIORITY_OPTIONS.map((option) => (
              <option key={option} value={option === "Não informado" ? "" : option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </FormRow>

      <div className="space-y-1.5">
        <FieldHeader label="Descrição breve (resumo)" />
        <Textarea
          rows={5}
          value={formData.description ?? ""}
          onChange={(event) => handleChange("description", event.target.value)}
          placeholder="Resumo curto para cards, listagens e publicação da vaga."
        />
      </div>

      <div className="space-y-1.5">
        <FieldHeader label="Benefícios" />
        <Textarea
          rows={4}
          value={formData.benefits ?? ""}
          onChange={(event) => handleChange("benefits", event.target.value)}
          placeholder="Liste apenas benefícios confirmados no documento ou informados pelo RH."
        />
      </div>
    </div>
  );

  const renderContentSection = () => (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <FieldHeader label="Responsabilidades" />
        <RichTextEditor
          value={formData.responsibilities || ""}
          onChange={(value) => handleChange("responsibilities", value)}
          placeholder="Descreva o dia a dia da função, escopo de atuação e entregas esperadas."
        />
      </div>

      <div className="space-y-1.5">
        <FieldHeader
          label="Requisitos técnicos (base da IA)"
          badge={getConfidenceBadge("requirements")}
        />
        <div className={cn("rounded-2xl border border-zinc-200 overflow-hidden", fieldHasLowConfidence("requirements") && "border-red-300 ring-2 ring-red-100")}>
          <RichTextEditor
            value={formData.technical_requirements || ""}
            onChange={(value) => handleChange("technical_requirements", value)}
            placeholder="Ferramentas, certificações, sistemas, conhecimentos técnicos e experiência operacional."
          />
        </div>
      </div>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Habilidades / palavras-chave" />
          <Textarea
            rows={4}
            value={formData.tags ?? ""}
            onChange={(event) => handleChange("tags", event.target.value)}
            placeholder="Ex: Gestão de Frotas, Excel, Telemetria, Negociação com Fornecedores."
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Escolaridade mínima" />
          <Select
            value={formData.education_level ?? ""}
            onChange={(event) => handleChange("education_level", event.target.value === "Não informado" ? "" : event.target.value)}
          >
            {EDUCATION_OPTIONS.map((option) => (
              <option key={option} value={option === "Não informado" ? "" : option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Requisitos obrigatórios" />
          <Textarea
            rows={4}
            value={formData.mandatory_requirements ?? ""}
            onChange={(event) => handleChange("mandatory_requirements", event.target.value)}
            placeholder="Liste itens obrigatórios que precisam ser atendidos."
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Requisitos desejáveis" />
          <Textarea
            rows={4}
            value={formData.desirable_requirements ?? ""}
            onChange={(event) => handleChange("desirable_requirements", event.target.value)}
            placeholder="Liste diferenciais desejáveis, mas não eliminatórios."
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Anos de experiência mínima" />
          <Input
            type="number"
            min={0}
            value={formData.min_experience_years ?? ""}
            onChange={(event) => handleChange("min_experience_years", toOptionalInteger(event.target.value))}
            placeholder="Ex: 3"
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Critérios eliminatórios" />
          <Textarea
            rows={4}
            value={formData.eliminatory_criteria ?? ""}
            onChange={(event) => handleChange("eliminatory_criteria", event.target.value)}
            placeholder="Ex: CNH ativa, disponibilidade para viagens, atuação em turno específico."
          />
        </div>
      </FormRow>
    </div>
  );

  const renderLocationSection = () => (
    <div className="space-y-6">
      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Cidade" required badge={getConfidenceBadge("city")} />
          <Input
            value={formData.city ?? ""}
            onChange={(event) => handleChange("city", event.target.value)}
            placeholder="Ex: Tatuí"
            className={getFieldClassName("city")}
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Estado" required />
          <Combobox
            options={STATE_OPTIONS}
            value={formData.state ?? ""}
            onChange={(value) => handleComboboxChange("state", value)}
            placeholder="Selecione o estado"
            searchPlaceholder="Buscar UF ou estado"
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Modelo de trabalho" badge={getConfidenceBadge("work_model")} />
          <Select
            value={formData.work_model ?? ""}
            onChange={(event) => handleChange("work_model", event.target.value === "Não informado" ? "" : event.target.value)}
          >
            {WORK_MODEL_OPTIONS.map((option) => (
              <option key={option} value={option === "Não informado" ? "" : option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Tipo de contrato" badge={getConfidenceBadge("contract_type")} />
          <Select
            value={formData.contract_type ?? ""}
            onChange={(event) => handleChange("contract_type", event.target.value === "Não informado" ? "" : event.target.value)}
          >
            {CONTRACT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option === "Não informado" ? "" : option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Salário mínimo" badge={getConfidenceBadge("salary")} />
          <Input
            type="number"
            step="0.01"
            value={formData.salary_min ?? ""}
            onChange={(event) => handleChange("salary_min", toOptionalFloat(event.target.value))}
            placeholder="Ex: 3500"
            addonLeft="R$"
            className={getFieldClassName("salary")}
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Salário máximo" />
          <Input
            type="number"
            step="0.01"
            value={formData.salary_max ?? ""}
            onChange={(event) => handleChange("salary_max", toOptionalFloat(event.target.value))}
            placeholder="Ex: 5000"
            addonLeft="R$"
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Carga horária" />
          <Input
            value={formData.workload ?? ""}
            onChange={(event) => handleChange("workload", event.target.value)}
            placeholder="Ex: 44h semanais"
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Escala / horário" />
          <Input
            value={formData.work_schedule ?? ""}
            onChange={(event) => handleChange("work_schedule", event.target.value)}
            placeholder="Ex: Segunda a sexta, das 08h às 18h"
          />
        </div>
      </FormRow>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Exige CNH",
            description: "Ative quando a habilitação for requisito real da vaga.",
            checked: Boolean(formData.requires_cnh),
            onChange: (checked: boolean) => handleChange("requires_cnh", checked),
          },
          {
            label: "Exige viagens",
            description: "Use apenas se o documento ou o RH confirmarem deslocamentos.",
            checked: Boolean(formData.requires_travel),
            onChange: (checked: boolean) => handleChange("requires_travel", checked),
          },
          {
            label: "Exige mudança",
            description: "Ative quando houver necessidade de mudança de cidade ou estado.",
            checked: Boolean(formData.requires_relocation),
            onChange: (checked: boolean) => handleChange("requires_relocation", checked),
          },
        ].map((item) => (
          <ContentCard key={item.label} padding="sm" className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-black tracking-tight text-zinc-900">{item.label}</p>
              <p className="text-xs leading-relaxed text-zinc-500">{item.description}</p>
            </div>
            <Switch checked={item.checked} onCheckedChange={item.onChange} />
          </ContentCard>
        ))}
      </div>

      {formData.requires_cnh && (
        <div className="space-y-1.5">
          <FieldHeader label="Categoria da CNH" />
          <Input
            value={formData.cnh_category ?? ""}
            onChange={(event) => handleChange("cnh_category", event.target.value)}
            placeholder="Ex: B, C, D ou E"
          />
        </div>
      )}
    </div>
  );

  const renderIASection = () => (
    <div className="space-y-6">
      <ContentCard className="border-develoi-navy/10 bg-develoi-navy/5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-develoi-navy">
            <Info size={18} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-black tracking-tight text-develoi-navy">Leitura estratégica da Aurora AI</p>
            <p className="text-sm leading-relaxed text-zinc-600">
              Os pesos abaixo não precisam somar 100. Eles definem prioridade relativa entre técnica, experiência, localização e aderência ao contexto da vaga.
            </p>
          </div>
        </div>
      </ContentCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {IA_WEIGHT_FIELDS.map((item) => (
          <ContentCard key={String(item.field)} padding="sm" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-black tracking-tight text-zinc-900">{item.label}</p>
                <p className="text-xs leading-relaxed text-zinc-500">{item.description}</p>
              </div>
              {confidence && (
                <Badge color="primary" pill>
                  IA
                </Badge>
              )}
            </div>

            <Input
              type="number"
              min={0}
              value={(formData[item.field] as number | undefined) ?? 0}
              onChange={(event) => handleChange(item.field, Number.parseInt(event.target.value || "0", 10))}
            />
          </ContentCard>
        ))}
      </div>

      <FormRow cols={2}>
        <div className="space-y-1.5">
          <FieldHeader label="Margem de corte (%)" />
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.compatibility_threshold ?? 80}
            onChange={(event) => handleChange("compatibility_threshold", Number.parseInt(event.target.value || "0", 10))}
          />
        </div>

        <div className="space-y-1.5">
          <FieldHeader label="Máximo de candidatos sugeridos" />
          <Input
            type="number"
            min={1}
            value={formData.max_compatible_candidates ?? 20}
            onChange={(event) => handleChange("max_compatible_candidates", Number.parseInt(event.target.value || "0", 10))}
          />
        </div>
      </FormRow>
    </div>
  );

  const renderInternalSection = () => (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <FieldHeader label="Observações privadas" />
        <Textarea
          rows={8}
          value={formData.internal_notes ?? ""}
          onChange={(event) => handleChange("internal_notes", event.target.value)}
          placeholder="Anotações internas do RH, contexto de urgência, aprovadores e observações de processo."
        />
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case "info":
        return renderInfoSection();
      case "content":
        return renderContentSection();
      case "location":
        return renderLocationSection();
      case "ia":
        return renderIASection();
      case "internal":
        return renderInternalSection();
      default:
        return null;
    }
  };

  const currentSectionMeta = SECTION_META.find((section) => section.id === activeSection)!;

  const renderEditorMode = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex-1 space-y-6">
          {renderImportSummary()}
          
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-px">
            {SECTION_META.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all",
                    isActive 
                      ? "text-develoi-navy" 
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50 rounded-t-xl"
                  )}
                >
                  <Icon size={16} className={cn(isActive ? "text-develoi-navy" : "text-zinc-400")} />
                  {section.navLabel}
                  
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-develoi-navy"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <PanelCard
            title={currentSectionMeta.title}
            description={currentSectionMeta.description}
            icon={currentSectionMeta.icon}
          >
            {renderCurrentSection()}
          </PanelCard>
        </div>

        <div className="xl:w-[320px] shrink-0 space-y-6">
          {renderQueueCard()}
        </div>
      </div>
    </div>
  );

  const rawImportText = currentImportId ? rawImportTexts[currentImportId] ?? "" : "";

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <IconButton variant="ghost" size="md" onClick={onBack} aria-label="Voltar">
              <ArrowLeft size={18} />
            </IconButton>

            <SectionTitle
              className="mb-0"
              title={job ? "Editar Vaga" : "Cadastrar Nova Vaga"}
              subtitle="Configure os detalhes da vaga, importe documentos reais e revise os parâmetros da IA."
              icon={<Briefcase size={22} />}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {currentImportedReview && importMode && (
              <Button
                variant="outline"
                iconLeft={<ArrowLeft size={14} />}
                onClick={() => setImportMode(false)}
              >
                Voltar para revisão
              </Button>
            )}

            {currentImportedReview && !importMode && !job && (
              <Button
                variant="outline"
                iconLeft={<RefreshCcw size={14} />}
                onClick={() => setImportMode(true)}
              >
                Importar mais arquivos
              </Button>
            )}

            {!importMode && (
              <>
                <Button variant="outline" loading={loading} onClick={() => handleSave(false)}>
                  Salvar rascunho
                </Button>
                <Button variant="secondary" loading={loading} onClick={() => handleSave(true)}>
                  Salvar e publicar
                </Button>
              </>
            )}
          </div>
        </div>

        {!job && (
          <ContentCard padding="sm" className="inline-flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant={!importMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setImportMode(false)}
            >
              Cadastrar manualmente
            </Button>
            <Button
              variant={importMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setImportMode(true)}
            >
              Importar por arquivo
            </Button>
          </ContentCard>
        )}

        {importMode ? renderImportMode() : renderEditorMode()}
      </div>

      <Modal
        open={rawImportOpen}
        onClose={() => setRawImportOpen(false)}
        title="Texto bruto importado"
        description={
          currentImportedReview
            ? `Leitura original do arquivo ${currentImportedReview.fileName}`
            : "Conteúdo extraído do documento."
        }
        icon={<FileText size={20} />}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setRawImportOpen(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {currentImportedReview && (
            <div className="flex flex-wrap gap-2">
              <Badge color="primary" pill>
                Importação #{currentImportedReview.importId}
              </Badge>
              <Badge color="default" pill>
                {currentImportedReview.fileName}
              </Badge>
            </div>
          )}

          {rawImportLoading ? (
            <ContentCard className="flex items-center justify-center py-12 text-sm font-bold text-zinc-500">
              Carregando texto importado...
            </ContentCard>
          ) : rawImportError ? (
            <ContentCard className="border-red-200 bg-red-50/70 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed">{rawImportError}</p>
              </div>
            </ContentCard>
          ) : (
            <Textarea
              rows={18}
              readOnly
              value={rawImportText || "Nenhum texto bruto disponível para esta importação."}
            />
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
}

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
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {badge}
    </div>
  );
}

export default function JobForm({ job, initialData, onBack, onSuccess }: JobFormProps) {
  const { currentUnit, units } = useUnit();
  const tenantId = getTenantId();
  const toast = useToast();
  const isMasterUnit = currentUnit.is_master === 1;
  const startsInImportMode = Boolean(initialData?.["_importMode" as keyof typeof initialData]);
  const unitCity = isMasterUnit ? "" : currentUnit.location.split(",")[0] || "";
  const unitState = isMasterUnit ? "" : currentUnit.location.split(",")[1]?.trim() || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importUnitId, setImportUnitId] = useState<string>(() => currentUnit.id);
  const [importCity, setImportCity] = useState<string>(() => unitCity);

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

    try {
      // Envia todos de uma vez — o servidor processa em background e salva como rascunho
      const body = new FormData();
      filesToProcess.forEach(f => body.append("files", f));
      body.append("tenant_id", String(tenantId));
      body.append("unit_id", String(importUnitId || currentUnit.id));
      if (importCity.trim()) body.append("city", importCity.trim());

      const res = await fetch("/api/jobs/import/batch-auto", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar arquivos.");

      toast.dismiss(loadingToastId);
      const count = data.queued as number;
      toast.success(
        count === 1
          ? "Vaga enviada para processamento — será salva como rascunho em instantes."
          : `${count} vagas enviadas para processamento — serão salvas como rascunho em instantes.`
      );
      onSuccess();
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
            <div className="relative overflow-hidden rounded-xl bg-develoi-navy p-4">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-develoi-gold/10 blur-2xl" />
              <div className="relative z-10 flex items-start gap-2.5">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-develoi-gold" />
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-develoi-gold/70">Resumo da IA</p>
                  <p className="text-[12px] font-medium leading-relaxed text-white/80">{formData.ai_summary}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </PanelCard>
    );
  };

  const renderQueueCard = () => {
    if (importedReviews.length === 0) return null;

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-zinc-100 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-zinc-900">Lote importado</p>
              <p className="text-[11px] text-zinc-400">{importedReviews.length} vaga{importedReviews.length !== 1 ? "s" : ""} aguardando revisão</p>
            </div>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              Lim. {MAX_BATCH_IMPORT_FILES}
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {importedReviews.length > 1 && (
            <button
              onClick={handleBatchAutoSave}
              disabled={isBatchSaving}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-develoi-navy py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a] disabled:opacity-50"
            >
              {isBatchSaving
                ? <><Loader2 size={13} className="animate-spin" /> Salvando {batchSaveProgress?.current}/{batchSaveProgress?.total}…</>
                : <><Zap size={13} className="text-develoi-gold" /> Salvar todas ({importedReviews.length}) automaticamente</>}
            </button>
          )}

          {importedReviews.map((review, index) => {
            const isActive = review.importId === currentImportId;
            return (
              <button
                key={review.importId}
                onClick={() => loadImportedReview(review)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  isActive ? "bg-develoi-gold/8 ring-1 ring-develoi-gold/20" : "hover:bg-zinc-50"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-black text-zinc-500">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-zinc-800">{review.fileName}</p>
                  {review.data?.title && (
                    <p className="truncate text-[10px] text-zinc-500">
                      {review.data.title}{review.data.city ? ` · ${review.data.city}` : ""}
                    </p>
                  )}
                </div>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-develoi-gold/15 px-2 py-0.5 text-[9px] font-bold text-develoi-gold">
                    Editando
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImportMode = () => (
    <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
      <div className="space-y-6">
        {renderQueueCard()}

        {currentImportedReview && (
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <p className="text-[13px] font-semibold text-emerald-800">Revisão pronta</p>
            </div>
            <p className="mb-3 text-[12px] leading-relaxed text-emerald-700/80">
              O lote já contém vaga em análise. Volte para a revisão manual ou importe mais arquivos.
            </p>
            <button
              onClick={() => setImportMode(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <ArrowLeft size={13} /> Voltar para revisão
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Panel header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-navy/8">
            <FileUp size={15} className="text-develoi-navy" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-zinc-900">Importação assistida por IA</h3>
            <p className="text-[11px] text-zinc-400">A plataforma estrutura apenas os campos com evidência textual no documento.</p>
          </div>
        </div>
        <div className="p-5">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {units.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Unidade
              </label>
              <Select
                value={importUnitId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setImportUnitId(uid);
                  const unit = units.find(u => u.id === uid);
                  if (unit?.city) setImportCity(unit.city);
                  else setImportCity("");
                }}
              >
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.city ? ` — ${u.city}` : ""}</option>
                ))}
              </Select>
            </div>
          )}
          <div className={cn("space-y-1.5", units.length <= 1 && "sm:col-span-2")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5">
              Cidade padrão
              <span className="normal-case font-medium text-zinc-400 tracking-normal">(opcional)</span>
            </label>
            <Input
              value={importCity}
              onChange={(e) => setImportCity(e.target.value)}
              placeholder="Ex: São Paulo — deixe em branco para a IA detectar"
            />
            <p className="text-[10px] text-zinc-400 leading-relaxed flex items-start gap-1">
              <Info size={10} className="mt-0.5 shrink-0 text-zinc-300" />
              Usada como fallback quando a IA não encontrar a cidade no documento. Se deixar vazio, a IA tenta extrair do texto.
            </p>
          </div>
        </div>

        {/* ── DROP ZONE ── */}
        <div
          onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setIsDropActive(true); }}
          onDragLeave={(event) => { event.preventDefault(); event.stopPropagation(); setIsDropActive(false); }}
          onDrop={handleDrop}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all sm:px-10 sm:py-20",
            isDropActive
              ? "border-develoi-navy bg-develoi-navy/[0.04]"
              : "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-zinc-50"
          )}
        >
          {/* Subtle corner glows */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-develoi-gold/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-400/8 blur-3xl" />

          {/* Icon */}
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm">
            {isAnalyzing
              ? <div className="h-8 w-8 animate-spin rounded-full border-3 border-develoi-gold border-t-transparent" style={{ borderWidth: 3 }} />
              : <Upload size={24} />}
          </div>

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div key="analyzing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-develoi-navy px-5 py-3.5 text-white shadow-lg">
                  <Sparkles size={15} className="shrink-0 text-develoi-gold" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[12px] font-bold">Aurora IA analisando documento</p>
                    {analyzeProgress && (
                      <p className="mt-0.5 truncate text-[10px] text-white/50">
                        {analyzeProgress.total > 1
                          ? `${analyzeProgress.current}/${analyzeProgress.total}: ${analyzeProgress.fileName}`
                          : analyzeProgress.fileName}
                      </p>
                    )}
                  </div>
                  <Loader2 size={14} className="shrink-0 animate-spin text-white/40" />
                </div>
                <p className="text-[12px] text-zinc-400">Estruturando campos da vaga a partir do documento…</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <h3 className="text-[22px] font-black tracking-tight text-zinc-900">Arraste a descrição da vaga</h3>
                <p className="mx-auto max-w-md text-[13px] leading-relaxed text-zinc-500">
                  Envie até {MAX_BATCH_IMPORT_FILES} arquivos por lote em PDF, Word, texto ou planilha.
                  A IA preenche apenas os campos que encontrar no documento.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-7 flex flex-col items-center gap-3">
            <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx" onChange={handleFileUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-develoi-navy px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-develoi-navy/15 transition-all hover:bg-[#0a1e3a] disabled:opacity-50"
            >
              <Upload size={14} />
              {isAnalyzing ? "Analisando arquivos…" : "Selecionar arquivos"}
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Limite de {MAX_BATCH_IMPORT_FILES} arquivos por lote
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
            {["PDF", "DOC", "DOCX", "TXT", "CSV", "XLS", "XLSX"].map((ext) => (
              <span key={ext} className="rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                .{ext}
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>
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
          <div key={item.label} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{item.description}</p>
            </div>
            <Switch checked={item.checked} onCheckedChange={item.onChange} />
          </div>
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
      <div className="flex items-start gap-3 rounded-xl border border-develoi-navy/10 bg-develoi-navy/[0.04] px-4 py-3.5">
        <Info size={15} className="mt-0.5 shrink-0 text-develoi-navy" />
        <div>
          <p className="text-[13px] font-semibold text-develoi-navy">Leitura estratégica da Aurora AI</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-600">
            Os pesos não precisam somar 100. Eles definem a prioridade relativa entre técnica, experiência, localização e aderência ao contexto da vaga.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {IA_WEIGHT_FIELDS.map((item) => (
          <div key={String(item.field)} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-zinc-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{item.description}</p>
              </div>
              {confidence && (
                <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">IA</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={(formData[item.field] as number | undefined) ?? 0}
                onChange={(event) => handleChange(item.field, Number.parseInt(event.target.value || "0", 10))}
              />
              <span className="shrink-0 text-[13px] font-semibold text-zinc-400">pts</span>
            </div>
          </div>
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

  const renderEditorMode = () => {
    const hasQueue = importedReviews.length > 0;
    return (
      <div className="space-y-5">
        <div className={cn(
          "flex flex-col gap-5",
          hasQueue && "xl:flex-row xl:items-start"
        )}>
          {/* Main form area — full width when no queue */}
          <div className="min-w-0 flex-1 space-y-5">
            {renderImportSummary()}

            {/* Section tabs */}
            <div className="flex items-center gap-0.5 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {SECTION_META.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-develoi-navy text-white shadow-sm"
                        : "text-zinc-500 hover:bg-white hover:text-zinc-800"
                    )}
                  >
                    <Icon size={13} className={isActive ? "text-white" : "text-zinc-400"} />
                    {section.navLabel}
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

          {/* Queue sidebar — only rendered when there are items */}
          {hasQueue && (
            <div className="w-full shrink-0 space-y-5 xl:w-[300px]">
              {renderQueueCard()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const rawImportText = currentImportId ? rawImportTexts[currentImportId] ?? "" : "";

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-sky-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-[20px] font-black leading-none tracking-tight text-white sm:text-[24px]">
                  {job ? "Editar Vaga" : "Cadastrar Nova Vaga"}
                </h1>
                <p className="mt-1 text-[11px] font-medium text-white/40">
                  Configure os detalhes, importe documentos e revise os parâmetros da IA
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentImportedReview && importMode && (
                <button
                  onClick={() => setImportMode(false)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
                >
                  <ArrowLeft size={12} /> Voltar para revisão
                </button>
              )}
              {currentImportedReview && !importMode && !job && (
                <button
                  onClick={() => setImportMode(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
                >
                  <RefreshCcw size={12} /> Importar mais arquivos
                </button>
              )}
              {!importMode && (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={loading}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-4 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={loading}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a] disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                    Salvar e publicar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── MODO TOGGLE (novo / importar) ── */}
        {!job && (
          <div className="flex h-10 items-center gap-0.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
            <button
              onClick={() => setImportMode(false)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-all",
                !importMode
                  ? "bg-develoi-navy text-white shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              )}
            >
              <Building2 size={13} />
              Cadastrar manualmente
            </button>
            <button
              onClick={() => setImportMode(true)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-all",
                importMode
                  ? "bg-develoi-navy text-white shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              )}
            >
              <FileUp size={13} />
              Importar por arquivo
            </button>
          </div>
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

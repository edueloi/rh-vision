import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  FileText,
  Filter,
  Layout,
  Link as LinkIcon,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Badge,
  Button,
  ContentCard,
  Divider,
  EmptyState,
  FormRow,
  IconButton,
  Input,
  Modal,
  PageWrapper,
  PanelCard,
  SectionTitle,
  Select,
  StatCard,
  StatGrid,
  Switch,
  Textarea,
  useToast,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";

type TabId = "tools" | "responses" | "config";
type QuestionType =
  | "text"
  | "long_text"
  | "number"
  | "select"
  | "multi-select"
  | "yes-no"
  | "scale-5"
  | "scale-10";

interface DashboardIndicatorData {
  sent: number;
  received: number;
  completionRate: number;
  discCount: number;
  activeForms: number;
}

interface DashboardChartEntry {
  name?: string;
  status?: string;
  count: number;
  predominant_profile?: string;
}

interface DashboardData {
  indicators: DashboardIndicatorData;
  charts: {
    disc: DashboardChartEntry[];
    usage: DashboardChartEntry[];
    funnel: DashboardChartEntry[];
  };
}

interface ToolQuestionDraft {
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  is_eliminatory: boolean;
  expected_answer: string;
  options_json: string[];
}

interface ToolRecord {
  id: number;
  tenant_id: string | number;
  unit_id?: string | number | null;
  name: string;
  type: string;
  description?: string | null;
  status?: string | null;
  public_slug?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ToolResponseRecord {
  id: number;
  tool_id: number;
  candidate_id?: number | null;
  job_id?: number | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
  tool_name?: string | null;
  tool_type?: string | null;
  status?: string | null;
  score?: number | null;
  classification?: string | null;
  ai_summary?: string | null;
  ai_analysis_json?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

interface ToolAnswerRecord {
  id: number;
  question_id: number;
  question_text: string;
  question_type: string;
  answer_text?: string | null;
  answer_json?: string | null;
}

interface ToolResponseDetail extends ToolResponseRecord {
  answers: ToolAnswerRecord[];
}

interface ToolTemplate {
  key: string;
  name: string;
  type: string;
  description: string;
  summary: string;
  accent: "warning" | "info" | "primary" | "purple";
  questions: ToolQuestionDraft[];
}

const TOOL_TYPE_OPTIONS = [
  { value: "DISC", label: "Perfil DISC" },
  { value: "culture-fit", label: "Fit cultural" },
  { value: "test", label: "Teste técnico" },
  { value: "survey", label: "Pesquisa / clima" },
];

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string; hint: string }> = [
  { value: "text", label: "Texto curto", hint: "Resposta rápida em linha única." },
  { value: "long_text", label: "Parágrafo", hint: "Resposta aberta mais profunda." },
  { value: "number", label: "Número", hint: "Anos, nota, volume ou faixa numérica." },
  { value: "select", label: "Escolha única", hint: "Uma opção por pergunta." },
  { value: "multi-select", label: "Múltipla escolha", hint: "Mais de uma opção aplicável." },
  { value: "yes-no", label: "Sim ou não", hint: "Triagem binária e objetiva." },
  { value: "scale-5", label: "Escala 1-5", hint: "Percepção compacta e comparável." },
  { value: "scale-10", label: "Escala 1-10", hint: "Gradiente mais fino para scoring." },
];

const TOOL_TEMPLATES: ToolTemplate[] = [
  {
    key: "disc",
    name: "Perfil DISC",
    type: "DISC",
    description: "Avaliação comportamental completa com 20 cenários para mapear Dominância, Influência, Estabilidade e Conformidade.",
    summary: "Ideal para mapear perfil comportamental antes de entrevista ou contratação.",
    accent: "warning",
    questions: [
      { question_text: "Quando surge um problema urgente na operação, qual comportamento mais se aproxima do seu?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Assumo a frente e decido rápido", "Engajo as pessoas e crio energia no grupo", "Mantenho a calma e estabilizo o time", "Organizo dados, riscos e critérios antes de agir"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você gosta de rotinas e processos bem definidos?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Como você reage quando precisa convencer pessoas a seguir uma nova direção?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Apresento argumentos diretos e espero ação rápida", "Uso entusiasmo e histórias para engajar emocionalmente", "Escuto todos antes e busco consenso gradual", "Preparo dados e evidências para sustentar minha posição"] },
      { question_text: "Você costuma buscar precisão e revisão antes de entregar algo importante?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Não, prefiro entregar rápido e ajustar depois", "Depende — se for algo visível, capricho mais", "Sim, reviso com calma e peço opinião de outros", "Sempre. Precisão é inegociável para mim"] },
      { question_text: "Ao receber um feedback crítico sobre um erro, qual sua reação imediata?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Foco na solução e corrijo na hora", "Tento entender o impacto no relacionamento com o time", "Aceito com calma e peço orientações claras", "Analiso profundamente a causa raiz do erro"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você se sente confortável liderando reuniões ou grupos?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Qual frase descreve melhor como você lida com prazos apertados?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Acelero o ritmo e elimino qualquer obstáculo", "Motivo a equipe e distribuo responsabilidades com energia", "Mantenho o plano original e faço ajustes graduais", "Reviso prioridades e documento o que pode ser cortado"] },
      { question_text: "Como você prefere receber instruções no trabalho?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Objetivo e resultado final — eu decido como chegar lá", "Conversa leve, com espaço para troca de ideias", "Passo a passo claro, com suporte disponível", "Documentação detalhada com critérios e exemplos"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você valoriza harmonia e evita confrontos no trabalho?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Quando um colega não cumpre o combinado, qual sua tendência?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Cobro diretamente e espero ação imediata", "Converso de forma leve tentando entender o contexto", "Espero um momento adequado e abordo com cuidado", "Registro o ocorrido e comunico ao responsável formal"] },
      { question_text: "O que mais te motiva em um ambiente de trabalho?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Desafios, autonomia e liberdade para decidir", "Reconhecimento, interação social e novidades", "Segurança, colaboração e um time unido", "Qualidade, organização e processos bem feitos"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você gosta de improvisar soluções no momento?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Como você se comporta em uma reunião com muitas opiniões divergentes?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Tomo a palavra e direciono para uma decisão", "Tento mediar com bom humor e achar um meio-termo", "Ouço todos e espero o grupo convergir", "Anoto os pontos e sugiro uma análise mais técnica"] },
      { question_text: "Como você lida com mudanças inesperadas de plano?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Adapto rápido e vejo como oportunidade", "Animo a equipe e ajudo todos a se ajustarem", "Preciso de um tempo para processar e me reorganizar", "Avalio os impactos antes de aceitar a mudança"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você se considera competitivo?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Qual papel você geralmente assume em projetos em grupo?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Líder — defino direção e cobro resultados", "Comunicador — conecto as pessoas e mantenho o clima", "Executor — faço minha parte com consistência", "Planejador — estruturo cronograma e processos"] },
      { question_text: "O que mais te incomoda no trabalho?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Lentidão e falta de ação", "Ambiente frio e sem interação humana", "Conflitos constantes e pressão excessiva", "Falta de padrão, erros evitáveis e desorganização"] },
      { question_text: "Em uma escala de 1 a 5, o quanto você se preocupa com detalhes e acabamento?", question_type: "scale-5", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
      { question_text: "Se pudesse escolher, qual tipo de tarefa você faria o dia todo?", question_type: "select", is_required: true, is_eliminatory: false, expected_answer: "", options_json: ["Resolver problemas complexos e tomar decisões", "Apresentar ideias, negociar e se relacionar", "Manter processos rodando de forma previsível", "Analisar dados, criar relatórios e documentar"] },
      { question_text: "Descreva brevemente como colegas de trabalho costumam te descrever.", question_type: "long_text", is_required: true, is_eliminatory: false, expected_answer: "", options_json: [] },
    ],
  },
  {
    key: "technical",
    name: "Triagem Técnica",
    type: "test",
    description: "Validação inicial de repertório técnico, experiência prática e maturidade operacional.",
    summary: "Útil para vagas que precisam filtrar domínio de ferramentas e profundidade real.",
    accent: "primary",
    questions: [
      {
        question_text: "Quais ferramentas, sistemas ou tecnologias você já utilizou com autonomia?",
        question_type: "long_text",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [],
      },
      {
        question_text: "Há quantos anos você atua diretamente na área desta vaga?",
        question_type: "number",
        is_required: true,
        is_eliminatory: true,
        expected_answer: "2",
        options_json: [],
      },
      {
        question_text: "Marque os contextos em que você já operou.",
        question_type: "multi-select",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [
          "Ambiente industrial",
          "Operação logística",
          "Atendimento ao cliente",
          "Liderança de equipe",
          "Processos com indicadores e metas",
        ],
      },
      {
        question_text: "Você já teve responsabilidade direta sobre metas, SLAs ou indicadores?",
        question_type: "yes-no",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [],
      },
    ],
  },
  {
    key: "culture",
    name: "Fit Cultural",
    type: "culture-fit",
    description: "Avaliação de valores, ambiente desejado, maturidade de comunicação e aderência ao ritmo da operação.",
    summary: "Ajuda a identificar compatibilidade com liderança, autonomia e cultura da unidade.",
    accent: "info",
    questions: [
      {
        question_text: "O que não pode faltar em um ambiente para você performar bem?",
        question_type: "long_text",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [],
      },
      {
        question_text: "Qual cenário representa melhor a forma como você prefere trabalhar?",
        question_type: "select",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [
          "Ambiente muito estruturado, com rotina previsível.",
          "Ambiente colaborativo, com bastante troca e proximidade.",
          "Ambiente intenso, com metas agressivas e rapidez.",
          "Ambiente analítico, com forte foco em qualidade e precisão.",
        ],
      },
      {
        question_text: "Em uma escala de 1 a 10, quão confortável você se sente com mudanças frequentes de prioridade?",
        question_type: "scale-10",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [],
      },
    ],
  },
  {
    key: "screening",
    name: "Triagem Relâmpago",
    type: "survey",
    description: "Formulário curto para captar disponibilidade, aderência mínima e interesse real.",
    summary: "Bom para volume alto, portal público e primeira camada de qualificação.",
    accent: "purple",
    questions: [
      {
        question_text: "Você possui disponibilidade para o modelo de trabalho informado?",
        question_type: "yes-no",
        is_required: true,
        is_eliminatory: true,
        expected_answer: "Sim",
        options_json: [],
      },
      {
        question_text: "Qual turno ou janela de horário melhor atende sua rotina hoje?",
        question_type: "select",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: ["Manhã", "Tarde", "Noite", "Comercial", "Escala flexível"],
      },
      {
        question_text: "Em uma escala de 1 a 5, quanto esta oportunidade faz sentido para o seu momento de carreira?",
        question_type: "scale-5",
        is_required: true,
        is_eliminatory: false,
        expected_answer: "",
        options_json: [],
      },
    ],
  },
];

const PLAYBOOK_PROMPT = `Você é Aurora, especialista em recrutamento.
Analise respostas de um formulário de RH considerando:
1. Clareza e profundidade das respostas.
2. Evidências práticas de experiência.
3. Riscos comportamentais ou operacionais.
4. Compatibilidade com ritmo, processo e cultura.
5. Recomendação final entre Prosseguir, Atenção ou Reprovar.
Responda em JSON com resumo, score, strengths, attention_points e recommendation.`;

const QUALITY_CHECKLIST = [
  "Misture perguntas de triagem objetiva com pelo menos uma resposta aberta que revele repertório real.",
  "Use perguntas eliminatórias apenas quando o critério for realmente obrigatório para a vaga.",
  "Evite blocos longos sem contexto. Perguntas curtas convertem mais e reduzem abandono.",
  "Use escalas para comparar candidatos e múltipla escolha quando quiser acelerar leitura do RH.",
  "Descreva claramente o propósito do formulário. Isso melhora engajamento e qualidade das respostas.",
];

function createBlankQuestion(type: QuestionType = "text"): ToolQuestionDraft {
  return {
    question_text: "",
    question_type: type,
    is_required: true,
    is_eliminatory: false,
    expected_answer: "",
    options_json: type === "select" || type === "multi-select" ? [""] : [],
  };
}

function createEmptyToolForm(): {
  name: string;
  description: string;
  type: string;
  questions: ToolQuestionDraft[];
} {
  return {
    name: "",
    description: "",
    type: "DISC",
    questions: [createBlankQuestion()],
  };
}

function isChoiceQuestion(type: string) {
  return type === "select" || type === "multi-select";
}

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return value
        .split(/\r?\n|;/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function parseAnalysis(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sem data";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function normalizeStatus(status?: string | null) {
  return (status || "").toLowerCase();
}

function isCompletedStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized.includes("conclu") || normalized.includes("anal");
}

function getToolTypeMeta(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("disc")) {
    return {
      label: "Perfil DISC",
      description: "Comportamento e tomada de decisão",
      icon: Brain,
      badgeColor: "warning" as const,
    };
  }

  if (normalized.includes("culture")) {
    return {
      label: "Fit cultural",
      description: "Valores, ritmo e aderência",
      icon: Target,
      badgeColor: "info" as const,
    };
  }

  if (normalized.includes("test") || normalized.includes("technical")) {
    return {
      label: "Teste técnico",
      description: "Profundidade e repertório prático",
      icon: FileText,
      badgeColor: "primary" as const,
    };
  }

  return {
    label: "Formulário",
    description: "Triagem personalizada",
    icon: ClipboardCheck,
    badgeColor: "purple" as const,
  };
}

function getQuestionTypeLabel(type: string) {
  return QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label || "Campo";
}

function getAnswerPreview(answer: ToolAnswerRecord) {
  if (answer.answer_json) {
    try {
      const parsed = JSON.parse(answer.answer_json);
      if (Array.isArray(parsed)) {
        return parsed.join(", ");
      }

      if (typeof parsed === "number" || typeof parsed === "boolean") {
        return String(parsed);
      }

      if (typeof parsed === "object" && parsed !== null) {
        return JSON.stringify(parsed);
      }
    } catch {
      return answer.answer_json;
    }
  }

  return answer.answer_text || "Sem resposta registrada.";
}

function buildPreviewOptions(question: ToolQuestionDraft) {
  const options = question.options_json.filter(Boolean);
  if (options.length > 0) return options;

  if (question.question_type === "yes-no") return ["Sim", "Não"];
  if (question.question_type === "scale-5") return ["1", "2", "3", "4", "5"];
  if (question.question_type === "scale-10") {
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  }

  return [];
}

const DISC_PROFILE_INFO = {
  D: {
    label: "Dominância",
    color: "bg-red-500",
    textColor: "text-red-700",
    description: "Foco em resultados, rapidez e competitividade. Decisivo e direto.",
  },
  I: {
    label: "Influência",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    description: "Foco em pessoas, comunicação e entusiasmo. Sociável e persuasivo.",
  },
  S: {
    label: "Estabilidade",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    description: "Foco em colaboração, persistência e ritmo constante. Paciente e leal.",
  },
  C: {
    label: "Conformidade",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    description: "Foco em detalhes, precisão e regras. Analítico e sistemático.",
  },
};

function DiscResultView({ scores, predominant }: { scores: Record<string, number>; predominant: string }) {
  const sortedProfiles = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {Object.entries(DISC_PROFILE_INFO).map(([key, info]) => {
          const score = scores[key] || 0;
          const isPredominant = key === predominant;

          return (
            <ContentCard
              key={key}
              padding="sm"
              className={cn(
                "relative overflow-hidden border-zinc-100 bg-zinc-50/80 transition-all",
                isPredominant && "border-develoi-navy/20 bg-white ring-1 ring-develoi-navy/10 shadow-sm"
              )}
            >
              <div className="relative z-10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", info.textColor)}>
                    {info.label}
                  </span>
                  <span className="text-lg font-black text-zinc-900">{score}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    className={cn("h-full", info.color)}
                  />
                </div>
              </div>
              {isPredominant && (
                <div className="absolute top-0 right-0 p-1">
                  <Badge color="success" className="scale-75 origin-top-right">Pilar</Badge>
                </div>
              )}
            </ContentCard>
          );
        })}
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-zinc-50/50 p-6">
        <h4 className="text-sm font-black tracking-tight text-zinc-900">Análise de Temperamento</h4>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sortedProfiles.map(([key, score]) => {
            const info = DISC_PROFILE_INFO[key as keyof typeof DISC_PROFILE_INFO];
            return (
              <div key={key} className="flex gap-4">
                <div className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", info.color)} />
                <div className="space-y-1">
                  <p className="text-xs font-black text-zinc-900">
                    {info.label} ({score}%)
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-500">{info.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HRTools() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("tools");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [responses, setResponses] = useState<ToolResponseRecord[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ToolResponseDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<ToolRecord | null>(null);
  const [toolForm, setToolForm] = useState(createEmptyToolForm());
  const [toolSearch, setToolSearch] = useState("");
  const [toolTypeFilter, setToolTypeFilter] = useState("");
  const [responseSearch, setResponseSearch] = useState("");
  const [responseStatusFilter, setResponseStatusFilter] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [responsesLoading, setResponsesLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzingId, setIsAnalyzingId] = useState<number | null>(null);
  const [isCloningId, setIsCloningId] = useState<number | null>(null);
  const [localFlowConfig, setLocalFlowConfig] = useState({
    notifyEmail: true,
    autoAnalysis: true,
    anonymousMode: false,
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      const response = await fetch(`/api/hr-tools/dashboard?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar o painel de ferramentas.");
      }

      setDashboardData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar o painel de ferramentas.");
    } finally {
      setDashboardLoading(false);
    }
  }, [queryUnitId, tenantId, toast]);

  const fetchTools = useCallback(async () => {
    try {
      setToolsLoading(true);
      const response = await fetch(`/api/hr-tools?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar ferramentas.");
      }

      setTools(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar ferramentas.");
      setTools([]);
    } finally {
      setToolsLoading(false);
    }
  }, [queryUnitId, tenantId, toast]);

  const fetchResponses = useCallback(async () => {
    try {
      setResponsesLoading(true);
      const response = await fetch(`/api/hr-tools/all/responses?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar respostas.");
      }

      setResponses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar respostas.");
      setResponses([]);
    } finally {
      setResponsesLoading(false);
    }
  }, [queryUnitId, tenantId, toast]);

  const refreshAll = useCallback(() => {
    fetchDashboard();
    fetchTools();
    fetchResponses();
  }, [fetchDashboard, fetchResponses, fetchTools]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const toolMetrics = useMemo(() => {
    const map = new Map<
      number,
      {
        responsesCount: number;
        completedCount: number;
        scoredCount: number;
        totalScore: number;
        lastResponseAt?: string;
      }
    >();

    responses.forEach((response) => {
      const current = map.get(response.tool_id) || {
        responsesCount: 0,
        completedCount: 0,
        scoredCount: 0,
        totalScore: 0,
        lastResponseAt: undefined,
      };

      current.responsesCount += 1;
      if (isCompletedStatus(response.status)) current.completedCount += 1;
      if (typeof response.score === "number") {
        current.scoredCount += 1;
        current.totalScore += response.score;
      }

      if (!current.lastResponseAt || new Date(response.created_at || 0) > new Date(current.lastResponseAt)) {
        current.lastResponseAt = response.created_at;
      }

      map.set(response.tool_id, current);
    });

    return map;
  }, [responses]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        toolSearch.trim() === "" ||
        tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
        (tool.description || "").toLowerCase().includes(toolSearch.toLowerCase());

      const matchesType = toolTypeFilter === "" || tool.type === toolTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [toolSearch, toolTypeFilter, tools]);

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const haystack = [
        response.candidate_name,
        response.tool_name,
        response.job_title,
        response.classification,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = responseSearch.trim() === "" || haystack.includes(responseSearch.toLowerCase());
      const matchesStatus = responseStatusFilter === "" || response.status === responseStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [responseSearch, responseStatusFilter, responses]);

  const derivedStats = useMemo(() => {
    const totalResponses = responses.length;
    const analyzed = responses.filter((item) => Boolean(item.ai_analysis_json)).length;
    const scored = responses.filter((item) => typeof item.score === "number");
    const averageScore =
      scored.length > 0
        ? Math.round(scored.reduce((total, item) => total + Number(item.score || 0), 0) / scored.length)
        : 0;

    return {
      totalResponses,
      analyzed,
      averageScore,
      pendingAnalysis: totalResponses - analyzed,
    };
  }, [responses]);

  const dashboardIndicators = dashboardData?.indicators || {
    sent: responses.length,
    received: responses.filter((item) => isCompletedStatus(item.status)).length,
    completionRate: responses.length
      ? Math.round((responses.filter((item) => isCompletedStatus(item.status)).length / responses.length) * 100)
      : 0,
    discCount: 0,
    activeForms: tools.length,
  };

  const closeBuilder = () => setShowCreateModal(false);

  const openBlankBuilder = () => {
    setToolForm(createEmptyToolForm());
    setShowCreateModal(true);
  };

  const applyTemplate = (template: ToolTemplate) => {
    setToolForm({
      name: template.name,
      type: template.type,
      description: template.description,
      questions: template.questions.map((question) => ({
        ...question,
        options_json: [...question.options_json],
      })),
    });
    setShowCreateModal(true);
  };

  const cloneTool = async (tool: ToolRecord) => {
    try {
      setIsCloningId(tool.id);
      const response = await fetch(`/api/hr-tools/${tool.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar a ferramenta.");
      }

      const questions = Array.isArray(data.questions)
        ? data.questions.map((question: any) => ({
            question_text: question.question_text || "",
            question_type: (question.question_type || "text") as QuestionType,
            is_required: Boolean(question.is_required),
            is_eliminatory: Boolean(question.is_eliminatory),
            expected_answer: question.expected_answer || "",
            options_json: parseOptions(question.options_json),
          }))
        : [createBlankQuestion()];

      setToolForm({
        name: `${data.name} - Cópia`,
        description: data.description || "",
        type: data.type || "survey",
        questions: questions.length > 0 ? questions : [createBlankQuestion()],
      });
      setShowCreateModal(true);
      toast.success("Ferramenta carregada como novo rascunho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao duplicar ferramenta.");
    } finally {
      setIsCloningId(null);
    }
  };

  const updateToolField = (field: "name" | "description" | "type", value: string) => {
    setToolForm((current) => ({ ...current, [field]: value }));
  };

  const addQuestion = (type: QuestionType = "text") => {
    setToolForm((current) => ({
      ...current,
      questions: [...current.questions, createBlankQuestion(type)],
    }));
  };

  const updateQuestion = (index: number, patch: Partial<ToolQuestionDraft>) => {
    setToolForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              ...patch,
              options_json:
                patch.question_type && !isChoiceQuestion(patch.question_type)
                  ? []
                  : patch.options_json !== undefined
                    ? patch.options_json
                    : question.options_json,
            }
          : question
      ),
    }));
  };

  const removeQuestion = (index: number) => {
    setToolForm((current) => {
      const nextQuestions = current.questions.filter((_, questionIndex) => questionIndex !== index);
      return {
        ...current,
        questions: nextQuestions.length > 0 ? nextQuestions : [createBlankQuestion()],
      };
    });
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    setToolForm((current) => {
      const next = [...current.questions];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, questions: next };
    });
  };

  const handleCopyLink = (slug?: string | null) => {
    if (!slug) {
      toast.error("Ferramenta sem link público disponível.");
      return;
    }

    navigator.clipboard.writeText(`${window.location.origin}/public/tools/${slug}`);
    toast.success("Link público copiado.");
  };

  const handleCreateTool = async (event: React.FormEvent) => {
    event.preventDefault();

    const sanitizedQuestions = toolForm.questions
      .map((question) => ({
        question_text: question.question_text.trim(),
        question_type: question.question_type,
        is_required: question.is_required,
        is_eliminatory: question.is_eliminatory,
        expected_answer: question.expected_answer.trim(),
        options_json: question.options_json.map((option) => option.trim()).filter(Boolean),
      }))
      .filter((question) => question.question_text.length > 0);

    if (!toolForm.name.trim()) {
      toast.error("Informe o nome da ferramenta.");
      return;
    }

    if (!toolForm.description.trim()) {
      toast.error("Descreva o objetivo do formulário.");
      return;
    }

    if (sanitizedQuestions.length === 0) {
      toast.error("Adicione pelo menos uma pergunta.");
      return;
    }

    const invalidChoiceQuestion = sanitizedQuestions.find(
      (question) => isChoiceQuestion(question.question_type) && question.options_json.length < 2
    );

    if (invalidChoiceQuestion) {
      toast.error("Perguntas de escolha precisam ter pelo menos duas opções.");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/hr-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          unit_id: currentUnit.id,
          name: toolForm.name.trim(),
          type: toolForm.type,
          description: toolForm.description.trim(),
          questions: sanitizedQuestions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar a ferramenta.");
      }

      toast.success("Ferramenta publicada com sucesso.");
      setToolForm(createEmptyToolForm());
      setShowCreateModal(false);
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar a ferramenta.");
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDeleteTool = async () => {
    if (!toolToDelete) return;

    try {
      const response = await fetch(`/api/hr-tools/${toolToDelete.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao remover ferramenta.");
      }

      toast.success("Ferramenta removida com sucesso.");
      setToolToDelete(null);
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover ferramenta.");
    }
  };

  const fetchResponseDetails = async (responseId: number) => {
    try {
      const response = await fetch(`/api/hr-tools/responses/${responseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar detalhes da resposta.");
      }

      setSelectedResponse(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar detalhes da resposta.");
    }
  };

  const runAiAnalysis = async (responseId: number) => {
    try {
      setIsAnalyzingId(responseId);
      const response = await fetch(`/api/hr-tools/responses/${responseId}/analyze`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar análise automática.");
      }

      toast.success("Análise gerada com sucesso.");
      await fetchResponses();

      if (selectedResponse?.id === responseId) {
        await fetchResponseDetails(responseId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar análise automática.");
    } finally {
      setIsAnalyzingId(null);
    }
  };

  const copyPlaybook = async () => {
    await navigator.clipboard.writeText(PLAYBOOK_PROMPT);
    toast.success("Playbook copiado.");
  };

  const builderQuestionCount = toolForm.questions.filter((question) => question.question_text.trim()).length;
  const builderEstimatedMinutes = Math.max(1, Math.ceil(Math.max(toolForm.questions.length, 1) * 0.75));
  const selectedAnalysis = parseAnalysis(selectedResponse?.ai_analysis_json);

  const renderBuilderPreview = () => (
    <PanelCard
      title="Preview da experiência"
      description="A prévia acompanha o formulário e ajuda o RH a perceber fricção antes de publicar."
      icon={Eye}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Perguntas</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{toolForm.questions.length}</p>
          </ContentCard>

          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Tempo estimado</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{builderEstimatedMinutes} min</p>
          </ContentCard>

          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Prontas</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{builderQuestionCount}</p>
          </ContentCard>
        </div>

        <ContentCard className="space-y-4 border-zinc-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge color={getToolTypeMeta(toolForm.type).badgeColor} pill>
                {getToolTypeMeta(toolForm.type).label}
              </Badge>
              <Badge color="default" pill>
                Etapa inicial
              </Badge>
            </div>
            <h4 className="text-lg font-black tracking-tight text-zinc-900">
              {toolForm.name.trim() || "Seu formulário ainda está sem nome"}
            </h4>
            <p className="text-sm leading-relaxed text-zinc-500">
              {toolForm.description.trim() ||
                "Descreva aqui o propósito do formulário para o candidato entender o contexto antes de responder."}
            </p>
          </div>

          <Divider className="my-0" />

          <div className="space-y-3">
            {toolForm.questions.slice(0, 3).map((question, index) => (
              <div key={`${question.question_text}-${index}`} className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black tracking-tight text-zinc-900">
                    {question.question_text.trim() || `Pergunta ${index + 1}`}
                  </p>
                  <Badge color="default" pill>
                    {getQuestionTypeLabel(question.question_type)}
                  </Badge>
                </div>

                {question.question_type === "text" && (
                  <div className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-400">
                    Resposta curta do candidato
                  </div>
                )}

                {question.question_type === "long_text" && (
                  <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-xs text-zinc-400">
                    Resposta detalhada em bloco de texto
                  </div>
                )}

                {question.question_type === "number" && (
                  <div className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-400">
                    Campo numérico validado
                  </div>
                )}

                {buildPreviewOptions(question).length > 0 && (
                  <div
                    className={cn(
                      "grid gap-2",
                      question.question_type === "scale-10"
                        ? "grid-cols-5"
                        : question.question_type === "scale-5"
                          ? "grid-cols-5"
                          : "grid-cols-1"
                    )}
                  >
                    {buildPreviewOptions(question).slice(0, question.question_type.startsWith("scale") ? undefined : 4).map((option) => (
                      <div
                        key={option}
                        className={cn(
                          "rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500",
                          question.question_type.startsWith("scale") && "text-center"
                        )}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {toolForm.questions.length > 3 && (
              <p className="text-xs font-semibold text-zinc-400">
                +{toolForm.questions.length - 3} perguntas adicionais aparecerão no fluxo público.
              </p>
            )}
          </div>
        </ContentCard>
      </div>
    </PanelCard>
  );

  const renderBuilderModal = () => (
    <Modal
      open={showCreateModal}
      onClose={closeBuilder}
      size="xl"
      title="Construtor de ferramentas"
      description="Monte formulários mais fortes que um fluxo comum: tipagem real, critérios eliminatórios, análise automática e preview da jornada."
      icon={<Layout size={20} />}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={closeBuilder}>
            Cancelar
          </Button>
          <Button form="tool-builder-form" type="submit" variant="secondary" loading={isCreating}>
            Publicar ferramenta
          </Button>
        </div>
      }
    >
      <form id="tool-builder-form" onSubmit={handleCreateTool} className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <div className="space-y-6">
          <PanelCard
            title="Modelos rápidos"
            description="Comece de um playbook pronto e ajuste a camada final para a unidade."
            icon={Zap}
          >
            <div className="space-y-3">
              {TOOL_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-4 text-left transition-all hover:border-develoi-navy/30 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black tracking-tight text-zinc-900">{template.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{template.summary}</p>
                    </div>
                    <Badge color={template.accent} pill>
                      {template.questions.length} blocos
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </PanelCard>

          {renderBuilderPreview()}
        </div>

        <div className="space-y-6">
          <PanelCard
            title="Briefing do formulário"
            description="Defina objetivo, posicionamento e contexto para a pessoa candidata."
            icon={ClipboardCheck}
          >
            <FormRow cols={2}>
              <Input
                label="Nome da ferramenta"
                required
                value={toolForm.name}
                onChange={(event) => updateToolField("name", event.target.value)}
                placeholder="Ex: Triagem inicial de liderança"
              />

              <Select
                label="Tipo"
                value={toolForm.type}
                onChange={(event) => updateToolField("type", event.target.value)}
              >
                {TOOL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormRow>

            <Textarea
              label="Descrição"
              required
              rows={4}
              maxChars={280}
              value={toolForm.description}
              onChange={(event) => updateToolField("description", event.target.value)}
              placeholder="Explique o objetivo do formulário, o que o RH vai medir e o tom da avaliação."
            />
          </PanelCard>

          <PanelCard
            title="Perguntas"
            description="Construa um fluxo forte, com tipos certos, opções reais e critérios de corte quando necessário."
            icon={FileText}
            action={
              <Button type="button" size="sm" iconLeft={<Plus size={14} />} onClick={() => addQuestion()}>
                Nova pergunta
              </Button>
            }
          >
            <div className="space-y-4">
              {toolForm.questions.map((question, index) => (
                <ContentCard key={`${index}-${question.question_type}`} className="space-y-4 border-zinc-200">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color="primary" pill>
                          Pergunta {index + 1}
                        </Badge>
                        <Badge color="default" pill>
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>
                        {question.is_required && (
                          <Badge color="success" pill>
                            Obrigatória
                          </Badge>
                        )}
                        {question.is_eliminatory && (
                          <Badge color="danger" pill>
                            Eliminatória
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Ajuste o formato da resposta para facilitar leitura, score e análise da Aurora.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <IconButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveQuestion(index, "up")}
                        disabled={index === 0}
                        aria-label="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === toolForm.questions.length - 1}
                        aria-label="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                      <IconButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        aria-label="Remover pergunta"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>

                  <Textarea
                    label="Enunciado"
                    required
                    rows={2}
                    value={question.question_text}
                    onChange={(event) => updateQuestion(index, { question_text: event.target.value })}
                    placeholder="Escreva uma pergunta clara, objetiva e fácil de responder."
                  />

                  <FormRow cols={2}>
                    <Select
                      label="Formato de resposta"
                      value={question.question_type}
                      onChange={(event) =>
                        updateQuestion(index, {
                          question_type: event.target.value as QuestionType,
                          options_json: isChoiceQuestion(event.target.value)
                            ? question.options_json.length > 0
                              ? question.options_json
                              : ["", ""]
                            : [],
                        })
                      }
                    >
                      {QUESTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Resposta esperada / critério"
                      value={question.expected_answer}
                      onChange={(event) => updateQuestion(index, { expected_answer: event.target.value })}
                      placeholder="Ex: Sim, 3 anos, nível 8+, Excel avançado"
                    />
                  </FormRow>

                  {isChoiceQuestion(question.question_type) && (
                    <Textarea
                      label="Opções"
                      rows={4}
                      hint="Uma opção por linha. Isso melhora a manutenção e o preview público."
                      value={question.options_json.join("\n")}
                      onChange={(event) =>
                        updateQuestion(index, {
                          options_json: event.target.value
                            .split(/\r?\n/)
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder={"Exemplo:\nLiderança direta\nOperação logística\nIndicadores e metas"}
                    />
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <ContentCard padding="sm" className="flex items-start justify-between gap-4 border-zinc-100 bg-zinc-50/70">
                      <div className="space-y-1">
                        <p className="text-sm font-black tracking-tight text-zinc-900">Pergunta obrigatória</p>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          Exija resposta antes de avançar no fluxo público.
                        </p>
                      </div>
                      <Switch
                        checked={question.is_required}
                        onCheckedChange={(checked) => updateQuestion(index, { is_required: checked })}
                      />
                    </ContentCard>

                    <ContentCard padding="sm" className="flex items-start justify-between gap-4 border-zinc-100 bg-zinc-50/70">
                      <div className="space-y-1">
                        <p className="text-sm font-black tracking-tight text-zinc-900">Critério eliminatório</p>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          Destaque este bloco para triagem objetiva e leitura mais rápida do RH.
                        </p>
                      </div>
                      <Switch
                        checked={question.is_eliminatory}
                        onCheckedChange={(checked) => updateQuestion(index, { is_eliminatory: checked })}
                      />
                    </ContentCard>
                  </div>
                </ContentCard>
              ))}
            </div>
          </PanelCard>
        </div>
      </form>
    </Modal>
  );

  const renderToolsTab = () => (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { title: "Formulários ativos",  value: dashboardIndicators.activeForms,       icon: ClipboardCheck, color: "text-develoi-navy",  bg: "bg-develoi-navy/8",   bar: "bg-develoi-navy" },
          { title: "Respostas recebidas", value: dashboardIndicators.received,           icon: Users,          color: "text-develoi-gold",  bg: "bg-develoi-gold/10",  bar: "bg-develoi-gold" },
          { title: "Taxa de conclusão",   value: `${dashboardIndicators.completionRate}%`, icon: BarChart3,    color: "text-sky-600",        bg: "bg-sky-50",           bar: "bg-sky-500" },
          { title: "Candidatos com DISC", value: dashboardIndicators.discCount,          icon: Brain,          color: "text-amber-600",     bg: "bg-amber-50",         bar: "bg-amber-400" },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className={cn("absolute -right-4 -top-4 h-14 w-14 rounded-full blur-xl opacity-50", s.bg)} />
            <div className="relative z-10">
              <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                <s.icon size={15} className={s.color} />
              </div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.title}</p>
              <p className={cn("text-[26px] font-black leading-none tabular-nums", s.color)}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr,0.7fr]">
        {/* Radar */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
              <BarChart3 size={13} className="text-develoi-navy" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-zinc-900">Radar da operação</span>
              <p className="text-[10px] text-zinc-400">Uso das ferramentas e funil de respostas</p>
            </div>
          </div>
          <div className="grid gap-0 divide-x divide-zinc-100 lg:grid-cols-2">
            {/* Usage bars */}
            <div className="space-y-3 p-4">
              <p className="text-[11px] font-semibold text-zinc-500">Ferramentas mais usadas</p>
              {(dashboardData?.charts.usage || []).slice(0, 4).map((item) => {
                const denominator = Math.max(dashboardIndicators.sent || 0, 1);
                const width = Math.min(100, Math.round((item.count / denominator) * 100));
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-600">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="font-semibold tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-develoi-navy transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {(dashboardData?.charts.usage || []).length === 0 && (
                <p className="text-[11px] italic text-zinc-400">Volume insuficiente para leitura de uso.</p>
              )}
            </div>
            {/* Funnel */}
            <div className="space-y-2 p-4">
              <p className="text-[11px] font-semibold text-zinc-500">Status das respostas</p>
              {(dashboardData?.charts.funnel || []).map((item) => {
                const color = isCompletedStatus(item.status) ? "bg-emerald-500"
                  : item.status?.toLowerCase().includes("pend") ? "bg-amber-400" : "bg-sky-500";
                return (
                  <div key={`${item.status}-${item.count}`} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} />
                      <span className="text-[12px] font-medium text-zinc-700">{item.status}</span>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums text-zinc-900">{item.count}</span>
                  </div>
                );
              })}
              {(dashboardData?.charts.funnel || []).length === 0 && (
                <p className="text-[11px] italic text-zinc-400">Funil vazio — aguardando submissões.</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick templates */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
              <Layout size={13} className="text-develoi-navy" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-zinc-900">Templates prontos</span>
              <p className="text-[10px] text-zinc-400">Comece de um modelo e ajuste apenas o que precisar</p>
            </div>
          </div>
          <div className="divide-y divide-zinc-50">
            {TOOL_TEMPLATES.map((template) => {
              const ACCENT_COLORS: Record<string, { dot: string; badge: string }> = {
                warning: { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700" },
                info:    { dot: "bg-sky-500",      badge: "bg-sky-50 text-sky-700" },
                primary: { dot: "bg-develoi-navy", badge: "bg-develoi-navy/8 text-develoi-navy" },
                purple:  { dot: "bg-violet-500",   badge: "bg-violet-50 text-violet-700" },
              };
              const ac = ACCENT_COLORS[template.accent] ?? ACCENT_COLORS.primary;
              return (
                <button key={template.key} type="button" onClick={() => applyTemplate(template)}
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ac.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-zinc-900">{template.name}</p>
                    <p className="text-[10px] text-zinc-400">{template.summary}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold", ac.badge)}>
                    {template.questions.length} perguntas
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter bar tools */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
        <div className="relative flex min-w-[180px] flex-1 items-center">
          <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
          <input type="text" placeholder="Nome ou objetivo do formulário…"
            value={toolSearch} onChange={e => setToolSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15" />
        </div>
        <select value={toolTypeFilter} onChange={e => setToolTypeFilter(e.target.value)}
          className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition-all sm:w-40"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '10px', paddingRight: '2rem' }}>
          <option value="">Todos os tipos</option>
          {TOOL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex-1" />
        {(toolSearch || toolTypeFilter) && (
          <button onClick={() => { setToolSearch(""); setToolTypeFilter(""); }}
            className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-rose-500">Limpar</button>
        )}
      </div>

      {/* Tool cards */}
      {toolsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <ClipboardCheck size={24} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-zinc-700">Nenhuma ferramenta encontrada</p>
            <p className="mt-1 text-[12px] text-zinc-400">Crie seu primeiro formulário ou escolha um template abaixo.</p>
          </div>
          <button onClick={openBlankBuilder}
            className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
            <Plus size={13} /> Criar formulário
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool, index) => {
            const meta = getToolTypeMeta(tool.type);
            const metrics = toolMetrics.get(tool.id);
            const Icon = meta.icon;
            const completionRate = metrics?.responsesCount
              ? Math.round((metrics.completedCount / metrics.responsesCount) * 100) : 0;
            const averageScore = metrics && metrics.scoredCount > 0
              ? Math.round(metrics.totalScore / metrics.scoredCount) : null;

            const BADGE_COLORS: Record<string, string> = {
              warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
              info:    "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
              primary: "bg-develoi-navy/8 text-develoi-navy ring-1 ring-develoi-navy/15",
              purple:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
            };
            const badgeClass = BADGE_COLORS[meta.badgeColor] ?? BADGE_COLORS.primary;

            return (
              <motion.div key={tool.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03, duration: 0.2 }}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-develoi-navy/20 hover:shadow-md">
                  {/* Top band */}
                  <div className={cn("h-1", meta.badgeColor === "warning" ? "bg-amber-400" : meta.badgeColor === "info" ? "bg-sky-500" : meta.badgeColor === "purple" ? "bg-violet-500" : "bg-develoi-navy")} />

                  <div className="flex flex-1 flex-col gap-4 p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.badgeColor === "warning" ? "bg-amber-50 text-amber-600" : meta.badgeColor === "info" ? "bg-sky-50 text-sky-600" : meta.badgeColor === "purple" ? "bg-violet-50 text-violet-600" : "bg-develoi-navy/8 text-develoi-navy")}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", badgeClass)}>{meta.label}</span>
                          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", tool.status === "Ativo" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-zinc-100 text-zinc-500")}>
                            {tool.status || "Rascunho"}
                          </span>
                        </div>
                        <h3 className="text-[13px] font-bold leading-tight text-zinc-900">{tool.name}</h3>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{tool.description || meta.description}</p>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Respostas", value: metrics?.responsesCount || 0, color: "text-zinc-900" },
                        { label: "Conclusão", value: `${completionRate}%`,          color: completionRate >= 70 ? "text-emerald-600" : "text-amber-600" },
                        { label: "Score",     value: averageScore != null ? `${averageScore}` : "—", color: averageScore && averageScore >= 70 ? "text-emerald-600" : "text-zinc-600" },
                      ].map(m => (
                        <div key={m.label} className="rounded-xl bg-zinc-50 p-2.5 text-center ring-1 ring-zinc-200/80">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{m.label}</p>
                          <p className={cn("mt-1 text-[18px] font-black tabular-nums leading-none", m.color)}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Last interaction */}
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <Clock size={10} />
                      Última: <span className="font-medium text-zinc-600">{formatDateTime(metrics?.lastResponseAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCopyLink(tool.public_slug)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-develoi-navy px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]"
                      >
                        <LinkIcon size={12} /> Copiar link
                      </button>
                      <button
                        onClick={() => window.open(`/public/tools/${tool.public_slug}`, "_blank")}
                        disabled={!tool.public_slug}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                      >
                        <Eye size={12} /> Visualizar
                      </button>
                      <button
                        onClick={() => cloneTool(tool)}
                        disabled={isCloningId === tool.id}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {isCloningId === tool.id ? <RefreshCw size={11} className="animate-spin" /> : <Copy size={12} />} Duplicar
                      </button>
                      <button
                        onClick={() => setToolToDelete(tool)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderResponsesTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { title: "Respostas totais",    value: derivedStats.totalResponses,          icon: Users,     color: "text-develoi-navy",  bg: "bg-develoi-navy/8" },
          { title: "Com análise IA",      value: derivedStats.analyzed,                icon: Sparkles,  color: "text-sky-600",        bg: "bg-sky-50" },
          { title: "Score médio",         value: derivedStats.averageScore || "—",     icon: BarChart3, color: "text-develoi-gold",   bg: "bg-develoi-gold/10" },
          { title: "Pendentes de leitura",value: derivedStats.pendingAnalysis,         icon: Clock,     color: "text-amber-600",      bg: "bg-amber-50" },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
              <s.icon size={15} className={s.color} />
            </div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.title}</p>
            <p className={cn("text-[26px] font-black leading-none tabular-nums", s.color)}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
        <div className="relative flex min-w-[180px] flex-1 items-center">
          <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
          <input type="text" placeholder="Candidato, ferramenta, vaga…"
            value={responseSearch} onChange={e => setResponseSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15" />
        </div>
        <select value={responseStatusFilter} onChange={e => setResponseStatusFilter(e.target.value)}
          className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition-all sm:w-36"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '10px', paddingRight: '2rem' }}>
          <option value="">Todos status</option>
          {[...new Set(responses.map(r => r.status).filter(Boolean))].map(s => <option key={s} value={s || ""}>{s}</option>)}
        </select>
        <div className="flex-1" />
        {(responseSearch || responseStatusFilter) && (
          <button onClick={() => { setResponseSearch(""); setResponseStatusFilter(""); }}
            className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-rose-500">
            Limpar
          </button>
        )}
        <button onClick={fetchResponses} title="Atualizar"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Response cards */}
      {responsesLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
          ))}
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <Mail size={24} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-zinc-700">Nenhuma resposta encontrada</p>
            <p className="mt-1 text-[12px] text-zinc-400">Assim que candidatos responderem, a fila aparece aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredResponses.map((item) => {
            const hasAnalysis = Boolean(item.ai_analysis_json);
            const meta = getToolTypeMeta(item.tool_type || item.tool_name || "survey");
            const ResponseIcon = meta.icon;
            const isCompleted = isCompletedStatus(item.status);
            const isPending   = normalizeStatus(item.status).includes("pend");

            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  {/* Score band */}
                  <div className={cn("h-1", isCompleted ? "bg-emerald-500" : isPending ? "bg-amber-400" : "bg-sky-400")} />

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                            {item.tool_name || "Ferramenta"}
                          </span>
                          <span className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                            isCompleted ? "bg-emerald-50 text-emerald-700" :
                            isPending   ? "bg-amber-50 text-amber-700" :
                            "bg-sky-50 text-sky-700"
                          )}>
                            {item.status || "Em andamento"}
                          </span>
                          {typeof item.score === "number" && (
                            <span className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums",
                              item.score >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {item.score} pts
                            </span>
                          )}
                        </div>
                        <h3 className="truncate text-[13px] font-bold text-zinc-900">
                          {item.candidate_name || "Candidato sem nome"}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400">
                          <Clock size={9} /> {item.job_title || "Aplicação geral"} · {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-develoi-navy/8 text-develoi-navy">
                        <ResponseIcon size={16} />
                      </div>
                    </div>

                    {/* Aurora summary */}
                    <div className={cn(
                      "rounded-xl border p-3 text-[11px] leading-relaxed",
                      hasAnalysis ? "border-sky-100 bg-sky-50/60 text-sky-800" : "border-zinc-100 bg-zinc-50 text-zinc-500 italic"
                    )}>
                      {hasAnalysis
                        ? <><span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-sky-600">Resumo Aurora</span>{item.ai_summary}</>
                        : "Sem resumo ainda. Gere a análise para estruturar leitura, score e recomendação."}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fetchResponseDetails(item.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        <Eye size={12} /> Ver detalhe
                      </button>
                      <button
                        onClick={() => runAiAnalysis(item.id)}
                        disabled={isAnalyzingId === item.id}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors disabled:opacity-50",
                          hasAnalysis
                            ? "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            : "bg-develoi-navy text-white hover:bg-[#0a1e3a]"
                        )}
                      >
                        {isAnalyzingId === item.id ? <RefreshCw size={11} className="animate-spin" /> : <Wand2 size={12} />}
                        {hasAnalysis ? "Reprocessar" : "Gerar análise"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <PanelCard
          title="Biblioteca de modelos"
          description="Escolha um ponto de partida sólido e adapte para a sua unidade sem montar tudo do zero."
          icon={Layout}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {TOOL_TEMPLATES.map((template) => (
              <ContentCard key={template.key} className="space-y-4 border-zinc-200/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black tracking-tight text-zinc-900">{template.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{template.description}</p>
                  </div>
                  <Badge color={template.accent} pill>
                    {template.type}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {template.questions.slice(0, 3).map((question, index) => (
                    <div key={`${template.key}-${index}`} className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-sm text-zinc-600">
                      {question.question_text}
                    </div>
                  ))}
                </div>

                <Button variant="secondary" size="sm" onClick={() => applyTemplate(template)}>
                  Usar modelo
                </Button>
              </ContentCard>
            ))}
          </div>
        </PanelCard>

        <div className="space-y-6">
          <PanelCard
            title="Fluxo recomendado"
            description="Ajustes locais para orientar a operação do time ao publicar e analisar respostas."
            icon={Shield}
          >
            <div className="space-y-3">
              {[
                {
                  key: "notifyEmail" as const,
                  title: "Notificar time por e-mail",
                  description: "Destaque para respostas novas em rotinas com alto volume.",
                },
                {
                  key: "autoAnalysis" as const,
                  title: "Priorizar parecer automático",
                  description: "Boa prática quando o formulário já tem perguntas bem estruturadas.",
                },
                {
                  key: "anonymousMode" as const,
                  title: "Leitura cega na primeira triagem",
                  description: "Reduz vieses quando o foco inicial é só na resposta.",
                },
              ].map((item) => (
                <ContentCard key={item.key} padding="sm" className="flex items-start justify-between gap-4 border-zinc-100 bg-zinc-50/80">
                  <div className="space-y-1">
                    <p className="text-sm font-black tracking-tight text-zinc-900">{item.title}</p>
                    <p className="text-xs leading-relaxed text-zinc-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={localFlowConfig[item.key]}
                    onCheckedChange={(checked) =>
                      setLocalFlowConfig((current) => ({ ...current, [item.key]: checked }))
                    }
                  />
                </ContentCard>
              ))}
            </div>
          </PanelCard>

          <PanelCard
            title="Playbook Aurora"
            description="Prompt-base para copiar e usar como padrão de leitura de formulários em outros fluxos."
            icon={Sparkles}
            action={
              <Button size="sm" variant="outline" onClick={copyPlaybook}>
                Copiar prompt
              </Button>
            }
          >
            <Textarea rows={10} readOnly value={PLAYBOOK_PROMPT} />
          </PanelCard>
        </div>
      </div>

      <PanelCard
        title="Checklist de qualidade"
        description="Princípios simples para fazer um formulário parecer produto e não só uma sequência de campos."
        icon={CheckCircle2}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {QUALITY_CHECKLIST.map((item, index) => (
            <ContentCard key={index} padding="sm" className="flex gap-3 border-zinc-100 bg-zinc-50/80">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-develoi-navy shadow-sm">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">{item}</p>
            </ContentCard>
          ))}
        </div>
      </PanelCard>
    </div>
  );

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ClipboardCheck size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">{currentUnit.name}</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Ferramentas de RH
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                <span className="font-semibold text-white/60">{tools.length}</span> formulários mapeados na unidade
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAll}
                title="Atualizar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/50 transition-all hover:bg-white/12 hover:text-white"
              >
                <RefreshCw size={13} className={dashboardLoading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={openBlankBuilder}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
              >
                <Plus size={13} /> Novo formulário
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
            {[
              { label: "Formulários ativos", value: dashboardIndicators.activeForms, color: "text-white" },
              { label: "Respostas",           value: dashboardIndicators.received,    color: "text-emerald-400" },
              { label: "Taxa conclusão",      value: `${dashboardIndicators.completionRate}%`, color: "text-sky-300" },
              { label: "Com DISC",            value: dashboardIndicators.discCount,   color: "text-develoi-gold" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <span className={cn("text-[20px] font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[10px] font-medium text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
          {([
            { id: "tools"     as TabId, label: "Formulários",       icon: ClipboardCheck },
            { id: "responses" as TabId, label: "Respostas",         icon: Mail },
            { id: "config"    as TabId, label: "Biblioteca",        icon: Layout },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-develoi-navy text-white shadow-sm"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-800"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "tools" && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {renderToolsTab()}
            </motion.div>
          )}

          {activeTab === "responses" && (
            <motion.div
              key="responses"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {renderResponsesTab()}
            </motion.div>
          )}

          {activeTab === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {renderConfigTab()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {renderBuilderModal()}

      <Modal
        open={Boolean(selectedResponse)}
        onClose={() => setSelectedResponse(null)}
        size="xl"
        title={selectedResponse?.candidate_name || "Resposta da ferramenta"}
        description={selectedResponse?.tool_name || "Detalhe da submissão"}
        icon={<Users size={20} />}
      >
        {selectedResponse && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Ferramenta</p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">{selectedResponse.tool_name}</p>
              </ContentCard>
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Status</p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">{selectedResponse.status || "Em andamento"}</p>
              </ContentCard>
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Score</p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">
                  {typeof selectedResponse.score === "number" ? selectedResponse.score : "--"}
                </p>
              </ContentCard>
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Recebido em</p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">{formatDateTime(selectedResponse.created_at)}</p>
              </ContentCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
              <PanelCard
                title="Respostas do candidato"
                description="Leitura pergunta a pergunta com o valor efetivamente submetido."
                icon={FileText}
              >
                <div className="space-y-4">
                  {selectedResponse.answers.map((answer, index) => (
                    <ContentCard key={answer.id} className="space-y-3 border-zinc-100 bg-zinc-50/70">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color="primary" pill>
                          Pergunta {index + 1}
                        </Badge>
                        <Badge color="default" pill>
                          {getQuestionTypeLabel(answer.question_type)}
                        </Badge>
                      </div>
                      <p className="text-sm font-black tracking-tight text-zinc-900">{answer.question_text}</p>
                      <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-600">
                        {getAnswerPreview(answer)}
                      </div>
                    </ContentCard>
                  ))}
                </div>
              </PanelCard>

              <div className="space-y-6">
                <PanelCard
                  title="Contexto da pessoa"
                  description="Referências de identificação e vaga vinculada."
                  icon={Mail}
                >
                  <div className="space-y-3 text-sm text-zinc-600">
                    <p>
                      <span className="font-black text-zinc-900">Nome:</span> {selectedResponse.candidate_name || "Não informado"}
                    </p>
                    <p>
                      <span className="font-black text-zinc-900">E-mail:</span> {selectedResponse.candidate_email || "Não informado"}
                    </p>
                    <p>
                      <span className="font-black text-zinc-900">Vaga:</span> {selectedResponse.job_title || "Aplicação geral"}
                    </p>
                  </div>
                </PanelCard>

                {selectedAnalysis ? (
                  <>
                    {selectedAnalysis.disc_scores && (
                      <PanelCard
                        title="Perfil Comportamental DISC"
                        description="Mapeamento de tendências, ritmo e forma de atuação predominante."
                        icon={Brain}
                      >
                        <DiscResultView
                          scores={selectedAnalysis.disc_scores}
                          predominant={selectedAnalysis.predominant_profile}
                        />
                      </PanelCard>
                    )}

                    <PanelCard
                      title="Parecer Aurora"
                      description="Resumo executivo, score e recomendação automática."
                      icon={Sparkles}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4">
                        <div className="rounded-3xl bg-develoi-navy px-5 py-5 text-white">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-develoi-gold">
                                Score estimado
                              </p>
                              <p className="mt-2 text-4xl font-black tracking-tight text-develoi-gold">
                                {selectedAnalysis.score_estimate ?? "--"}%
                              </p>
                            </div>
                            <Badge
                              color={selectedAnalysis.recommendation === "Prosseguir" ? "success" : "warning"}
                              pill
                              className="self-start"
                            >
                              {selectedAnalysis.recommendation || "Sem recomendação"}
                            </Badge>
                          </div>
                          <p className="mt-4 text-sm leading-relaxed text-white/85">
                            {selectedAnalysis.summary || "A análise foi concluída, mas não retornou resumo."}
                          </p>
                        </div>

                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Pontos fortes</p>
                          <div className="mt-3 space-y-2">
                            {(selectedAnalysis.strengths || []).map((item: string, index: number) => (
                              <div key={index} className="flex gap-2 text-sm text-zinc-600">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{item}</span>
                              </div>
                            ))}
                            {(selectedAnalysis.strengths || []).length === 0 && (
                              <p className="text-sm text-zinc-400">A análise não destacou pontos fortes específicos.</p>
                            )}
                          </div>
                        </ContentCard>

                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Pontos de atenção</p>
                          <div className="mt-3 space-y-2">
                            {(selectedAnalysis.attention_points || []).map((item: string, index: number) => (
                              <div key={index} className="flex gap-2 text-sm text-zinc-600">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>{item}</span>
                              </div>
                            ))}
                            {(selectedAnalysis.attention_points || []).length === 0 && (
                              <p className="text-sm text-zinc-400">A análise não encontrou alertas relevantes.</p>
                            )}
                          </div>
                        </ContentCard>

                        {selectedAnalysis.suggested_questions && selectedAnalysis.suggested_questions.length > 0 && (
                          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Sugestões para entrevista</p>
                            <div className="mt-3 space-y-2">
                              {selectedAnalysis.suggested_questions.map((item: string, index: number) => (
                                <div key={index} className="flex gap-2 text-sm text-zinc-600">
                                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-develoi-navy/30" />
                                  <span className="italic">"{item}"</span>
                                </div>
                              ))}
                            </div>
                          </ContentCard>
                        )}
                      </div>
                    </PanelCard>
                  </>
                ) : (
                  <PanelCard
                    title="Parecer automático"
                    description="Ainda não existe leitura estruturada desta resposta."
                    icon={Wand2}
                  >
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-zinc-500">
                        Gere o parecer para transformar respostas abertas em resumo executivo, score e recomendação.
                      </p>
                      <Button
                        variant="secondary"
                        iconLeft={<Sparkles size={14} />}
                        onClick={() => runAiAnalysis(selectedResponse.id)}
                        loading={isAnalyzingId === selectedResponse.id}
                        fullWidth
                      >
                        Gerar análise agora
                      </Button>
                    </div>
                  </PanelCard>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(toolToDelete)}
        onClose={() => setToolToDelete(null)}
        size="sm"
        title="Remover ferramenta"
        description="Esta ação apaga o formulário e o histórico de respostas vinculadas."
        icon={<AlertCircle size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setToolToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDeleteTool}>
              Confirmar remoção
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Você está removendo <span className="font-black text-zinc-900">{toolToDelete?.name}</span>. O conteúdo e as respostas não poderão ser recuperados.
        </p>
      </Modal>
    </PageWrapper>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Badge,
  Button,
  ContentCard,
  EmptyState,
  Input,
  PageWrapper,
  PanelCard,
  Textarea,
  useToast,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

interface PublicToolQuestion {
  id: number;
  question_text: string;
  question_type: string;
  is_required?: boolean | number;
  options_json?: string | string[] | null;
}

interface PublicToolRecord {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
  accent_color?: string | null;
  questions: PublicToolQuestion[];
}

type StepId = "info" | "questions" | "success";

function getPublicToolSlug() {
  if (typeof window === "undefined") return "";

  const marker = "/public/tools/";
  const path = window.location.pathname;
  const suffix = path.includes(marker) ? path.split(marker)[1] : "";

  return suffix ? suffix.split("/")[0] : "";
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

function isRequired(question?: PublicToolQuestion | null) {
  return Boolean(question?.is_required);
}

function hasAnswer(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function getQuestionTypeLabel(type: string) {
  switch (type) {
    case "text":
      return "Texto curto";
    case "long_text":
      return "Parágrafo";
    case "number":
      return "Número";
    case "select":
      return "Escolha única";
    case "multi-select":
      return "Múltipla escolha";
    case "yes-no":
      return "Sim ou não";
    case "scale-5":
      return "Escala 1-5";
    case "scale-10":
      return "Escala 1-10";
    default:
      return "Pergunta";
  }
}

function getToolTypeBadge(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("disc")) return { label: "Perfil DISC", color: "warning" as const };
  if (normalized.includes("culture")) return { label: "Fit cultural", color: "info" as const };
  if (normalized.includes("test")) return { label: "Teste técnico", color: "primary" as const };
  return { label: "Formulário", color: "purple" as const };
}

export default function PublicToolResponse() {
  const slug = getPublicToolSlug();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const toast = useToast();

  const [tool, setTool] = useState<PublicToolRecord | null>(null);
  const [step, setStep] = useState<StepId>("info");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<number | null>(null);
  const [questionError, setQuestionError] = useState("");

  const [candidateInfo, setCandidateInfo] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  const [answers, setAnswers] = useState<Record<number, unknown>>({});

  useEffect(() => {
    const fetchTool = async () => {
      if (!slug) {
        setError("Ferramenta não informada.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/public/hr-tools/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ferramenta não encontrada ou inativa.");
        }

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("Esta ferramenta ainda não possui perguntas publicadas.");
        }

        setTool(data);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar formulário.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTool();
  }, [slug]);

  const totalQuestions = tool?.questions.length || 0;
  const currentQuestion = tool?.questions[currentQuestionIdx] || null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = totalQuestions > 0 ? Math.round(((currentQuestionIdx + 1) / totalQuestions) * 100) : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(totalQuestions * 0.75));
  const infoReady = candidateInfo.full_name.trim() !== "" && candidateInfo.email.trim() !== "";
  const canAdvanceQuestion = !currentQuestion || !isRequired(currentQuestion) || hasAnswer(currentAnswer);
  const answeredCount = useMemo(
    () => tool?.questions.filter((question) => hasAnswer(answers[question.id])).length || 0,
    [answers, tool?.questions]
  );

  const setAnswer = (questionId: number, value: unknown) => {
    setQuestionError("");
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const toggleMultipleChoice = (questionId: number, option: string) => {
    const current = Array.isArray(answers[questionId]) ? ([...answers[questionId]] as string[]) : [];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];

    setAnswer(questionId, next);
  };

  const handleInfoSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!infoReady) {
      toast.error("Preencha nome e e-mail para continuar.");
      return;
    }

    setCurrentQuestionIdx(0);
    setStep("questions");
  };

  const goToQuestion = (index: number) => {
    setQuestionError("");
    setCurrentQuestionIdx(index);
  };

  const handleNextQuestion = () => {
    if (!canAdvanceQuestion) {
      setQuestionError("Esta pergunta é obrigatória. Responda para continuar.");
      return;
    }

    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx((current) => current + 1);
    }
  };

  const handleSubmit = async () => {
    if (!tool || !currentQuestion) return;

    if (!canAdvanceQuestion) {
      setQuestionError("Esta pergunta é obrigatória. Responda para finalizar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedAnswers = tool.questions
        .filter((question) => hasAnswer(answers[question.id]))
        .map((question) => ({
          question_id: question.id,
          value: answers[question.id],
        }));

      const response = await fetch(`/api/public/hr-tools/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateInfo,
          answers: formattedAnswers,
          jobId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar suas respostas.");
      }

      setSubmittedResponseId(data.responseId || null);
      setStep("success");
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Erro ao enviar respostas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnswerField = (question: PublicToolQuestion) => {
    const selectedValue = answers[question.id];
    const options = parseOptions(question.options_json);

    if (question.question_type === "text") {
      return (
        <Input
          value={(selectedValue as string) || ""}
          onChange={(event) => setAnswer(question.id, event.target.value)}
          placeholder="Digite sua resposta"
          autoFocus
        />
      );
    }

    if (question.question_type === "long_text") {
      return (
        <Textarea
          rows={6}
          value={(selectedValue as string) || ""}
          onChange={(event) => setAnswer(question.id, event.target.value)}
          placeholder="Descreva sua resposta com contexto e exemplos práticos."
        />
      );
    }

    if (question.question_type === "number") {
      return (
        <Input
          type="number"
          value={(selectedValue as string) || ""}
          onChange={(event) => setAnswer(question.id, event.target.value)}
          placeholder="Digite um valor numérico"
          autoFocus
        />
      );
    }

    if (question.question_type === "yes-no") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {["Sim", "Não"].map((option) => (
            <Button
              key={option}
              type="button"
              variant={selectedValue === option ? "secondary" : "outline"}
              onClick={() => setAnswer(question.id, option)}
              className="h-auto py-4 text-sm"
              fullWidth
            >
              {option}
            </Button>
          ))}
        </div>
      );
    }

    if (question.question_type === "scale-5" || question.question_type === "scale-10") {
      const total = question.question_type === "scale-5" ? 5 : 10;

      return (
        <div className="space-y-4">
          <div className={cn("grid gap-2", total === 5 ? "grid-cols-5" : "grid-cols-5 md:grid-cols-10")}>
            {Array.from({ length: total }).map((_, index) => {
              const option = String(index + 1);
              const active = String(selectedValue || "") === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswer(question.id, option)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm font-black transition-all",
                    active
                      ? "border-develoi-navy bg-develoi-navy text-white shadow-md"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-develoi-navy/35 hover:text-develoi-navy"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>Baixo</span>
            <span>Alto</span>
          </div>
        </div>
      );
    }

    if (question.question_type === "multi-select") {
      return (
        <div className="space-y-3">
          <div className="grid gap-3">
            {options.map((option) => {
              const selectedOptions = Array.isArray(selectedValue) ? (selectedValue as string[]) : [];
              const active = selectedOptions.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleMultipleChoice(question.id, option)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all",
                    active
                      ? "border-develoi-navy bg-develoi-navy/5 text-develoi-navy"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-develoi-navy/35 hover:text-develoi-navy"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-zinc-400">Você pode marcar mais de uma opção.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {options.map((option) => {
          const active = selectedValue === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setAnswer(question.id, option)}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all",
                active
                  ? "border-develoi-navy bg-develoi-navy/5 text-develoi-navy"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-develoi-navy/35 hover:text-develoi-navy"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  const companyName = tool?.company_name || tool?.tenant_name || "Recrutamento";
  const bgGradient = "min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30";

  if (isLoading) {
    return (
      <PageWrapper className={bgGradient}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-develoi-navy/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg shadow-zinc-200/60 ring-1 ring-zinc-100">
                <Loader2 size={24} className="animate-spin text-develoi-navy" />
              </div>
            </div>
            <p className="text-sm font-semibold text-zinc-500">Preparando formulário...</p>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  if (error || !tool) {
    return (
      <PageWrapper className={bgGradient}>
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 py-10">
          <div className="w-full space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-400">
              <AlertCircle size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-900">Formulário indisponível</h2>
              <p className="text-sm leading-relaxed text-zinc-500">{error || "A ferramenta não está disponível neste momento."}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} fullWidth>
              Tentar novamente
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const typeBadge = getToolTypeBadge(tool.type);

  return (
    <PageWrapper className={bgGradient}>
      {/* Faixa decorativa top */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[300px] bg-gradient-to-b from-develoi-navy/[0.03] to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:px-8 lg:max-w-4xl">

        {/* Header compacto e elegante */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/70 px-5 py-4 shadow-sm shadow-zinc-100/60 backdrop-blur-xl sm:mb-10 sm:px-6"
        >
          <div className="flex items-center gap-3.5 overflow-hidden">
            {tool.logo_url ? (
              <img src={tool.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain ring-1 ring-zinc-200/60" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-develoi-navy text-white">
                <ClipboardCheck size={18} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-zinc-400">{companyName}</p>
              <p className="truncate text-sm font-bold text-zinc-900">{tool.name}</p>
            </div>
          </div>
          <Badge color={typeBadge.color} pill className="shrink-0 text-[10px]">
            {typeBadge.label}
          </Badge>
        </motion.header>

        <AnimatePresence mode="wait">
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col gap-8"
            >
              {/* Hero da página inicial */}
              <div className="space-y-4 text-center sm:space-y-5">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-develoi-navy to-develoi-navy/80 text-white shadow-lg shadow-develoi-navy/20 sm:h-20 sm:w-20"
                >
                  <Sparkles size={28} className="sm:hidden" />
                  <Sparkles size={34} className="hidden sm:block" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
                    {tool.name}
                  </h1>
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
                    {tool.description || "Avaliação comportamental com foco em tomada de decisão, ritmo e colaboração."}
                  </p>
                </div>
              </div>

              {/* Stats em linha */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Etapas", value: String(tool.questions.length), icon: ClipboardCheck },
                  { label: "Duração", value: `${estimatedMinutes} min`, icon: Clock },
                  { label: "Privacidade", value: "100%", icon: ShieldCheck },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-100/80 bg-white/60 px-3 py-4 backdrop-blur-sm">
                    <stat.icon size={16} className="text-develoi-navy/60" />
                    <span className="text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl">{stat.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Formulário de dados */}
              <div className="rounded-3xl border border-zinc-100/80 bg-white/80 p-6 shadow-sm shadow-zinc-100/50 backdrop-blur-xl sm:p-8">
                <div className="mb-6 space-y-1">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-900">Seus dados</h2>
                  <p className="text-sm text-zinc-500">Preencha para iniciar a avaliação.</p>
                </div>

                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <Input
                    label="Nome completo"
                    required
                    value={candidateInfo.full_name}
                    onChange={(event) =>
                      setCandidateInfo((current) => ({ ...current, full_name: event.target.value }))
                    }
                    placeholder="Seu nome completo"
                    icon={<User size={14} />}
                  />

                  <Input
                    label="E-mail"
                    required
                    type="email"
                    value={candidateInfo.email}
                    onChange={(event) =>
                      setCandidateInfo((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="seu@email.com"
                    icon={<Mail size={14} />}
                  />

                  <Input
                    label="Telefone / WhatsApp"
                    value={candidateInfo.phone}
                    onChange={(event) =>
                      setCandidateInfo((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                    icon={<Phone size={14} />}
                  />

                  <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/60 px-4 py-3">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-develoi-navy/60" />
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Dados protegidos e usados apenas para identificação no processo seletivo.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="secondary"
                    iconRight={<ArrowRight size={16} />}
                    fullWidth
                    className="!mt-6 h-12 text-sm font-bold"
                  >
                    Começar avaliação
                  </Button>
                </form>
              </div>

              {/* Passos esperados */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { step: "1", title: "Identificação", desc: "Dados rápidos de contato" },
                  { step: "2", title: "Avaliação", desc: "Responda às perguntas guiadas" },
                  { step: "3", title: "Conclusão", desc: "Envio automático ao RH" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-2xl border border-zinc-100/60 bg-white/50 px-4 py-3.5 backdrop-blur-sm">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-develoi-navy/5 text-xs font-extrabold text-develoi-navy">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-800">{item.title}</p>
                      <p className="text-[11px] text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === "questions" && currentQuestion && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col gap-6"
            >
              {/* Barra de progresso compacta */}
              <div className="rounded-2xl border border-zinc-100/80 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">Pergunta {currentQuestionIdx + 1}</span>
                    <span className="text-xs text-zinc-400">de {totalQuestions}</span>
                  </div>
                  <span className="text-xs font-bold text-develoi-navy">{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-develoi-navy to-develoi-navy/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                {/* Mini mapa de dots - visível sempre */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tool.questions.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(i)}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all",
                        i === currentQuestionIdx
                          ? "w-6 bg-develoi-navy"
                          : hasAnswer(answers[q.id])
                            ? "bg-emerald-400"
                            : "bg-zinc-200 hover:bg-zinc-300"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Card da pergunta */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 rounded-3xl border border-zinc-100/80 bg-white/80 p-6 shadow-sm shadow-zinc-100/50 backdrop-blur-xl sm:p-8"
                >
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-develoi-navy/5 text-[10px] font-extrabold text-develoi-navy">
                          {currentQuestionIdx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          {getQuestionTypeLabel(currentQuestion.question_type)}
                        </span>
                        {isRequired(currentQuestion) && (
                          <span className="text-[10px] font-bold text-red-400">• Obrigatória</span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl lg:text-2xl">
                        {currentQuestion.question_text}
                      </h2>
                    </div>

                    {renderAnswerField(currentQuestion)}

                    {questionError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50/80 px-4 py-3 text-sm text-red-600">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{questionError}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navegação fixa embaixo */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100/80 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<ArrowLeft size={14} />}
                  onClick={() => {
                    if (currentQuestionIdx === 0) {
                      setStep("info");
                      return;
                    }
                    setQuestionError("");
                    setCurrentQuestionIdx((c) => c - 1);
                  }}
                >
                  {currentQuestionIdx === 0 ? "Voltar" : "Anterior"}
                </Button>

                <span className="hidden text-xs text-zinc-400 sm:block">
                  {candidateInfo.full_name} · {answeredCount}/{totalQuestions} respondidas
                </span>

                {currentQuestionIdx < totalQuestions - 1 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={<ArrowRight size={14} />}
                    onClick={handleNextQuestion}
                  >
                    Próxima
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<CheckCircle2 size={14} />}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                  >
                    Enviar
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="mx-auto flex w-full max-w-2xl flex-1 items-center"
            >
              <div className="w-full space-y-8 text-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200/50"
                >
                  <CheckCircle2 size={40} />
                </motion.div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                    Obrigado, {candidateInfo.full_name.split(" ")[0]}!
                  </h2>
                  <p className="mx-auto max-w-md text-base leading-relaxed text-zinc-500">
                    Sua avaliação foi enviada para a equipe de{" "}
                    <span className="font-bold text-zinc-700">{companyName}</span>.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-100/80 bg-white/60 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Protocolo</p>
                    <p className="mt-1 text-lg font-extrabold text-zinc-900">#{submittedResponseId || "--"}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100/80 bg-white/60 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tipo</p>
                    <p className="mt-1 text-lg font-extrabold text-zinc-900">{typeBadge.label}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100/80 bg-white/60 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Respostas</p>
                    <p className="mt-1 text-lg font-extrabold text-zinc-900">{answeredCount}/{totalQuestions}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100/80 bg-white/60 p-5 text-left backdrop-blur-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Próximos passos</p>
                  <div className="space-y-2.5">
                    {[
                      "O RH recebe sua avaliação e faz a leitura junto ao restante do seu material.",
                      "Se houver aderência, o time segue com contato ou etapa complementar.",
                      "Guarde seu e-mail informado para acompanhar qualquer retorno.",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-600">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-develoi-navy/30" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => window.location.assign(window.location.origin)}
                  className="mx-auto"
                >
                  Concluir
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer minimalista */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-[10px] font-semibold tracking-widest text-zinc-300">
            Powered by Aurora · {companyName}
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}

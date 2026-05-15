import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

export type AIReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
export type AITextVerbosity = 'low' | 'medium' | 'high';
export type AIMessageRole = 'user' | 'model' | 'assistant';
export type AIMessagePart = { text?: string | null };
export type AIMessage = { role?: AIMessageRole; parts?: AIMessagePart[] };
export type AIGenerateContentConfig = {
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningEffort?: AIReasoningEffort;
  verbosity?: AITextVerbosity;
  instructions?: string;
  operationLabel?: string;
};
export type AIGenerateContentRequest = {
  model?: string;
  contents: string | AIMessage[];
  config?: AIGenerateContentConfig;
};
export type AIClient = {
  models: {
    generateContent: (request: AIGenerateContentRequest) => Promise<{ text: string }>;
  };
};
export type GoogleGenAI = AIClient;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const LEGACY_GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-5-nano';
export const GEMINI_MODEL = OPENAI_MODEL;
const OPENAI_RETRY_ATTEMPTS = Math.max(1, Number.parseInt(process.env.OPENAI_RETRY_ATTEMPTS?.trim() || '3', 10) || 3);
const OPENAI_RETRY_BASE_DELAY_MS = Math.max(250, Number.parseInt(process.env.OPENAI_RETRY_BASE_DELAY_MS?.trim() || '900', 10) || 900);

export const AI_CORE_INSTRUCTIONS = [
  'Você é Aurora AI, especialista sênior em recrutamento, seleção, people analytics e análise técnica de candidatos e vagas.',
  'Responda sempre em português do Brasil com rigor, clareza e critério profissional.',
  'Nunca invente informações ausentes. Quando faltarem dados, use null, [] ou declare a ausência conforme o formato solicitado.',
  'Em análises de aderência, seja conservadora e baseie a conclusão apenas nas evidências fornecidas.',
].join(' ');

export class AITemporaryUnavailableError extends Error {
  statusCode: number;
  originalError: unknown;
  constructor(message: string, originalError: unknown) {
    super(message);
    this.name = 'AITemporaryUnavailableError';
    this.statusCode = 503;
    this.originalError = originalError;
  }
}

export const GeminiTemporaryUnavailableError = AITemporaryUnavailableError;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getAIErrorStatus(error: any) {
  const numericStatus = Number(error?.status ?? error?.code ?? error?.error?.code);
  return Number.isFinite(numericStatus) && numericStatus > 0 ? numericStatus : null;
}

export function getAIErrorMessage(error: any) {
  return error?.error?.message || error?.message || 'Erro desconhecido ao consultar o provedor de IA.';
}

export function isAITemporaryFailure(error: any) {
  const status = getAIErrorStatus(error);
  const providerStatus = String(error?.error?.status || error?.code || '').toUpperCase();
  return (
    status === 408 || status === 409 || status === 429 ||
    status === 500 || status === 502 || status === 503 || status === 504 ||
    providerStatus === 'RESOURCE_EXHAUSTED' || providerStatus === 'UNAVAILABLE' ||
    providerStatus === 'ECONNRESET' || providerStatus === 'ETIMEDOUT'
  );
}

export function normalizeReasoningEffort(value: string | undefined, fallback: AIReasoningEffort): AIReasoningEffort {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'none' || normalized === 'minimal' || normalized === 'low' ||
      normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
    return normalized;
  }
  return fallback;
}

export function normalizeTextVerbosity(value: string | undefined, fallback: AITextVerbosity): AITextVerbosity {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') return normalized;
  return fallback;
}

export function buildAIInstructions(extraInstructions?: string | null) {
  return [AI_CORE_INSTRUCTIONS, extraInstructions?.trim()].filter(Boolean).join('\n\n');
}

export function extractTextFromAIMessageParts(parts?: AIMessagePart[]) {
  return (parts || [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function convertGeminiLikeContentsToOpenAIInput(contents: string | AIMessage[]): any {
  if (typeof contents === 'string') return contents;

  const normalizedMessages = contents
    .map((item) => ({
      role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
      text: extractTextFromAIMessageParts(item.parts),
    }))
    .filter((item) => item.text);

  if (normalizedMessages.length === 0) return '';

  if (normalizedMessages.every((item) => item.role === 'user')) {
    return normalizedMessages.map((item) => ({
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: item.text }],
    }));
  }

  return normalizedMessages
    .map((item) => `${item.role === 'assistant' ? 'Assistente' : 'Usuário'}:\n${item.text}`)
    .join('\n\n');
}

export async function executeAIRequestWithRetry<T>(request: () => Promise<T>, operationLabel = 'geração de conteúdo') {
  let lastError: unknown;
  for (let attempt = 1; attempt <= OPENAI_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!isAITemporaryFailure(error) || attempt === OPENAI_RETRY_ATTEMPTS) break;
      const delayMs = OPENAI_RETRY_BASE_DELAY_MS * attempt;
      const status = getAIErrorStatus(error) ?? 'sem status';
      console.warn(`[OpenAI] ${operationLabel} temporariamente indisponível (${status}). Nova tentativa em ${delayMs}ms.`);
      await wait(delayMs);
    }
  }
  if (isAITemporaryFailure(lastError)) {
    const status = getAIErrorStatus(lastError) ?? 'sem status';
    const providerMessage = getAIErrorMessage(lastError);
    throw new AITemporaryUnavailableError(
      `OpenAI indisponível temporariamente para ${operationLabel} (${status}): ${providerMessage}`,
      lastError
    );
  }
  throw lastError;
}

export function createAIClient(): AIClient {
  if (!OPENAI_API_KEY) {
    if (LEGACY_GEMINI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada. O arquivo .env ainda está com GEMINI_API_KEY. Renomeie para OPENAI_API_KEY e use uma chave OpenAI válida com prefixo sk- ou sk-proj-.');
    }
    throw new Error('OPENAI_API_KEY não configurada. Defina a chave no arquivo .env.');
  }
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(OPENAI_API_KEY)) {
    throw new Error('OPENAI_API_KEY está com uma chave do Google/Gemini (prefixo AIza). Remova a variável OPENAI_API_KEY do terminal atual e configure uma chave OpenAI válida com prefixo sk- ou sk-proj-.');
  }

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  return {
    models: {
      generateContent: async ({ model, contents, config }: AIGenerateContentRequest) => {
        const expectsJson = config?.responseMimeType === 'application/json';
        const response = await executeAIRequestWithRetry(
          () =>
            client.responses.create({
              model: model || OPENAI_MODEL,
              input: convertGeminiLikeContentsToOpenAIInput(contents) as any,
              instructions: buildAIInstructions(config?.instructions),
              max_output_tokens: config?.maxOutputTokens,
              ...(model?.startsWith('o1') || model?.startsWith('o3') ? {
                reasoning: {
                  effort: config?.reasoningEffort || normalizeReasoningEffort(process.env.OPENAI_REASONING_EFFORT, 'low'),
                }
              } : {}),
              text: {
                format: expectsJson ? { type: 'json_object' } : { type: 'text' },
                verbosity: config?.verbosity || normalizeTextVerbosity(process.env.OPENAI_TEXT_VERBOSITY, 'medium'),
              },
            }),
          config?.operationLabel || 'geração de conteúdo'
        ) as any;
        return { text: response.output_text || '' };
      },
    },
  };
}

export const createGeminiClient = createAIClient;

export function normalizeAuroraChatReply(rawText: string) {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^Olá!? Eu sou a Aurora AI[^.]*\.\s*/i, '')
    .replace(/^Eu sou a Aurora AI[^.]*\.\s*/i, '')
    .replace(/^Minha missão é[^.]*\.\s*/i, '')
    .replace(/([.:])\s+(?=\d+\.\s)/g, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) ? numericValue : value.toString();
  }
  return value;
}

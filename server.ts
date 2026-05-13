import dotenv from 'dotenv';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initDb, prisma } from './src/lib/db';
import OpenAI from 'openai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import multer from 'multer';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import {
  getDefaultAccessProfile,
  getPermissionPreset,
  normalizeAccessPermissions,
  stringifyAccessPermissions,
} from './src/lib/access';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const LEGACY_GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-5-nano';
const OPENAI_RETRY_ATTEMPTS = Math.max(1, Number.parseInt(process.env.OPENAI_RETRY_ATTEMPTS?.trim() || '3', 10) || 3);
const OPENAI_RETRY_BASE_DELAY_MS = Math.max(250, Number.parseInt(process.env.OPENAI_RETRY_BASE_DELAY_MS?.trim() || '900', 10) || 900);
const IMPORT_UPLOADS_DIR = path.join(__dirname, 'storage', 'imports');
const CANDIDATE_UPLOADS_DIR = path.join(__dirname, 'storage', 'candidate-files');
const CANDIDATE_BATCH_IMPORT_MAX_FILES = 30;
const CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES = 96 * 1024 * 1024;
const CANDIDATE_BATCH_IMPORT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.csv', '.xls', '.xlsx'];

type AIReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
type AITextVerbosity = 'low' | 'medium' | 'high';
type AIMessageRole = 'user' | 'model' | 'assistant';
type AIMessagePart = { text?: string | null };
type AIMessage = { role?: AIMessageRole; parts?: AIMessagePart[] };
type AIGenerateContentConfig = {
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningEffort?: AIReasoningEffort;
  verbosity?: AITextVerbosity;
  instructions?: string;
  operationLabel?: string;
};
type AIGenerateContentRequest = {
  model?: string;
  contents: string | AIMessage[];
  config?: AIGenerateContentConfig;
};
type AIClient = {
  models: {
    generateContent: (request: AIGenerateContentRequest) => Promise<{ text: string }>;
  };
};
type GoogleGenAI = AIClient;

const GEMINI_MODEL = OPENAI_MODEL;

const AI_CORE_INSTRUCTIONS = [
  'VocÃª Ã© Aurora AI, especialista sÃªnior em recrutamento, seleÃ§Ã£o, people analytics e anÃ¡lise tÃ©cnica de candidatos e vagas.',
  'Responda sempre em portuguÃªs do Brasil com rigor, clareza e critÃ©rio profissional.',
  'Nunca invente informaÃ§Ãµes ausentes. Quando faltarem dados, use null, [] ou declare a ausÃªncia conforme o formato solicitado.',
  'Em anÃ¡lises de aderÃªncia, seja conservadora e baseie a conclusÃ£o apenas nas evidÃªncias fornecidas.',
].join(' ');

class AITemporaryUnavailableError extends Error {
  statusCode: number;
  originalError: unknown;

  constructor(message: string, originalError: unknown) {
    super(message);
    this.name = 'AITemporaryUnavailableError';
    this.statusCode = 503;
    this.originalError = originalError;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAIErrorStatus(error: any) {
  const numericStatus = Number(error?.status ?? error?.code ?? error?.error?.code);
  return Number.isFinite(numericStatus) && numericStatus > 0 ? numericStatus : null;
}

function getAIErrorMessage(error: any) {
  return error?.error?.message || error?.message || 'Erro desconhecido ao consultar o provedor de IA.';
}

function isAITemporaryFailure(error: any) {
  const status = getAIErrorStatus(error);
  const providerStatus = String(error?.error?.status || error?.code || '').toUpperCase();

  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    providerStatus === 'RESOURCE_EXHAUSTED' ||
    providerStatus === 'UNAVAILABLE' ||
    providerStatus === 'ECONNRESET' ||
    providerStatus === 'ETIMEDOUT'
  );
}

function normalizeReasoningEffort(value: string | undefined, fallback: AIReasoningEffort): AIReasoningEffort {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'none' ||
    normalized === 'minimal' ||
    normalized === 'low' ||
    normalized === 'medium' ||
    normalized === 'high' ||
    normalized === 'xhigh'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeTextVerbosity(value: string | undefined, fallback: AITextVerbosity): AITextVerbosity {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }

  return fallback;
}

function buildAIInstructions(extraInstructions?: string | null) {
  return [AI_CORE_INSTRUCTIONS, extraInstructions?.trim()].filter(Boolean).join('\n\n');
}

function extractTextFromAIMessageParts(parts?: AIMessagePart[]) {
  return (parts || [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function convertGeminiLikeContentsToOpenAIInput(contents: string | AIMessage[]): any {
  if (typeof contents === 'string') {
    return contents;
  }

  const normalizedMessages = contents
    .map((item) => ({
      role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
      text: extractTextFromAIMessageParts(item.parts),
    }))
    .filter((item) => item.text);

  if (normalizedMessages.length === 0) {
    return '';
  }

  if (normalizedMessages.every((item) => item.role === 'user')) {
    return normalizedMessages.map((item) => ({
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: item.text }],
    }));
  }

  return normalizedMessages
    .map((item) => `${item.role === 'assistant' ? 'Assistente' : 'UsuÃ¡rio'}:\n${item.text}`)
    .join('\n\n');
}

async function executeAIRequestWithRetry<T>(request: () => Promise<T>, operationLabel = 'geraÃ§Ã£o de conteÃºdo') {
  let lastError: unknown;

  for (let attempt = 1; attempt <= OPENAI_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      if (!isAITemporaryFailure(error) || attempt === OPENAI_RETRY_ATTEMPTS) {
        break;
      }

      const delayMs = OPENAI_RETRY_BASE_DELAY_MS * attempt;
      const status = getAIErrorStatus(error) ?? 'sem status';
      console.warn(`[OpenAI] ${operationLabel} temporariamente indisponÃ­vel (${status}). Nova tentativa em ${delayMs}ms.`);
      await wait(delayMs);
    }
  }

  if (isAITemporaryFailure(lastError)) {
    const status = getAIErrorStatus(lastError) ?? 'sem status';
    const providerMessage = getAIErrorMessage(lastError);
    throw new AITemporaryUnavailableError(
      `OpenAI indisponÃ­vel temporariamente para ${operationLabel} (${status}): ${providerMessage}`,
      lastError
    );
  }

  throw lastError;
}

function createAIClient(): AIClient {
  if (!OPENAI_API_KEY) {
    if (LEGACY_GEMINI_API_KEY) {
      throw new Error('OPENAI_API_KEY nÃ£o configurada. O arquivo .env ainda estÃ¡ com GEMINI_API_KEY. Renomeie para OPENAI_API_KEY e use uma chave OpenAI vÃ¡lida com prefixo sk- ou sk-proj-.');
    }

    throw new Error('OPENAI_API_KEY nÃ£o configurada. Defina a chave no arquivo .env.');
  }

  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(OPENAI_API_KEY)) {
    throw new Error('OPENAI_API_KEY estÃ¡ com uma chave do Google/Gemini (prefixo AIza). Remova a variÃ¡vel OPENAI_API_KEY do terminal atual e configure uma chave OpenAI vÃ¡lida com prefixo sk- ou sk-proj-.');
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
                verbosity: expectsJson ? 'low' : config?.verbosity || normalizeTextVerbosity(process.env.OPENAI_TEXT_VERBOSITY, 'low'),
              },
            }),
          config?.operationLabel || 'geraÃ§Ã£o de conteÃºdo'
        ) as any;

        return {
          text: response.output_text || '',
        };
      },
    },
  };
}

const createGeminiClient = createAIClient;
const GeminiTemporaryUnavailableError = AITemporaryUnavailableError;

function normalizeAuroraChatReply(rawText: string) {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^OlÃƒÆ’Ã‚Â¡!? Eu sou a Aurora AI[^.]*\.\s*/i, '')
    .replace(/^Eu sou a Aurora AI[^.]*\.\s*/i, '')
    .replace(/^Minha missÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â©[^.]*\.\s*/i, '')
    .replace(/([.:])\s+(?=\d+\.\s)/g, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) ? numericValue : value.toString();
  }

  return value;
}

function sanitizeUploadFileName(fileName: string) {
  const normalized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'arquivo';
}

function bytesToMegabytes(bytes: number) {
  return Number((bytes / (1024 * 1024)).toFixed(1));
}

function getCandidateBatchImportCapacity() {
  return {
    max_files_per_batch: CANDIDATE_BATCH_IMPORT_MAX_FILES,
    max_file_size_bytes: CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES,
    max_file_size_mb: bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES),
    max_total_size_bytes: CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES,
    max_total_size_mb: bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES),
    supported_extensions: CANDIDATE_BATCH_IMPORT_EXTENSIONS,
  };
}

function normalizeExtractedResumeText(rawText: string) {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function saveImportedResumeFile(batchId: number | string, tenantId: string, file: any) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const safeName = sanitizeUploadFileName(path.basename(file.originalname || 'curriculo', extension));
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}${extension}`;
  const targetDir = path.join(IMPORT_UPLOADS_DIR, tenantId, String(batchId));
  const targetPath = path.join(targetDir, uniqueName);

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.writeFile(targetPath, file.buffer);

  return targetPath;
}

async function saveImportedJobFile(importId: number | string, tenantId: string, file: any) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const safeName = sanitizeUploadFileName(path.basename(file.originalname || 'vaga', extension));
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}${extension}`;
  const targetDir = path.join(IMPORT_UPLOADS_DIR, tenantId, 'jobs', String(importId));
  const targetPath = path.join(targetDir, uniqueName);

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.writeFile(targetPath, file.buffer);

  return targetPath;
}

async function extractPdfTextFromBuffer(buffer: Buffer) {
  console.log('[PDF] Iniciando extraÃ§Ã£o de texto do buffer...');
  try {
    const pdfModule = require('pdf-parse');
    const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse;

    if (!PDFParseClass) {
      console.error('[PDF] Chaves disponÃ­veis no mÃ³dulo:', Object.keys(pdfModule));
      throw new Error('Classe PDFParse nÃ£o encontrada no mÃ³dulo pdf-parse');
    }

    const parser = new PDFParseClass({ data: buffer });
    const result = await parser.getText();
    const text = result?.text || '';
    await parser.destroy();

    console.log('[PDF] Texto extraÃ­do com sucesso. Tamanho:', text.length);
    return text;
  } catch (error: any) {
    console.error('[PDF] Erro ao ler PDF:', error);
    throw new Error('Falha ao processar arquivo PDF: ' + error.message);
  }
}

async function extractResumeTextFromBuffer(buffer: Buffer, fileName: string, fileType?: string | null) {
  const extension = path.extname(fileName).toLowerCase();
  let text = '';

  if (extension === '.pdf') {
    text = await extractPdfTextFromBuffer(buffer);
  } else if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else if (extension === '.xlsx' || extension === '.xls') {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    text = sheet ? xlsx.utils.sheet_to_txt(sheet) : '';
  } else if (
    extension === '.txt' ||
    extension === '.csv' ||
    extension === '.md' ||
    (fileType && fileType.startsWith('text/'))
  ) {
    text = buffer.toString('utf8');
  } else {
    throw new Error(`Formato de currÃƒÆ’Ã‚Â­culo nÃƒÆ’Ã‚Â£o suportado: ${extension || fileType || 'desconhecido'}`);
  }

  const normalizedText = normalizeExtractedResumeText(text);
  if (normalizedText.length < 20) {
    throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel extrair texto suficiente do currÃƒÆ’Ã‚Â­culo.');
  }

  return normalizedText;
}

async function extractResumeTextFromStoredFile(file: any) {
  if (!file.file_path) {
    throw new Error('Arquivo do currÃƒÆ’Ã‚Â­culo nÃƒÆ’Ã‚Â£o encontrado no armazenamento.');
  }

  const buffer = await fs.promises.readFile(file.file_path);
  return extractResumeTextFromBuffer(buffer, file.file_name, file.file_type);
}

async function extractJobTextFromBuffer(buffer: Buffer, fileName: string, fileType?: string | null) {
  return extractResumeTextFromBuffer(buffer, fileName, fileType);
}

async function extractJobTextFromStoredFile(file: any) {
  if (!file.file_path) {
    throw new Error('Arquivo da vaga nÃ£o encontrado no armazenamento.');
  }

  const buffer = await fs.promises.readFile(file.file_path);
  return extractJobTextFromBuffer(buffer, file.file_name, file.file_type);
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;\nÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function normalizeNullableTextBlock(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text ? text : null;
}

function normalizeNullableInteger(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : null;
}

function normalizeNullableFloat(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeNullableBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['sim', 's', 'true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }

    if (['nao', 'nÃƒÆ’Ã‚Â£o', 'n', 'false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeBrazilianState(value: unknown) {
  const text = normalizeNullableString(value);
  if (!text) {
    return null;
  }

  const lettersOnly = text.toUpperCase().replace(/[^A-Z]/g, '');
  return lettersOnly.length === 2 ? lettersOnly : null;
}

function clampInteger(value: unknown, fallback: number, min = 0, max = 100) {
  const normalized = normalizeNullableInteger(value);
  if (normalized === null) {
    return fallback;
  }

  return Math.max(min, Math.min(max, normalized));
}

function normalizeConfidenceLevel(value: unknown): 'Alta' | 'MÃ©dia' | 'Baixa' {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (normalized === 'alta') return 'Alta';
  if (normalized === 'media') return 'MÃ©dia';
  return 'Baixa';
}

function normalizeEvidenceSnippet(value: unknown) {
  const text = normalizeNullableTextBlock(value);
  return text ? text.slice(0, 220) : null;
}

function normalizeEvidenceText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasSourceEvidence(extractedText: string, evidence: string | null) {
  if (!evidence) {
    return false;
  }

  const normalizedSource = normalizeEvidenceText(extractedText || '');
  const normalizedEvidence = normalizeEvidenceText(evidence);

  return Boolean(normalizedEvidence) && normalizedSource.includes(normalizedEvidence);
}

function buildImportedJobSummary(data: any) {
  const parts = [
    data?.title || null,
    data?.department ? `Departamento: ${data.department}` : null,
    data?.city && data?.state ? `${data.city}/${data.state}` : data?.city || null,
    data?.contract_type ? `Contrato: ${data.contract_type}` : null,
    data?.work_model ? `Modelo: ${data.work_model}` : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' | ');
  }

  return 'Revise os campos importados e complete apenas os dados confirmados no arquivo.';
}

function normalizeImportedJobParsedData(data: any, extractedText: string) {
  const evidence = data && typeof data.evidence === 'object' && data.evidence ? data.evidence : {};
  const pickValue = <T,>(value: T, evidenceValue: unknown, fallback: T = null as T) => (
    hasSourceEvidence(extractedText, normalizeEvidenceSnippet(evidenceValue)) ? value : fallback
  );

  const workModel = pickValue(normalizeNullableString(data?.work_model), evidence?.work_model);
  const contractType = pickValue(normalizeNullableString(data?.contract_type), evidence?.contract_type);
  const requiresCnh = pickValue(normalizeNullableBoolean(data?.requires_cnh), evidence?.requires_cnh);
  const requiresTravel = pickValue(normalizeNullableBoolean(data?.requires_travel), evidence?.requires_travel);
  const requiresRelocation = pickValue(normalizeNullableBoolean(data?.requires_relocation), evidence?.requires_relocation);

  const normalized = {
    title: pickValue(normalizeNullableString(data?.title), evidence?.title),
    department: pickValue(normalizeNullableString(data?.department), evidence?.department),
    description: pickValue(normalizeNullableTextBlock(data?.description), evidence?.description),
    responsibilities: pickValue(normalizeNullableTextBlock(data?.responsibilities), evidence?.responsibilities),
    technical_requirements: pickValue(normalizeNullableTextBlock(data?.technical_requirements), evidence?.technical_requirements),
    mandatory_requirements: pickValue(normalizeNullableTextBlock(data?.mandatory_requirements), evidence?.mandatory_requirements),
    desirable_requirements: pickValue(normalizeNullableTextBlock(data?.desirable_requirements), evidence?.desirable_requirements),
    eliminatory_criteria: pickValue(normalizeNullableTextBlock(data?.eliminatory_criteria), evidence?.eliminatory_criteria),
    benefits: pickValue(normalizeNullableTextBlock(data?.benefits), evidence?.benefits),
    city: pickValue(normalizeNullableString(data?.city), evidence?.city),
    state: pickValue(normalizeBrazilianState(data?.state), evidence?.state),
    work_model: ['Presencial', 'HÃ­brido', 'Home Office'].includes(workModel || '') ? workModel : null,
    contract_type: ['CLT', 'PJ', 'EstÃ¡gio', 'TemporÃ¡rio', 'Freelancer', 'Outro'].includes(contractType || '') ? contractType : null,
    seniority_level: pickValue(normalizeNullableString(data?.seniority_level), evidence?.seniority_level),
    education_level: pickValue(normalizeNullableString(data?.education_level), evidence?.education_level),
    min_experience_years: pickValue(normalizeNullableInteger(data?.min_experience_years), evidence?.min_experience_years),
    salary_min: pickValue(normalizeNullableFloat(data?.salary_min), evidence?.salary_min),
    salary_max: pickValue(normalizeNullableFloat(data?.salary_max), evidence?.salary_max),
    workload: pickValue(normalizeNullableString(data?.workload), evidence?.workload),
    work_schedule: pickValue(normalizeNullableString(data?.work_schedule), evidence?.work_schedule),
    requires_cnh: requiresCnh === true,
    cnh_category: pickValue(normalizeNullableString(data?.cnh_category), evidence?.cnh_category),
    requires_travel: requiresTravel === true,
    requires_relocation: requiresRelocation === true,
    tags: pickValue(normalizeNullableString(data?.tags), evidence?.tags),
    compatibility_threshold: clampInteger(data?.compatibility_threshold, 80, 50, 100),
    weight_technical: clampInteger(data?.weight_technical, 20),
    weight_experience: clampInteger(data?.weight_experience, 20),
    weight_education: clampInteger(data?.weight_education, 20),
    weight_location: clampInteger(data?.weight_location, 10),
    weight_soft_skills: clampInteger(data?.weight_soft_skills, 15),
    weight_culture: clampInteger(data?.weight_culture, 15),
    ai_summary: null as string | null,
    confidence: {
      title: normalizeConfidenceLevel(data?.confidence?.title),
      city: normalizeConfidenceLevel(data?.confidence?.city),
      salary: normalizeConfidenceLevel(data?.confidence?.salary),
      requirements: normalizeConfidenceLevel(data?.confidence?.requirements),
    },
  };

  if (!normalized.title) {
    normalized.confidence.title = 'Baixa';
  }

  if (!normalized.city || !normalized.state) {
    normalized.confidence.city = 'Baixa';
  }

  if (normalized.salary_min === null && normalized.salary_max === null) {
    normalized.confidence.salary = 'Baixa';
  }

  if (!normalized.technical_requirements && !normalized.mandatory_requirements && !normalized.desirable_requirements) {
    normalized.confidence.requirements = 'Baixa';
  }

  normalized.ai_summary = buildImportedJobSummary(normalized);

  return normalized;
}

function buildResumePeriodLabel(startDate: string | null, endDate: string | null, fallback?: string | null) {
  if (fallback) {
    return fallback;
  }

  if (!startDate && !endDate) {
    return null;
  }

  return [startDate || 'InÃ­cio nÃ£o informado', endDate || 'Atual'].join(' - ');
}

function normalizeResumeExperienceList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      const company = normalizeNullableString(item?.company) || '';
      const role = normalizeNullableString(item?.role) || '';
      const period = normalizeNullableString(item?.period) || '';
      const location = normalizeNullableString(item?.location);
      const description = normalizeNullableTextBlock(item?.description) || '';

      if (!company && !role && !period && !location && !description) {
        return null;
      }

      return { company, role, period, location, description };
    })
    .filter(Boolean);
}

function normalizeResumeEducationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      const course = normalizeNullableString(item?.course) || '';
      const institution = normalizeNullableString(item?.institution) || '';
      const status = normalizeNullableString(item?.status) || 'NÃ£o informado';
      const degree_type = normalizeNullableString(item?.degree_type);
      const start_date = normalizeNullableString(item?.start_date);
      const end_date = normalizeNullableString(item?.end_date);
      const period = buildResumePeriodLabel(start_date, end_date, normalizeNullableString(item?.period));

      if (!course && !institution && !status && !degree_type && !period) {
        return null;
      }

      return {
        course,
        institution,
        status,
        degree_type,
        start_date,
        end_date,
        period,
      };
    })
    .filter(Boolean);
}

function normalizeResumeCertificationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      const name = normalizeNullableString(item?.name) || '';
      const institution = normalizeNullableString(item?.institution);
      const year = normalizeNullableString(item?.year);

      if (!name && !institution && !year) {
        return null;
      }

      return { name, institution, year };
    })
    .filter(Boolean);
}

function normalizeResumeProjectList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      const name = normalizeNullableString(item?.name) || '';
      const description = normalizeNullableTextBlock(item?.description) || '';
      const technologies = normalizeNullableString(item?.technologies);

      if (!name && !description && !technologies) {
        return null;
      }

      return { name, description, technologies };
    })
    .filter(Boolean);
}

function normalizeResumeLanguageList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
        if (typeof item === 'string') {
          const language = normalizeNullableString(item) || '';
          return language ? { language, level: 'NÃ£o informado' } : null;
        }

        const language = normalizeNullableString(item?.language) || '';
        const level = normalizeNullableString(item?.level) || 'NÃ£o informado';

        if (!language) {
          return null;
        }

        return { language, level };
      })
      .filter(Boolean);
  }

  return normalizeStringList(value).map((language) => ({
    language,
    level: 'NÃ£o informado',
  }));
}

function formatResumeExperienceList(value: Array<{ company?: string; role?: string; period?: string; location?: string | null; description?: string }>) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const block = value
    .map((item) => {
      const header = [item.role, item.company].filter(Boolean).join(' | ');
      const meta = [item.period, item.location].filter(Boolean).join(' | ');
      return [header || null, meta || null, item.description || null].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  return normalizeNullableTextBlock(block);
}

function formatResumeEducationList(value: Array<{ course?: string; institution?: string; status?: string; period?: string | null }>) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const block = value
    .map((item) => [item.course, item.institution, item.status, item.period].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n');

  return normalizeNullableTextBlock(block);
}

function formatResumeCertificationList(value: Array<{ name?: string; institution?: string | null; year?: string | null }>) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const block = value
    .map((item) => [item.name, item.institution, item.year].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n');

  return normalizeNullableTextBlock(block);
}

function stringifyStructuredListOrNull(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? JSON.stringify(value) : null;
}

function normalizeResumeParsedData(data: any, hasLinkedJob: boolean) {
  const compatibilityScore = Number(data?.compatibility_score);
  const experiences_list = normalizeResumeExperienceList(data?.experiences_list);
  const education_list = normalizeResumeEducationList(data?.education_list);
  const certifications_list = normalizeResumeCertificationList(data?.certifications_list);
  const projects_list = normalizeResumeProjectList(data?.projects_list);
  const languages_list = normalizeResumeLanguageList(data?.languages_list ?? data?.languages);
  const skills = normalizeStringList(data?.skills ?? data?.hard_skills);
  const soft_skills = normalizeStringList(data?.soft_skills);
  const strengths = normalizeStringList(data?.strengths);
  const attention_points = normalizeStringList(data?.attention_points);
  const objective = normalizeNullableString(data?.objective);
  const objectives_list = normalizeStringList(data?.objectives);

  if (objective && !objectives_list.includes(objective)) {
    objectives_list.unshift(objective);
  }

  const current_title = normalizeNullableString(data?.current_title) || experiences_list[0]?.role || null;
  const current_company = normalizeNullableString(data?.current_company) || experiences_list[0]?.company || null;
  const role = normalizeNullableString(data?.role ?? data?.desired_position) || current_title || null;
  const summary = normalizeNullableTextBlock(data?.summary ?? data?.professional_summary);
  const highlights = normalizeStringList(data?.highlights);
  const languages = languages_list.length > 0
    ? languages_list.map((item) => item.level && item.level !== 'NÃ£o informado' ? `${item.language} (${item.level})` : item.language)
    : normalizeStringList(data?.languages);

  return {
    name: normalizeNullableString(data?.name ?? data?.full_name),
    email: normalizeNullableString(data?.email),
    phone: normalizeNullableString(data?.phone),
    cpf: normalizeNullableString(data?.cpf),
    birth_date: normalizeNullableString(data?.birth_date),
    age: normalizeNullableInteger(data?.age),
    city: normalizeNullableString(data?.city),
    state: normalizeNullableString(data?.state),
    country: normalizeNullableString(data?.country),
    postal_code: normalizeNullableString(data?.postal_code),
    address: normalizeNullableString(data?.address),
    role,
    current_title,
    current_company,
    objective,
    objectives_list,
    summary,
    highlights,
    experience_years: normalizeNullableInteger(data?.experience_years),
    skills,
    soft_skills,
    experiences_list,
    education_list,
    certifications_list,
    projects_list,
    languages_list,
    education_level: normalizeNullableString(data?.education_level),
    academic_education: normalizeNullableTextBlock(data?.academic_education) || formatResumeEducationList(education_list),
    courses_certifications: normalizeNullableTextBlock(data?.courses_certifications) || formatResumeCertificationList(certifications_list),
    professional_experiences: normalizeNullableTextBlock(data?.professional_experiences) || formatResumeExperienceList(experiences_list),
    languages,
    linkedin_url: normalizeNullableString(data?.linkedin_url),
    portfolio_url: normalizeNullableString(data?.portfolio_url),
    desired_area: normalizeNullableString(data?.desired_area),
    desired_work_model: normalizeNullableString(data?.desired_work_model),
    desired_contract_type: normalizeNullableString(data?.desired_contract_type),
    desired_salary: normalizeNullableFloat(data?.desired_salary),
    has_cnh: normalizeNullableBoolean(data?.has_cnh),
    cnh_category: normalizeNullableString(data?.cnh_category),
    available_to_travel: normalizeNullableBoolean(data?.available_to_travel),
    available_to_relocate: normalizeNullableBoolean(data?.available_to_relocate),
    compatibility_score: hasLinkedJob && Number.isFinite(compatibilityScore)
      ? Math.max(0, Math.min(100, Math.round(compatibilityScore)))
      : null,
    recommendation: hasLinkedJob ? normalizeNullableString(data?.recommendation) : null,
    strengths,
    attention_points,
  };
}

function buildResumePreAnalysisPrompt(resumeText: string, linkedJob?: { job_title?: string | null; job_description?: string | null } | null) {
  const hasLinkedJob = Boolean(linkedJob?.job_title || linkedJob?.job_description);

  return `
VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© uma analista de RH especialista em leitura de currÃƒÆ’Ã‚Â­culos.

Tarefa:
- Ler o currÃƒÆ’Ã‚Â­culo abaixo.
- Extrair somente os dados que realmente aparecem no currÃƒÆ’Ã‚Â­culo.
- NÃƒÆ’Ã‚Â£o inventar informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
- Se um campo nÃƒÆ’Ã‚Â£o existir ou nÃƒÆ’Ã‚Â£o puder ser confirmado com seguranÃƒÆ’Ã‚Â§a, retorne null.
- Para listas sem dados, retorne [].
- O resumo deve ser curto, objetivo e baseado apenas no currÃƒÆ’Ã‚Â­culo.

${hasLinkedJob ? `
HÃƒÆ’Ã‚Â¡ uma vaga vinculada. FaÃƒÆ’Ã‚Â§a tambÃƒÆ’Ã‚Â©m uma prÃƒÆ’Ã‚Â©-anÃƒÆ’Ã‚Â¡lise de aderÃƒÆ’Ã‚Âªncia:
- compatibility_score: nota de 0 a 100
- recommendation: parecer curto
- strengths: pontos fortes para a vaga
- attention_points: pontos de atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para a vaga

Vaga vinculada:
TÃƒÆ’Ã‚Â­tulo: ${linkedJob?.job_title || 'NÃƒÆ’Ã‚Â£o informado'}
DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ${linkedJob?.job_description || 'NÃƒÆ’Ã‚Â£o informada'}
` : `
NÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ vaga vinculada neste lote.
Nesse caso, retorne:
- compatibility_score: null
- recommendation: null
- strengths: []
- attention_points: []
`}

CurrÃƒÆ’Ã‚Â­culo:
${resumeText}

Retorne apenas JSON neste formato:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "cpf": string | null,
  "birth_date": string | null,
  "age": number | null,
  "city": string | null,
  "state": string | null,
  "country": string | null,
  "postal_code": string | null,
  "address": string | null,
  "role": string | null,
  "current_title": string | null,
  "current_company": string | null,
  "objective": string | null,
  "summary": string | null,
  "experience_years": number | null,
  "skills": string[],
  "soft_skills": string[],
  "education_level": string | null,
  "academic_education": string | null,
  "courses_certifications": string | null,
  "professional_experiences": string | null,
  "languages": string[],
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "desired_area": string | null,
  "desired_work_model": string | null,
  "desired_contract_type": string | null,
  "desired_salary": number | null,
  "has_cnh": boolean | null,
  "cnh_category": string | null,
  "available_to_travel": boolean | null,
  "available_to_relocate": boolean | null,
  "compatibility_score": number | null,
  "recommendation": string | null,
  "strengths": string[],
  "attention_points": string[]
}
`.trim();
}

function buildStructuredResumeBatchPrompt(resumeText: string, linkedJob?: { job_title?: string | null; job_description?: string | null } | null) {
  const hasLinkedJob = Boolean(linkedJob?.job_title || linkedJob?.job_description);

  return `
VocÃª Ã© Aurora, especialista em leitura de currÃ­culos para recrutamento.

Objetivo:
- Ler o currÃ­culo completo abaixo.
- Extrair somente informaÃ§Ãµes que realmente aparecem no currÃ­culo.
- NÃ£o inventar dados.
- Quando nÃ£o houver confirmaÃ§Ã£o suficiente, retorne null.
- Para listas sem dados, retorne [].
- Monte um JSON rico, com dados resumidos e tambÃ©m listas estruturadas para experiÃªncias, formaÃ§Ã£o, certificaÃ§Ãµes, projetos e idiomas.

Regras de mapeamento:
- "experiences_list": array com cada experiÃªncia profissional. Campos: company, role, period, location, description.
- "education_list": array com cada formaÃ§Ã£o. Campos: course, institution, status, degree_type, start_date, end_date.
- "certifications_list": array com cursos e certificaÃ§Ãµes. Campos: name, institution, year.
- "projects_list": array com projetos ou portfÃ³lio. Campos: name, description, technologies.
- "languages_list": array com idiomas. Campos: language, level.
- "hard_skills": string com tecnologias, ferramentas e competÃªncias tÃ©cnicas separadas por vÃ­rgula.
- "soft_skills": string com competÃªncias comportamentais separadas por vÃ­rgula.
- "professional_summary": resumo profissional curto, objetivo e fiel ao currÃ­culo.
- "highlights": string com destaques separados por " | ".

${hasLinkedJob ? `
HÃ¡ uma vaga vinculada. FaÃ§a tambÃ©m a anÃ¡lise de aderÃªncia:
- compatibility_score: nota de 0 a 100
- recommendation: parecer curto
- strengths: pontos fortes para a vaga
- attention_points: pontos de atenÃ§Ã£o para a vaga

Vaga vinculada:
TÃ­tulo: ${linkedJob?.job_title || 'NÃ£o informado'}
DescriÃ§Ã£o: ${linkedJob?.job_description || 'NÃ£o informada'}
` : `
NÃ£o hÃ¡ vaga vinculada neste lote.
Nesse caso, retorne:
- compatibility_score: null
- recommendation: null
- strengths: []
- attention_points: []
`}

CurrÃ­culo:
${resumeText}

Retorne apenas JSON neste formato:
{
  "full_name": string | null,
  "email": string | null,
  "phone": string | null,
  "cpf": string | null,
  "birth_date": string | null,
  "age": number | null,
  "city": string | null,
  "state": string | null,
  "country": string | null,
  "postal_code": string | null,
  "address": string | null,
  "desired_position": string | null,
  "current_title": string | null,
  "current_company": string | null,
  "objective": string | null,
  "desired_area": string | null,
  "desired_work_model": string | null,
  "desired_contract_type": string | null,
  "desired_salary": number | null,
  "professional_summary": string | null,
  "highlights": string | null,
  "experience_years": number | null,
  "education_level": string | null,
  "hard_skills": string | null,
  "soft_skills": string | null,
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "has_cnh": boolean | null,
  "cnh_category": string | null,
  "available_to_travel": boolean | null,
  "available_to_relocate": boolean | null,
  "experiences_list": [{ "company": string, "role": string, "period": string, "location": string | null, "description": string }],
  "education_list": [{ "course": string, "institution": string, "status": string, "degree_type": string | null, "start_date": string | null, "end_date": string | null }],
  "certifications_list": [{ "name": string, "institution": string | null, "year": string | null }],
  "projects_list": [{ "name": string, "description": string, "technologies": string | null }],
  "languages_list": [{ "language": string, "level": string }],
  "compatibility_score": number | null,
  "recommendation": string | null,
  "strengths": string[],
  "attention_points": string[]
}
`.trim();
}

function parseJsonFromAiResponse(textResponse: string) {
  const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('A IA nÃƒÆ’Ã‚Â£o retornou um JSON vÃƒÆ’Ã‚Â¡lido.');
  }

  return JSON.parse(jsonMatch[0]);
}

function parseJsonFromAiResponseSafe(textResponse: string) {
  const normalizedText = String(textResponse || '')
    .replace(/```json|```/gi, '')
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .trim();

  const jsonMatch = normalizedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('A IA nÃ£o retornou um JSON vÃ¡lido.');
  }

  const rawJson = jsonMatch[0];
  const attempts = [
    rawJson,
    rawJson.replace(/,\s*([}\]])/g, '$1'),
    rawJson
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1'),
    rawJson
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
      .replace(/,\s*([}\]])/g, '$1'),
  ];

  let lastError: unknown;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[AI JSON Parse] Falha ao converter resposta em JSON:', rawJson.slice(0, 800));
  throw lastError instanceof Error ? lastError : new Error('Falha ao interpretar JSON retornado pela IA.');
}

async function runResumePreAnalysis(ai: GoogleGenAI, file: any, linkedJob?: { job_title?: string | null; job_description?: string | null } | null) {
  const extractedText = await extractResumeTextFromStoredFile(file);
  const prompt = buildStructuredResumeBatchPrompt(extractedText, linkedJob);
  const aiResult = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 2600,
      reasoningEffort: 'low',
      operationLabel: 'prÃ©-anÃ¡lise de currÃ­culo',
    }
  });

  const parsed = parseJsonFromAiResponseSafe(aiResult.text || '{}');
  const normalized = normalizeResumeParsedData(parsed, Boolean(linkedJob?.job_title || linkedJob?.job_description));

  return {
    extractedText,
    parsedData: normalized,
    aiSummary: normalized.summary,
    compatibilityScore: normalized.compatibility_score,
    compatibilityClassification: normalized.recommendation,
  };
}

function buildCandidateImportNotes(data: any) {
  const lines = [
    data?.objective ? `Objetivo: ${data.objective}` : null,
    data?.current_title ? `Cargo atual: ${data.current_title}` : null,
    data?.current_company ? `Empresa atual: ${data.current_company}` : null,
    Array.isArray(data?.highlights) && data.highlights.length > 0 ? `Destaques: ${data.highlights.join(' | ')}` : null,
    Array.isArray(data?.projects_list) && data.projects_list.length > 0 ? `Projetos mapeados: ${data.projects_list.length}` : null,
    data?.country ? `PaÃƒÆ’Ã‚Â­s: ${data.country}` : null,
    data?.postal_code ? `CEP: ${data.postal_code}` : null,
    data?.age ? `Idade informada: ${data.age}` : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : null;
}

async function attachImportedResumeToCandidate(candidateId: number | string, file: any) {
  if (!file?.file_path || !fs.existsSync(file.file_path)) {
    return null;
  }

  const extension = path.extname(file.file_name || '').toLowerCase();
  const safeName = sanitizeUploadFileName(path.basename(file.file_name || 'curriculo', extension));
  const targetDir = path.join(CANDIDATE_UPLOADS_DIR, String(file.tenant_id), String(candidateId));
  const targetPath = path.join(
    targetDir,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}${extension}`
  );

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.copyFile(file.file_path, targetPath);

  await db.prepare(`
    INSERT INTO candidate_files (
      candidate_id, file_name, file_path, file_type, file_size,
      extracted_text, ai_summary, tenant_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    candidateId,
    file.file_name,
    targetPath,
    file.file_type || null,
    file.file_size || null,
    file.extracted_text || null,
    file.ai_summary || null,
    file.tenant_id || null
  );

  return targetPath;
}

const upload = multer({ storage: multer.memoryStorage() });
const candidateBatchUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: CANDIDATE_BATCH_IMPORT_MAX_FILES,
    fileSize: CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!CANDIDATE_BATCH_IMPORT_EXTENSIONS.includes(extension)) {
      cb(new Error(`Formato de currÃ­culo nÃ£o suportado: ${extension || 'desconhecido'}`));
      return;
    }

    cb(null, true);
  },
});

function addDays(dateValue: string | Date, days: number) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function toSqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getPlanLabel(validityDays: number) {
  if (validityDays >= 365) return 'Plano Anual';
  if (validityDays >= 180) return 'Plano Semestral';
  if (validityDays >= 90) return 'Plano Trimestral';
  return 'Trial 30 dias';
}

function getTenantContractStatus(expiresAt?: string | null, status?: string | null) {
  if (status === 'Suspenso') {
    return 'Suspenso';
  }

  if (!expiresAt) {
    return status || 'Ativo';
  }

  const today = new Date();
  const expiration = new Date(expiresAt);

  if (expiration.getTime() < today.getTime()) {
    return 'Expirado';
  }

  const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) {
    return 'Vencendo';
  }

  return status || 'Ativo';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Initialize DB
  await initDb();

  app.use(cors());
  app.use(express.json());
  app.set('json replacer', jsonReplacer);

  // --- Auth helpers ---

  async function getCallerUser(req: any): Promise<{ id: string; tenant_id: string; role: string } | null> {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return null;
    if (userId === 'admin-root') return { id: 'admin-root', tenant_id: 'develoi', role: 'admin' };
    const user = await db.prepare('SELECT id, tenant_id, role FROM users WHERE id = ?').get(userId) as any;
    return user || null;
  }

  function isRootCaller(req: any): boolean {
    return req.headers['x-user-id'] === 'admin-root';
  }

  async function assertTenantAccess(req: any, res: any, tenantId: string): Promise<boolean> {
    const caller = await getCallerUser(req);
    if (!caller) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
    if (caller.id === 'admin-root') return true;
    if (caller.tenant_id !== tenantId) {
      res.status(403).json({ error: 'Access denied to this tenant' });
      return false;
    }
    return true;
  }

  function getTenantMasterUnitId(tenantId: string) {
    return `master-${tenantId}`;
  }

  function getTenantOwnerUserId(tenantId: string) {
    return `admin-${tenantId}`;
  }

  // --- API Routes ---

  // Authentication
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    console.log(`Login attempt for: [${cleanEmail}]`);
    try {
      const stmt = db.prepare('SELECT u.*, un.name as unit_name, t.name as tenant_name FROM users u LEFT JOIN units un ON u.unit_id = un.id LEFT JOIN tenants t ON u.tenant_id = t.id WHERE (LOWER(u.email) = ? OR LOWER(u.id) = ?) AND u.password = ?');
      const user = await stmt.get(cleanEmail, cleanEmail, cleanPassword) as any;

      if (user) {
        console.log(`Login success: ${user.full_name} (${user.role})`);
        await db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const userResponse = { ...user };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        // Fallback for first-run
        if (cleanEmail === 'admin' && cleanPassword === 'admin') {
           console.log('Login success via Fallback Admin');
           return res.json({
             id: 'admin-root',
             full_name: 'Admin Master',
             email: 'admin',
             role: 'admin',
             tenant_id: 'develoi',
             tenant_name: 'Develoi Recruitment',
             access_profile: 'custom',
             permissions_json: JSON.stringify({
               dashboard: true, aurora_ai: true, jobs: true, candidates: true,
               imports: true, tools: true, administration: true, super_admin: true,
             }),
           });
        }
        console.log(`Login failed for: [${cleanEmail}]. No user found with these credentials.`);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error details:', error);
      res.status(500).json({ error: 'Auth failed' });
    }
  });

  // Candidate File Import
  app.post('/api/candidates/import-file', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { unitId, tenantId } = req.body;

    try {
      let text = '';
      const extension = path.extname(req.file.originalname).toLowerCase();

      if (extension === '.pdf') {
        text = await extractPdfTextFromBuffer(req.file.buffer);
      } else if (extension === '.docx') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (extension === '.xlsx' || extension === '.xls') {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        text = xlsx.utils.sheet_to_txt(sheet);
      }

      if (!text || text.trim().length < 20) {
        return res.status(400).json({ error: 'Could not extract text from file' });
      }

      const ai = createGeminiClient();

      const prompt = `
        Extraia as informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do candidato a partir do texto do currÃƒÆ’Ã‚Â­culo abaixo e retorne um JSON estruturado.
        
        Texto do CurrÃƒÆ’Ã‚Â­culo:
        ${text}

        JSON Schema:
        {
          "full_name": string,
          "email": string,
          "phone": string,
          "city": string,
          "state": string (UF),
          "desired_position": string,
          "desired_salary": number (opcional),
          "experience_years": number (total estimado),
          "education_level": string,
          "professional_summary": string,
          "hard_skills": string (lista separada por vÃƒÆ’Ã‚Â­rgula),
          "professional_experiences": string (texto formatado),
          "linkedin_url": string
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1100,
          reasoningEffort: 'low',
          operationLabel: 'extraÃ§Ã£o de currÃ­culo importado',
        }
      });
      
      const candidateData = JSON.parse(result.text || '{}');

      // Save to DB
      const keys = Object.keys(candidateData).filter(k => k !== 'id');
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => candidateData[k]);
      
      const insertQuery = `
        INSERT INTO candidates (${keys.join(',')}, tenant_id, unit_id, source, status, created_at, updated_at) 
        VALUES (${placeholders}, ?, ?, 'ImportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 'Novo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const insertResult = await db.prepare(insertQuery).run(...values, tenantId, unitId);
      const candidateId = insertResult.lastInsertRowid;
      const candidateTenantId = tenantId || 'fadel';
      const safeName = sanitizeUploadFileName(path.basename(req.file.originalname || 'curriculo', extension));
      const candidateDir = path.join(CANDIDATE_UPLOADS_DIR, String(candidateTenantId), String(candidateId));
      const candidateFilePath = path.join(
        candidateDir,
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}${extension}`
      );

      await fs.promises.mkdir(candidateDir, { recursive: true });
      await fs.promises.writeFile(candidateFilePath, req.file.buffer);

      // Save file record
      await db.prepare(`
        INSERT INTO candidate_files (
          candidate_id, file_name, file_path, file_type, file_size, extracted_text, ai_summary, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(candidateId, req.file.originalname, candidateFilePath, req.file.mimetype, req.file.size, text, candidateData.professional_summary || null, candidateTenantId);

      // Log history
      await db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(candidateId, 'IMPORT', 'CurrÃƒÆ’Ã‚Â­culo Importado', `Dados extraÃƒÆ’Ã‚Â­dos via IA a partir do arquivo ${req.file.originalname}`);

      res.status(201).json({ id: candidateId, ...candidateData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process resume' });
    }
  });

  // Jobs Endpoints
  app.get('/api/jobs', async (req, res) => {
    const { unitId, tenantId, status, search, workModel } = req.query;
    let query = 'SELECT * FROM jobs WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    if (unitId && unitId !== 'master') {
      query += ' AND unit_id = ?';
      params.push(unitId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (workModel) {
      query += ' AND work_model = ?';
      params.push(workModel);
    }

    if (search) {
      query += ' AND (title LIKE ? OR city LIKE ? OR department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const jobs = await db.prepare(query).all(...params);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', async (req, res) => {
    const job = req.body;
    if (!job.title || !job.city || !job.state) {
      return res.status(400).json({ error: 'Title, city and state are required' });
    }
    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !k.startsWith('_'));
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => job[k]);
    const query = `INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    try {
      const result = await db.prepare(query).run(...values);
      res.status(201).json({ id: result.lastInsertRowid, ...job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  });

  app.put('/api/jobs/:id', async (req, res) => {
    const job = req.body;
    const { id } = req.params;
    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && !k.startsWith('_'));
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => job[k]);
    const query = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    try {
      await db.prepare(query).run(...values, id);
      res.json({ id, ...job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  app.patch('/api/jobs/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
      await db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  app.patch('/api/jobs/:id/publication', async (req, res) => {
    const { is_public } = req.body;
    try {
      await db.prepare('UPDATE jobs SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_public ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update publication' });
    }
  });

  app.delete('/api/jobs/:id', async (req, res) => {
    const jobId = req.params.id;
    try {
      // Physically delete associated job import files to avoid disk clutter
      const jobImports = await db.prepare('SELECT file_path FROM job_imports WHERE job_id = ?').all(jobId) as any[];
      for (const imp of jobImports) {
        if (imp.file_path && fs.existsSync(imp.file_path)) {
          await fs.promises.unlink(imp.file_path).catch(err => console.error(`Failed to delete job file: ${imp.file_path}`, err));
        }
      }

      await db.prepare('UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(jobId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete job:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  });

  app.get('/api/jobs/:id/candidates', async (req, res) => {
    try {
      const candidates = await db.prepare(`
        SELECT c.*, m.compatibility_score, m.status as match_status
        FROM candidates c
        JOIN candidate_job_matches m ON c.id = m.candidate_id
        WHERE m.job_id = ? AND c.deleted_at IS NULL
      `).all(req.params.id);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch applied candidates' });
    }
  });

  // Job Import Endpoints
  app.post('/api/jobs/import', upload.single('file'), async (req, res) => {
    const { tenant_id, unit_id } = req.body;

    if (!tenant_id || !unit_id) {
      return res.status(400).json({ error: 'tenant_id and unit_id are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Job file is required' });
    }

    try {
      const extractedText = await extractJobTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);

      const result = await db.prepare(`
        INSERT INTO job_imports (
          tenant_id, unit_id, file_name, file_type, file_size, status, extracted_text
        )
        VALUES (?, ?, ?, ?, ?, 'uploaded', ?)
      `).run(
        tenant_id,
        unit_id,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        extractedText
      );

      const importId = result.lastInsertRowid;
      const filePath = await saveImportedJobFile(importId, tenant_id, req.file);

      await db.prepare(`
        UPDATE job_imports
        SET file_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(filePath, importId);

      res.status(201).json({ id: importId, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create job import' });
    }
  });

  app.get('/api/jobs/import/:id', async (req, res) => {
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(req.params.id);
      if (!importData) return res.status(404).json({ error: 'Import not found' });
      res.json(importData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import details' });
    }
  });

  app.post('/api/jobs/import/:id/analyze', async (req, res) => {
    const { id } = req.params;
    console.log(`[DEBUG] Received analyze request for import ID: ${id}`);
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });

      await db.prepare('UPDATE job_imports SET status = "analyzing_ai" WHERE id = ?').run(id);

      // In a real app we'd extract text from the file.
      // Here we simulate it based on the file name if text is not provided.
      const actualExtractedText = importData.extracted_text || await extractJobTextFromStoredFile(importData);
      console.log(`[DEBUG] Extracted text length: ${actualExtractedText?.length || 0}`);
      const simulatedText = importData.extracted_text || `DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da vaga importada do arquivo ${importData.file_name}. Esperamos um profissional com experiÃƒÆ’Ã‚Âªncia em LogÃƒÆ’Ã‚Â­stica, CNH categoria E, residindo em TatuÃƒÆ’Ã‚Â­/SP. SalÃƒÆ’Ã‚Â¡rio entre R$ 3.500,00 e R$ 5.000,00. BenefÃƒÆ’Ã‚Â­cios: Vale transporte, plano de saÃƒÆ’Ã‚Âºde, seguro de vida.`;

      const ai = createGeminiClient();
      
      const prompt = `
        VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© um especialista em recrutamento e seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. Analise o documento de descriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de vaga abaixo e extraia as informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em JSON estruturado. 
        NÃƒÆ’Ã‚Â£o invente informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes. Quando um dado nÃƒÆ’Ã‚Â£o existir, retorne null. 
        Identifique requisitos obrigatÃƒÆ’Ã‚Â³rios, desejÃƒÆ’Ã‚Â¡veis, responsabilidades, localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, modelo de trabalho, tipo de contrato, experiÃƒÆ’Ã‚Âªncia, formaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, benefÃƒÆ’Ã‚Â­cios e critÃƒÆ’Ã‚Â©rios de compatibilidade para anÃƒÆ’Ã‚Â¡lise de candidatos. 
        TambÃƒÆ’Ã‚Â©m sugira pesos para anÃƒÆ’Ã‚Â¡lise de compatibilidade com candidatos.

        DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Vaga:
        ${simulatedText}

        Retorne EXATAMENTE este JSON:
        {
          "title": string,
          "department": string,
          "description": string,
          "responsibilities": string,
          "technical_requirements": string,
          "mandatory_requirements": string,
          "desirable_requirements": string,
          "eliminatory_criteria": string,
          "benefits": string,
          "city": string,
          "state": string,
          "work_model": "Presencial" | "HÃƒÆ’Ã‚Â­brido" | "Home Office",
          "contract_type": "CLT" | "PJ" | "EstÃƒÆ’Ã‚Â¡gio" | "TemporÃƒÆ’Ã‚Â¡rio" | "Freelancer" | "Outro",
          "seniority_level": "Operacional" | "JÃƒÆ’Ã‚Âºnior" | "Pleno" | "SÃƒÆ’Ã‚Âªnior" | "CoordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o" | "GerÃƒÆ’Ã‚Âªncia" | "Diretoria",
          "education_level": string,
          "min_experience_years": number,
          "salary_min": number,
          "salary_max": number,
          "workload": string,
          "work_schedule": string,
          "requires_cnh": boolean,
          "cnh_category": string,
          "requires_travel": boolean,
          "requires_relocation": boolean,
          "tags": string,
          "compatibility_threshold": number,
          "weight_technical": number,
          "weight_experience": number,
          "weight_education": number,
          "weight_location": number,
          "weight_soft_skills": number,
          "weight_culture": number,
          "ai_summary": string,
          "confidence": {
            "title": "Alta" | "MÃƒÆ’Ã‚Â©dia" | "Baixa",
            "city": "Alta" | "MÃƒÆ’Ã‚Â©dia" | "Baixa",
            "salary": "Alta" | "MÃƒÆ’Ã‚Â©dia" | "Baixa",
            "requirements": "Alta" | "MÃƒÆ’Ã‚Â©dia" | "Baixa"
          }
        }
      `;

      const strictPrompt = `
Analise o texto de uma vaga e retorne apenas dados que existirem de forma explÃ­cita no documento.

Regras obrigatÃ³rias:
- NÃ£o invente cidade, estado, salÃ¡rio, benefÃ­cios, experiÃªncia, contrato, senioridade ou qualquer outro campo.
- Se um campo nÃ£o aparecer claramente no texto, retorne null.
- Preserve a redaÃ§Ã£o original sempre que possÃ­vel; sÃ³ faÃ§a ajustes leves de ortografia ou concordÃ¢ncia.
- NÃ£o use o nome do arquivo como fonte de verdade.
- Para cada campo preenchido, informe um trecho literal do documento em "evidence".
- O trecho em "evidence" precisa existir exatamente no texto enviado.
- Os pesos de IA podem ser sugeridos por vocÃª, mas nunca preencha dados da vaga sem evidÃªncia.
- Retorne JSON vÃ¡lido no padrÃ£o RFC 8259, sem comentÃ¡rios, sem markdown, sem vÃ­rgulas finais e com todas as chaves entre aspas duplas.

Texto da vaga:
${actualExtractedText}

Retorne EXATAMENTE este JSON:
{
  "title": string | null,
  "department": string | null,
  "description": string | null,
  "responsibilities": string | null,
  "technical_requirements": string | null,
  "mandatory_requirements": string | null,
  "desirable_requirements": string | null,
  "eliminatory_criteria": string | null,
  "benefits": string | null,
  "city": string | null,
  "state": string | null,
  "work_model": "Presencial" | "HÃ­brido" | "Home Office" | null,
  "contract_type": "CLT" | "PJ" | "EstÃ¡gio" | "TemporÃ¡rio" | "Freelancer" | "Outro" | null,
  "seniority_level": "Operacional" | "JÃºnior" | "Pleno" | "SÃªnior" | "CoordenaÃ§Ã£o" | "GerÃªncia" | "Diretoria" | null,
  "education_level": string | null,
  "min_experience_years": number | null,
  "salary_min": number | null,
  "salary_max": number | null,
  "workload": string | null,
  "work_schedule": string | null,
  "requires_cnh": boolean | null,
  "cnh_category": string | null,
  "requires_travel": boolean | null,
  "requires_relocation": boolean | null,
  "tags": string | null,
  "compatibility_threshold": number,
  "weight_technical": number,
  "weight_experience": number,
  "weight_education": number,
  "weight_location": number,
  "weight_soft_skills": number,
  "weight_culture": number,
  "confidence": {
    "title": "Alta" | "MÃ©dia" | "Baixa",
    "city": "Alta" | "MÃ©dia" | "Baixa",
    "salary": "Alta" | "MÃ©dia" | "Baixa",
    "requirements": "Alta" | "MÃ©dia" | "Baixa"
  },
  "evidence": {
    "title": string | null,
    "department": string | null,
    "description": string | null,
    "responsibilities": string | null,
    "technical_requirements": string | null,
    "mandatory_requirements": string | null,
    "desirable_requirements": string | null,
    "eliminatory_criteria": string | null,
    "benefits": string | null,
    "city": string | null,
    "state": string | null,
    "work_model": string | null,
    "contract_type": string | null,
    "seniority_level": string | null,
    "education_level": string | null,
    "min_experience_years": string | null,
    "salary_min": string | null,
    "salary_max": string | null,
    "workload": string | null,
    "work_schedule": string | null,
    "requires_cnh": string | null,
    "cnh_category": string | null,
    "requires_travel": string | null,
    "requires_relocation": string | null,
    "tags": string | null
  },
  "ai_summary": string | null
}
      `;

      const aiResult = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1800,
          reasoningEffort: 'low',
          operationLabel: 'anÃ¡lise de vaga importada',
        }
      });
      
      const textResponse = aiResult.text || "";
      const cleaned = textResponse.replace(/```json|```/g, '').trim();
      const parsedData = normalizeImportedJobParsedData(parseJsonFromAiResponseSafe(cleaned), actualExtractedText);

      await db.prepare(`
        UPDATE job_imports
        SET status = "ready_for_review",
            extracted_text = ?,
            parsed_data_json = ?,
            confidence_json = ?,
            ai_summary = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        actualExtractedText,
        JSON.stringify(parsedData),
        JSON.stringify(parsedData.confidence),
        parsedData.ai_summary,
        id
      );

      res.json({ success: true, data: parsedData });
    } catch (error) {
      console.error('[AI Analysis Error]:', error);
      await db.prepare('UPDATE job_imports SET status = \'error\', error_message = ? WHERE id = ?').run(error instanceof Error ? error.message : String(error), id);
      res.status(500).json({ error: 'AI analysis failed', detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/jobs/import/:id/create-job', async (req, res) => {
    const { id } = req.params;
    const jobData = req.body;
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });

      const keys = Object.keys(jobData).filter(
        k =>
          k !== 'id' &&
          k !== 'created_at' &&
          k !== 'updated_at' &&
          k !== 'confidence' &&
          k !== 'tenant_id' &&
          k !== 'unit_id' &&
          k !== 'ai_summary' &&
          !k.startsWith('_')
      );
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => jobData[k]);

      const query = `INSERT INTO jobs (${keys.join(',')}, tenant_id, unit_id, created_at, updated_at) VALUES (${placeholders}, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

      const result = await db.prepare(query).run(...values, importData.tenant_id, importData.unit_id);
      const jobId = result.lastInsertRowid;

      await db.prepare('UPDATE job_imports SET status = "created_job", job_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(jobId, id);

      res.json({ success: true, jobId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job from import' });
    }
  });

  app.delete('/api/jobs/import/:id', async (req, res) => {
    const importId = req.params.id;
    try {
      const imp = await db.prepare('SELECT file_path FROM job_imports WHERE id = ?').get(importId) as any;
      if (imp?.file_path && fs.existsSync(imp.file_path)) {
        await fs.promises.unlink(imp.file_path).catch(err => console.error(`Failed to delete job import file: ${imp.file_path}`, err));
      }

      await db.prepare('DELETE FROM job_imports WHERE id = ?').run(importId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete job import:', error);
      res.status(500).json({ error: 'Failed to delete job import' });
    }
  });

  // AI Generation
  app.post('/api/jobs/:id/generate-publication-text', async (req, res) => {
    const { channel, tone = 'profissional' } = req.body;
    const { id } = req.params;

    try {
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
      if (!job) return res.status(404).json({ error: 'Job not found' });

      const ai = createGeminiClient();

      const prompt = `
        VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© um especialista em recrutamento e seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. Gere um texto para divulgaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da vaga abaixo no canal ${channel}.
        Tom desejado: ${tone}.
        
        Dados da Vaga:
        TÃƒÆ’Ã‚Â­tulo: ${job.title}
        Departamento: ${job.department}
        Cidade/Estado: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Contrato: ${job.contract_type}
        DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ${job.description}
        Responsabilidades: ${job.responsibilities}
        Requisitos: ${job.technical_requirements}
        BenefÃƒÆ’Ã‚Â­cios: ${job.benefits}

        Formato de Resposta:
        TÃƒÆ’Ã‚Â­tulo Sugerido: [TÃƒÆ’Ã‚Â­tulo]
        Texto Completo: [DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o detalhada]
        Texto Curto: [Resumo para redes sociais]
        Hashtags: [Relevantes]
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: 1200,
          reasoningEffort: 'low',
          verbosity: 'high',
          operationLabel: 'geraÃ§Ã£o de texto de divulgaÃ§Ã£o',
        }
      });
      
      res.json({ text: result.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate text with AI' });
    }
  });

  // Stats Endpoint for Dashboard
  app.get('/api/dashboard/overview', async (req, res) => {
    const { unitId, tenantId, period = '30d' } = req.query;
    try {
      const p = period === 'all' ? '10 year' : period === '90d' ? '90 days' : period === '30d' ? '30 days' : '7 days';
      const unitFilter = (alias?: string) => {
        const prefix = alias ? `${alias}.` : '';
        return unitId && unitId !== 'master' ? `AND ${prefix}unit_id = ?` : '';
      };
      const unitParams = unitId && unitId !== 'master' ? [unitId] : [];

      // 1. Core Stats
      const stats = await db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM jobs WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND status = 'Aberta') as active_jobs,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL) as total_candidates,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND created_at >= date('now', '-${p}')) as new_candidates,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE compatibility_score >= 80) as compatible_candidates,
          (SELECT COUNT(*) FROM hr_tool_responses) as tool_responses
      `).get(tenantId, ...unitParams, tenantId, ...unitParams, tenantId, ...unitParams) as any;

      // 2. Funnel Data
      const funnel = await db.prepare(`
        SELECT
          status, COUNT(*) as count
        FROM candidate_job_matches
        GROUP BY status
      `).all() as any[];

      // 3. Recent Jobs
      const recentJobs = await db.prepare(`
        SELECT j.id, j.title, j.city, j.state, j.status, j.created_at,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id) as candidates_count,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id AND compatibility_score >= 80) as compatible_count
        FROM jobs j
        WHERE j.tenant_id = ? ${unitFilter('j')} AND j.deleted_at IS NULL
        ORDER BY j.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      // 4. Recommended Candidates (Top recent matches)
      const recommendations = await db.prepare(`
        SELECT c.id, c.full_name, c.city, c.state, j.title as job_title, m.compatibility_score, m.compatibility_classification as classification
        FROM candidate_job_matches m
        JOIN candidates c ON m.candidate_id = c.id
        JOIN jobs j ON m.job_id = j.id
        WHERE c.tenant_id = ? ${unitFilter('c')} AND m.compatibility_score >= 70
        ORDER BY m.compatibility_score DESC, c.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      // 5. Recent Imports
      const recentImports = await db.prepare(`
        SELECT id, name, created_at, total_files, processed_files, created_candidates, status
        FROM import_batches
        WHERE tenant_id = ? ${unitFilter()}
        ORDER BY created_at DESC
        LIMIT 3
      `).all(tenantId, ...unitParams);

      // 6. Distribution Charts
      const charts = {
        candidatesByStatus: await db.prepare(`
          SELECT status, COUNT(*) as value FROM candidates WHERE tenant_id = ? ${unitFilter()} GROUP BY status
        `).all(tenantId, ...unitParams),
        compatibilityMedia: await db.prepare(`
          SELECT j.title as name, AVG(m.compatibility_score) as value
          FROM jobs j
          JOIN candidate_job_matches m ON j.id = m.job_id
          WHERE j.tenant_id = ? ${unitFilter('j')}
          GROUP BY j.id
        `).all(tenantId, ...unitParams),
        discDistribution: await db.prepare(`
          SELECT predominant_profile as name, COUNT(*) as value
          FROM candidate_disc_results r
          JOIN candidates c ON r.candidate_id = c.id
          WHERE c.tenant_id = ? ${unitFilter('c')}
          GROUP BY predominant_profile
        `).all(tenantId, ...unitParams)
      };

      // 7. Smart Alerts & Suggestions
      const alerts = [];
      const criticalJobs = (recentJobs as any[]).filter(j => j.candidates_count === 0 && j.status === 'Aberta');
      criticalJobs.forEach(j => {
        alerts.push({
          type: 'danger',
          title: 'Vaga sem candidatos',
          message: `A vaga "${j.title}" estÃƒÆ’Ã‚Â¡ aberta hÃƒÆ’Ã‚Â¡ ${Math.floor((Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias e nÃƒÆ’Ã‚Â£o possui candidatos.`,
          action: 'Revisar requisitos'
        });
      });

      const highMatches = (recommendations as any[]).filter(r => r.compatibility_score >= 90);
      if (highMatches.length > 0) {
        alerts.push({
          type: 'success',
          title: 'Talentos detectados',
          message: `Existem ${highMatches.length} candidatos com compatibilidade superior a 90% aguardando revisÃƒÆ’Ã‚Â£o.`,
          action: 'Ver candidatos'
        });
      }

      // 8. Unit Summary
      const unitSummary = await db.prepare(`
        SELECT
          u.id,
          u.name,
          (SELECT COUNT(*) FROM jobs WHERE unit_id = u.id AND deleted_at IS NULL AND status = 'Aberta') as active_jobs,
          (SELECT COUNT(*) FROM candidates WHERE unit_id = u.id AND deleted_at IS NULL) as total_candidates,
          (SELECT COUNT(*) FROM candidate_job_matches m JOIN jobs j ON m.job_id = j.id WHERE j.unit_id = u.id AND m.status = 'Contratado') as hires
        FROM units u
        WHERE u.tenant_id = ?
      `).all(tenantId);

      res.json({
        stats,
        funnel,
        recentJobs,
        recommendations,
        recentImports,
        charts,
        alerts,
        unitSummary
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Stats Endpoint for Dashboard (Legacy)
  app.get('/api/stats', async (req, res) => {
    const { unitId } = req.query;
    try {
      let where = 'WHERE deleted_at IS NULL';
      const params: any[] = [];
      if (unitId && unitId !== 'master') {
        where += ' AND unit_id = ?';
        params.push(unitId);
      }

      const jobsCount = await db.prepare(`SELECT COUNT(*) as count FROM jobs ${where}`).get(...params) as any;

      let candidateWhere = 'WHERE deleted_at IS NULL';
      const candidateParams: any[] = [];
      if (unitId && unitId !== 'master') {
        candidateWhere += ' AND unit_id = ?';
        candidateParams.push(unitId);
      }
      const candidatesCount = await db.prepare(`SELECT COUNT(*) as count FROM candidates ${candidateWhere}`).get(...candidateParams) as any;
      const openJobs = await db.prepare(`SELECT COUNT(*) as count FROM jobs ${where} AND status = 'Aberta'`).get(...params) as any;
      const applicationsCount = await db.prepare(`SELECT COUNT(*) as count FROM candidate_job_matches`).get() as any;

      res.json({
        jobsCount: jobsCount.count,
        candidatesCount: candidatesCount.count,
        applicationsCount: applicationsCount.count,
        openJobs: openJobs.count
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Candidates Endpoints
  app.post('/api/ai/parse-resume', upload.single('resume'), async (req, res) => {
    console.log('--- AI RESUME PARSE REQUEST RECEIVED ---');
    try {
      const file = req.file;
      if (!file) {
        console.error('[PARSE] Nenhum arquivo recebido no Multer');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      console.log('[PARSE] Arquivo recebido:', file.originalname, 'Tipo:', file.mimetype);

      const text = await extractResumeTextFromBuffer(file.buffer, file.originalname, file.mimetype);
      if (!text || text.trim().length === 0) {
        console.warn('[PARSE] Nenhum texto extraÃ­do do arquivo');
      }

      console.log('[PARSE] Chamando OpenAI...');
      const ai = createGeminiClient();
      
      const prompt = `
        VocÃª Ã© Aurora, assistente de recrutamento inteligente da Develoi.
        Sua missÃ£o Ã© extrair ABSOLUTAMENTE TUDO do currÃ­culo abaixo.
        NÃƒO PULE NENHUMA SEÃ‡ÃƒO. Leia CADA LINHA do currÃ­culo.
        Se um campo nÃ£o existir no currÃ­culo, retorne null. Mas se existir, EXTRAIA.

        REGRAS:
        - "experiences_list": ARRAY obrigatÃ³rio com CADA emprego/experiÃªncia. Inclua TODOS, mesmo estÃ¡gios e freelances. Campos: company, role, period, location, description (atividades resumidas em 1-2 frases).
        - "education_list": ARRAY com CADA formação. Inclua pós-graduação, MBA, graduação, técnico. Campos: course, institution, status ("Concluído", "Em andamento", "Trancado", "Incompleto"), degree_type (Bacharelado, Licenciatura, Tecnólogo, Especialização, MBA, Mestrado, Doutorado, Técnico, Outro), start_date (formato MM/YYYY se possível), end_date (formato MM/YYYY se possível).
        - "certifications_list": ARRAY com CADA curso ou certificaÃ§Ã£o mencionada. Campos: name, institution, year.
        - "projects_list": ARRAY com projetos relevantes/portfÃ³lio mencionados. Campos: name (nome do projeto), description (o que Ã©), technologies (tecnologias usadas, string separada por vÃ­rgula).
        - "languages_list": ARRAY com idiomas. Campos: language, level.
        - "hard_skills": String com TODAS as tecnologias, ferramentas e competÃªncias tÃ©cnicas. Separe por vÃ­rgula. Inclua frameworks, linguagens, bancos, ferramentas, etc.
        - "soft_skills": String com habilidades comportamentais inferidas. Separe por vÃ­rgula.
        - "professional_summary": Resumo profissional baseado no currÃ­culo (2-3 parÃ¡grafos).
        - "highlights": String com os destaques/diferenciais do candidato, separados por " | ".
        - "experience_years": NÃºmero com total de anos de experiÃªncia.
        - "education_level": Um entre: "Ensino Fundamental", "Ensino MÃ©dio", "TÃ©cnico", "Ensino Superior Incompleto", "Ensino Superior Completo", "PÃ³s / MBA / Mestrado".

        Texto do CurrÃ­culo:
        ${text}

        JSON de resposta:
        {
          "full_name": string | null,
          "email": string | null,
          "phone": string | null,
          "cpf": string | null,
          "birth_date": string | null,
          "city": string | null,
          "state": string | null,
          "address": string | null,
          "linkedin_url": string | null,
          "portfolio_url": string | null,
          "desired_position": string | null,
          "desired_area": string | null,
          "desired_salary": number | null,
          "experience_years": number | null,
          "education_level": string | null,
          "hard_skills": string | null,
          "soft_skills": string | null,
          "highlights": string | null,
          "professional_summary": string | null,
          "desired_work_model": string | null,
          "desired_contract_type": string | null,
          "has_cnh": boolean | null,
          "cnh_category": string | null,
          "available_to_travel": boolean | null,
          "available_to_relocate": boolean | null,
          "experiences_list": [{ "company": string, "role": string, "period": string, "location": string | null, "description": string }],
          "education_list": [{ "course": string, "institution": string, "status": string, "degree_type": string | null, "start_date": string | null, "end_date": string | null }],
          "certifications_list": [{ "name": string, "institution": string | null, "year": string | null }],
          "projects_list": [{ "name": string, "description": string, "technologies": string | null }],
          "languages_list": [{ "language": string, "level": string }]
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2600,
          reasoningEffort: 'low',
          operationLabel: 'extraÃ§Ã£o completa de currÃ­culo',
        }
      });

      const data = parseJsonFromAiResponseSafe(result.text || '{}');
      console.log('[PARSE] âœ… ExtraÃ§Ã£o completa:');
      console.log('  Nome:', data.full_name);
      console.log('  ExperiÃªncias:', data.experiences_list?.length || 0);
      console.log('  FormaÃ§Ãµes:', data.education_list?.length || 0);
      console.log('  CertificaÃ§Ãµes:', data.certifications_list?.length || 0);
      console.log('  Projetos:', data.projects_list?.length || 0);
      console.log('  Idiomas:', data.languages_list?.length || 0);
      console.log('  Hard Skills:', data.hard_skills?.substring(0, 80) || 'N/A');
      console.log('  Soft Skills:', data.soft_skills?.substring(0, 80) || 'N/A');
      res.json(data);
    } catch (error: any) {
      console.error('[PARSE] Erro CrÃ­tico:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao processar currÃ­culo',
        details: error.stack 
      });
    }
  });

  app.get('/api/candidates', async (req, res) => {
    const { tenantId, unitId, search, status, source } = req.query;
    let query = 'SELECT * FROM candidates WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    if (unitId && unitId !== 'master') {
      query += ' AND unit_id = ?';
      params.push(unitId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR desired_position LIKE ? OR hard_skills LIKE ? OR summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const candidates = await db.prepare(query).all(...params);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  app.get('/api/candidates/:id', async (req, res) => {
    try {
      const candidate = await db.prepare('SELECT * FROM candidates WHERE id = ? AND deleted_at IS NULL').get(req.params.id) as any;
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      // Fetch related data
      candidate.files = await db.prepare('SELECT * FROM candidate_files WHERE candidate_id = ?').all(candidate.id);
      candidate.matches = await db.prepare(`
        SELECT m.*, j.title as job_title, j.city as job_city, j.state as job_state
        FROM candidate_job_matches m
        JOIN jobs j ON m.job_id = j.id
        WHERE m.candidate_id = ?
      `).all(candidate.id);
      candidate.disc = await db.prepare('SELECT * FROM candidate_disc_results WHERE candidate_id = ?').get(candidate.id);
      candidate.history = await db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(candidate.id);

      res.json(candidate);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  app.get('/api/candidates/:candidateId/files/:fileId', async (req, res) => {
    try {
      const file = await db.prepare(`
        SELECT cf.*
        FROM candidate_files cf
        JOIN candidates c ON c.id = cf.candidate_id
        WHERE cf.id = ? AND cf.candidate_id = ? AND c.deleted_at IS NULL
      `).get(req.params.fileId, req.params.candidateId) as any;

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!file.file_path || !fs.existsSync(file.file_path)) {
        return res.status(404).json({ error: 'Stored file not found' });
      }

      if (req.query.download === '1') {
        return res.download(file.file_path, file.file_name);
      }

      if (file.file_type) {
        res.type(file.file_type);
      }

      res.sendFile(path.resolve(file.file_path));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to serve candidate file' });
    }
  });

  app.post('/api/candidates', async (req, res) => {
    const candidate = req.body;
    if (!candidate.full_name || !candidate.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => candidate[k]);

    const query = `INSERT INTO candidates (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

    try {
      const result = await db.prepare(query).run(...values);
      res.status(201).json({ id: result.lastInsertRowid, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  });

  app.put('/api/candidates/:id', async (req, res) => {
    const candidate = req.body;
    const { id } = req.params;

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && k !== 'files' && k !== 'matches' && k !== 'disc' && k !== 'history');
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => candidate[k]);

    const query = `UPDATE candidates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    try {
      await db.prepare(query).run(...values, id);
      res.json({ id, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', async (req, res) => {
    const candidateId = req.params.id;
    try {
      // Physically delete candidate files (resumes, attachments)
      const candFiles = await db.prepare('SELECT file_path FROM candidate_files WHERE candidate_id = ?').all(candidateId) as any[];
      for (const f of candFiles) {
        if (f.file_path && fs.existsSync(f.file_path)) {
          await fs.promises.unlink(f.file_path).catch(err => console.error(`Failed to delete candidate file: ${f.file_path}`, err));
        }
      }

      // Also delete files from imports linked to this candidate
      const importFiles = await db.prepare('SELECT file_path FROM import_files WHERE candidate_id = ?').all(candidateId) as any[];
      for (const f of importFiles) {
        if (f.file_path && fs.existsSync(f.file_path)) {
          await fs.promises.unlink(f.file_path).catch(err => console.error(`Failed to delete import file: ${f.file_path}`, err));
        }
      }

      await db.prepare('UPDATE candidates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(candidateId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  app.post('/api/candidates/:id/link-job', async (req, res) => {
    const { id } = req.params;
    const { job_id, tenant_id } = req.body;

    try {
      const existing = await db.prepare('SELECT id FROM candidate_job_matches WHERE candidate_id = ? AND job_id = ?').get(id, job_id);
      if (existing) return res.status(400).json({ error: 'Candidate already linked to this job' });

      await db.prepare('INSERT INTO candidate_job_matches (candidate_id, job_id, tenant_id, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(id, job_id, tenant_id);

      // Log history
      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id, 'LINK', 'Vaga Vinculada', 'Candidato foi vinculado a uma nova oportunidade.');

      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to link job' });
    }
  });

  app.get('/api/candidates/:id/history', async (req, res) => {
    try {
      const history = await db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.post('/api/candidates/:id/history', async (req, res) => {
    const { id } = req.params;
    const { event_type, title, description, job_id } = req.body;
    try {
      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id || null, event_type, title, description);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add history' });
    }
  });

  // AI Compatibility Analysis
  app.post('/api/candidates/:id/analyze-job/:jobId', async (req, res) => {
    const { id, jobId } = req.params;
    const { tenant_id } = req.body;

    try {
      const candidate = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;

      if (!candidate || !job) return res.status(404).json({ error: 'Candidate or Job not found' });

      const ai = createGeminiClient();
      
      const prompt = `
        VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© um especialista em recrutamento e seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com IA. Compare o candidato com a vaga e retorne um relatÃƒÆ’Ã‚Â³rio detalhado em JSON.
        
        Vaga:
        TÃƒÆ’Ã‚Â­tulo: ${job.title}
        Requisitos: ${job.technical_requirements}
        MandatÃƒÆ’Ã‚Â³rios: ${job.mandatory_requirements}
        EliminatÃƒÆ’Ã‚Â³rios: ${job.eliminatory_criteria}
        Local: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Anos Exp MÃƒÆ’Ã‚Â­nimos: ${job.min_experience_years}
        
        Candidato:
        Nome: ${candidate.full_name}
        ExperiÃƒÆ’Ã‚Âªncia: ${candidate.professional_experiences}
        Resumo: ${candidate.professional_summary}
        Skills: ${candidate.hard_skills}
        Local: ${candidate.city}/${candidate.state}
        Modelo Desejado: ${candidate.desired_work_model}
        Tempo Exp: ${candidate.experience_years} anos
        CNH: ${candidate.has_cnh ? 'Sim, cat ' + candidate.cnh_category : 'NÃƒÆ’Ã‚Â£o'}

        JSON Schema:
        {
          "compatibility_score": number (0-100),
          "compatibility_classification": "Alto Fit" | "MÃƒÆ’Ã‚Â©dio Fit" | "Baixo Fit" | "IncompatÃƒÆ’Ã‚Â­vel",
          "compatibility_summary": string,
          "strengths": string[] (principais pontos fortes),
          "attention_points": string[] (pontos de atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o),
          "requirements_met": string[] (requisitos preenchidos),
          "requirements_partial": string[] (parcialmente atendidos),
          "requirements_missing": string[] (faltantes),
          "eliminatory_flags": string[] (critÃƒÆ’Ã‚Â©rios eliminatÃƒÆ’Ã‚Â³rios feridos),
          "interview_questions": string[] (sugestÃƒÆ’Ã‚Âµes de perguntas),
          "risk_analysis": string,
          "final_recommendation": string
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2200,
          reasoningEffort: 'low',
          operationLabel: 'anÃ¡lise de compatibilidade candidato-vaga',
        }
      });
      
      const analysis = JSON.parse(result.text || '{}');

      // Update match in DB
      const updateQuery = `
        UPDATE candidate_job_matches 
        SET 
          compatibility_score = ?,
          compatibility_classification = ?,
          compatibility_summary = ?,
          strengths = ?,
          attention_points = ?,
          requirements_met = ?,
          requirements_partial = ?,
          requirements_missing = ?,
          eliminatory_flags = ?,
          interview_questions = ?,
          risk_analysis = ?,
          final_recommendation = ?,
          ai_analysis_json = ?,
          analyzed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND job_id = ?
      `;

      await db.prepare(updateQuery).run(
        analysis.compatibility_score,
        analysis.compatibility_classification,
        analysis.compatibility_summary,
        JSON.stringify(analysis.strengths),
        JSON.stringify(analysis.attention_points),
        JSON.stringify(analysis.requirements_met),
        JSON.stringify(analysis.requirements_partial),
        JSON.stringify(analysis.requirements_missing),
        JSON.stringify(analysis.eliminatory_flags),
        JSON.stringify(analysis.interview_questions),
        analysis.risk_analysis,
        analysis.final_recommendation,
        JSON.stringify(analysis),
        id,
        jobId
      );

    // Log history
      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, jobId, 'AI_ANALYSIS', 'AnÃƒÆ’Ã‚Â¡lise IA Realizada', `Score de compatibilidade: ${analysis.compatibility_score}%`);

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  // --- Aurora AI Endpoints ---

  app.get('/api/aurora-ai/settings', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      const settings = await db.prepare('SELECT * FROM ai_matching_settings WHERE tenant_id = ? AND unit_id = ?').get(tenantId, unitId);
      if (!settings) {
        // Return default if not exists
        return res.json({
          default_precision_mode: 'Equilibrada',
          default_compatibility_threshold: 70,
          default_max_results: 20,
          default_distance_radius_km: 50,
          weight_location: 10,
          weight_experience: 20,
          weight_hard_skills: 20,
          weight_soft_skills: 15,
          weight_disc: 15,
          weight_education: 10,
          weight_salary: 5,
          weight_work_model: 5
        });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/aurora-ai/settings', async (req, res) => {
    const settings = req.body;
    const { tenant_id, unit_id } = settings;

    const keys = Object.keys(settings).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => settings[k]);

    const query = `
      INSERT INTO ai_matching_settings (${keys.join(',')}, created_at, updated_at)
      VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(tenant_id, unit_id) DO UPDATE SET
        ${keys.map(k => `${k} = excluded.${k}`).join(',')},
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await db.prepare(query).run(...values);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.post('/api/aurora-ai/match-job', async (req, res) => {
    const { 
      jobId, 
      tenantId, 
      unitId, 
      precisionMode, 
      minScore, 
      maxResults, 
      radius, 
      locationRule,
      onlyWithResume,
      onlyWithDisc,
      statusFilter,
      sourceFilter
    } = req.body;

    try {
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Job not found' });

      // Create session
      const sessionResult = await db.prepare(`
        INSERT INTO ai_search_sessions
        (tenant_id, unit_id, job_id, search_type, precision_mode, compatibility_threshold, max_results, distance_radius_km, location_rule, only_with_resume, only_with_disc, created_at)
        VALUES (?, ?, ?, 'match-job', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(tenantId, unitId, jobId, precisionMode || 'Equilibrada', minScore || 70, maxResults || 50, radius, locationRule, onlyWithResume ? 1 : 0, onlyWithDisc ? 1 : 0);
      
      const sessionId = sessionResult.lastInsertRowid;

      // Fetch candidates
      let candQuery = 'SELECT * FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL';
      const candParams: any[] = [tenantId];

      if (unitId && unitId !== 'master') {
        candQuery += ' AND unit_id = ?';
        candParams.push(unitId);
      }

      if (statusFilter && statusFilter !== 'Todos') {
        candQuery += ' AND status = ?';
        candParams.push(statusFilter);
      }

      if (sourceFilter && sourceFilter !== 'Todos') {
        candQuery += ' AND source = ?';
        candParams.push(sourceFilter);
      }

      const candidates = await db.prepare(candQuery).all(...candParams) as any[];

      // Fetch DISC for candidates
      for (const cand of candidates) {
        cand.disc = await db.prepare('SELECT predominant_profile FROM candidate_disc_results WHERE candidate_id = ?').get(cand.id);
      }

      // AI Matching Logic
      const ai = createGeminiClient();
      
      const candidatesToProcess = candidates.slice(0, 50); 

      const prompt = `
        VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© a Aurora AI, sistema de inteligÃƒÆ’Ã‚Âªncia de recrutamento.
        Sua tarefa ÃƒÆ’Ã‚Â© comparar uma lista de candidatos com uma vaga especÃƒÆ’Ã‚Â­fica.
        Avalie requisitos obrigatÃƒÆ’Ã‚Â³rios, desejÃƒÆ’Ã‚Â¡veis, experiÃƒÆ’Ã‚Âªncia, localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, modelo de trabalho, formaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, habilidades, DISC e critÃƒÆ’Ã‚Â©rios eliminatÃƒÆ’Ã‚Â³rios.
        
        Vaga:
        TÃƒÆ’Ã‚Â­tulo: ${job.title}
        Local: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Requisitos: ${job.mandatory_requirements}
        DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ${job.description}
        ExperiÃƒÆ’Ã‚Âªncia MÃƒÆ’Ã‚Â­nima: ${job.min_experience_years} anos
        
        ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Busca:
        PrecisÃƒÆ’Ã‚Â£o: ${precisionMode} (FlexÃƒÆ’Ã‚Â­vel, Equilibrada ou Rigorosa - siga o rigor solicitado)
        Raio Max DistÃƒÆ’Ã‚Â¢ncia: ${radius} km
        Regra LocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ${locationRule} (Peso dado ÃƒÆ’Ã‚Â  proximidade)
        
        Candidatos:
        ${candidatesToProcess.map(c => `ID: ${c.id}, Nome: ${c.full_name}, Local: ${c.city}/${c.state}, Exp: ${c.experience_years}y, Skills: ${c.hard_skills}, Modelo: ${c.desired_work_model}, DISC: ${c.disc?.predominant_profile || 'N/A'}`).join('\n')}
        
        Regras de NegÃƒÆ’Ã‚Â³cio:
        - Se Vaga Presencial, a localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© crÃƒÆ’Ã‚Â­tica.
        - Pontue de 0 a 100 baseando-se no FIT real.
        - 90-100: AltÃƒÆ’Ã‚Â­ssimo Fit, 80-89: Alto Fit, 70-79: Fit Moderado.
        
        Retorne APENAS um JSON:
        {
          "results": [
            {
              "candidate_id": number,
              "compatibility_score": number,
              "classification": string,
              "distance_km": number,
              "has_disc": boolean,
              "disc_profile": string,
              "strengths": string[],
              "attention_points": string[],
              "recommendation_reason": string,
              "risk_reason": string
            }
          ],
          "summary": string (resumo geral da busca)
        }
      `;

      const aiResult = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2600,
          reasoningEffort: 'low',
          operationLabel: 'match inteligente de vaga',
        }
      });

      const analysis = JSON.parse(aiResult.text || '{"results": [], "summary": ""}');
      
      // Save results
      const insertResultStmt = db.prepare(`
        INSERT INTO ai_search_results
        (session_id, candidate_id, job_id, compatibility_score, classification, distance_km, has_disc, disc_profile, strengths, attention_points, recommendation_reason, risk_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const resItem of analysis.results) {
        if (resItem.compatibility_score >= (minScore || 0)) {
          await insertResultStmt.run(
            sessionId,
            resItem.candidate_id,
            jobId,
            resItem.compatibility_score,
            resItem.classification,
            resItem.distance_km,
            resItem.has_disc ? 1 : 0,
            resItem.disc_profile || null,
            JSON.stringify(resItem.strengths),
            JSON.stringify(resItem.attention_points),
            resItem.recommendation_reason,
            resItem.risk_reason
          );
        }
      }

      // Update session summary
      await db.prepare('UPDATE ai_search_sessions SET summary = ? WHERE id = ?').run(analysis.summary, sessionId);

      res.json({ sessionId, summary: analysis.summary, results: analysis.results });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Match job failed' });
    }
  });

  app.post('/api/aurora-ai/chat', async (req, res) => {
    const { message, tenantId, unitId, sessionId } = req.body;
    let effectiveUnitId = unitId;
    let currentSessionId = sessionId;
    
    try {
      if (!message?.trim()) {
        return res.status(400).json({ error: 'Mensagem obrigatÃƒÆ’Ã‚Â³ria' });
      }

      const ai = createGeminiClient();
      const normalizedMessage = String(message).trim();
      const wantsDetailedReply = /(detalh|explic|complet|passo a passo|relat[oÃ³]rio|aprofund|an[aÃ¡]lise completa)/i.test(normalizedMessage);
      const wantsAction = /(cri(a|ar|e)|atualiz|modific|altera|remov|delet|exclu|abr(e|ir)|fech(a|ar)|reabr)/i.test(normalizedMessage);

      if (effectiveUnitId === 'master') {
        const masterUnit = await db.prepare('SELECT id FROM units WHERE tenant_id = ? AND is_master = 1 LIMIT 1').get(tenantId) as any;
        effectiveUnitId = masterUnit?.id || unitId;
      }

      // Fetch history for context
      if (!currentSessionId) {
        const sessionRes = await db.prepare('INSERT INTO ai_search_sessions (tenant_id, unit_id, search_type, created_at) VALUES (?, ?, "chat", CURRENT_TIMESTAMP)').run(tenantId, effectiveUnitId);
        currentSessionId = sessionRes.lastInsertRowid;
      }


      const history = await db.prepare('SELECT role, message FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(currentSessionId) as any[];
      const recentHistory = history.slice(-6);

      // Busca contexto do banco de dados para a IA
      let jobQuery = `SELECT id, title, city, status FROM jobs WHERE tenant_id = ? AND deleted_at IS NULL`;
      let jobParams: any[] = [tenantId];
      if (unitId !== 'master') {
        jobQuery += ` AND unit_id = ?`;
        jobParams.push(effectiveUnitId);
      }
      jobQuery += ` LIMIT 100`;
      const jobs = await db.prepare(jobQuery).all(...jobParams) as any[];
      const jobsList = jobs.map(j => `- Vaga #${j.id}: ${j.title} (${j.city || 'Remoto'}) | Status: ${j.status}`).join('\n');

      let candQuery = `SELECT id, full_name, desired_position, city, experience_years, hard_skills, status FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL`;
      let candParams: any[] = [tenantId];
      if (unitId !== 'master') {
        candQuery += ` AND unit_id = ?`;
        candParams.push(effectiveUnitId);
      }
      candQuery += ` LIMIT 100`;
      const candidates = await db.prepare(candQuery).all(...candParams) as any[];
      const candidatesList = candidates.map(c => `- Candidato #${c.id} ${c.full_name} | Cargo: ${c.desired_position || '-'} | Local: ${c.city || '-'} | Exp: ${c.experience_years || 0} anos | Skills: ${c.hard_skills?.substring(0, 50) || '-'} | Status: ${c.status}`).join('\n');

      const systemPrompt = `
        VocÃª Ã© a Aurora AI, assistente de recrutamento inteligente da Develoi.
        Sua missÃ£o Ã© responder perguntas do recrutador sobre o sistema, candidatos e vagas.
        Responda sempre em portuguÃªs do Brasil, de forma clara e profissional.
        
        Diretrizes:
        1. Baseie-se nos dados do sistema listados abaixo. NÃƒO invente candidatos ou vagas.
        2. Responda curto e direto por padrÃ£o.
        3. NÃ£o repita "Eu sou a Aurora" em toda mensagem.
        4. CRIAÃ‡ÃƒO DE VAGA:
           - Se o usuÃ¡rio pedir para criar uma vaga mas nÃ£o informar o tÃ­tulo, responda apenas: "Qual o tÃ­tulo da vaga e a cidade?"
           - Se o usuÃ¡rio fornecer dados da vaga, use SOMENTE os campos que ele explicitamente informou.
           - NUNCA invente campos como salÃ¡rio, benefÃ­cios, experiÃªncia ou qualquer informaÃ§Ã£o nÃ£o fornecida pelo usuÃ¡rio.
           - Campos permitidos no data: title, city, state, department, status, description, work_model, employment_type, mandatory_requirements, hard_skills.
           - Inclua apenas os campos que o usuÃ¡rio mencionou. Omita todos os outros.
           - SEMPRE escreva UMA frase curta de confirmaÃ§Ã£o ANTES do bloco <action>:
           Vaga criada como rascunho!
           <action>
           {"type":"create_job","data":{"title":"TÃ­tulo","city":"Cidade","status":"Rascunho"}}
           </action>
        5. Para atualizar vaga (apenas com campos que o usuÃ¡rio pediu alterar):
           Vaga atualizada!
           <action>
           {"type":"update_job","job_id":123,"data":{"status":"Aberta"}}
           </action>

        === VAGAS ===
        ${jobsList || 'Nenhuma vaga.'}

        === CANDIDATOS ===
        ${candidatesList || 'Nenhum candidato.'}
      `;

      const contents: AIMessage[] = [
        ...recentHistory.map((h) => ({
          role: (h.role === 'assistant' ? 'model' : 'user') as AIMessageRole,
          parts: [{ text: h.message }]
        })),
        { role: 'user', parts: [{ text: normalizedMessage }] }
      ];

      await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "user", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, effectiveUnitId, currentSessionId, normalizedMessage);

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents,
        config: {
          temperature: 0.4,
          maxOutputTokens: wantsDetailedReply ? 800 : wantsAction ? 500 : 300,
          reasoningEffort: 'low',
          verbosity: wantsDetailedReply ? 'medium' : 'low',
          instructions: systemPrompt,
          operationLabel: 'chat da Aurora',
        }
      });

      if (!result.text?.trim()) {
        console.warn('[Aurora AI] Modelo retornou resposta vazia. Usando fallback.');
        result.text = 'NÃ£o consegui processar sua solicitaÃ§Ã£o agora. Poderia reformular a pergunta?';
      }

      let responseText = normalizeAuroraChatReply(result.text) || 'Como posso ajudar?';
      
      // Parse potential action block
      const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
      let actionResultMsg = '';
      if (actionMatch) {
        try {
          const actionJson = JSON.parse(actionMatch[1].trim());
          if (actionJson.type === 'create_job') {
            const data = { ...actionJson.data, tenant_id: tenantId, unit_id: effectiveUnitId };
            const keys = Object.keys(data);
            const placeholders = keys.map(() => '?').join(',');
            const values = keys.map(k => data[k]);
            const res = await db.prepare(`INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(...values);
            actionResultMsg = `\n\n[SISTEMA: Vaga "${data.title || ''}" criada com sucesso! ID: #${res.lastInsertRowid}]`;
          } else if (actionJson.type === 'update_job' && actionJson.job_id) {
            const updates = [];
            const params = [];
            for (const [key, value] of Object.entries(actionJson.data)) {
              updates.push(`${key} = ?`);
              params.push(value);
            }
            if (updates.length > 0) {
              params.push(actionJson.job_id, tenantId);
              await db.prepare(`UPDATE jobs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`).run(...params);
              actionResultMsg = `\n\n[SISTEMA: Vaga #${actionJson.job_id} atualizada com sucesso!]`;
            }
          }
        } catch (e) {
          console.error("Action parse error", e);
        }
        responseText = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim() + actionResultMsg;
      }

      // Save assistant response
      await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "assistant", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, effectiveUnitId, currentSessionId, responseText);

      res.json({ message: responseText, sessionId: currentSessionId });
    } catch (error) {
      if (error instanceof GeminiTemporaryUnavailableError) {
        const fallbackMessage = 'A Aurora estÃ¡ com alta demanda no provedor de IA no momento. Tente novamente em alguns instantes.';

        if (currentSessionId) {
          await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "assistant", ?, CURRENT_TIMESTAMP)')
            .run(tenantId, effectiveUnitId, currentSessionId, fallbackMessage);
        }

        console.warn(`[Aurora AI] ${error.message}`);
        return res.json({ message: fallbackMessage, sessionId: currentSessionId });
      }

      console.error(error);
      res.status(500).json({ error: 'Chat failed' });
    }
  });

  app.get('/api/aurora-ai/sessions', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      const sessions = await db.prepare('SELECT * FROM ai_search_sessions WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // --- HR Tools Endpoints ---

  app.get('/api/hr-tools', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      let query = 'SELECT * FROM hr_tools WHERE tenant_id = ? AND deleted_at IS NULL';
      const params = [tenantId];
      if (unitId && unitId !== 'master') {
        query += ' AND unit_id = ?';
        params.push(unitId);
      }
      const tools = await db.prepare(query).all(...params);
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HR tools' });
    }
  });

  app.get('/api/hr-tools/dashboard', async (req, res) => {
    const { tenantId, unitId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    try {
      const unitFilter = unitId && unitId !== 'master' ? 'AND unit_id = ?' : '';
      const params = unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId];

      const totalSentRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? ${unitFilter}`).get(...params) as any;
      const totalSent = { count: Number(totalSentRaw?.count || 0) };

      const totalReceivedRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? AND status = 'Concluído' ${unitFilter}`).get(...params) as any;
      const totalReceived = { count: Number(totalReceivedRaw?.count || 0) };

      const candidatesWithDiscQuery = unitId && unitId !== 'master'
        ? 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ? AND c.unit_id = ?'
        : 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ?';
      const candidatesWithDiscRaw = await db.prepare(candidatesWithDiscQuery).get(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId])) as any;
      const candidatesWithDisc = { count: Number(candidatesWithDiscRaw?.count || 0) };

      const activeFormsRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tools WHERE tenant_id = ? AND status = 'Ativo' ${unitFilter}`).get(...params) as any;
      const activeForms = { count: Number(activeFormsRaw?.count || 0) };

      // DISC Distribution
      const discDistributionQuery = unitId && unitId !== 'master'
        ? `SELECT r.predominant_profile, COUNT(*) as count
           FROM candidate_disc_results r
           JOIN candidates c ON r.candidate_id = c.id
           WHERE c.tenant_id = ? AND c.unit_id = ?
           GROUP BY r.predominant_profile`
        : `SELECT r.predominant_profile, COUNT(*) as count
           FROM candidate_disc_results r
           JOIN candidates c ON r.candidate_id = c.id
           WHERE c.tenant_id = ?
           GROUP BY r.predominant_profile`;
      const discDistribution = (await db.prepare(discDistributionQuery).all(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId])))
        .map((d: any) => ({ ...d, count: Number(d.count || 0) }));

      // Tool usage
      const toolUsage = await db.prepare(`
        SELECT t.name, COUNT(r.id) as count
        FROM hr_tools t
        LEFT JOIN hr_tool_responses r ON t.id = r.tool_id
        WHERE t.tenant_id = ? ${unitFilter.replace('unit_id', 't.unit_id')}
        GROUP BY t.id
      `).all(...params);

      // Status funnel
      const statusFunnel = await db.prepare(`
        SELECT status, COUNT(*) as count
        FROM hr_tool_responses
        WHERE tenant_id = ? ${unitFilter}
        GROUP BY status
      `).all(...params);

      res.json({
        indicators: {
          sent: totalSent.count || 0,
          received: totalReceived.count || 0,
          completionRate: (totalSent.count || 0) > 0 ? Math.round(((totalReceived.count || 0) / (totalSent.count || 1)) * 100) : 0,
          discCount: candidatesWithDisc.count || 0,
          activeForms: activeForms.count || 0
        },
        charts: {
          disc: discDistribution || [],
          usage: toolUsage || [],
          funnel: statusFunnel || []
        }
      });
    } catch (error: any) {
      console.error('HR Dashboard Error:', error);
      res.status(500).json({ error: 'Failed to fetch HR dashboard data', details: error.message });
    }
  });

  app.get('/api/hr-tools/:id', async (req, res) => {
    try {
      const tool = await db.prepare('SELECT * FROM hr_tools WHERE id = ?').get(req.params.id);
      const questions = await db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all(req.params.id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool details' });
    }
  });

  app.post('/api/hr-tools', async (req, res) => {
    const { tenant_id, unit_id, name, type, description, questions } = req.body;
    try {
      const slug = name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(2, 7);

      const toolInsert = await db.prepare(`
        INSERT INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Ativo')
      `).run(tenant_id, unit_id, name, type, description, slug);

      const toolId = toolInsert.lastInsertRowid;

      if (questions && Array.isArray(questions)) {
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx];
          await db.prepare(`
            INSERT INTO hr_tool_questions (tool_id, question_text, question_type, is_required, is_eliminatory, expected_answer, options_json, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            toolId,
            q.question_text,
            q.question_type,
            q.is_required ? 1 : 0,
            q.is_eliminatory ? 1 : 0,
            q.expected_answer,
            q.options_json ? JSON.stringify(q.options_json) : null,
            idx
          );
        }
      }

      res.json({ id: toolId, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create tool' });
    }
  });

  app.delete('/api/hr-tools/:id', async (req, res) => {
    try {
      await db.prepare('DELETE FROM hr_tool_answers WHERE response_id IN (SELECT id FROM hr_tool_responses WHERE tool_id = ?)').run(req.params.id);
      await db.prepare('DELETE FROM hr_tool_responses WHERE tool_id = ?').run(req.params.id);
      await db.prepare('DELETE FROM hr_tool_questions WHERE tool_id = ?').run(req.params.id);
      await db.prepare('DELETE FROM hr_tools WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete tool' });
    }
  });

  app.get('/api/hr-tools/all/responses', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      let query = `
        SELECT r.*, c.full_name as candidate_name, j.title as job_title, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE t.tenant_id = ?
      `;
      const params = [tenantId];

      if (unitId && unitId !== 'master') {
        query += ' AND r.unit_id = ?';
        params.push(unitId);
      }

      query += ' ORDER BY r.created_at DESC';

      const responses = await db.prepare(query).all(...params);
      res.json(responses);
    } catch (error) {
       console.error(error);
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.get('/api/hr-tools/responses/:responseId', async (req, res) => {
    try {
      const response = await db.prepare(`
        SELECT r.*, c.full_name as candidate_name, c.email as candidate_email, j.title as job_title, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.id = ?
      `).get(req.params.responseId) as any;

      if (!response) return res.status(404).json({ error: 'Response not found' });

      const answers = await db.prepare(`
        SELECT a.*, q.question_text, q.question_type
        FROM hr_tool_answers a
        JOIN hr_tool_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
        ORDER BY q.position ASC
      `).all(req.params.responseId);

      res.json({ ...response, answers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch response details' });
    }
  });


  app.get('/api/hr-tools/:id/responses', (req, res) => {
    try {
      const responses = db.prepare(`
        SELECT r.*, c.full_name as candidate_name, j.title as job_title
        FROM hr_tool_responses r
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.tool_id = ?
        ORDER BY r.created_at DESC
      `).all(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.post('/api/hr-tools/responses/:responseId/analyze', async (req, res) => {
    try {
      const responseId = req.params.responseId;
      const response = await db.prepare(`
        SELECT r.*, t.name as tool_name, t.description as tool_description, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.id = ?
      `).get(responseId) as any;

      if (!response) return res.status(404).json({ error: 'Response not found' });

      const answers = await db.prepare(`
        SELECT a.*, q.question_text, q.question_type
        FROM hr_tool_answers a
        JOIN hr_tool_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
      `).all(responseId) as any[];

      const candidate = response.candidate_id ? await db.prepare('SELECT * FROM candidates WHERE id = ?').get(response.candidate_id) as any : null;
      const isDisc = response.tool_name.toLowerCase().includes('disc') || (response.tool_type && response.tool_type.toLowerCase().includes('disc'));

      const ai = createGeminiClient();
      
      const prompt = `
        Você é Aurora, especialista sênior em Recrutamento e Seleção. 
        Analise as respostas do formulário "${response.tool_name}" para o candidato ${candidate?.full_name || 'Anônimo'}.
        
        RESPOSTAS:
        ${answers.map(a => `Pergunta: ${a.question_text}\nResposta: ${a.answer_text}`).join('\n\n')}
        
        ${isDisc ? `Como esta é uma avaliação DISC, você DEVE calcular e retornar as pontuações para os 4 perfis:
        - Dominância (D): Foco em resultados, rapidez, competitividade.
        - Influência (I): Foco em pessoas, comunicação, otimismo.
        - Estabilidade (S): Foco em colaboração, persistência, ritmo constante.
        - Conformidade (C): Foco em detalhes, precisão, regras.` : ''}

        Gere um parecer profissional estruturado em JSON:
        {
          "summary": "Resumo executivo do perfil (máx 60 palavras)",
          "score_estimate": number (0-100),
          "recommendation": "Prosseguir" | "Atenção" | "Reprovar",
          "strengths": string[],
          "attention_points": string[],
          "suggested_questions": string[],
          ${isDisc ? `"disc_scores": { "D": number, "I": number, "S": number, "C": number }, "predominant_profile": "D" | "I" | "S" | "C"` : ''}
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1500,
          reasoningEffort: 'low',
          operationLabel: 'parecer estruturado de ferramenta RH',
        }
      });

      const analysis = JSON.parse(result.text || '{}');

      await db.prepare(`
        UPDATE hr_tool_responses 
        SET ai_summary = ?, ai_analysis_json = ?, score = ?, classification = ?, status = 'Concluído', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(analysis.summary, result.text, analysis.score_estimate, analysis.recommendation, responseId);

      // Persistência DISC
      if (isDisc && analysis.disc_scores) {
        try {
          await db.prepare(`
            INSERT INTO candidate_disc_results (candidate_id, response_id, predominant_profile, d_score, i_score, s_score, c_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(response_id) DO UPDATE SET
              predominant_profile = excluded.predominant_profile,
              d_score = excluded.d_score,
              i_score = excluded.i_score,
              s_score = excluded.s_score,
              c_score = excluded.c_score
          `).run(
            response.candidate_id,
            responseId,
            analysis.predominant_profile || '?',
            analysis.disc_scores.D || 0,
            analysis.disc_scores.I || 0,
            analysis.disc_scores.S || 0,
            analysis.disc_scores.C || 0
          );
        } catch (e) {
          console.error('DISC Save Error:', e);
        }
      }

      res.json({ success: true, analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  app.get('/api/candidates/:id/hr-tools', async (req, res) => {
    try {
      const evaluations = await db.prepare(`
        SELECT r.*, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.candidate_id = ?
        ORDER BY r.created_at DESC
      `).all(req.params.id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate tools' });
    }
  });

  // --- Public Tool Endpoints ---

  app.get('/api/public/tenants/:id', async (req, res) => {
    try {
      const tenant = await db.prepare('SELECT id, name, company_name, email, phone FROM tenants WHERE id = ?').get(req.params.id) as any;
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant info' });
    }
  });

  app.get('/api/public/hr-tools/:slug', async (req, res) => {
    try {
      const tool = await db.prepare("SELECT h.*, t.name as tenant_name, t.company_name, t.logo_url FROM hr_tools h JOIN tenants t ON h.tenant_id = t.id WHERE h.public_slug = ? AND h.status = 'Ativo'").get(req.params.slug);
      if (!tool) return res.status(404).json({ error: 'Tool not found or inactive' });

      const questions = await db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all((tool as any).id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool' });
    }
  });

  app.post('/api/public/hr-tools/:slug/submit', async (req, res) => {
    const { candidateInfo, answers, jobId } = req.body;
    const { slug } = req.params;

    try {
      const tool = await db.prepare('SELECT * FROM hr_tools WHERE public_slug = ?').get(slug) as any;
      if (!tool) return res.status(404).json({ error: 'Tool not found' });

      // 1. Find or create candidate
      let candidateId: number | bigint | any;
      const existingCandidate = await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(candidateInfo.email, tool.tenant_id) as any;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        const newCandRes = await db.prepare(`
          INSERT INTO candidates (tenant_id, unit_id, full_name, email, phone, source, status)
          VALUES (?, ?, ?, ?, ?, 'Ferramenta RH', 'Novo')
        `).run(tool.tenant_id, tool.unit_id, candidateInfo.full_name, candidateInfo.email, candidateInfo.phone);
        candidateId = newCandRes.lastInsertRowid;
      }

      // 2. Create response
      const responseRes = await db.prepare(`
        INSERT INTO hr_tool_responses (tenant_id, unit_id, tool_id, candidate_id, job_id, status, completed_at)
        VALUES (?, ?, ?, ?, ?, 'Concluído', CURRENT_TIMESTAMP)
      `).run(tool.tenant_id, tool.unit_id, tool.id, candidateId, jobId || null);

      const responseId = responseRes.lastInsertRowid;

      // 3. Save answers
      for (const ans of answers) {
        await db.prepare(`
          INSERT INTO hr_tool_answers (response_id, question_id, answer_text, answer_json)
          VALUES (?, ?, ?, ?)
        `).run(
          responseId,
          ans.question_id,
          typeof ans.value === 'object' ? null : String(ans.value),
          typeof ans.value === 'object' ? JSON.stringify(ans.value) : null
        );
      }

      // 4. If it's a DISC tool, process DISC logic (simplified for demo)
      if (tool.type === 'DISC') {
        const profiles = ['DominÃƒÆ’Ã‚Â¢ncia', 'InfluÃƒÆ’Ã‚Âªncia', 'Estabilidade', 'Conformidade'];
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

        await db.prepare(`
          INSERT INTO candidate_disc_results (
            candidate_id, predominant_profile, behavioral_summary, created_at, updated_at
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          candidateId,
          randomProfile,
          `Perfil ${randomProfile} identificado via Ferramenta de RH.`
        );

        // Log in history
        await db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description) VALUES (?, "ASSESSMENT", "DISC Concluído", ?)')
          .run(candidateId, `Candidato concluiu a avaliação DISC: ${randomProfile}`);
      }

      res.json({ success: true, responseId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Submission failed' });
    }
  });

  // --- Mass Import Endpoints ---

  app.get('/api/imports/dashboard', async (req, res) => {
    const { tenantId } = req.query;
    try {
      const stats = await db.prepare(`
        SELECT
          SUM(total_files) as total_files,
          SUM(processed_files) as processed_files,
          SUM(created_candidates) as created_candidates,
          SUM(duplicate_files) as duplicate_files,
          SUM(error_files) as error_files
        FROM import_batches
        WHERE tenant_id = ?
      `).get(tenantId) as any;

      const monthlyTrend = await db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(total_files) as files
        FROM import_batches
        WHERE tenant_id = ?
        GROUP BY month
        LIMIT 6
      `).all(tenantId);

      res.json({ stats, monthlyTrend });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import dashboard stats' });
    }
  });

  app.get('/api/imports/capacity', async (_req, res) => {
    res.json(getCandidateBatchImportCapacity());
  });

  app.get('/api/imports', async (req, res) => {
    const { tenantId } = req.query;
    try {
      const batches = await db.prepare(`
        SELECT b.*, j.title as job_title
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.tenant_id = ?
        ORDER BY b.created_at DESC
      `).all(tenantId);
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch imports' });
    }
  });

  app.post('/api/imports', async (req, res) => {
    const { tenant_id, unit_id, name, job_id, import_type, analysis_mode, precision_mode, compatibility_threshold, duplicate_strategy } = req.body;
    try {
      const result = await db.prepare(`
        INSERT INTO import_batches (
          tenant_id, unit_id, name, job_id, import_type, analysis_mode,
          precision_mode, compatibility_threshold, duplicate_strategy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        tenant_id, unit_id, name || `Lote ${new Date().toLocaleDateString()}`,
        job_id || null, import_type || 'mixed', analysis_mode || 'full',
        precision_mode || 'Equilibrada', compatibility_threshold || 70, duplicate_strategy || 'manual'
      );
      res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create import batch' });
    }
  });

  app.get('/api/imports/:id', async (req, res) => {
    try {
      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(req.params.id);

      const files = await db.prepare('SELECT * FROM import_files WHERE batch_id = ?').all(req.params.id);
      
      res.json({ ...batch as any, files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch batch details' });
    }
  });

  app.post('/api/imports/:id/files', (req, res) => {
    candidateBatchUpload.array('files', CANDIDATE_BATCH_IMPORT_MAX_FILES)(req, res, async (uploadError: any) => {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `Cada currÃ­culo pode ter atÃ© ${bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES)} MB.`,
          });
        }

        if (uploadError.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: `Cada lote aceita atÃ© ${CANDIDATE_BATCH_IMPORT_MAX_FILES} currÃ­culos.`,
          });
        }

        return res.status(400).json({ error: uploadError.message });
      }

      if (uploadError) {
        return res.status(400).json({ error: uploadError.message || 'Falha ao validar arquivos do lote.' });
      }

      try {
        const batchId = req.params.id;
        const batch = await db.prepare('SELECT id, tenant_id, unit_id, total_files FROM import_batches WHERE id = ?').get(batchId) as any;
        const files = (req.files as any[]) || [];

        if (!batch) {
          return res.status(404).json({ error: 'Batch not found' });
        }

        if (files.length === 0) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const existingFilesCount = Number(batch.total_files || 0);
        const existingSizeRow = await db.prepare('SELECT COALESCE(SUM(file_size), 0) as total_size FROM import_files WHERE batch_id = ?').get(batchId) as any;
        if (existingFilesCount + files.length > CANDIDATE_BATCH_IMPORT_MAX_FILES) {
          return res.status(400).json({
            error: `O lote pode conter no mÃ¡ximo ${CANDIDATE_BATCH_IMPORT_MAX_FILES} currÃ­culos.`,
          });
        }

        const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
        const cumulativeBytes = Number(existingSizeRow?.total_size || 0) + totalBytes;
        if (cumulativeBytes > CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES) {
          return res.status(400).json({
            error: `O lote pode acumular atÃ© ${bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES)} MB no total.`,
          });
        }

        for (const file of files) {
          const filePath = await saveImportedResumeFile(batchId, batch.tenant_id, file);
          await db.prepare(`
            INSERT INTO import_files (batch_id, tenant_id, unit_id, file_name, file_path, file_type, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded')
          `).run(batchId, batch.tenant_id, batch.unit_id, file.originalname, filePath, file.mimetype, file.size);
        }

        await db.prepare('UPDATE import_batches SET total_files = total_files + ? WHERE id = ?').run(files.length, batchId);

        res.json({
          success: true,
          capacity: getCandidateBatchImportCapacity(),
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add files to batch' });
      }
    });
  });

  app.post('/api/imports/:id/start', async (req, res) => {
    const batchId = req.params.id;
    try {
      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(batchId) as any;

      const files = await db.prepare("SELECT * FROM import_files WHERE batch_id = ? AND status = 'uploaded'").all(batchId) as any[];

      await db.prepare("UPDATE import_batches SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);

      // Responder imediatamente para nÃ£o travar o cliente/servidor
      res.json({ success: true, message: 'Processamento iniciado em segundo plano' });

      // Processamento em Background
      (async () => {
        const ai = createGeminiClient();

        try {
          for (const file of files) {
            try {
              await db.prepare("UPDATE import_files SET status = 'processing', progress = 10, duplicate_status = 'none', duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?").run(file.id);

              const extractedText = await extractResumeTextFromStoredFile(file);
              
              const prompt = buildStructuredResumeBatchPrompt(extractedText, {
                job_title: batch.job_title,
                job_description: batch.job_description,
              });

              try {
                const aiResult = await ai.models.generateContent({
                  model: GEMINI_MODEL,
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  config: {
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                    maxOutputTokens: 2600,
                    reasoningEffort: 'low',
                    operationLabel: 'pré-análise em lote',
                  }
                });
                
                const data = normalizeResumeParsedData(
                  parseJsonFromAiResponseSafe(aiResult.text || '{}'),
                  Boolean(batch.job_title || batch.job_description)
                );

                const existing = data.email
                  ? await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(data.email, batch.tenant_id) as any
                  : null;
                
                let status = 'completed';
                let duplicateStatus = 'none';
                let duplicateCandidateId = null;

                if (existing) {
                  status = 'duplicate';
                  duplicateStatus = 'email';
                  duplicateCandidateId = existing.id;
                }

                await db.prepare(`
                  UPDATE import_files
                  SET status = ?,
                      progress = 100,
                      extracted_text = ?,
                      parsed_data_json = ?,
                      ai_summary = ?,
                      duplicate_status = ?,
                      duplicate_candidate_id = ?,
                      compatibility_score = ?,
                      compatibility_classification = ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(
                  status,
                  extractedText,
                  JSON.stringify(data),
                  data.summary,
                  duplicateStatus,
                  duplicateCandidateId,
                  data.compatibility_score,
                  data.recommendation,
                  file.id
                );

                await db.prepare(`
                  UPDATE import_batches
                  SET processed_files = processed_files + 1,
                      duplicate_files = duplicate_files + ${duplicateStatus !== 'none' ? 1 : 0},
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(batchId);

              } catch (err: any) {
                console.error(`AI Error for file ${file.id}:`, err);
                await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(err.message || String(err), file.id);
                await db.prepare('UPDATE import_batches SET error_files = error_files + 1 WHERE id = ?').run(batchId);
                // Also increment processed_files so the batch can complete
                await db.prepare('UPDATE import_batches SET processed_files = processed_files + 1 WHERE id = ?').run(batchId);
              }
            } catch (err) {
              console.error(`Error extraction for file ${file.id}:`, err);
              await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(String(err), file.id);
              await db.prepare('UPDATE import_batches SET processed_files = processed_files + 1, error_files = error_files + 1 WHERE id = ?').run(batchId);
            }
          }
        } catch (criticalError) {
          console.error("Critical background processing error:", criticalError);
        } finally {
          await db.prepare("UPDATE import_batches SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);
        }
      })().catch(err => console.error("Critical background error:", err));

    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start processing' });
      }
    }
  });

  app.post('/api/imports/files/:id/reprocess', async (req, res) => {
    const fileId = req.params.id;
    try {
      const file = await db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(file.batch_id) as any;

      await db.prepare("UPDATE import_files SET status = 'uploaded' WHERE id = ?").run(fileId);

      // Reuse logic from /start but for just one file
      // In a real app we'd extract this to a service function
      res.json({ success: true, message: 'Reprocessamento iniciado' });

      // Background process com prÃƒÆ’Ã‚Â©-anÃƒÆ’Ã‚Â¡lise real
      (async () => {
        const ai = createGeminiClient();
        await db.prepare("UPDATE import_files SET status = 'processing', progress = 10, duplicate_status = 'none', duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?").run(fileId);

        const extractedText = await extractResumeTextFromStoredFile(file);
        let prompt = `
          Extraia somente os dados realmente presentes no currÃƒÆ’Ã‚Â­culo abaixo.
          Se um campo nÃƒÆ’Ã‚Â£o existir, retorne null ou [].
          NÃƒÆ’Ã‚Â£o invente informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.

          CurrÃƒÆ’Ã‚Â­culo:
          ${extractedText}

          Vaga:
          ${batch.job_title || 'Nenhuma'}

          Retorne apenas JSON com os campos:
          name, email, phone, city, state, role, summary, experience_years, skills,
          education_level, languages, linkedin_url, portfolio_url,
          compatibility_score, recommendation, strengths, attention_points.
        `;
        prompt = buildStructuredResumeBatchPrompt(extractedText, {
          job_title: batch.job_title,
          job_description: batch.job_description,
        });

        try {
          const aiResult = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 2600,
              reasoningEffort: 'low',
              operationLabel: 'reprocessamento de prÃ©-anÃ¡lise',
            }
          });
          const data = normalizeResumeParsedData(
            parseJsonFromAiResponseSafe(aiResult.text || '{}'),
            Boolean(batch.job_title || batch.job_description)
          );

          const existing = data.email
            ? await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(data.email, batch.tenant_id) as any
            : null;
          let status = 'completed';
          let duplicateStatus = 'none';
          let duplicateCandidateId = null;

          if (existing) {
            status = 'duplicate';
            duplicateStatus = 'email';
            duplicateCandidateId = existing.id;
          }

          await db.prepare(`
            UPDATE import_files
            SET status = ?, progress = 100, extracted_text = ?, parsed_data_json = ?, ai_summary = ?,
                duplicate_status = ?, duplicate_candidate_id = ?, compatibility_score = ?, compatibility_classification = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            status,
            extractedText,
            JSON.stringify(data),
            data.summary,
            duplicateStatus,
            duplicateCandidateId,
            data.compatibility_score,
            data.recommendation,
            fileId
          );

          await db.prepare("UPDATE import_batches SET processed_files = (SELECT COUNT(*) FROM import_files WHERE batch_id = ? AND status IN ('completed', 'duplicate', 'error')), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(file.batch_id, file.batch_id);
        } catch (err: any) {
          await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(err.message, fileId);
        }
      })();

    } catch (error) {
      res.status(500).json({ error: 'Failed to reprocess file' });
    }
  });

  app.delete('/api/imports/files/:id', async (req, res) => {
    const fileId = req.params.id;
    try {
      const file = await db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      if (file.file_path && fs.existsSync(file.file_path)) {
        await fs.promises.unlink(file.file_path);
      }

      await db.prepare('DELETE FROM import_files WHERE id = ?').run(fileId);
      await db.prepare('UPDATE import_batches SET total_files = total_files - 1 WHERE id = ?').run(file.batch_id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.delete('/api/imports/:id', async (req, res) => {
    const batchId = req.params.id;
    try {
      const batch = await db.prepare('SELECT tenant_id FROM import_batches WHERE id = ?').get(batchId) as any;
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      // Get all files to delete them physically
      const files = await db.prepare('SELECT file_path FROM import_files WHERE batch_id = ?').all(batchId) as any[];
      for (const file of files) {
        if (file.file_path && fs.existsSync(file.file_path)) {
          await fs.promises.unlink(file.file_path).catch(() => {});
        }
      }

      // Delete batch directory
      const batchDir = path.join(IMPORT_UPLOADS_DIR, batch.tenant_id, String(batchId));
      if (fs.existsSync(batchDir)) {
        await fs.promises.rm(batchDir, { recursive: true, force: true }).catch(() => {});
      }

      await db.prepare('DELETE FROM import_files WHERE batch_id = ?').run(batchId);
      await db.prepare('DELETE FROM import_batches WHERE id = ?').run(batchId);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete batch' });
    }
  });

  app.patch('/api/imports/files/:id', async (req, res) => {
    const { id } = req.params;
    const { parsed_data_json } = req.body;
    try {
      await db.prepare('UPDATE import_files SET parsed_data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(parsed_data_json, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update file data' });
    }
  });

  // AI Job Suggestion for Imports
  app.post('/api/ai/match-jobs', async (req, res) => {
    const { candidateProfile, tenantId } = req.body;
    try {
      const activeJobs = await db.prepare("SELECT id, title, description, city, state FROM jobs WHERE tenant_id = ? AND status = 'Aberta'").all(tenantId) as any[];
      
      if (activeJobs.length === 0) return res.json({ suggestions: [] });

      const ai = createGeminiClient();

      const prompt = `
        OlÃƒÆ’Ã‚Â¡, eu sou Aurora, a InteligÃƒÆ’Ã‚Âªncia Artificial especialista em talentos da Develoi.
        Minha missÃƒÆ’Ã‚Â£o hoje ÃƒÆ’Ã‚Â© analisar o perfil do candidato abaixo e encontrar as melhores oportunidades entre nossas vagas abertas.
        
        PERFIL DO CANDIDATO:
        ${JSON.stringify(candidateProfile)}

        VAGAS DISPONÃƒÆ’Ã‚ÂVEIS:
        ${JSON.stringify(activeJobs)}

        Por favor, selecione as vagas com maior afinidade (mÃƒÆ’Ã‚Â­nimo de 60%) e justifique brevemente sua escolha.
        Retorne APENAS o JSON no seguinte formato:
        {
          "suggestions": [
            { "job_id": number, "match_reason": "breve justificativa (mÃƒÆ’Ã‚Â¡x 15 palavras)", "score": number (0-100) }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 900,
          reasoningEffort: 'low',
          operationLabel: 'sugestÃ£o de vagas por IA',
        }
      });

      const text = response.text || "{}";
      const match = text.match(/\{[\s\S]*\}/);
      const data = match ? JSON.parse(match[0]) : { suggestions: [] };

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI matching failed' });
    }
  });

  app.post('/api/imports/:id/commit', async (req, res) => {
    const batchId = req.params.id;
    try {
      const files = await db.prepare("SELECT * FROM import_files WHERE batch_id = ? AND status IN ('completed', 'duplicate')").all(batchId) as any[];
      const batch = await db.prepare('SELECT * FROM import_batches WHERE id = ?').get(batchId) as any;

      console.log(`Starting commit for batch ${batchId}. Files found to commit: ${files.length}`);
      for (const file of files) {
        try {
          console.log(`Processing commit for file ${file.id}: ${file.file_name}`);
          if (!file.parsed_data_json) {
            console.warn(`File ${file.id} has no parsed data, skipping.`);
            continue;
          }
          const data = JSON.parse(file.parsed_data_json);
        const hardSkillsText = Array.isArray(data.skills) ? data.skills.join(', ') : null;
        const softSkillsText = Array.isArray(data.soft_skills) ? data.soft_skills.join(', ') : null;
        const languagesText = Array.isArray(data.languages) ? data.languages.join(', ') : null;
        const experiencesJson = stringifyStructuredListOrNull(data.experiences_list);
        const educationJson = stringifyStructuredListOrNull(data.education_list);
        const certificationsJson = stringifyStructuredListOrNull(data.certifications_list);
        const projectsJson = stringifyStructuredListOrNull(data.projects_list);
        const languagesJson = stringifyStructuredListOrNull(data.languages_list);
        const hardSkillsJson = stringifyStructuredListOrNull(data.skills);
        const softSkillsJson = stringifyStructuredListOrNull(data.soft_skills);
        const objectivesJson = stringifyStructuredListOrNull(data.objectives_list);

        if (file.status === 'completed') {
          if (!data?.name || !data?.email) {
            await db.prepare(`
              UPDATE import_files
              SET error_message = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run('Revisar prÃƒÆ’Ã‚Â©-anÃƒÆ’Ã‚Â¡lise: nome e e-mail sÃƒÆ’Ã‚Â£o obrigatÃƒÆ’Ã‚Â³rios para concluir o cadastro.', file.id);
            continue;
          }

          const importNotes = buildCandidateImportNotes(data);

          // Create new candidate
          const candRes = await db.prepare(`
            INSERT INTO candidates (
              tenant_id, unit_id, full_name, email, phone, city, state,
              desired_position, professional_summary, experience_years, hard_skills,
              education_level, languages, linkedin_url, portfolio_url, source, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ImportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em Massa', 'Novo')
          `).run(
            file.tenant_id, file.unit_id, data.name, data.email, data.phone, data.city, data.state,
            data.role,
            data.summary,
            data.experience_years,
            hardSkillsText,
            data.education_level,
            languagesText,
            data.linkedin_url,
            data.portfolio_url
          );

          const candId = candRes.lastInsertRowid;

          await db.prepare(`
            UPDATE candidates
            SET cpf = ?,
                birth_date = ?,
                address = ?,
                desired_area = ?,
                desired_salary = ?,
                professional_experiences = ?,
                academic_education = ?,
                courses_certifications = ?,
                soft_skills = ?,
                experiences_json = ?,
                education_json = ?,
                certifications_json = ?,
                projects_json = ?,
                languages_json = ?,
                hard_skills_json = ?,
                soft_skills_json = ?,
                objectives_json = ?,
                has_cnh = ?,
                cnh_category = ?,
                available_to_travel = ?,
                available_to_relocate = ?,
                desired_work_model = ?,
                desired_contract_type = ?,
                internal_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            data.cpf,
            data.birth_date,
            data.address,
            data.desired_area,
            data.desired_salary,
            data.professional_experiences,
            data.academic_education,
            data.courses_certifications,
            softSkillsText,
            experiencesJson,
            educationJson,
            certificationsJson,
            projectsJson,
            languagesJson,
            hardSkillsJson,
            softSkillsJson,
            objectivesJson,
            data.has_cnh === null ? false : Boolean(data.has_cnh),
            data.cnh_category,
            data.available_to_travel === null ? false : Boolean(data.available_to_travel),
            data.available_to_relocate === null ? false : Boolean(data.available_to_relocate),
            data.desired_work_model,
            data.desired_contract_type,
            importNotes,
            candId
          );

          await attachImportedResumeToCandidate(candId, file);

          // Link to job if batch has job
          if (batch.job_id) {
            await db.prepare(`
              INSERT INTO candidate_job_matches (candidate_id, job_id, compatibility_score, classification, status)
              VALUES (?, ?, ?, ?, 'Triagem')
            `).run(candId, batch.job_id, file.compatibility_score, file.compatibility_classification);
          }

          // AUTO-TOOLING INTEGRATION: Send tool if selected
          const autoToolId = req.body.autoToolId;
          if (autoToolId && autoToolId !== 'none') {
            await db.prepare(`
              INSERT INTO hr_tool_responses (tool_id, candidate_id, tenant_id, status)
              VALUES (?, ?, ?, 'Pendente')
            `).run(autoToolId, candId, file.tenant_id);
          }

          await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(candId, file.id);
          await db.prepare('UPDATE import_batches SET created_candidates = created_candidates + 1 WHERE id = ?').run(batchId);
        }
        else if (file.status === 'duplicate' && batch.duplicate_strategy === 'update') {
          // Update existing
          await db.prepare(`
            UPDATE candidates
            SET full_name = ?, phone = ?, city = ?, state = ?, professional_summary = ?,
                desired_position = ?, experience_years = ?, hard_skills = ?, education_level = ?,
                languages = ?, linkedin_url = ?, portfolio_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            data.name,
            data.phone,
            data.city,
            data.state,
            data.summary,
            data.role,
            data.experience_years,
            hardSkillsText,
            data.education_level,
            languagesText,
            data.linkedin_url,
            data.portfolio_url,
            file.duplicate_candidate_id
          );

          await db.prepare(`
            UPDATE candidates
            SET cpf = COALESCE(?, cpf),
                birth_date = COALESCE(?, birth_date),
                address = COALESCE(?, address),
                desired_area = COALESCE(?, desired_area),
                desired_salary = COALESCE(?, desired_salary),
                professional_experiences = COALESCE(?, professional_experiences),
                academic_education = COALESCE(?, academic_education),
                courses_certifications = COALESCE(?, courses_certifications),
                soft_skills = COALESCE(?, soft_skills),
                experiences_json = COALESCE(?, experiences_json),
                education_json = COALESCE(?, education_json),
                certifications_json = COALESCE(?, certifications_json),
                projects_json = COALESCE(?, projects_json),
                languages_json = COALESCE(?, languages_json),
                hard_skills_json = COALESCE(?, hard_skills_json),
                soft_skills_json = COALESCE(?, soft_skills_json),
                objectives_json = COALESCE(?, objectives_json),
                has_cnh = COALESCE(?, has_cnh),
                cnh_category = COALESCE(?, cnh_category),
                available_to_travel = COALESCE(?, available_to_travel),
                available_to_relocate = COALESCE(?, available_to_relocate),
                desired_work_model = COALESCE(?, desired_work_model),
                desired_contract_type = COALESCE(?, desired_contract_type),
                internal_notes = COALESCE(?, internal_notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            data.cpf,
            data.birth_date,
            data.address,
            data.desired_area,
            data.desired_salary,
            data.professional_experiences,
            data.academic_education,
            data.courses_certifications,
            softSkillsText,
            experiencesJson,
            educationJson,
            certificationsJson,
            projectsJson,
            languagesJson,
            hardSkillsJson,
            softSkillsJson,
            objectivesJson,
            data.has_cnh,
            data.cnh_category,
            data.available_to_travel,
            data.available_to_relocate,
            data.desired_work_model,
            data.desired_contract_type,
            buildCandidateImportNotes(data),
            file.duplicate_candidate_id
          );

          await attachImportedResumeToCandidate(file.duplicate_candidate_id, file);

          await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(file.duplicate_candidate_id, file.id);
          await db.prepare('UPDATE import_batches SET updated_candidates = updated_candidates + 1 WHERE id = ?').run(batchId);
        }
      } catch (fileError) {
          console.error(`Error committing file ${file.id}:`, fileError);
          await db.prepare('UPDATE import_files SET error_message = ? WHERE id = ?').run(String(fileError), file.id);
        }
      }

      // Update batch status to committed
      await db.prepare("UPDATE import_batches SET status = 'committed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Commit failed' });
    }
  });

  // --- Tenants Management (SuperAdmin only) ---
  app.get('/api/tenants', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can view tenants' });
    }
    try {
      const tenants = await db.prepare(`
        SELECT
          t.*,
          COUNT(u.id) as total_users,
          SUM(CASE WHEN u.status = 'Ativo' THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN u.role = 'admin' THEN 1 ELSE 0 END) as admin_users,
          MAX(u.last_login) as last_login
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id
        GROUP BY t.id
        ORDER BY datetime(t.created_at) DESC
      `).all() as any[];

      res.json(
        tenants.map((tenant) => ({
          ...tenant,
          total_users: Number(tenant.total_users || 0),
          active_users: Number(tenant.active_users || 0),
          admin_users: Number(tenant.admin_users || 0),
          validity_days: Number(tenant.validity_days || 30),
          max_users: Number(tenant.max_users || 0),
          contract_status: getTenantContractStatus(tenant.expires_at, tenant.status),
        }))
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  });

  app.post('/api/tenants/provision', async (req, res) => {
    const {
      name,
      document,
      responsible_name,
      email,
      password,
      phone,
      validity_days,
      plan_label,
      max_users,
      access_profile,
      permissions_json,
    } = req.body;
    try {
      const tenantId = name.toLowerCase().replace(/\s+/g, '-').substring(0, 15) + '-' + Math.random().toString(36).substr(2, 4);
      const validityDays = Math.max(1, Number(validity_days || 30));
      const startsAt = toSqlDateTime(new Date());
      const expiresAt = toSqlDateTime(addDays(startsAt, validityDays));
      const accessProfile = access_profile || 'rh-operacao';

      // 1. Create Tenant
      await db.prepare(`
        INSERT INTO tenants (
          id, name, document, status, plan_label, validity_days, starts_at, expires_at, max_users, access_profile
        ) VALUES (?, ?, ?, 'Ativo', ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        name,
        document || '',
        plan_label || getPlanLabel(validityDays),
        validityDays,
        startsAt,
        expiresAt,
        Number(max_users || 3),
        accessProfile
      );

      const ownerAccessProfile = 'admin-mestre';
      const ownerPermissions = normalizeAccessPermissions(
        permissions_json,
        ownerAccessProfile
      );

      // 2. Create Master Unit for this Tenant
      const unitId = 'master-' + tenantId;
      await db.prepare(`
        INSERT INTO units (id, tenant_id, name, company_name, responsible_name, phone, email, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(unitId, tenantId, `Matriz - ${name}`, name, responsible_name, phone, email);

      // 3. Create First User (Admin of this Tenant)
      const userId = 'admin-' + tenantId;
      await db.prepare(`
        INSERT INTO users (
          id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json
        )
        VALUES (?, ?, ?, ?, ?, ?, 'admin', 'Ativo', ?, ?)
      `).run(
        userId,
        tenantId,
        unitId,
        responsible_name,
        email,
        password,
        ownerAccessProfile,
        stringifyAccessPermissions(ownerPermissions, ownerAccessProfile)
      );

      res.json({ success: true, tenantId, userId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to provision tenant' });
    }
  });

  app.get('/api/tenants/:id/accesses', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can view tenant accesses' });
    }
    try {
      const accesses = await db.prepare(`
        SELECT u.*, un.name as unit_name
        FROM users u
        LEFT JOIN units un ON u.unit_id = un.id
        WHERE u.tenant_id = ? AND u.id <> 'admin-root'
        ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END, u.full_name ASC
      `).all(req.params.id);
      res.json(accesses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant accesses' });
    }
  });

  app.post('/api/tenants/:id/accesses', async (req, res) => {
    const { id: tenantId } = req.params;
    // Esta rota ÃƒÆ’Ã‚Â© exclusiva do admin-root (Super Admin)
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can provision tenant accesses' });
    }
    const { full_name, email, password, role, status, access_profile, permissions_json, unit_id } = req.body;

    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const accessCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').get(tenantId) as any;
      if (tenant.max_users && Number(accessCount?.count || 0) >= Number(tenant.max_users)) {
        return res.status(400).json({ error: 'Tenant reached max user limit' });
      }

      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      const accessProfile = access_profile || tenant.access_profile || getDefaultAccessProfile(role);
      const resolvedPermissions = normalizeAccessPermissions(permissions_json, accessProfile);
      // Nunca atribuir super_admin a usuÃƒÆ’Ã‚Â¡rios de tenant
      resolvedPermissions.super_admin = false;
      const masterUnitId = await db.prepare('SELECT id FROM units WHERE tenant_id = ? AND is_master = 1').get(tenantId) as any;

      await db.prepare(`
        INSERT INTO users (
          id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        tenantId,
        unit_id || masterUnitId?.id || null,
        full_name,
        email,
        password,
        role || 'user',
        status || 'Ativo',
        accessProfile,
        stringifyAccessPermissions(resolvedPermissions, accessProfile)
      );

      res.status(201).json({ success: true, id: userId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create tenant access' });
    }
  });

  app.patch('/api/tenants/:id/settings', async (req, res) => {
    const { id } = req.params;
    const { validity_days, plan_label, max_users, access_profile, status } = req.body;

    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any;
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const validityDays = Math.max(1, Number(validity_days || tenant.validity_days || 30));
      const startsAt = toSqlDateTime(new Date());
      const expiresAt = toSqlDateTime(addDays(startsAt, validityDays));
      const accessProfile = access_profile || tenant.access_profile || 'admin-mestre';

      await db.prepare(`
        UPDATE tenants
        SET
          status = ?,
          plan_label = ?,
          validity_days = ?,
          starts_at = ?,
          expires_at = ?,
          max_users = ?,
          access_profile = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        status || 'Ativo',
        plan_label || getPlanLabel(validityDays),
        validityDays,
        startsAt,
        expiresAt,
        Number(max_users || tenant.max_users || 3),
        accessProfile,
        id
      );

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update tenant settings' });
    }
  });

  app.delete('/api/tenants/:id', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can delete tenants' });
    }
    const tenantId = req.params.id;
    if (tenantId === 'develoi') {
      return res.status(403).json({ error: 'Cannot delete root tenant' });
    }
    let deleteStep = 'start';
    try {
      deleteStep = 'load stored files';
      const storedFiles = [
        ...(await db.prepare('SELECT file_path FROM import_files WHERE tenant_id = ? AND file_path IS NOT NULL').all(tenantId) as any[]),
        ...(await db.prepare('SELECT file_path FROM job_imports WHERE tenant_id = ? AND file_path IS NOT NULL').all(tenantId) as any[]),
        ...(await db.prepare(`
          SELECT cf.file_path
          FROM candidate_files cf
          JOIN candidates c ON c.id = cf.candidate_id
          WHERE c.tenant_id = ? AND cf.file_path IS NOT NULL
        `).all(tenantId) as any[]),
      ]
        .map((row) => row?.file_path)
        .filter(Boolean);

      deleteStep = 'transaction';
      await prisma.$transaction(async (tx) => {
        deleteStep = 'delete hr_tool_answers by response';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_answers WHERE response_id IN (SELECT id FROM hr_tool_responses WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete hr_tool_answers by question';
        await tx.$executeRawUnsafe(`
          DELETE FROM hr_tool_answers
          WHERE question_id IN (
            SELECT q.id
            FROM hr_tool_questions q
            JOIN hr_tools t ON t.id = q.tool_id
            WHERE t.tenant_id = ?
          )
        `, tenantId);
        deleteStep = 'delete ai_search_results';
        await tx.$executeRawUnsafe('DELETE FROM ai_search_results WHERE session_id IN (SELECT id FROM ai_search_sessions WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete ai_chat_messages';
        await tx.$executeRawUnsafe('DELETE FROM ai_chat_messages WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete ai_search_sessions';
        await tx.$executeRawUnsafe('DELETE FROM ai_search_sessions WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete ai_matching_settings';
        await tx.$executeRawUnsafe('DELETE FROM ai_matching_settings WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete candidate_disc_results';
        await tx.$executeRawUnsafe('DELETE FROM candidate_disc_results WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete candidate_history';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_history
          WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
             OR job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)
        `, tenantId, tenantId);
        deleteStep = 'delete candidate_job_matches';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_job_matches
          WHERE tenant_id = ?
             OR candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
             OR job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)
        `, tenantId, tenantId, tenantId);
        deleteStep = 'delete candidate_files';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_files
          WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
        `, tenantId);
        deleteStep = 'delete job_publication_texts';
        await tx.$executeRawUnsafe('DELETE FROM job_publication_texts WHERE job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete import_batch_events';
        await tx.$executeRawUnsafe('DELETE FROM import_batch_events WHERE batch_id IN (SELECT id FROM import_batches WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete import_files';
        await tx.$executeRawUnsafe('DELETE FROM import_files WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete import_batches';
        await tx.$executeRawUnsafe('DELETE FROM import_batches WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete job_imports';
        await tx.$executeRawUnsafe('DELETE FROM job_imports WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete hr_tool_responses';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_responses WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete hr_tool_questions';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_questions WHERE tool_id IN (SELECT id FROM hr_tools WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete hr_tools';
        await tx.$executeRawUnsafe('DELETE FROM hr_tools WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete candidates';
        await tx.$executeRawUnsafe('DELETE FROM candidates WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete jobs';
        await tx.$executeRawUnsafe('DELETE FROM jobs WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete users';
        await tx.$executeRawUnsafe('DELETE FROM users WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete units';
        await tx.$executeRawUnsafe('DELETE FROM units WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete tenant';
        await tx.$executeRawUnsafe('DELETE FROM tenants WHERE id = ?', tenantId);
      });

      deleteStep = 'delete filesystem';
      for (const filePath of new Set(storedFiles)) {
        if (filePath && fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath).catch(() => undefined);
        }
      }

      const tenantStorageDir = path.join(IMPORT_UPLOADS_DIR, tenantId);
      if (fs.existsSync(tenantStorageDir)) {
        await fs.promises.rm(tenantStorageDir, { recursive: true, force: true }).catch(() => undefined);
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Failed to delete tenant',
        step: deleteStep,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // --- Units Management ---
  app.get('/api/units', async (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'develoi';
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const units = await db.prepare('SELECT * FROM units WHERE tenant_id = ? ORDER BY is_master DESC, name ASC').all(tenantId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  });

  app.post('/api/units', async (req, res) => {
    const unit = req.body;
    const tenantId = unit.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const id = unit.id || Math.random().toString(36).substr(2, 9);
      await db.prepare(`
        INSERT INTO units (id, tenant_id, parent_id, name, company_name, responsible_name, phone, email, city, state, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        tenantId,
        unit.parent_id || null,
        unit.name,
        unit.company_name || null,
        unit.responsible_name || null,
        unit.phone || null,
        unit.email || null,
        unit.city || null,
        unit.state || null,
        0
      );
      res.json({ id, ...unit });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create unit' });
    }
  });

  app.put('/api/units/:id', async (req, res) => {
    const { id } = req.params;
    const unit = req.body;
    try {
      const existing = await db.prepare('SELECT tenant_id FROM units WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'Unit not found' });
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare(`
        UPDATE units SET
          name = ?, parent_id = ?, company_name = ?, responsible_name = ?,
          phone = ?, email = ?, city = ?, state = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        unit.name, unit.parent_id || null, unit.company_name || null,
        unit.responsible_name || null, unit.phone || null, unit.email || null,
        unit.city || null, unit.state || null, id
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update unit' });
    }
  });

  app.delete('/api/units/:id', async (req, res) => {
    try {
      const existing = await db.prepare('SELECT id, tenant_id, is_master FROM units WHERE id = ?').get(req.params.id) as any;
      if (!existing) return res.status(404).json({ error: 'Unit not found' });
      if (existing.is_master || existing.id === getTenantMasterUnitId(existing.tenant_id)) {
        return res.status(403).json({ error: 'Cannot delete the initial master unit' });
      }
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  });

  // --- Users Management ---
  app.get('/api/users', async (req, res) => {
    const { unitId } = req.query;
    const tenantId = (req.query.tenantId as string) || 'develoi';
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      let query = 'SELECT u.*, un.name as unit_name FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.tenant_id = ? AND u.id <> \'admin-root\'';
      const params: any[] = [tenantId];
      if (unitId && unitId !== 'master') {
        query += ' AND u.unit_id = ?';
        params.push(unitId);
      }
      const users = await db.prepare(query).all(...params);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const user = req.body;
    const tenantId = user.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').get(tenantId) as any;
      if (tenant.max_users && Number(userCount?.count || 0) >= Number(tenant.max_users)) {
        return res.status(400).json({ error: 'Limite de usuÃƒÆ’Ã‚Â¡rios do cliente atingido' });
      }

      const id = 'user-' + Math.random().toString(36).substr(2, 9);
      const accessProfile = user.access_profile || getDefaultAccessProfile(user.role);
      const safePermissions = normalizeAccessPermissions(user.permissions_json, accessProfile);
      // Nunca permitir super_admin para usuÃƒÆ’Ã‚Â¡rios de tenant
      safePermissions.super_admin = false;

      await db.prepare(`
        INSERT INTO users (id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        tenantId,
        user.unit_id || null,
        user.full_name,
        user.email,
        user.password,
        user.role || 'user',
        user.status || 'Ativo',
        accessProfile,
        stringifyAccessPermissions(safePermissions, accessProfile)
      );
      res.json({ id, ...user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const user = req.body;
    try {
      const existing = await db.prepare('SELECT tenant_id FROM users WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;

      const accessProfile = user.access_profile || getDefaultAccessProfile(user.role);
      const safePermissions = normalizeAccessPermissions(user.permissions_json, accessProfile);
      safePermissions.super_admin = false;

      await db.prepare(`
        UPDATE users SET
          full_name = ?, email = ?, role = ?, status = ?, unit_id = ?, access_profile = ?, permissions_json = ?
        WHERE id = ?
      `).run(
        user.full_name,
        user.email,
        user.role,
        user.status,
        user.unit_id,
        accessProfile,
        stringifyAccessPermissions(safePermissions, accessProfile),
        id
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const existing = await db.prepare('SELECT tenant_id, id FROM users WHERE id = ?').get(req.params.id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });
      if (existing.id === 'admin-root') return res.status(403).json({ error: 'Cannot delete root admin' });
      const caller = await getCallerUser(req);
      if (!caller) return res.status(401).json({ error: 'Unauthorized' });
      if (existing.id === caller.id) {
        return res.status(403).json({ error: 'Cannot delete your own user' });
      }
      if (existing.id === getTenantOwnerUserId(existing.tenant_id)) {
        return res.status(403).json({ error: 'Cannot delete the initial tenant administrator' });
      }
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  const server = createHttpServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server } // Compartilha o servidor HTTP para o WebSocket do Vite
      },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      try {
        const template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.url, template);
        res.status(200).setHeader('Content-Type', 'text/html');
        res.end(html);
      } catch (error) {
        next(error);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FAILED TO START SERVER:', err);
  process.exit(1);
});

import {
  normalizeNullableString, normalizeNullableTextBlock, normalizeNullableBoolean,
  normalizeNullableInteger, normalizeNullableFloat, normalizeBrazilianState,
  clampInteger, normalizeConfidenceLevel, parseJsonFromAiResponseSafe
} from './resume';

export { parseJsonFromAiResponseSafe };

function buildImportedJobSummary(data: any) {
  const parts = [
    data?.title || null,
    data?.department ? `Departamento: ${data.department}` : null,
    data?.city && data?.state ? `${data.city}/${data.state}` : data?.city || null,
    data?.contract_type ? `Contrato: ${data.contract_type}` : null,
    data?.work_model ? `Modelo: ${data.work_model}` : null,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' | ');
  return 'Revise os campos importados e complete apenas os dados confirmados no arquivo.';
}

export function normalizeImportedJobParsedData(data: any, extractedText: string) {
  const evidence = data && typeof data.evidence === 'object' && data.evidence ? data.evidence : {};
  const pickValue = <T,>(value: T, _evidenceValue: unknown, fallback: T = null as T) =>
    (value !== undefined && value !== null) ? value : fallback;

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
    work_model: ['Presencial', 'Híbrido', 'Home Office'].includes(workModel || '') ? workModel : null,
    contract_type: ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer', 'Outro'].includes(contractType || '') ? contractType : null,
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

  if (!normalized.title) normalized.confidence.title = 'Baixa';
  if (!normalized.city || !normalized.state) normalized.confidence.city = 'Baixa';
  if (normalized.salary_min === null && normalized.salary_max === null) normalized.confidence.salary = 'Baixa';
  if (!normalized.technical_requirements && !normalized.mandatory_requirements && !normalized.desirable_requirements) normalized.confidence.requirements = 'Baixa';

  normalized.ai_summary = buildImportedJobSummary(normalized);
  return normalized;
}

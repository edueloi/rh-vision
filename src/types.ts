export interface Job {
  id: number;
  tenant_id: number;
  unit_id: number;
  title: string;
  department?: string;
  description: string;
  responsibilities?: string;
  technical_requirements?: string;
  mandatory_requirements?: string;
  desirable_requirements?: string;
  eliminatory_criteria?: string;
  benefits?: string;
  city: string;
  state: string;
  work_model: string;
  contract_type: string;
  seniority_level?: string;
  education_level?: string;
  min_experience_years: number;
  salary_min?: number;
  salary_max?: number;
  workload?: string;
  work_schedule?: string;
  requires_cnh: boolean;
  cnh_category?: string;
  requires_travel: boolean;
  requires_relocation: boolean;
  status: string;
  is_public: boolean;
  public_slug: string;
  compatibility_threshold: number;
  max_compatible_candidates: number;
  weight_technical: number;
  weight_experience: number;
  weight_education: number;
  weight_location: number;
  weight_soft_skills: number;
  weight_culture: number;
  internal_notes?: string;
  tags?: string;
  external_links: string; // JSON
  created_at: string;
  updated_at: string;
  candidates_count?: number;
  location?: string;
  type?: string;
}

export interface Candidate {
  id: number;
  tenant_id: string;
  unit_id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  city?: string;
  state?: string;
  address?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  desired_position?: string;
  desired_area?: string;
  desired_salary?: number;
  education_level?: string;
  experience_years?: number;
  professional_summary?: string;
  professional_experiences?: string;
  academic_education?: string;
  courses_certifications?: string;
  hard_skills?: string;
  soft_skills?: string;
  languages?: string;
  has_cnh?: boolean;
  cnh_category?: string;
  available_to_travel?: boolean;
  available_to_relocate?: boolean;
  desired_work_model?: string;
  desired_contract_type?: string;
  source: string;
  status: 'Novo' | 'Em análise' | 'Compatível' | 'Entrevista' | 'Aprovado' | 'Reprovado' | 'Banco de talentos' | 'Contratado';
  tags?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Virtual properties for UI
  last_job_title?: string;
  last_score?: number;
  files?: CandidateFile[];
  matches?: CandidateJobMatch[];
  disc?: CandidateDiscResult;
  history?: CandidateHistoryEvent[];
}

export interface CandidateFile {
  id: number;
  candidate_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  extracted_text?: string;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateJobMatch {
  id: number;
  tenant_id: string;
  candidate_id: number;
  job_id: number;
  status: string;
  compatibility_score?: number;
  compatibility_classification?: string;
  compatibility_summary?: string;
  strengths?: string;
  attention_points?: string;
  requirements_met?: string;
  requirements_partial?: string;
  requirements_missing?: string;
  eliminatory_flags?: string;
  interview_questions?: string;
  risk_analysis?: string;
  final_recommendation?: string;
  ai_analysis_json?: string;
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  job_title?: string;
  job_city?: string;
  job_state?: string;
}

export interface CandidateDiscResult {
  id: number;
  candidate_id: number;
  disc_d?: number;
  disc_i?: number;
  disc_s?: number;
  disc_c?: number;
  predominant_profile?: string;
  behavioral_summary?: string;
  strengths?: string;
  attention_points?: string;
  communication_style?: string;
  leadership_style?: string;
  ideal_environment?: string;
  raw_answers_json?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateHistoryEvent {
  id: number;
  candidate_id: number;
  job_id?: number;
  event_type: string;
  title: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface Application {
  id: number;
  job_id: number;
  candidate_id: number;
  score: number | null;
  ai_analysis: string | null;
  status: string;
  applied_at: string;
  name: string;
  email: string;
  phone: string;
}

export interface HrTool {
  id: number;
  tenant_id: number;
  unit_id?: number;
  name: string;
  type: 'disc' | 'screening' | 'culture-fit' | 'interview' | 'technical-test' | 'checklist' | 'availability' | 'ai-report';
  description?: string;
  status: 'Ativo' | 'Inativo';
  is_public: boolean;
  public_slug?: string;
  public_url?: string;
  expires_at?: string;
  settings_json?: string;
  created_at: string;
  updated_at: string;
  responses_count?: number;
  completion_rate?: number;
}

export interface HrToolQuestion {
  id: number;
  tool_id: number;
  question_text: string;
  question_type: string;
  is_required: boolean;
  is_eliminatory: boolean;
  expected_answer?: string;
  score_weight: number;
  options_json?: string;
  position: number;
}

export interface HrToolResponse {
  id: number;
  tenant_id: number;
  tool_id: number;
  candidate_id?: number;
  job_id?: number;
  status: 'Pendente' | 'Iniciado' | 'Concluído' | 'Analizado';
  started_at?: string;
  completed_at?: string;
  score?: number;
  classification?: string;
  ai_summary?: string;
  ai_analysis_json?: string;
  created_at: string;
  candidate_name?: string;
  tool_name?: string;
}

export interface HrToolAnswer {
  id: number;
  response_id: number;
  question_id: number;
  answer_text?: string;
  answer_json?: string;
  score?: number;
}

export interface DiscResultFull extends HrToolResponse {
  disc_d: number;
  disc_i: number;
  disc_s: number;
  disc_c: number;
  predominant_profile: string;
  behavioral_summary?: string;
  strengths?: string;
  attention_points?: string;
  communication_style?: string;
  leadership_style?: string;
  ideal_environment?: string;
  interview_suggestions?: string;
}

export interface ImportBatch {
  id: number;
  tenant_id: number;
  unit_id?: number;
  job_id?: number;
  name: string;
  import_type: 'resumes' | 'spreadsheet' | 'mixed';
  status: 'Waiting' | 'Processing' | 'Completed' | 'Failed';
  analysis_mode: 'extraction' | 'creation' | 'full';
  precision_mode: 'Flexível' | 'Equilibrada' | 'Rigorosa';
  compatibility_threshold: number;
  max_highlighted_candidates: number;
  duplicate_strategy: 'ignore' | 'update' | 'review';
  location_rule: 'Obrigatória' | 'Peso alto' | 'Peso médio' | 'Ignorar';
  distance_radius_km: number;
  language_mode: 'Português' | 'Inglês' | 'Automático';
  tags?: string;
  notes?: string;
  total_files: number;
  processed_files: number;
  created_candidates: number;
  updated_candidates: number;
  duplicate_files: number;
  error_files: number;
  summary?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
}

export interface ImportFile {
  id: number;
  batch_id: number;
  tenant_id: number;
  unit_id?: number;
  candidate_id?: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'Waiting' | 'Uploading' | 'Uploaded' | 'Extracting' | 'Analyzing' | 'Comparing' | 'Completed' | 'Duplicate' | 'Error';
  progress: number;
  extracted_text?: string;
  parsed_data_json?: string;
  ai_summary?: string;
  duplicate_status: 'none' | 'email' | 'phone' | 'cpf';
  duplicate_candidate_id?: number;
  compatibility_score?: number;
  compatibility_classification?: string;
  job_analysis_json?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportBatchEvent {
  id: number;
  batch_id: number;
  event_type: string;
  description: string;
  metadata_json?: string;
  created_at: string;
}

export interface DashboardOverview {
  metrics: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    aiAnalyses: number;
    compatibleAbove80: number;
    discRespondidos: number;
    totalImports: number;
    hiredThisMonth: number;
  };
  funnel: { label: string; count: number; variant: number }[];
  recentJobs: (Job & { candidates_count: number; high_match_count: number })[];
  criticalJobs: (Job & { candidates_count: number; high_match_count: number })[];
  recommended: (Candidate & { compatibility_score: number; compatibility_classification: string; job_title: string; disc_profile?: string })[];
  charts: {
    candidatesByStatus: { name: string; value: number }[];
    discDistribution: { name: string; value: number }[];
    evolution: { name: string; v: number }[];
  };
  recentImports: (ImportBatch & { job_title?: string })[];
  unitSummary: { name: string; active_jobs: number; candidates: number }[];
  nexusInsights: { type: 'success' | 'warning' | 'info'; text: string }[];
}

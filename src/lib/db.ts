import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database('nexus_recruitment.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      document TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      city TEXT,
      state TEXT,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      title TEXT NOT NULL,
      department TEXT,
      description TEXT,
      responsibilities TEXT,
      technical_requirements TEXT,
      mandatory_requirements TEXT,
      desirable_requirements TEXT,
      eliminatory_criteria TEXT,
      benefits TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      work_model TEXT CHECK(work_model IN ('Presencial', 'Híbrido', 'Home Office')),
      contract_type TEXT CHECK(contract_type IN ('CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer', 'Outro')),
      seniority_level TEXT,
      education_level TEXT,
      min_experience_years INTEGER,
      salary_min REAL,
      salary_max REAL,
      workload TEXT,
      work_schedule TEXT,
      requires_cnh BOOLEAN DEFAULT 0,
      cnh_category TEXT,
      requires_travel BOOLEAN DEFAULT 0,
      requires_relocation BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'Rascunho' CHECK(status IN ('Rascunho', 'Aberta', 'Pausada', 'Encerrada')),
      is_public BOOLEAN DEFAULT 0,
      public_slug TEXT,
      public_url TEXT,
      compatibility_threshold INTEGER DEFAULT 80,
      distance_radius_km INTEGER DEFAULT 50,
      location_rule TEXT DEFAULT 'Peso médio',
      max_compatible_candidates INTEGER DEFAULT 20,
      weight_technical INTEGER DEFAULT 20,
      weight_experience INTEGER DEFAULT 20,
      weight_education INTEGER DEFAULT 20,
      weight_location INTEGER DEFAULT 10,
      weight_soft_skills INTEGER DEFAULT 15,
      weight_culture INTEGER DEFAULT 15,
      internal_notes TEXT,
      tags TEXT,
      external_link_linkedin TEXT,
      external_link_indeed TEXT,
      external_link_infojobs TEXT,
      external_link_catho TEXT,
      external_link_other TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      cpf TEXT,
      birth_date TEXT,
      city TEXT,
      state TEXT,
      latitude REAL,
      longitude REAL,
      address TEXT,
      linkedin_url TEXT,
      portfolio_url TEXT,
      desired_position TEXT,
      desired_area TEXT,
      desired_salary REAL,
      education_level TEXT,
      experience_years INTEGER,
      professional_summary TEXT,
      professional_experiences TEXT,
      academic_education TEXT,
      courses_certifications TEXT,
      hard_skills TEXT,
      soft_skills TEXT,
      languages TEXT,
      has_cnh BOOLEAN DEFAULT 0,
      cnh_category TEXT,
      available_to_travel BOOLEAN DEFAULT 0,
      available_to_relocate BOOLEAN DEFAULT 0,
      desired_work_model TEXT,
      desired_contract_type TEXT,
      source TEXT DEFAULT 'Manual',
      status TEXT DEFAULT 'Novo' CHECK(status IN ('Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado')),
      tags TEXT,
      internal_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    -- New Nexus AI Tables
    CREATE TABLE IF NOT EXISTS ai_search_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      user_id TEXT,
      job_id INTEGER,
      search_type TEXT, -- 'match-job', 'chat', 'disc-filter', etc.
      precision_mode TEXT DEFAULT 'Equilibrada',
      compatibility_threshold INTEGER DEFAULT 70,
      max_results INTEGER DEFAULT 50,
      distance_radius_km INTEGER,
      location_rule TEXT,
      only_with_resume BOOLEAN DEFAULT 0,
      only_with_disc BOOLEAN DEFAULT 0,
      filters_json TEXT,
      prompt TEXT,
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ai_search_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      job_id INTEGER,
      compatibility_score INTEGER,
      classification TEXT,
      distance_km REAL,
      has_disc BOOLEAN,
      disc_profile TEXT,
      strengths TEXT,
      attention_points TEXT,
      recommendation_reason TEXT,
      risk_reason TEXT,
      ai_analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES ai_search_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      user_id TEXT,
      session_id INTEGER,
      role TEXT CHECK(role IN ('user', 'assistant', 'system')),
      message TEXT NOT NULL,
      tool_used TEXT,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (session_id) REFERENCES ai_search_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_matching_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      default_precision_mode TEXT DEFAULT 'Equilibrada',
      default_compatibility_threshold INTEGER DEFAULT 70,
      default_max_results INTEGER DEFAULT 20,
      default_distance_radius_km INTEGER DEFAULT 50,
      weight_location INTEGER DEFAULT 10,
      weight_experience INTEGER DEFAULT 20,
      weight_hard_skills INTEGER DEFAULT 20,
      weight_soft_skills INTEGER DEFAULT 15,
      weight_disc INTEGER DEFAULT 15,
      weight_education INTEGER DEFAULT 10,
      weight_salary INTEGER DEFAULT 5,
      weight_work_model INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(tenant_id, unit_id)
    );

    CREATE TABLE IF NOT EXISTS candidate_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      extracted_text TEXT,
      ai_summary TEXT,
      tenant_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_job_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      candidate_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Inscrito',
      compatibility_score INTEGER,
      compatibility_classification TEXT,
      compatibility_summary TEXT,
      strengths TEXT,
      attention_points TEXT,
      requirements_met TEXT,
      requirements_partial TEXT,
      requirements_missing TEXT,
      eliminatory_flags TEXT,
      interview_questions TEXT,
      risk_analysis TEXT,
      final_recommendation TEXT,
      ai_analysis_json TEXT,
      analyzed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_disc_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      disc_d INTEGER,
      disc_i INTEGER,
      disc_s INTEGER,
      disc_c INTEGER,
      predominant_profile TEXT,
      behavioral_summary TEXT,
      strengths TEXT,
      attention_points TEXT,
      communication_style TEXT,
      leadership_style TEXT,
      ideal_environment TEXT,
      raw_answers_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      job_id INTEGER,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS job_publication_texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      title TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    -- HR Tools & Assessments Tables
    CREATE TABLE IF NOT EXISTS hr_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'DISC', 'screening', 'culture-fit', 'interview', 'technical', 'checklist', 'availability', 'ia-report'
      description TEXT,
      status TEXT DEFAULT 'Ativo',
      is_public BOOLEAN DEFAULT 1,
      public_slug TEXT UNIQUE,
      public_url TEXT,
      expires_at DATETIME,
      settings_json TEXT, -- weights, colors, custom configs
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS hr_tool_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL, -- 'text', 'long-text', 'yes-no', 'multiple-choice', 'scale-5', 'scale-10', 'file', 'date'
      is_required BOOLEAN DEFAULT 1,
      is_eliminatory BOOLEAN DEFAULT 0,
      expected_answer TEXT,
      score_weight INTEGER DEFAULT 1,
      options_json TEXT, -- For multiple choice
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tool_id) REFERENCES hr_tools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hr_tool_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      tool_id INTEGER NOT NULL,
      candidate_id INTEGER, -- Can be null initially if person is not in DB
      job_id INTEGER,
      status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Em andamento', 'Concluído', 'Expirado'
      started_at DATETIME,
      completed_at DATETIME,
      score INTEGER,
      classification TEXT,
      ai_summary TEXT,
      ai_analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (tool_id) REFERENCES hr_tools(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS hr_tool_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer_text TEXT,
      answer_json TEXT,
      score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (response_id) REFERENCES hr_tool_responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES hr_tool_questions(id) ON DELETE CASCADE
    );

    -- Import Batches & Files Tables
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      job_id INTEGER,
      name TEXT NOT NULL,
      import_type TEXT DEFAULT 'mixed', -- 'individual', 'spreadsheet', 'mixed'
      status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
      analysis_mode TEXT DEFAULT 'full', -- 'extraction', 'creation', 'matching', 'full'
      precision_mode TEXT DEFAULT 'Equilibrada',
      compatibility_threshold INTEGER DEFAULT 70,
      max_highlighted_candidates INTEGER DEFAULT 20,
      duplicate_strategy TEXT DEFAULT 'manual', -- 'ignore', 'update', 'manual'
      location_rule TEXT DEFAULT 'Peso médio',
      distance_radius_km INTEGER DEFAULT 50,
      language_mode TEXT DEFAULT 'Automático',
      tags TEXT,
      notes TEXT,
      total_files INTEGER DEFAULT 0,
      processed_files INTEGER DEFAULT 0,
      created_candidates INTEGER DEFAULT 0,
      updated_candidates INTEGER DEFAULT 0,
      duplicate_files INTEGER DEFAULT 0,
      error_files INTEGER DEFAULT 0,
      summary TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS import_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      candidate_id INTEGER,
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'pending', -- 'pending', 'uploading', 'uploaded', 'processing', 'completed', 'duplicate', 'error'
      progress INTEGER DEFAULT 0,
      extracted_text TEXT,
      parsed_data_json TEXT,
      ai_summary TEXT,
      duplicate_status TEXT, -- 'none', 'email', 'phone', 'cpf'
      duplicate_candidate_id INTEGER,
      compatibility_score INTEGER,
      compatibility_classification TEXT,
      job_analysis_json TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
      FOREIGN KEY (duplicate_candidate_id) REFERENCES candidates(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS import_batch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      job_id INTEGER,
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'uploaded', -- 'uploaded', 'extracting_text', 'analyzing_ai', 'ready_for_review', 'created_job', 'error', 'cancelled'
      extracted_text TEXT,
      parsed_data_json TEXT,
      confidence_json TEXT,
      ai_summary TEXT,
      error_message TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    -- Insert Default Fadel Data
    INSERT OR IGNORE INTO tenants (id, name, document) VALUES ('fadel', 'Fadel Transportes', '00.000.000/0001-00');
    
    INSERT OR IGNORE INTO units (id, tenant_id, name, city, state) VALUES ('master', 'fadel', 'Fadel - Central (Master)', 'Todas', 'N/A');
    
    -- Insert default tools if they don't exist
    INSERT OR IGNORE INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug) 
    VALUES ('fadel', 'master', 'Avaliação DISC', 'DISC', 'Avaliação comportamental baseada na metodologia DISC.', 'disc-standard');
    
    INSERT OR IGNORE INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug) 
    VALUES ('fadel', 'master', 'Fit Cultural', 'culture-fit', 'Aferição de alinhamento com os valores da Fadel.', 'cultural-fit-master');

    -- Insert default questions for DISC (simplified example)
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'Como você se comporta sob pressão?', 'text', 0 FROM hr_tools WHERE public_slug = 'disc-standard';
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'Você prefere trabalhar sozinho ou em equipe?', 'yes-no', 1 FROM hr_tools WHERE public_slug = 'disc-standard';
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'Em uma escala de 1 a 10, o quanto você gosta de rotinas claras?', 'scale-10', 2 FROM hr_tools WHERE public_slug = 'disc-standard';

    -- Insert default questions for Fit Cultural
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'O que você mais valoriza em uma empresa?', 'text', 0 FROM hr_tools WHERE public_slug = 'cultural-fit-master';
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'Você se considera uma pessoa pontual e rigorosa com horários?', 'scale-5', 1 FROM hr_tools WHERE public_slug = 'cultural-fit-master';
    INSERT OR IGNORE INTO hr_tool_questions (tool_id, question_text, question_type, position)
    SELECT id, 'Você prefere ambientes estáveis ou em constante mudança?', 'text', 2 FROM hr_tools WHERE public_slug = 'cultural-fit-master';

    INSERT OR IGNORE INTO units (id, tenant_id, name, city, state) VALUES ('tatui', 'fadel', 'Fadel - Tatuí', 'Tatuí', 'SP');
    INSERT OR IGNORE INTO units (id, tenant_id, name, city, state) VALUES ('curitiba', 'fadel', 'Fadel - Curitiba', 'Curitiba', 'PR');
    INSERT OR IGNORE INTO units (id, tenant_id, name, city, state) VALUES ('rio', 'fadel', 'Fadel - Rio de Janeiro', 'Rio de Janeiro', 'RJ');
    INSERT OR IGNORE INTO units (id, tenant_id, name, city, state) VALUES ('bh', 'fadel', 'Fadel - Belo Horizonte', 'Belo Horizonte', 'MG');

    -- Insert Default Sample Job
    INSERT OR IGNORE INTO jobs (id, tenant_id, unit_id, title, department, city, state, work_model, contract_type, status, is_public, description) 
    VALUES (1, 'fadel', 'tatui', 'Motorista Carreteiro', 'Logística', 'Tatuí', 'SP', 'Presencial', 'CLT', 'Aberta', 1, 'Vaga para transporte rodoviário de cargas pesadas.');
  `);
}

export default db;

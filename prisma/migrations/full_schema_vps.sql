-- =============================================================================
-- TRIAGEM SMART — Schema completo para deploy na VPS
-- Executar: mysql -u root -p rh_vision < full_schema_vps.sql
-- Idempotente: usa IF NOT EXISTS e verificações antes de ALTER
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- =============================================================================
-- 1. TENANTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `tenants` (
  `id`           VARCHAR(191)  NOT NULL,
  `name`         VARCHAR(255)  NOT NULL,
  `document`     VARCHAR(255)  NULL,
  `status`       VARCHAR(100)  NULL DEFAULT 'Ativo',
  `plan_label`   VARCHAR(255)  NULL,
  `validity_days` INT          NULL DEFAULT 30,
  `starts_at`    DATETIME(0)   NULL,
  `expires_at`   DATETIME(0)   NULL,
  `max_users`    INT           NULL DEFAULT 3,
  `access_profile` VARCHAR(100) NULL DEFAULT 'rh-operacao',
  `contract_status` VARCHAR(100) NULL,
  `created_at`   DATETIME(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`   DATETIME(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. UNITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `units` (
  `id`               VARCHAR(191) NOT NULL,
  `tenant_id`        VARCHAR(191) NOT NULL,
  `parent_id`        VARCHAR(191) NULL,
  `name`             VARCHAR(255) NOT NULL,
  `company_name`     VARCHAR(255) NULL,
  `responsible_name` VARCHAR(255) NULL,
  `phone`            VARCHAR(255) NULL,
  `email`            VARCHAR(255) NULL,
  `city`             VARCHAR(255) NULL,
  `state`            VARCHAR(255) NULL,
  `country`          VARCHAR(255) NULL DEFAULT 'Brasil',
  `latitude`         DOUBLE       NULL,
  `longitude`        DOUBLE       NULL,
  `is_master`        BOOLEAN      NOT NULL DEFAULT false,
  `created_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `units_tenant_id_idx` (`tenant_id`),
  INDEX `units_parent_id_idx` (`parent_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. USERS
-- Unique: (tenant_id, email) — mesmo e-mail pode existir em tenants distintos
-- =============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                      VARCHAR(191) NOT NULL,
  `tenant_id`               VARCHAR(191) NOT NULL,
  `unit_id`                 VARCHAR(191) NULL,
  `full_name`               VARCHAR(255) NOT NULL,
  `email`                   VARCHAR(255) NOT NULL,
  `password`                VARCHAR(255) NOT NULL,
  `role`                    VARCHAR(100) NOT NULL DEFAULT 'user',
  `status`                  VARCHAR(100) NOT NULL DEFAULT 'Ativo',
  `access_profile`          VARCHAR(100) NULL DEFAULT 'rh-operacao',
  `permissions_json`        LONGTEXT     NULL,
  `action_permissions_json` LONGTEXT     NULL,
  `photo_url`               LONGTEXT     NULL,
  `last_login`              DATETIME(0)  NULL,
  `created_at`              DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `users_tenant_email_unique` (`tenant_id`, `email`),
  INDEX `users_tenant_id_idx` (`tenant_id`),
  INDEX `users_unit_id_idx`   (`unit_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. JOBS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `jobs` (
  `id`                       INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`                VARCHAR(191) NOT NULL,
  `unit_id`                  VARCHAR(191) NOT NULL,
  `title`                    VARCHAR(255) NOT NULL,
  `department`               VARCHAR(255) NULL,
  `description`              LONGTEXT     NULL,
  `responsibilities`         LONGTEXT     NULL,
  `technical_requirements`   LONGTEXT     NULL,
  `mandatory_requirements`   LONGTEXT     NULL,
  `desirable_requirements`   LONGTEXT     NULL,
  `eliminatory_criteria`     LONGTEXT     NULL,
  `benefits`                 LONGTEXT     NULL,
  `ai_summary`               LONGTEXT     NULL,
  `city`                     VARCHAR(255) NOT NULL DEFAULT '',
  `state`                    VARCHAR(255) NOT NULL DEFAULT '',
  `latitude`                 DOUBLE       NULL,
  `longitude`                DOUBLE       NULL,
  `work_model`               VARCHAR(100) NULL,
  `contract_type`            VARCHAR(100) NULL,
  `seniority_level`          VARCHAR(255) NULL,
  `education_level`          VARCHAR(255) NULL,
  `min_experience_years`     INTEGER      NULL,
  `salary_min`               DOUBLE       NULL,
  `salary_max`               DOUBLE       NULL,
  `workload`                 VARCHAR(255) NULL,
  `work_schedule`            VARCHAR(255) NULL,
  `requires_cnh`             BOOLEAN      NOT NULL DEFAULT false,
  `cnh_category`             VARCHAR(50)  NULL,
  `requires_travel`          BOOLEAN      NOT NULL DEFAULT false,
  `requires_relocation`      BOOLEAN      NOT NULL DEFAULT false,
  `status`                   VARCHAR(100) NOT NULL DEFAULT 'Rascunho',
  `approval_status`          VARCHAR(50)  NULL,
  `approval_requested_by`    VARCHAR(191) NULL,
  `approval_requested_at`    DATETIME(0)  NULL,
  `approval_resolved_at`     DATETIME(0)  NULL,
  `is_public`                BOOLEAN      NOT NULL DEFAULT false,
  `public_slug`              VARCHAR(255) NULL,
  `public_url`               VARCHAR(500) NULL,
  `compatibility_threshold`  INTEGER      NOT NULL DEFAULT 80,
  `distance_radius_km`       INTEGER      NOT NULL DEFAULT 50,
  `location_rule`            VARCHAR(255) NOT NULL DEFAULT 'Peso médio',
  `max_compatible_candidates` INTEGER     NOT NULL DEFAULT 20,
  `weight_technical`         INTEGER      NOT NULL DEFAULT 20,
  `weight_experience`        INTEGER      NOT NULL DEFAULT 20,
  `weight_education`         INTEGER      NOT NULL DEFAULT 20,
  `weight_location`          INTEGER      NOT NULL DEFAULT 10,
  `weight_soft_skills`       INTEGER      NOT NULL DEFAULT 15,
  `weight_culture`           INTEGER      NOT NULL DEFAULT 15,
  `internal_notes`           LONGTEXT     NULL,
  `tags`                     LONGTEXT     NULL,
  `external_link_linkedin`   VARCHAR(500) NULL,
  `external_link_indeed`     VARCHAR(500) NULL,
  `external_link_infojobs`   VARCHAR(500) NULL,
  `external_link_catho`      VARCHAR(500) NULL,
  `external_link_other`      VARCHAR(500) NULL,
  `created_at`               DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`               DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `deleted_at`               DATETIME(0)  NULL,
  INDEX `jobs_tenant_id_idx` (`tenant_id`),
  INDEX `jobs_unit_id_idx`   (`unit_id`),
  INDEX `jobs_status_idx`    (`status`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. JOB APPROVALS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `job_approvals` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `job_id`     INT          NOT NULL,
  `tenant_id`  VARCHAR(191) NOT NULL,
  `action`     VARCHAR(50)  NOT NULL,
  `actor_id`   VARCHAR(191) NOT NULL,
  `actor_name` VARCHAR(255) NOT NULL,
  `notes`      LONGTEXT     NULL,
  `created_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `idx_job_approvals_job_id`    (`job_id`),
  INDEX `idx_job_approvals_tenant_id` (`tenant_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. CANDIDATES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidates` (
  `id`                     INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`              VARCHAR(191) NOT NULL,
  `unit_id`                VARCHAR(191) NOT NULL,
  `full_name`              VARCHAR(255) NOT NULL,
  `email`                  VARCHAR(255) NOT NULL,
  `phone`                  VARCHAR(255) NULL,
  `cpf`                    VARCHAR(50)  NULL,
  `birth_date`             VARCHAR(50)  NULL,
  `city`                   VARCHAR(255) NULL,
  `state`                  VARCHAR(255) NULL,
  `latitude`               DOUBLE       NULL,
  `longitude`              DOUBLE       NULL,
  `address`                LONGTEXT     NULL,
  `linkedin_url`           VARCHAR(500) NULL,
  `portfolio_url`          VARCHAR(500) NULL,
  `desired_position`       VARCHAR(255) NULL,
  `desired_area`           VARCHAR(255) NULL,
  `desired_salary`         DOUBLE       NULL,
  `education_level`        VARCHAR(255) NULL,
  `experience_years`       INTEGER      NULL,
  `professional_summary`   LONGTEXT     NULL,
  `professional_experiences` LONGTEXT   NULL,
  `academic_education`     LONGTEXT     NULL,
  `courses_certifications` LONGTEXT     NULL,
  `hard_skills`            LONGTEXT     NULL,
  `soft_skills`            LONGTEXT     NULL,
  `languages`              LONGTEXT     NULL,
  `has_cnh`                BOOLEAN      NOT NULL DEFAULT false,
  `cnh_category`           VARCHAR(50)  NULL,
  `available_to_travel`    BOOLEAN      NOT NULL DEFAULT false,
  `available_to_relocate`  BOOLEAN      NOT NULL DEFAULT false,
  `desired_work_model`     VARCHAR(100) NULL,
  `desired_contract_type`  VARCHAR(100) NULL,
  `source`                 VARCHAR(100) NOT NULL DEFAULT 'Manual',
  `status`                 VARCHAR(100) NOT NULL DEFAULT 'Novo',
  `tags`                   LONGTEXT     NULL,
  `internal_notes`         LONGTEXT     NULL,
  -- JSON estruturado (add_candidate_lists migration)
  `experiences_json`       LONGTEXT     NULL,
  `education_json`         LONGTEXT     NULL,
  `languages_json`         LONGTEXT     NULL,
  `projects_json`          LONGTEXT     NULL,
  `certifications_json`    LONGTEXT     NULL,
  `hard_skills_json`       LONGTEXT     NULL,
  `soft_skills_json`       LONGTEXT     NULL,
  `objectives_json`        LONGTEXT     NULL,
  `created_at`             DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`             DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `deleted_at`             DATETIME(0)  NULL,
  INDEX `candidates_tenant_id_idx` (`tenant_id`),
  INDEX `candidates_unit_id_idx`   (`unit_id`),
  INDEX `candidates_email_idx`     (`email`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. CANDIDATE FILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidate_files` (
  `id`             INTEGER      NOT NULL AUTO_INCREMENT,
  `candidate_id`   INTEGER      NOT NULL,
  `file_name`      VARCHAR(255) NOT NULL,
  `file_path`      VARCHAR(500) NULL,
  `file_type`      VARCHAR(255) NULL,
  `file_size`      INTEGER      NULL,
  `extracted_text` LONGTEXT     NULL,
  `ai_summary`     LONGTEXT     NULL,
  `tenant_id`      VARCHAR(191) NULL,
  `created_at`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `candidate_files_candidate_id_idx` (`candidate_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. CANDIDATE JOB MATCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidate_job_matches` (
  `id`                         INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`                  VARCHAR(191) NOT NULL,
  `candidate_id`               INTEGER      NOT NULL,
  `job_id`                     INTEGER      NOT NULL,
  `status`                     VARCHAR(100) NOT NULL DEFAULT 'Inscrito',
  `compatibility_score`        INTEGER      NULL,
  `compatibility_classification` VARCHAR(255) NULL,
  `compatibility_summary`      LONGTEXT     NULL,
  `strengths`                  LONGTEXT     NULL,
  `attention_points`           LONGTEXT     NULL,
  `requirements_met`           LONGTEXT     NULL,
  `requirements_partial`       LONGTEXT     NULL,
  `requirements_missing`       LONGTEXT     NULL,
  `eliminatory_flags`          LONGTEXT     NULL,
  `interview_questions`        LONGTEXT     NULL,
  `risk_analysis`              LONGTEXT     NULL,
  `final_recommendation`       LONGTEXT     NULL,
  `ai_analysis_json`           LONGTEXT     NULL,
  `analyzed_at`                DATETIME(0)  NULL,
  `created_at`                 DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`                 DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `candidate_job_matches_tenant_id_idx`    (`tenant_id`),
  INDEX `candidate_job_matches_candidate_id_idx` (`candidate_id`),
  INDEX `candidate_job_matches_job_id_idx`       (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. CANDIDATE CONTACT STATUSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidate_contact_statuses` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`      VARCHAR(191) NOT NULL,
  `candidate_id`   INT          NOT NULL,
  `job_id`         INT          NOT NULL,
  `contact_status` VARCHAR(50)  NOT NULL DEFAULT '',
  `contact_notes`  TEXT         NULL,
  `updated_at`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_candidate_job`  (`candidate_id`, `job_id`),
  KEY `idx_tenant_id`    (`tenant_id`),
  KEY `idx_candidate_id` (`candidate_id`),
  KEY `idx_job_id`       (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. CANDIDATE DISC RESULTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidate_disc_results` (
  `id`                  INTEGER      NOT NULL AUTO_INCREMENT,
  `candidate_id`        INTEGER      NOT NULL,
  `disc_d`              INTEGER      NULL,
  `disc_i`              INTEGER      NULL,
  `disc_s`              INTEGER      NULL,
  `disc_c`              INTEGER      NULL,
  `predominant_profile` VARCHAR(255) NULL,
  `behavioral_summary`  LONGTEXT     NULL,
  `strengths`           LONGTEXT     NULL,
  `attention_points`    LONGTEXT     NULL,
  `communication_style` LONGTEXT     NULL,
  `leadership_style`    LONGTEXT     NULL,
  `ideal_environment`   LONGTEXT     NULL,
  `raw_answers_json`    LONGTEXT     NULL,
  `created_at`          DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`          DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `candidate_disc_results_candidate_id_idx` (`candidate_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. CANDIDATE HISTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS `candidate_history` (
  `id`           INTEGER      NOT NULL AUTO_INCREMENT,
  `candidate_id` INTEGER      NOT NULL,
  `job_id`       INTEGER      NULL,
  `event_type`   VARCHAR(100) NOT NULL,
  `title`        VARCHAR(255) NOT NULL,
  `description`  LONGTEXT     NULL,
  `created_by`   VARCHAR(191) NULL,
  `created_at`   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `candidate_history_candidate_id_idx` (`candidate_id`),
  INDEX `candidate_history_job_id_idx`       (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. AI SEARCH SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ai_search_sessions` (
  `id`                       INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`                VARCHAR(191) NOT NULL,
  `unit_id`                  VARCHAR(191) NOT NULL,
  `user_id`                  VARCHAR(191) NULL,
  `job_id`                   INTEGER      NULL,
  `search_type`              VARCHAR(100) NULL,
  `precision_mode`           VARCHAR(100) NOT NULL DEFAULT 'Equilibrada',
  `compatibility_threshold`  INTEGER      NOT NULL DEFAULT 70,
  `max_results`              INTEGER      NOT NULL DEFAULT 50,
  `distance_radius_km`       INTEGER      NULL,
  `location_rule`            VARCHAR(255) NULL,
  `only_with_resume`         BOOLEAN      NOT NULL DEFAULT false,
  `only_with_disc`           BOOLEAN      NOT NULL DEFAULT false,
  `filters_json`             LONGTEXT     NULL,
  `prompt`                   LONGTEXT     NULL,
  `summary`                  LONGTEXT     NULL,
  `created_at`               DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`               DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `ai_search_sessions_tenant_id_idx` (`tenant_id`),
  INDEX `ai_search_sessions_unit_id_idx`   (`unit_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. AI SEARCH RESULTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ai_search_results` (
  `id`                    INTEGER      NOT NULL AUTO_INCREMENT,
  `session_id`            INTEGER      NOT NULL,
  `candidate_id`          INTEGER      NOT NULL,
  `job_id`                INTEGER      NULL,
  `compatibility_score`   INTEGER      NULL,
  `classification`        VARCHAR(100) NULL,
  `distance_km`           DOUBLE       NULL,
  `has_disc`              BOOLEAN      NULL,
  `disc_profile`          VARCHAR(255) NULL,
  `strengths`             LONGTEXT     NULL,
  `attention_points`      LONGTEXT     NULL,
  `recommendation_reason` LONGTEXT     NULL,
  `risk_reason`           LONGTEXT     NULL,
  `ai_analysis_json`      LONGTEXT     NULL,
  `created_at`            DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `ai_search_results_session_id_idx`   (`session_id`),
  INDEX `ai_search_results_candidate_id_idx` (`candidate_id`),
  INDEX `ai_search_results_job_id_idx`       (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 14. AI CHAT MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
  `id`            INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`     VARCHAR(191) NOT NULL,
  `unit_id`       VARCHAR(191) NOT NULL,
  `user_id`       VARCHAR(191) NULL,
  `session_id`    INTEGER      NULL,
  `role`          VARCHAR(50)  NULL,
  `message`       LONGTEXT     NOT NULL,
  `tool_used`     VARCHAR(255) NULL,
  `metadata_json` LONGTEXT     NULL,
  `created_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `ai_chat_messages_tenant_id_idx`  (`tenant_id`),
  INDEX `ai_chat_messages_session_id_idx` (`session_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 15. AI MATCHING SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ai_matching_settings` (
  `id`                              INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`                       VARCHAR(191) NOT NULL,
  `unit_id`                         VARCHAR(191) NOT NULL,
  `default_precision_mode`          VARCHAR(100) NOT NULL DEFAULT 'Equilibrada',
  `default_compatibility_threshold` INTEGER      NOT NULL DEFAULT 70,
  `default_max_results`             INTEGER      NOT NULL DEFAULT 20,
  `default_distance_radius_km`      INTEGER      NOT NULL DEFAULT 50,
  `weight_location`                 INTEGER      NOT NULL DEFAULT 10,
  `weight_experience`               INTEGER      NOT NULL DEFAULT 20,
  `weight_hard_skills`              INTEGER      NOT NULL DEFAULT 20,
  `weight_soft_skills`              INTEGER      NOT NULL DEFAULT 15,
  `weight_disc`                     INTEGER      NOT NULL DEFAULT 15,
  `weight_education`                INTEGER      NOT NULL DEFAULT 10,
  `weight_salary`                   INTEGER      NOT NULL DEFAULT 5,
  `weight_work_model`               INTEGER      NOT NULL DEFAULT 5,
  `created_at`                      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`                      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `ai_matching_settings_tenant_id_unit_id_key` (`tenant_id`, `unit_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 16. HR TOOLS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `hr_tools` (
  `id`            INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`     VARCHAR(191) NOT NULL,
  `unit_id`       VARCHAR(191) NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `type`          VARCHAR(100) NOT NULL,
  `description`   LONGTEXT     NULL,
  `status`        VARCHAR(100) NOT NULL DEFAULT 'Ativo',
  `is_public`     BOOLEAN      NOT NULL DEFAULT true,
  `public_slug`   VARCHAR(255) NULL,
  `public_url`    VARCHAR(500) NULL,
  `expires_at`    DATETIME(0)  NULL,
  `settings_json` LONGTEXT     NULL,
  `created_by`    VARCHAR(191) NULL,
  `created_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `deleted_at`    DATETIME(0)  NULL,
  UNIQUE INDEX `hr_tools_public_slug_key` (`public_slug`),
  INDEX `hr_tools_tenant_id_idx` (`tenant_id`),
  INDEX `hr_tools_unit_id_idx`   (`unit_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 17. HR TOOL QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `hr_tool_questions` (
  `id`              INTEGER      NOT NULL AUTO_INCREMENT,
  `tool_id`         INTEGER      NOT NULL,
  `question_text`   LONGTEXT     NOT NULL,
  `question_type`   VARCHAR(100) NOT NULL,
  `is_required`     BOOLEAN      NOT NULL DEFAULT true,
  `is_eliminatory`  BOOLEAN      NOT NULL DEFAULT false,
  `expected_answer` LONGTEXT     NULL,
  `score_weight`    INTEGER      NOT NULL DEFAULT 1,
  `options_json`    LONGTEXT     NULL,
  `position`        INTEGER      NOT NULL DEFAULT 0,
  `created_at`      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `hr_tool_questions_tool_id_idx` (`tool_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 18. HR TOOL RESPONSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `hr_tool_responses` (
  `id`               INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`        VARCHAR(191) NOT NULL,
  `unit_id`          VARCHAR(191) NOT NULL,
  `tool_id`          INTEGER      NOT NULL,
  `candidate_id`     INTEGER      NULL,
  `job_id`           INTEGER      NULL,
  `candidate_name`   VARCHAR(255) NULL,
  `candidate_email`  VARCHAR(255) NULL,
  `status`           VARCHAR(100) NOT NULL DEFAULT 'Pendente',
  `started_at`       DATETIME(0)  NULL,
  `completed_at`     DATETIME(0)  NULL,
  `score`            INTEGER      NULL,
  `classification`   VARCHAR(255) NULL,
  `ai_summary`       LONGTEXT     NULL,
  `ai_analysis_json` LONGTEXT     NULL,
  `created_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `hr_tool_responses_tenant_id_idx`    (`tenant_id`),
  INDEX `hr_tool_responses_tool_id_idx`      (`tool_id`),
  INDEX `hr_tool_responses_candidate_id_idx` (`candidate_id`),
  INDEX `hr_tool_responses_job_id_idx`       (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 19. HR TOOL ANSWERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `hr_tool_answers` (
  `id`           INTEGER     NOT NULL AUTO_INCREMENT,
  `response_id`  INTEGER     NOT NULL,
  `question_id`  INTEGER     NOT NULL,
  `answer_text`  LONGTEXT    NULL,
  `answer_json`  LONGTEXT    NULL,
  `score`        INTEGER     NULL,
  `created_at`   DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `hr_tool_answers_response_id_idx`  (`response_id`),
  INDEX `hr_tool_answers_question_id_idx`  (`question_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 20. DISC LINKS (Links públicos de avaliação DISC)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `disc_links` (
  `id`           INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`    VARCHAR(191) NOT NULL,
  `unit_id`      VARCHAR(191) NULL,
  `candidate_id` INTEGER      NULL,
  `slug`         VARCHAR(191) NOT NULL,
  `label`        VARCHAR(255) NULL,
  `expires_at`   DATETIME(0)  NULL,
  `used_at`      DATETIME(0)  NULL,
  `created_at`   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `disc_links_slug_key` (`slug`),
  INDEX `disc_links_tenant_id_idx`    (`tenant_id`),
  INDEX `disc_links_candidate_id_idx` (`candidate_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 21. IMPORT BATCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `import_batches` (
  `id`                          INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`                   VARCHAR(191) NOT NULL,
  `unit_id`                     VARCHAR(191) NOT NULL,
  `job_id`                      INTEGER      NULL,
  `name`                        VARCHAR(255) NOT NULL,
  `import_type`                 VARCHAR(100) NOT NULL DEFAULT 'mixed',
  `status`                      VARCHAR(100) NOT NULL DEFAULT 'pending',
  `analysis_mode`               VARCHAR(100) NOT NULL DEFAULT 'full',
  `precision_mode`              VARCHAR(100) NOT NULL DEFAULT 'Equilibrada',
  `compatibility_threshold`     INTEGER      NOT NULL DEFAULT 70,
  `max_highlighted_candidates`  INTEGER      NOT NULL DEFAULT 20,
  `duplicate_strategy`          VARCHAR(100) NOT NULL DEFAULT 'manual',
  `location_rule`               VARCHAR(255) NOT NULL DEFAULT 'Peso médio',
  `distance_radius_km`          INTEGER      NOT NULL DEFAULT 50,
  `language_mode`               VARCHAR(100) NOT NULL DEFAULT 'Automático',
  `tags`                        LONGTEXT     NULL,
  `notes`                       LONGTEXT     NULL,
  `total_files`                 INTEGER      NOT NULL DEFAULT 0,
  `processed_files`             INTEGER      NOT NULL DEFAULT 0,
  `created_candidates`          INTEGER      NOT NULL DEFAULT 0,
  `updated_candidates`          INTEGER      NOT NULL DEFAULT 0,
  `duplicate_files`             INTEGER      NOT NULL DEFAULT 0,
  `error_files`                 INTEGER      NOT NULL DEFAULT 0,
  `summary`                     LONGTEXT     NULL,
  `created_by`                  VARCHAR(191) NULL,
  `created_at`                  DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`                  DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `import_batches_tenant_id_idx` (`tenant_id`),
  INDEX `import_batches_unit_id_idx`   (`unit_id`),
  INDEX `import_batches_job_id_idx`    (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 22. IMPORT FILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `import_files` (
  `id`                           INTEGER      NOT NULL AUTO_INCREMENT,
  `batch_id`                     INTEGER      NOT NULL,
  `tenant_id`                    VARCHAR(191) NOT NULL,
  `unit_id`                      VARCHAR(191) NOT NULL,
  `candidate_id`                 INTEGER      NULL,
  `file_name`                    VARCHAR(255) NOT NULL,
  `file_path`                    VARCHAR(500) NULL,
  `file_type`                    VARCHAR(255) NULL,
  `file_size`                    INTEGER      NULL,
  `status`                       VARCHAR(100) NOT NULL DEFAULT 'pending',
  `progress`                     INTEGER      NOT NULL DEFAULT 0,
  `extracted_text`               LONGTEXT     NULL,
  `parsed_data_json`             LONGTEXT     NULL,
  `ai_summary`                   LONGTEXT     NULL,
  `duplicate_status`             VARCHAR(100) NULL,
  `duplicate_candidate_id`       INTEGER      NULL,
  `compatibility_score`          INTEGER      NULL,
  `compatibility_classification` VARCHAR(255) NULL,
  `job_analysis_json`            LONGTEXT     NULL,
  `error_message`                LONGTEXT     NULL,
  `created_at`                   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`                   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `import_files_batch_id_idx`     (`batch_id`),
  INDEX `import_files_tenant_id_idx`    (`tenant_id`),
  INDEX `import_files_candidate_id_idx` (`candidate_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 23. IMPORT BATCH EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `import_batch_events` (
  `id`            INTEGER      NOT NULL AUTO_INCREMENT,
  `batch_id`      INTEGER      NOT NULL,
  `event_type`    VARCHAR(100) NOT NULL,
  `description`   LONGTEXT     NULL,
  `metadata_json` LONGTEXT     NULL,
  `created_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `import_batch_events_batch_id_idx` (`batch_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 24. JOB IMPORTS (importação de vagas por arquivo)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `job_imports` (
  `id`               INTEGER      NOT NULL AUTO_INCREMENT,
  `tenant_id`        VARCHAR(191) NOT NULL,
  `unit_id`          VARCHAR(191) NOT NULL,
  `job_id`           INTEGER      NULL,
  `file_name`        VARCHAR(255) NOT NULL,
  `file_path`        VARCHAR(500) NULL,
  `file_type`        VARCHAR(255) NULL,
  `file_size`        INTEGER      NULL,
  `status`           VARCHAR(100) NOT NULL DEFAULT 'uploaded',
  `extracted_text`   LONGTEXT     NULL,
  `parsed_data_json` LONGTEXT     NULL,
  `confidence_json`  LONGTEXT     NULL,
  `ai_summary`       LONGTEXT     NULL,
  `error_message`    LONGTEXT     NULL,
  `created_by`       VARCHAR(191) NULL,
  `created_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `job_imports_tenant_id_idx` (`tenant_id`),
  INDEX `job_imports_unit_id_idx`   (`unit_id`),
  INDEX `job_imports_job_id_idx`    (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 25. JOB PUBLICATION TEXTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `job_publication_texts` (
  `id`         INTEGER      NOT NULL AUTO_INCREMENT,
  `job_id`     INTEGER      NOT NULL,
  `channel`    VARCHAR(100) NOT NULL,
  `title`      VARCHAR(255) NULL,
  `content`    LONGTEXT     NULL,
  `created_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `job_publication_texts_job_id_idx` (`job_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 26. LINKEDIN PUBLICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `linkedin_publications` (
  `id`            INTEGER      NOT NULL AUTO_INCREMENT,
  `job_id`        INTEGER      NOT NULL,
  `tenant_id`     VARCHAR(191) NOT NULL,
  `status`        VARCHAR(100) NOT NULL DEFAULT 'pending',
  `linkedin_url`  VARCHAR(500) NULL,
  `error_message` LONGTEXT     NULL,
  `started_at`    DATETIME(0)  NULL,
  `completed_at`  DATETIME(0)  NULL,
  `created_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`    DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `linkedin_publications_job_id_idx`    (`job_id`),
  INDEX `linkedin_publications_tenant_id_idx` (`tenant_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 27. TENANT SETTINGS (auto-limpeza)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`            VARCHAR(191) NOT NULL,
  `auto_delete_enabled`  TINYINT(1)   NOT NULL DEFAULT 0,
  `auto_delete_interval` VARCHAR(50)  NOT NULL DEFAULT '6_months',
  `auto_delete_target`   VARCHAR(50)  NOT NULL DEFAULT 'candidates',
  `created_at`           DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_settings_tenant_id_key` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 28. USER PREFERENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id`         INTEGER      NOT NULL AUTO_INCREMENT,
  `user_id`    VARCHAR(191) NOT NULL,
  `tenant_id`  VARCHAR(191) NOT NULL,
  `key`        VARCHAR(255) NOT NULL,
  `value`      LONGTEXT     NOT NULL,
  `created_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `user_preferences_user_id_key_key` (`user_id`, `key`),
  INDEX `user_preferences_user_id_idx`   (`user_id`),
  INDEX `user_preferences_tenant_id_idx` (`tenant_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- FIM — Schema completo Triagem Smart v1.0
-- =============================================================================

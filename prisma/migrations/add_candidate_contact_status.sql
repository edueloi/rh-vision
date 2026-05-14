CREATE TABLE IF NOT EXISTS candidate_contact_statuses (
  id             INT NOT NULL AUTO_INCREMENT,
  tenant_id      VARCHAR(191) NOT NULL,
  candidate_id   INT NOT NULL,
  job_id         INT NOT NULL,
  contact_status VARCHAR(50) NOT NULL DEFAULT '',
  contact_notes  TEXT,
  updated_at     DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_candidate_job (candidate_id, job_id),
  KEY idx_tenant_id (tenant_id),
  KEY idx_candidate_id (candidate_id),
  KEY idx_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

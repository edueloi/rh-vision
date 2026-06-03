ALTER TABLE tenants ADD COLUMN max_jobs              INT NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN max_candidates        INT NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN max_ai_analyses_month INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tenant_ai_usage (
  id           INT          NOT NULL AUTO_INCREMENT,
  tenant_id    VARCHAR(191) NOT NULL,
  `year_month` VARCHAR(7)   NOT NULL,
  analyses     INT          NOT NULL DEFAULT 0,
  created_at   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_month (tenant_id, `year_month`),
  KEY idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_settings (
  id                   INT          NOT NULL AUTO_INCREMENT,
  tenant_id            VARCHAR(191) NOT NULL,
  auto_delete_enabled  TINYINT(1)   NOT NULL DEFAULT 0,
  auto_delete_interval VARCHAR(50)  NOT NULL DEFAULT '6_months',
  auto_delete_target   VARCHAR(50)  NOT NULL DEFAULT 'candidates',
  created_at           DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY tenant_settings_tenant_id_key (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

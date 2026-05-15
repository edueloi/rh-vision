import { prisma } from '../../lib/db';

export async function ensureUnitCountryColumn() {
  const existingColumn = await prisma.$queryRawUnsafe<any[]>(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'units'
      AND COLUMN_NAME = 'country'
    LIMIT 1
  `);

  if (!Array.isArray(existingColumn) || existingColumn.length === 0) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE units
      ADD COLUMN country VARCHAR(255) NULL AFTER state
    `);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE units
    SET country = 'Brasil'
    WHERE country IS NULL OR TRIM(country) = ''
  `);
}

export async function ensureContactStatusTable() {
  try {
    await prisma.$executeRawUnsafe(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists')) {
      console.warn('[ensureContactStatusTable]', err?.message);
    }
  }
}

export async function ensureUserPreferencesTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id         INT NOT NULL AUTO_INCREMENT,
        user_id    VARCHAR(191) NOT NULL,
        tenant_id  VARCHAR(191) NOT NULL,
        \`key\`    VARCHAR(100) NOT NULL,
        value      LONGTEXT NOT NULL,
        updated_at DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_key (user_id, \`key\`),
        KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists')) {
      console.warn('[ensureUserPreferencesTable]', err?.message);
    }
  }
}

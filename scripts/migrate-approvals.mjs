import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  // Create job_approvals table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS job_approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL,
      tenant_id VARCHAR(191) NOT NULL,
      action VARCHAR(50) NOT NULL,
      actor_id VARCHAR(191) NOT NULL,
      actor_name VARCHAR(255) NOT NULL,
      notes LONGTEXT,
      created_at DATETIME(0) DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_job_approvals_job_id (job_id),
      INDEX idx_job_approvals_tenant_id (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).then(() => console.log('OK: job_approvals table')).catch(e => console.error('job_approvals:', e.message));

  // Add columns safely — check information_schema first
  const cols = [
    ['approval_status',         'VARCHAR(50) NULL'],
    ['approval_requested_by',   'VARCHAR(191) NULL'],
    ['approval_requested_at',   'DATETIME(0) NULL'],
    ['approval_resolved_at',    'DATETIME(0) NULL'],
  ];

  for (const [col, def] of cols) {
    const exists = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = ?`,
      col
    );
    if (exists[0].cnt > 0) {
      console.log(`SKIP: ${col} already exists`);
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE jobs ADD COLUMN ${col} ${def}`)
        .then(() => console.log(`OK: added ${col}`))
        .catch(e => console.error(`${col}:`, e.message));
    }
  }

  await prisma.$disconnect();
  console.log('Migration concluída.');
}

run();

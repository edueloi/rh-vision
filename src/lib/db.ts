import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };

// ──────────────────────────────────────────────────────────────────────────────
// SQL dialect translator: SQLite → MySQL
// ──────────────────────────────────────────────────────────────────────────────
function toMySQL(sql: string): string {
  return sql
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
    // SQLite ON CONFLICT → MySQL ON DUPLICATE KEY UPDATE
    // E.g. ON CONFLICT(col) DO UPDATE SET a = excluded.a, b = excluded.b
    .replace(
      /ON CONFLICT\([^)]+\) DO UPDATE SET ([\s\S]*?)(?=\s*(?:WHERE|RETURNING|$|;))/gi,
      (_m, sets: string) => {
        const mysqlSets = sets
          .trim()
          .split(',')
          .map(s => s.trim().replace(/(\w+)\s*=\s*excluded\.(\w+)/, '$1 = VALUES($1)'))
          .join(', ');
        return `ON DUPLICATE KEY UPDATE ${mysqlSets}`;
      }
    )
    // date('now', '-N days') → DATE_SUB(NOW(), INTERVAL N DAY)
    .replace(
      /date\('now',\s*['"]-(\d+)\s*(year|years|day|days|month|months)['"]?\)/gi,
      (_m, n: string, unit: string) => {
        const u = unit.replace(/s$/i, '').toUpperCase();
        return `DATE_SUB(NOW(), INTERVAL ${n} ${u})`;
      }
    )
    // strftime('%Y-%m', col) → DATE_FORMAT(col, '%Y-%m')
    .replace(/strftime\('([^']+)',\s*([^)]+)\)/gi, "DATE_FORMAT($2, '$1')")
    // datetime('now') → NOW()
    .replace(/datetime\('now'\)/gi, 'NOW()')
    // CURRENT_TIMESTAMP stays — both SQLite and MySQL support it
    // datetime(col) → col (MySQL doesn't need this cast)
    .replace(/datetime\(([^)]+)\)/gi, '$1')
    // SQLite-only PRAGMA / sqlite_master → no-op
    .replace(/PRAGMA\s+\S+.*$/gim, '-- pragma removed')
    .replace(/sqlite_master/gi, 'information_schema.tables');
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// ──────────────────────────────────────────────────────────────────────────────
// Async prepare shim — mirrors better-sqlite3 API but returns Promises
// ──────────────────────────────────────────────────────────────────────────────
export function prepare(sql: string) {
  const mysqlSql = toMySQL(sql);

  return {
    /** Returns first matching row or null */
    get: (...params: any[]): Promise<any> =>
      prisma.$queryRawUnsafe<any[]>(mysqlSql, ...params.flat()).then(r => serializeBigInt(r[0] ?? null)),

    /** Returns all matching rows */
    all: (...params: any[]): Promise<any[]> =>
      prisma.$queryRawUnsafe<any[]>(mysqlSql, ...params.flat()).then(r => serializeBigInt(r)),

    /** Executes a write query; returns { lastInsertRowid } */
    run: async (...params: any[]): Promise<{ lastInsertRowid: number | null; changes: number }> => {
      const isInsert = /^\s*INSERT/i.test(mysqlSql);
      const changes = await prisma.$executeRawUnsafe(mysqlSql, ...params.flat());
      let lastInsertRowid: number | null = null;
      if (isInsert) {
        const row = await prisma.$queryRaw<[{ id: bigint }]>`SELECT LAST_INSERT_ID() as id`;
        lastInsertRowid = Number(row[0]?.id ?? 0) || null;
      }
      return { lastInsertRowid, changes };
    },
  };
}

// Convenience wrapper so server.ts can import db as a default and call db.prepare(...)
const db = { prepare };
export default db;

// ──────────────────────────────────────────────────────────────────────────────
// Seed / initDb
// ──────────────────────────────────────────────────────────────────────────────

const ROOT_PERMISSIONS_JSON = JSON.stringify({
  dashboard: true, aurora_ai: true, jobs: true, candidates: true,
  imports: true, tools: true, administration: true, super_admin: true,
});
const ADMIN_PERMISSIONS_JSON = JSON.stringify({
  dashboard: true, aurora_ai: true, jobs: true, candidates: true,
  imports: true, tools: true, administration: true, super_admin: false,
});
const OPERATION_PERMISSIONS_JSON = JSON.stringify({
  dashboard: true, aurora_ai: true, jobs: true, candidates: true,
  imports: true, tools: true, administration: false, super_admin: false,
});

function addDays(d: Date, days: number) {
  const r = new Date(d); r.setDate(r.getDate() + days); return r;
}

export async function initDb() {
  const now = new Date();

  await prisma.tenant.upsert({
    where: { id: 'develoi' },
    update: {},
    create: {
      id: 'develoi', name: 'Recrute IA', document: '00.000.000/0001-00',
      status: 'Ativo', plan_label: 'Plano Anual', validity_days: 3650,
      starts_at: now, expires_at: addDays(now, 3650), max_users: 999,
      access_profile: 'admin-mestre',
    },
  });

  await prisma.unit.upsert({
    where: { id: 'master' },
    update: {},
    create: { id: 'master', tenant_id: 'develoi', name: 'Develoi - Central (Master)', city: 'Todas', state: 'N/A', is_master: true },
  });

  await prisma.user.upsert({
    where: { id: 'admin-root' },
    update: { permissions_json: ROOT_PERMISSIONS_JSON },
    create: {
      id: 'admin-root', tenant_id: 'develoi', full_name: 'Admin Master',
      email: 'admin', password: 'admin', role: 'admin', status: 'Ativo',
      access_profile: 'custom', permissions_json: ROOT_PERMISSIONS_JSON,
    },
  });

  for (const u of [
    { id: 'tatui', name: 'Develoi - Tatuí', city: 'Tatuí', state: 'SP' },
    { id: 'curitiba', name: 'Develoi - Curitiba', city: 'Curitiba', state: 'PR' },
    { id: 'rio', name: 'Develoi - Rio de Janeiro', city: 'Rio de Janeiro', state: 'RJ' },
    { id: 'bh', name: 'Develoi - Belo Horizonte', city: 'Belo Horizonte', state: 'MG' },
  ]) {
    await prisma.unit.upsert({ where: { id: u.id }, update: {}, create: { ...u, tenant_id: 'develoi' } });
  }

  const discTool = await prisma.hrTool.upsert({
    where: { public_slug: 'disc-standard' },
    update: {},
    create: { tenant_id: 'develoi', unit_id: 'master', name: 'Avaliação DISC', type: 'DISC', description: 'Avaliação DISC.', public_slug: 'disc-standard', is_public: true },
  });

  const cultureTool = await prisma.hrTool.upsert({
    where: { public_slug: 'cultural-fit-master' },
    update: {},
    create: { tenant_id: 'develoi', unit_id: 'master', name: 'Fit Cultural', type: 'culture-fit', description: 'Fit Cultural.', public_slug: 'cultural-fit-master', is_public: true },
  });

  if (await prisma.hrToolQuestion.count({ where: { tool_id: discTool.id } }) === 0) {
    await prisma.hrToolQuestion.createMany({ data: [
      { tool_id: discTool.id, question_text: 'Como você se comporta sob pressão?', question_type: 'text', position: 0 },
      { tool_id: discTool.id, question_text: 'Você prefere trabalhar sozinho ou em equipe?', question_type: 'yes-no', position: 1 },
      { tool_id: discTool.id, question_text: 'Em uma escala de 1 a 10, rotinas claras?', question_type: 'scale-10', position: 2 },
    ]});
  }

  if (await prisma.hrToolQuestion.count({ where: { tool_id: cultureTool.id } }) === 0) {
    await prisma.hrToolQuestion.createMany({ data: [
      { tool_id: cultureTool.id, question_text: 'O que você mais valoriza em uma empresa?', question_type: 'text', position: 0 },
      { tool_id: cultureTool.id, question_text: 'Você é pontual?', question_type: 'scale-5', position: 1 },
      { tool_id: cultureTool.id, question_text: 'Prefere ambientes estáveis ou em mudança?', question_type: 'text', position: 2 },
    ]});
  }

  if (await prisma.job.count({ where: { id: 1 } }) === 0) {
    await prisma.job.create({ data: {
      id: 1, tenant_id: 'develoi', unit_id: 'tatui', title: 'Motorista Carreteiro',
      department: 'Logística', city: 'Tatuí', state: 'SP', work_model: 'Presencial',
      contract_type: 'CLT', status: 'Aberta', is_public: true,
      description: 'Vaga para transporte rodoviário de cargas pesadas.',
    }});
  }

  await prisma.user.updateMany({ where: { id: 'admin-root' }, data: { permissions_json: ROOT_PERMISSIONS_JSON, access_profile: 'custom' } });
  await prisma.user.updateMany({ where: { role: 'admin', id: { not: 'admin-root' }, permissions_json: null }, data: { permissions_json: ADMIN_PERMISSIONS_JSON, access_profile: 'admin-mestre' } });
  await prisma.user.updateMany({ where: { role: 'user', permissions_json: null }, data: { permissions_json: OPERATION_PERMISSIONS_JSON } });
}

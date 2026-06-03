// tenant-limits.ts — Enforcing de limites por tenant
// 0 = ilimitado. Retorna { allowed: false, error: '...' } quando estourar.

import db from '../../lib/db';

interface LimitCheck {
  allowed: boolean;
  error?: string;
  current?: number;
  limit?: number;
}

function getTenant(tenantId: string): any {
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
}

// ── Vagas ─────────────────────────────────────────────────────────────────────
export function checkJobLimit(tenantId: string): LimitCheck {
  const tenant = getTenant(tenantId);
  if (!tenant) return { allowed: true };
  const max = Number(tenant.max_jobs || 0);
  if (max === 0) return { allowed: true }; // ilimitado

  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM jobs WHERE tenant_id = ? AND deleted_at IS NULL AND status != 'Encerrada'"
  ).get(tenantId) as any;
  const current = Number(row?.cnt || 0);

  if (current >= max) {
    return {
      allowed: false,
      current,
      limit: max,
      error: `Limite de vagas atingido (${current}/${max}). Encerre ou remova vagas antes de criar novas, ou solicite aumento de limite ao administrador.`,
    };
  }
  return { allowed: true, current, limit: max };
}

// ── Candidatos ────────────────────────────────────────────────────────────────
export function checkCandidateLimit(tenantId: string): LimitCheck {
  const tenant = getTenant(tenantId);
  if (!tenant) return { allowed: true };
  const max = Number(tenant.max_candidates || 0);
  if (max === 0) return { allowed: true };

  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL"
  ).get(tenantId) as any;
  const current = Number(row?.cnt || 0);

  if (current >= max) {
    return {
      allowed: false,
      current,
      limit: max,
      error: `Limite de candidatos atingido (${current}/${max}). Solicite aumento de limite ao administrador.`,
    };
  }
  return { allowed: true, current, limit: max };
}

// ── Análises IA (por mês) ─────────────────────────────────────────────────────
export function checkAiAnalysisLimit(tenantId: string): LimitCheck {
  const tenant = getTenant(tenantId);
  if (!tenant) return { allowed: true };
  const max = Number(tenant.max_ai_analyses_month || 0);
  if (max === 0) return { allowed: true };

  const yearMonth = new Date().toISOString().slice(0, 7); // '2026-06'
  const row = db.prepare(
    'SELECT analyses FROM tenant_ai_usage WHERE tenant_id = ? AND `year_month` = ?'
  ).get(tenantId, yearMonth) as any;
  const current = Number(row?.analyses || 0);

  if (current >= max) {
    return {
      allowed: false,
      current,
      limit: max,
      error: `Limite de análises IA atingido este mês (${current}/${max}). O limite renova todo mês. Solicite aumento ao administrador.`,
    };
  }
  return { allowed: true, current, limit: max };
}

// Incrementa contador de análises IA do mês
export function incrementAiAnalysis(tenantId: string): void {
  const yearMonth = new Date().toISOString().slice(0, 7);
  try {
    const sql = 'INSERT INTO tenant_ai_usage (tenant_id, `year_month`, analyses) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE analyses = analyses + 1';
    db.prepare(sql).run(tenantId, yearMonth);
  } catch { /* silent */ }
}

// Retorna uso atual do tenant (para exibir no Super Admin)
export function getTenantUsage(tenantId: string) {
  const yearMonth = new Date().toISOString().slice(0, 7);

  const jobs = db.prepare(
    "SELECT COUNT(*) as cnt FROM jobs WHERE tenant_id = ? AND deleted_at IS NULL AND status != 'Encerrada'"
  ).get(tenantId) as any;

  const candidates = db.prepare(
    'SELECT COUNT(*) as cnt FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL'
  ).get(tenantId) as any;

  const aiRow = db.prepare(
    'SELECT analyses FROM tenant_ai_usage WHERE tenant_id = ? AND `year_month` = ?'
  ).get(tenantId, yearMonth) as any;

  return {
    jobs_active:       Number(jobs?.cnt || 0),
    candidates_total:  Number(candidates?.cnt || 0),
    ai_analyses_month: Number(aiRow?.analyses || 0),
    year_month:        yearMonth,
  };
}

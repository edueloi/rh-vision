import { Express } from 'express';
import db from '../../lib/db';

// Tenant/unit de destino para vagas vindas do portal Shigueno.
// Configura via .env: SHIGUENO_TENANT_IDS (usa o primeiro da lista) e SHIGUENO_UNIT_ID
const RAW_TENANT_IDS = process.env.SHIGUENO_TENANT_IDS || '';
const SHIGUENO_TENANT_ID = RAW_TENANT_IDS.split(',')[0]?.trim() || 'shigueno';
const SHIGUENO_UNIT_ID = process.env.SHIGUENO_UNIT_ID || `master-${SHIGUENO_TENANT_ID}`;
const WEBHOOK_SECRET = process.env.SHIGUENO_WEBHOOK_SECRET || 'shigueno-webhook-2026';

// Mapa de status do Shigueno → RH Vision
const STATUS_MAP: Record<string, string> = {
  'Ativa': 'Aberta',
  'Pausada': 'Pausada',
};

export function registerShiguenoWebhookRoutes(app: Express) {
  // POST /api/webhook/shigueno/vacancies — recebe vagas do portal Shigueno
  app.post('/api/webhook/shigueno/vacancies', async (req, res) => {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook secret inválido.' });
    }

    const { action, vacancy } = req.body;

    if (!action || !vacancy) {
      return res.status(400).json({ error: 'Campos "action" e "vacancy" são obrigatórios.' });
    }

    if (!['upsert', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Action deve ser "upsert" ou "delete".' });
    }

    try {
      if (action === 'delete') {
        // Soft-delete pela referência externa
        await db.prepare(`
          UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND tags LIKE ?
        `).run(SHIGUENO_TENANT_ID, `%shigueno_id:${vacancy.id}%`);

        return res.json({ success: true, action: 'deleted' });
      }

      // action === 'upsert': criar ou atualizar
      const mapped_status = STATUS_MAP[vacancy.status] || 'Rascunho';
      const tag = `shigueno_id:${vacancy.id}`;

      const existing = await db.prepare(`
        SELECT id FROM jobs WHERE tenant_id = ? AND tags LIKE ? AND deleted_at IS NULL
      `).get(SHIGUENO_TENANT_ID, `%${tag}%`) as any;

      if (existing) {
        await db.prepare(`
          UPDATE jobs SET
            title = ?, department = ?, description = ?, requirements = ?,
            mandatory_requirements = ?, city = ?, state = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          vacancy.title,
          vacancy.department || null,
          vacancy.description || null,
          vacancy.requirements || null,
          vacancy.requirements || null,
          extractCity(vacancy.location),
          extractState(vacancy.location),
          mapped_status,
          existing.id
        );

        return res.json({ success: true, action: 'updated', id: existing.id });
      } else {
        const result = await db.prepare(`
          INSERT INTO jobs (
            tenant_id, unit_id, title, department, description,
            mandatory_requirements, city, state, status, tags,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          SHIGUENO_TENANT_ID,
          SHIGUENO_UNIT_ID,
          vacancy.title,
          vacancy.department || null,
          vacancy.description || null,
          vacancy.requirements || null,
          extractCity(vacancy.location),
          extractState(vacancy.location),
          mapped_status,
          tag
        );

        return res.status(201).json({ success: true, action: 'created', id: result.lastInsertRowid });
      }
    } catch (error) {
      console.error('[Shigueno Webhook] Error:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook.' });
    }
  });

  // POST /api/webhook/shigueno/candidates — recebe candidatos do portal Shigueno
  app.post('/api/webhook/shigueno/candidates', async (req, res) => {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook secret inválido.' });
    }

    const { candidate, vacancy_id } = req.body;

    if (!candidate?.name || !candidate?.email) {
      return res.status(400).json({ error: 'Campos "candidate.name" e "candidate.email" são obrigatórios.' });
    }

    try {
      // Encontra a vaga no RH Vision pelo shigueno_id
      let rh_job_id: number | null = null;
      if (vacancy_id) {
        const job = await db.prepare(`
          SELECT id FROM jobs WHERE tenant_id = ? AND tags LIKE ? AND deleted_at IS NULL
        `).get(SHIGUENO_TENANT_ID, `%shigueno_id:${vacancy_id}%`) as any;
        if (job) rh_job_id = job.id;
      }

      // Verifica se candidato já existe pelo email
      const existing = await db.prepare(`
        SELECT id FROM candidates WHERE tenant_id = ? AND email = ? AND deleted_at IS NULL
      `).get(SHIGUENO_TENANT_ID, candidate.email) as any;

      let candidateId: number;

      if (existing) {
        candidateId = existing.id;
      } else {
        const result = await db.prepare(`
          INSERT INTO candidates (
            tenant_id, unit_id, full_name, email, phone,
            professional_summary, source, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'Portal Shigueno', 'Novo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          SHIGUENO_TENANT_ID,
          SHIGUENO_UNIT_ID,
          candidate.name,
          candidate.email,
          candidate.phone || null,
          candidate.cv_text || null
        );
        candidateId = Number(result.lastInsertRowid);
      }

      // Vincula candidato à vaga se informado
      if (rh_job_id) {
        const matchExists = await db.prepare(`
          SELECT id FROM candidate_job_matches WHERE candidate_id = ? AND job_id = ?
        `).get(candidateId, rh_job_id) as any;

        if (!matchExists) {
          await db.prepare(`
            INSERT INTO candidate_job_matches (tenant_id, candidate_id, job_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'Inscrito', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(SHIGUENO_TENANT_ID, candidateId, rh_job_id);
        }
      }

      return res.status(201).json({ success: true, candidate_id: candidateId, job_id: rh_job_id });
    } catch (error) {
      console.error('[Shigueno Webhook] Candidate error:', error);
      return res.status(500).json({ error: 'Erro ao processar candidato.' });
    }
  });

  // GET /api/webhook/shigueno/sync — sincroniza todas as vagas ativas (chamada manual)
  app.get('/api/webhook/shigueno/status', async (req, res) => {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook secret inválido.' });
    }
    try {
      const jobs = await db.prepare(`
        SELECT id, title, status, tags, created_at FROM jobs
        WHERE tenant_id = ? AND tags LIKE '%shigueno_id:%' AND deleted_at IS NULL
        ORDER BY created_at DESC
      `).all(SHIGUENO_TENANT_ID) as any[];

      const candidates = await db.prepare(`
        SELECT COUNT(*) as total FROM candidates
        WHERE tenant_id = ? AND source = 'Portal Shigueno' AND deleted_at IS NULL
      `).get(SHIGUENO_TENANT_ID) as any;

      res.json({
        tenant_id: SHIGUENO_TENANT_ID,
        synced_jobs: jobs.length,
        synced_candidates: candidates?.total || 0,
        jobs
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao consultar status.' });
    }
  });
}

function extractCity(location: string | undefined): string {
  if (!location) return 'Tatuí';
  // Formato: "Tatuí - SP"
  return location.split('-')[0].trim();
}

function extractState(location: string | undefined): string {
  if (!location) return 'SP';
  const parts = location.split('-');
  return parts.length > 1 ? parts[1].trim() : 'SP';
}

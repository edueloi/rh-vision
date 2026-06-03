import { Express } from 'express';
import db from '../../lib/db';
import { publishJobToLinkedIn, LinkedInJobPayload, PublishStatus } from '../services/linkedin-bot';

function getBaseUrl(): string {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

export function registerLinkedInRoutes(app: Express) {
  // GET /api/jobs/:id/linkedin — busca publicações anteriores
  app.get('/api/jobs/:id/linkedin', async (req, res) => {
    try {
      const pubs = await db.prepare(
        `SELECT id, status, linkedin_url, error_message, created_at, updated_at
         FROM linkedin_publications WHERE job_id = ? ORDER BY created_at DESC LIMIT 10`
      ).all(req.params.id);
      res.json(pubs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch LinkedIn publications' });
    }
  });

  // POST /api/jobs/:id/publish/linkedin — dispara o bot
  app.post('/api/jobs/:id/publish/linkedin', async (req, res) => {
    const jobId = req.params.id;
    const { triggered_by } = req.body;

    try {
      const job = await db.prepare(
        `SELECT j.*, t.company_name, t.name as tenant_name
         FROM jobs j LEFT JOIN tenants t ON j.tenant_id = t.id
         WHERE j.id = ? AND j.deleted_at IS NULL`
      ).get(jobId) as any;

      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      // Create pending record
      const { lastInsertRowid: pubId } = await db.prepare(
        `INSERT INTO linkedin_publications (job_id, tenant_id, status, triggered_by, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, NOW(), NOW())`
      ).run(job.id, job.tenant_id, triggered_by || null);

      // Respond immediately — bot runs async
      res.json({ id: pubId, status: 'pending', message: 'Bot iniciado. Acompanhe o status em tempo real.' });

      // Build public URL
      const baseUrl = getBaseUrl();
      const publicUrl = job.public_slug
        ? `${baseUrl}/vaga/${job.public_slug}`
        : `${baseUrl}/vaga/${job.id}`;

      const payload: LinkedInJobPayload = {
        title: job.title,
        company: job.company_name || job.tenant_name,
        city: job.city,
        state: job.state,
        description: job.description || '',
        responsibilities: job.responsibilities,
        requirements: job.mandatory_requirements || job.technical_requirements,
        benefits: job.benefits,
        workModel: job.work_model,
        contractType: job.contract_type,
        seniorityLevel: job.seniority_level,
        publicUrl,
      };

      // Update status helper
      const updateStatus = async (status: PublishStatus, detail?: string) => {
        console.log(`[linkedin-bot] job=${jobId} pub=${pubId} status=${status}${detail ? ` — ${detail}` : ''}`);
        await db.prepare(
          `UPDATE linkedin_publications SET status = ?, updated_at = NOW() WHERE id = ?`
        ).run(status, pubId).catch(() => {});
      };

      // Run bot
      updateStatus('logging_in');
      const result = await publishJobToLinkedIn(payload, updateStatus);

      if (result.success) {
        await db.prepare(
          `UPDATE linkedin_publications SET status = 'done', linkedin_url = ?, updated_at = NOW() WHERE id = ?`
        ).run(result.linkedinUrl || null, pubId);

        // Save URL back to job record
        if (result.linkedinUrl) {
          await db.prepare(
            `UPDATE jobs SET external_link_linkedin = ?, updated_at = NOW() WHERE id = ?`
          ).run(result.linkedinUrl, job.id);
        }
      } else {
        await db.prepare(
          `UPDATE linkedin_publications SET status = 'error', error_message = ?, screenshot_b64 = ?, updated_at = NOW() WHERE id = ?`
        ).run(result.error || 'Erro desconhecido', result.screenshot || null, pubId);
      }
    } catch (error: any) {
      console.error('[linkedin route] error:', error);
      // Don't try to respond again — headers already sent
    }
  });

  // GET /api/jobs/:id/linkedin/:pubId — status de uma publicação específica
  app.get('/api/jobs/:id/linkedin/:pubId', async (req, res) => {
    try {
      const pub = await db.prepare(
        `SELECT id, status, linkedin_url, error_message, screenshot_b64, created_at, updated_at
         FROM linkedin_publications WHERE id = ? AND job_id = ?`
      ).get(req.params.pubId, req.params.id);
      if (!pub) return res.status(404).json({ error: 'Publicação não encontrada' });
      res.json(pub);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch publication status' });
    }
  });
}

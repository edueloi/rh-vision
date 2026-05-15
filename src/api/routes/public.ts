import { Express } from 'express';
import db from '../../lib/db';
import { upload } from '../helpers/files';

export function registerPublicRoutes(app: Express) {
  app.get('/api/public/tenants/:id', async (req, res) => {
    try {
      const tenant = await db.prepare('SELECT id, name, company_name, email, phone FROM tenants WHERE id = ?').get(req.params.id) as any;
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant info' });
    }
  });

  app.get('/api/public/hr-tools/:slug', async (req, res) => {
    try {
      const tool = await db.prepare("SELECT h.*, t.name as tenant_name FROM hr_tools h JOIN tenants t ON h.tenant_id = t.id WHERE h.public_slug = ? AND h.status = 'Ativo'").get(req.params.slug);
      if (!tool) return res.status(404).json({ error: 'Tool not found or inactive' });

      const questions = await db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all((tool as any).id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool' });
    }
  });

  app.post('/api/public/hr-tools/:slug/submit', async (req, res) => {
    const { candidateInfo, answers, jobId } = req.body;
    const { slug } = req.params;
    try {
      const tool = await db.prepare('SELECT * FROM hr_tools WHERE public_slug = ?').get(slug) as any;
      if (!tool) return res.status(404).json({ error: 'Tool not found' });

      let candidateId: number | bigint | any;
      const existingCandidate = await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ? AND deleted_at IS NULL').get(candidateInfo.email, tool.tenant_id) as any;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        const newCandRes = await db.prepare(`
          INSERT INTO candidates (tenant_id, unit_id, full_name, email, phone, source, status)
          VALUES (?, ?, ?, ?, ?, 'Ferramenta RH', 'Novo')
        `).run(tool.tenant_id, tool.unit_id, candidateInfo.full_name, candidateInfo.email, candidateInfo.phone);
        candidateId = newCandRes.lastInsertRowid;
      }

      const responseRes = await db.prepare(`
        INSERT INTO hr_tool_responses (tenant_id, unit_id, tool_id, candidate_id, job_id, status, completed_at)
        VALUES (?, ?, ?, ?, ?, 'Concluído', CURRENT_TIMESTAMP)
      `).run(tool.tenant_id, tool.unit_id, tool.id, candidateId, jobId || null);

      const responseId = responseRes.lastInsertRowid;

      for (const ans of answers) {
        await db.prepare(`
          INSERT INTO hr_tool_answers (response_id, question_id, answer_text, answer_json)
          VALUES (?, ?, ?, ?)
        `).run(
          responseId,
          ans.question_id,
          typeof ans.value === 'object' ? null : String(ans.value),
          typeof ans.value === 'object' ? JSON.stringify(ans.value) : null
        );
      }

      if (tool.type === 'DISC') {
        const profiles = ['Dominância', 'Influência', 'Estabilidade', 'Conformidade'];
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

        await db.prepare(`
          INSERT INTO candidate_disc_results (
            candidate_id, predominant_profile, behavioral_summary, created_at, updated_at
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          candidateId,
          randomProfile,
          `Perfil ${randomProfile} identificado via Ferramenta de RH.`
        );

        await db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description) VALUES (?, "ASSESSMENT", "DISC Concluído", ?)')
          .run(candidateId, `Candidato concluiu a avaliação DISC: ${randomProfile}`);
      }

      res.json({ success: true, responseId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Submission failed' });
    }
  });

  app.post('/api/public/jobs/:jobId/apply', upload.single('resume'), async (req, res) => {
    const { jobId } = req.params;
    const { full_name, email, phone, linkedin } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Currículo é obrigatório' });
    if (!full_name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

    try {
      const job = await db.prepare('SELECT tenant_id, unit_id FROM jobs WHERE id = ?').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      const tenantId = job.tenant_id;

      let candidateId;
      const existingCandidate = await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ? AND deleted_at IS NULL').get(email, tenantId) as any;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
        if (phone || linkedin) {
          await db.prepare(`
            UPDATE candidates SET
              phone = COALESCE(NULLIF(phone,''), ?),
              linkedin = COALESCE(NULLIF(linkedin,''), ?),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(phone || null, linkedin || null, candidateId);
        }
        const existingHistory = await db.prepare('SELECT id FROM candidate_history WHERE candidate_id = ? AND job_id = ? AND event_type = ?').get(candidateId, jobId, 'APLICACAO') as any;
        if (existingHistory) {
          return res.status(400).json({ error: 'Sua inscrição já foi realizada para essa vaga.' });
        }
      } else {
        const newCandRes = await db.prepare(`
          INSERT INTO candidates (tenant_id, unit_id, full_name, email, phone, linkedin, source, status)
          VALUES (?, ?, ?, ?, ?, ?, 'Portal', 'Novo')
        `).run(tenantId, job.unit_id, full_name, email, phone || null, linkedin || null);
        candidateId = newCandRes.lastInsertRowid;
      }

      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description) VALUES (?, ?, ?, ?, ?)').run(
        candidateId, jobId, 'APLICACAO', 'Candidatura via Portal',
        `Candidatura enviada pelo portal público. ${phone ? `Tel: ${phone}.` : ''} ${linkedin ? `LinkedIn: ${linkedin}.` : ''}`
      );

      res.json({ success: true, message: 'Candidatura enviada com sucesso!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar inscrição' });
    }
  });
}

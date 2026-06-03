import { Express } from 'express';
import fs from 'fs';
import db from '../../lib/db';
import { createGeminiClient, GEMINI_MODEL } from '../helpers/ai';
import { upload } from '../helpers/files';
import { saveImportedJobFile, extractJobTextFromBuffer, extractJobTextFromStoredFile } from '../helpers/files';
import { normalizeImportedJobParsedData, parseJsonFromAiResponseSafe } from '../helpers/jobs-normalize';
import { pushJobToShiguenoPortal } from '../services/shigueno-portal-sync';
import { checkJobLimit } from '../helpers/tenant-limits';

export function registerJobRoutes(app: Express) {
  app.get('/api/jobs', async (req, res) => {
    const { unitId, tenantId, status, search, workModel } = req.query;
    let query = 'SELECT * FROM jobs WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (tenantId) { query += ' AND tenant_id = ?'; params.push(tenantId); }
    if (unitId && unitId !== 'master') { query += ' AND unit_id = ?'; params.push(unitId); }
    if (status === 'Em Aprovação') {
      query += ' AND approval_status = ?'; params.push('pending');
    } else if (status) {
      query += ' AND status = ?'; params.push(status);
    }
    if (workModel) { query += ' AND work_model = ?'; params.push(workModel); }
    if (search) {
      query += ' AND (title LIKE ? OR city LIKE ? OR department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';

    try {
      res.json(await db.prepare(query).all(...params));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', async (req, res) => {
    const job = req.body;
    if (!job.title || !job.city || !job.state) return res.status(400).json({ error: 'Title, city and state are required' });

    // Verificar limite de vagas do tenant
    if (job.tenant_id) {
      const limitCheck = checkJobLimit(job.tenant_id);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.error, limit_exceeded: 'jobs', current: limitCheck.current, limit: limitCheck.limit });
      }
    }

    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !k.startsWith('_'));
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => job[k]);
    try {
      const result = await db.prepare(`INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(...values);
      const newId = Number(result.lastInsertRowid);
      if (job.status === 'Aberta') {
        pushJobToShiguenoPortal('upsert', { id: newId, ...job });
      }
      res.status(201).json({ id: newId, ...job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  });

  app.put('/api/jobs/:id', async (req, res) => {
    const job = req.body;
    const { id } = req.params;
    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && !k.startsWith('_'));
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => job[k]);
    try {
      await db.prepare(`UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
      const updated = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
      if (updated && (updated.status === 'Aberta' || updated.status === 'Pausada')) {
        pushJobToShiguenoPortal('upsert', updated);
      }
      res.json({ id, ...job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  app.patch('/api/jobs/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
      await db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id) as any;
      if (job) {
        const action = status === 'Aberta' || status === 'Pausada' ? 'upsert' : 'delete';
        pushJobToShiguenoPortal(action, job);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ── Workflow de aprovação ─────────────────────────────────────────────────────

  // GET histórico de aprovações
  app.get('/api/jobs/:id/approvals', async (req, res) => {
    try {
      const history = await db.prepare(
        `SELECT id, action, actor_id, actor_name, notes, created_at
         FROM job_approvals WHERE job_id = ? ORDER BY created_at DESC`
      ).all(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  });

  // POST solicitar aprovação  (action = 'requested')
  app.post('/api/jobs/:id/approvals/request', async (req, res) => {
    const { actor_id, actor_name, notes } = req.body;
    const jobId = req.params.id;
    try {
      const job = await db.prepare('SELECT tenant_id, status FROM jobs WHERE id = ? AND deleted_at IS NULL').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
      if (job.status === 'Aberta') return res.status(400).json({ error: 'Vaga já está Aberta' });

      await db.prepare(
        `UPDATE jobs SET approval_status = 'pending', approval_requested_by = ?, approval_requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(actor_id, jobId);

      await db.prepare(
        `INSERT INTO job_approvals (job_id, tenant_id, action, actor_id, actor_name, notes) VALUES (?, ?, 'requested', ?, ?, ?)`
      ).run(jobId, job.tenant_id, actor_id, actor_name || actor_id, notes || null);

      res.json({ success: true, approval_status: 'pending' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to request approval' });
    }
  });

  // POST aprovar (action = 'approved')
  app.post('/api/jobs/:id/approvals/approve', async (req, res) => {
    const { actor_id, actor_name, notes } = req.body;
    const jobId = req.params.id;
    try {
      const job = await db.prepare('SELECT tenant_id, approval_status FROM jobs WHERE id = ? AND deleted_at IS NULL').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      await db.prepare(
        `UPDATE jobs SET approval_status = 'approved', approval_resolved_at = CURRENT_TIMESTAMP, status = 'Aberta', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(jobId);

      await db.prepare(
        `INSERT INTO job_approvals (job_id, tenant_id, action, actor_id, actor_name, notes) VALUES (?, ?, 'approved', ?, ?, ?)`
      ).run(jobId, job.tenant_id, actor_id, actor_name || actor_id, notes || null);

      const updatedJob = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      if (updatedJob) pushJobToShiguenoPortal('upsert', updatedJob);

      res.json({ success: true, approval_status: 'approved' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to approve job' });
    }
  });

  // POST rejeitar (action = 'rejected')
  app.post('/api/jobs/:id/approvals/reject', async (req, res) => {
    const { actor_id, actor_name, notes } = req.body;
    const jobId = req.params.id;
    try {
      const job = await db.prepare('SELECT tenant_id FROM jobs WHERE id = ? AND deleted_at IS NULL').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      await db.prepare(
        `UPDATE jobs SET approval_status = 'rejected', approval_resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(jobId);

      await db.prepare(
        `INSERT INTO job_approvals (job_id, tenant_id, action, actor_id, actor_name, notes) VALUES (?, ?, 'rejected', ?, ?, ?)`
      ).run(jobId, job.tenant_id, actor_id, actor_name || actor_id, notes || null);

      res.json({ success: true, approval_status: 'rejected' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to reject job' });
    }
  });

  // DELETE cancelar solicitação de aprovação (volta para Rascunho)
  app.delete('/api/jobs/:id/approvals/request', async (req, res) => {
    const { actor_id, actor_name } = req.body;
    const jobId = req.params.id;
    try {
      const job = await db.prepare('SELECT tenant_id FROM jobs WHERE id = ? AND deleted_at IS NULL').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      await db.prepare(
        `UPDATE jobs SET approval_status = NULL, approval_requested_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(jobId);

      await db.prepare(
        `INSERT INTO job_approvals (job_id, tenant_id, action, actor_id, actor_name, notes) VALUES (?, ?, 'cancelled', ?, ?, ?)`
      ).run(jobId, job.tenant_id, actor_id || 'system', actor_name || 'Sistema', 'Solicitação cancelada');

      res.json({ success: true, approval_status: null });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel approval' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  app.patch('/api/jobs/:id/publication', async (req, res) => {
    const { is_public } = req.body;
    try {
      await db.prepare('UPDATE jobs SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_public ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update publication' });
    }
  });

  app.delete('/api/jobs/:id', async (req, res) => {
    const jobId = req.params.id;
    try {
      const jobImports = await db.prepare('SELECT file_path FROM job_imports WHERE job_id = ?').all(jobId) as any[];
      for (const imp of jobImports) {
        if (imp.file_path && fs.existsSync(imp.file_path)) {
          await fs.promises.unlink(imp.file_path).catch(err => console.error(`Failed to delete job file: ${imp.file_path}`, err));
        }
      }
      const jobToDelete = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      await db.prepare('UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(jobId);
      if (jobToDelete) pushJobToShiguenoPortal('delete', jobToDelete);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete job:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  });

  app.get('/api/jobs/:id/candidates', async (req, res) => {
    try {
      const candidates = await db.prepare(`
        SELECT
          c.id, c.full_name, c.email, c.phone, c.city, c.state,
          c.desired_position, c.experience_years, c.status as candidate_status,
          m.id as match_id, m.compatibility_score, m.status as match_status,
          COALESCE(
            (SELECT r.compatibility_score FROM ai_search_results r
             WHERE r.candidate_id = c.id AND r.job_id = m.job_id
             ORDER BY r.created_at DESC LIMIT 1),
            m.compatibility_score
          ) as ai_score
        FROM candidates c
        JOIN candidate_job_matches m ON c.id = m.candidate_id
        WHERE m.job_id = ? AND c.deleted_at IS NULL
        ORDER BY ai_score DESC, c.full_name ASC
      `).all(req.params.id);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch applied candidates' });
    }
  });

  // Job Imports
  app.post('/api/jobs/import', upload.single('file') as any, async (req, res) => {
    const { tenant_id, unit_id } = req.body;
    if (!tenant_id || !unit_id) return res.status(400).json({ error: 'tenant_id and unit_id are required' });
    if (!req.file) return res.status(400).json({ error: 'Job file is required' });
    try {
      const extractedText = await extractJobTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
      const result = await db.prepare(`INSERT INTO job_imports (tenant_id, unit_id, file_name, file_type, file_size, status, extracted_text) VALUES (?, ?, ?, ?, ?, 'uploaded', ?)`).run(tenant_id, unit_id, req.file.originalname, req.file.mimetype, req.file.size, extractedText);
      const importId = result.lastInsertRowid;
      const filePath = await saveImportedJobFile(importId, tenant_id, req.file);
      await db.prepare(`UPDATE job_imports SET file_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(filePath, importId);
      res.status(201).json({ id: importId, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create job import' });
    }
  });

  app.get('/api/jobs/import/:id', async (req, res) => {
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(req.params.id);
      if (!importData) return res.status(404).json({ error: 'Import not found' });
      res.json(importData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import details' });
    }
  });

  app.post('/api/jobs/import/:id/analyze', async (req, res) => {
    const { id } = req.params;
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });
      await db.prepare('UPDATE job_imports SET status = "analyzing_ai" WHERE id = ?').run(id);

      const actualExtractedText = importData.extracted_text || await extractJobTextFromStoredFile(importData);
      const ai = createGeminiClient();

      const strictPrompt = buildJobAnalysisPrompt(actualExtractedText);
      const aiResult = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 1800, reasoningEffort: 'medium', operationLabel: 'análise de vaga importada' }
      });

      const cleaned = (aiResult.text || '').replace(/```json|```/g, '').trim();
      const parsedData = normalizeImportedJobParsedData(parseJsonFromAiResponseSafe(cleaned), actualExtractedText);

      await db.prepare(`UPDATE job_imports SET status = "ready_for_review", extracted_text = ?, parsed_data_json = ?, confidence_json = ?, ai_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
        actualExtractedText, JSON.stringify(parsedData), JSON.stringify(parsedData.confidence), parsedData.ai_summary, id
      );
      res.json({ success: true, data: parsedData });
    } catch (error) {
      console.error('[AI Analysis Error]:', error);
      await db.prepare('UPDATE job_imports SET status = \'error\', error_message = ? WHERE id = ?').run(error instanceof Error ? error.message : String(error), id);
      res.status(500).json({ error: 'AI analysis failed', detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/jobs/import/:id/create-job', async (req, res) => {
    const { id } = req.params;
    const jobData = req.body;
    try {
      const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });
      const keys = Object.keys(jobData).filter(k => !['id', 'created_at', 'updated_at', 'confidence', 'tenant_id', 'unit_id', 'ai_summary'].includes(k) && !k.startsWith('_'));
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => jobData[k]);
      const result = await db.prepare(`INSERT INTO jobs (${keys.join(',')}, tenant_id, unit_id, created_at, updated_at) VALUES (${placeholders}, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(...values, importData.tenant_id, importData.unit_id);
      const jobId = result.lastInsertRowid;
      await db.prepare('UPDATE job_imports SET status = "created_job", job_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(jobId, id);
      res.json({ success: true, jobId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job from import' });
    }
  });

  app.post('/api/jobs/import/batch-auto', upload.array('files', 20) as any, async (req, res) => {
    const { tenant_id, unit_id, city: defaultCity } = req.body;
    const files = req.files as Express.Multer.File[];
    if (!tenant_id || !unit_id) return res.status(400).json({ error: 'tenant_id and unit_id are required' });
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files provided' });

    const importIds: number[] = [];
    for (const file of files) {
      try {
        const extractedText = await extractJobTextFromBuffer(file.buffer, file.originalname, file.mimetype);
        const result = await db.prepare(`INSERT INTO job_imports (tenant_id, unit_id, file_name, file_type, file_size, status, extracted_text) VALUES (?, ?, ?, ?, ?, 'uploaded', ?)`).run(tenant_id, unit_id, file.originalname, file.mimetype, file.size, extractedText);
        const importId = Number(result.lastInsertRowid);
        await saveImportedJobFile(importId, tenant_id, file).catch(() => {});
        importIds.push(importId);
      } catch (err) { console.error('[batch-auto] upload error:', err); }
    }

    res.json({ success: true, queued: importIds.length, importIds });

    const unitData = await db.prepare('SELECT city, state FROM units WHERE id = ?').get(unit_id) as any;
    const fallbackCity = (defaultCity || unitData?.city || '') as string;
    const fallbackState = (unitData?.state || '') as string;

    (async () => {
      const ai = createGeminiClient();
      for (const importId of importIds) {
        try {
          const importData = await db.prepare('SELECT * FROM job_imports WHERE id = ?').get(importId) as any;
          if (!importData) continue;
          await db.prepare('UPDATE job_imports SET status = "analyzing_ai" WHERE id = ?').run(importId);
          const actualExtractedText = importData.extracted_text || await extractJobTextFromStoredFile(importData);
          const prompt = buildJobAnalysisPromptSimple(actualExtractedText);
          const aiResult = await ai.models.generateContent({
            model: GEMINI_MODEL, contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json', maxOutputTokens: 1800, temperature: 0.0, operationLabel: 'batch-auto vaga' }
          });
          const parsedData = normalizeImportedJobParsedData(parseJsonFromAiResponseSafe(aiResult.text || '{}'), actualExtractedText);
          await db.prepare(`UPDATE job_imports SET status = "ready_for_review", extracted_text = ?, parsed_data_json = ?, confidence_json = ?, ai_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
            actualExtractedText, JSON.stringify(parsedData), JSON.stringify(parsedData.confidence), parsedData.ai_summary, importId
          );
          const jobFields: Record<string, any> = {
            title: parsedData.title || importData.file_name,
            department: parsedData.department, description: parsedData.description,
            responsibilities: parsedData.responsibilities, technical_requirements: parsedData.technical_requirements,
            mandatory_requirements: parsedData.mandatory_requirements, desirable_requirements: parsedData.desirable_requirements,
            eliminatory_criteria: parsedData.eliminatory_criteria, benefits: parsedData.benefits,
            city: parsedData.city || fallbackCity, state: parsedData.state || fallbackState, work_model: parsedData.work_model,
            contract_type: parsedData.contract_type, seniority_level: parsedData.seniority_level,
            education_level: parsedData.education_level, min_experience_years: parsedData.min_experience_years,
            salary_min: parsedData.salary_min, salary_max: parsedData.salary_max,
            workload: parsedData.workload, work_schedule: parsedData.work_schedule,
            requires_cnh: parsedData.requires_cnh ? 1 : 0, cnh_category: parsedData.cnh_category,
            requires_travel: parsedData.requires_travel ? 1 : 0, requires_relocation: parsedData.requires_relocation ? 1 : 0,
            tags: parsedData.tags, status: 'Rascunho',
          };
          const fkeys = Object.keys(jobFields);
          const insertResult = await db.prepare(`INSERT INTO jobs (${fkeys.join(',')}, tenant_id, unit_id, created_at, updated_at) VALUES (${fkeys.map(() => '?').join(',')}, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(...fkeys.map(k => jobFields[k]), importData.tenant_id, importData.unit_id);
          await db.prepare('UPDATE job_imports SET status = "created_job", job_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(insertResult.lastInsertRowid, importId);
        } catch (err) {
          console.error(`[batch-auto] error processing import ${importId}:`, err);
          await db.prepare('UPDATE job_imports SET status = "error", error_message = ? WHERE id = ?').run(err instanceof Error ? err.message : String(err), importId);
        }
      }
    })();
  });

  app.delete('/api/jobs/import/:id', async (req, res) => {
    const importId = req.params.id;
    try {
      const imp = await db.prepare('SELECT file_path FROM job_imports WHERE id = ?').get(importId) as any;
      if (imp?.file_path && fs.existsSync(imp.file_path)) {
        await fs.promises.unlink(imp.file_path).catch(err => console.error(`Failed to delete job import file: ${imp.file_path}`, err));
      }
      await db.prepare('DELETE FROM job_imports WHERE id = ?').run(importId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete job import:', error);
      res.status(500).json({ error: 'Failed to delete job import' });
    }
  });
}

// ── Prompt builders (kept here to avoid another file for small helpers) ───────

function buildJobAnalysisPrompt(extractedText: string) {
  return `
Analise o texto de uma vaga e extraia TODAS as informações relevantes.

Regras obrigatórias:
- Não invente dados. Se algo não estiver no texto, retorne null.
- Preserve a redação original nas responsabilidades e requisitos.
- Forneça "evidence" (trecho literal) para cada campo preenchido.
- Retorne JSON válido no padrão RFC 8259, sem comentários ou markdown.

Texto da vaga:
${extractedText}

Retorne EXATAMENTE este JSON:
{
  "title": string | null, "department": string | null, "description": string | null,
  "responsibilities": string | null, "technical_requirements": string | null,
  "mandatory_requirements": string | null, "desirable_requirements": string | null,
  "eliminatory_criteria": string | null, "benefits": string | null,
  "city": string | null, "state": string | null,
  "work_model": "Presencial" | "Híbrido" | "Home Office" | null,
  "contract_type": "CLT" | "PJ" | "Estágio" | "Temporário" | "Freelancer" | "Outro" | null,
  "seniority_level": "Operacional" | "Júnior" | "Pleno" | "Sênior" | "Coordenação" | "Gerência" | "Diretoria" | null,
  "education_level": string | null, "min_experience_years": number | null,
  "salary_min": number | null, "salary_max": number | null,
  "workload": string | null, "work_schedule": string | null,
  "requires_cnh": boolean | null, "cnh_category": string | null,
  "requires_travel": boolean | null, "requires_relocation": boolean | null,
  "tags": string | null, "compatibility_threshold": number,
  "weight_technical": number, "weight_experience": number, "weight_education": number,
  "weight_location": number, "weight_soft_skills": number, "weight_culture": number,
  "confidence": { "title": "Alta"|"Média"|"Baixa", "city": "Alta"|"Média"|"Baixa", "salary": "Alta"|"Média"|"Baixa", "requirements": "Alta"|"Média"|"Baixa" },
  "evidence": { "title": string|null, "city": string|null, "state": string|null, "salary_min": string|null, "salary_max": string|null },
  "ai_summary": string | null
}`.trim();
}

function buildJobAnalysisPromptSimple(extractedText: string) {
  return `Analise o texto de uma vaga e extraia as informações. Não invente dados. Retorne JSON válido.

Texto:
${extractedText}

JSON:
{"title":null,"department":null,"description":null,"responsibilities":null,"technical_requirements":null,"mandatory_requirements":null,"desirable_requirements":null,"eliminatory_criteria":null,"benefits":null,"city":null,"state":null,"work_model":null,"contract_type":null,"seniority_level":null,"education_level":null,"min_experience_years":null,"salary_min":null,"salary_max":null,"workload":null,"work_schedule":null,"requires_cnh":null,"cnh_category":null,"requires_travel":null,"requires_relocation":null,"tags":null,"compatibility_threshold":80,"weight_technical":20,"weight_experience":20,"weight_education":20,"weight_location":10,"weight_soft_skills":15,"weight_culture":15,"confidence":{"title":"Baixa","city":"Baixa","salary":"Baixa","requirements":"Baixa"},"ai_summary":null}`.trim();
}

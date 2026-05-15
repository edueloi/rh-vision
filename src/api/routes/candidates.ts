import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import db from '../../lib/db';
import { upload } from '../helpers/files';
import { extractPdfTextFromBuffer, sanitizeUploadFileName, CANDIDATE_UPLOADS_DIR } from '../helpers/files';
import { createAIClient as createGeminiClient } from '../helpers/ai';
import { GEMINI_MODEL } from '../helpers/ai';
import { parseJsonFromAiResponseSafe } from '../helpers/resume';

export function registerCandidateRoutes(app: Express) {
  // Candidate File Import (single-file quick import)
  app.post('/api/candidates/import-file', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { unitId, tenantId } = req.body;

    try {
      let text = '';
      const extension = path.extname(req.file.originalname).toLowerCase();

      if (extension === '.pdf') {
        text = await extractPdfTextFromBuffer(req.file.buffer);
      } else if (extension === '.docx') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (extension === '.xlsx' || extension === '.xls') {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        text = xlsx.utils.sheet_to_txt(sheet);
      }

      if (!text || text.trim().length < 20) {
        return res.status(400).json({ error: 'Could not extract text from file' });
      }

      const ai = createGeminiClient();

      const prompt = `
        Extraia as informações do candidato a partir do texto do currículo abaixo e retorne um JSON estruturado.

        Texto do Currículo:
        ${text}

        JSON Schema:
        {
          "full_name": string,
          "email": string,
          "phone": string,
          "city": string,
          "state": string (UF),
          "desired_position": string,
          "desired_salary": number (opcional),
          "experience_years": number (total estimado),
          "education_level": string,
          "professional_summary": string,
          "hard_skills": string (lista separada por vírgula),
          "professional_experiences": string (texto formatado),
          "linkedin_url": string
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1100,
          reasoningEffort: 'medium',
          operationLabel: 'extração de currículo importado',
        }
      });

      const candidateData = JSON.parse(result.text || '{}');

      const keys = Object.keys(candidateData).filter(k => k !== 'id');
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => candidateData[k]);

      const insertQuery = `
        INSERT INTO candidates (${keys.join(',')}, tenant_id, unit_id, source, status, created_at, updated_at)
        VALUES (${placeholders}, ?, ?, 'Importação', 'Novo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const insertResult = await db.prepare(insertQuery).run(...values, tenantId, unitId);
      const candidateId = insertResult.lastInsertRowid;
      const candidateTenantId = tenantId || 'fadel';
      const safeName = sanitizeUploadFileName(path.basename(req.file.originalname || 'curriculo', extension));
      const candidateDir = path.join(CANDIDATE_UPLOADS_DIR, String(candidateTenantId), String(candidateId));
      const candidateFilePath = path.join(
        candidateDir,
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}${extension}`
      );

      await fs.promises.mkdir(candidateDir, { recursive: true });
      await fs.promises.writeFile(candidateFilePath, req.file.buffer);

      await db.prepare(`
        INSERT INTO candidate_files (
          candidate_id, file_name, file_path, file_type, file_size, extracted_text, ai_summary, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(candidateId, req.file.originalname, candidateFilePath, req.file.mimetype, req.file.size, text, candidateData.professional_summary || null, candidateTenantId);

      await db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(candidateId, 'IMPORT', 'Currículo Importado', `Dados extraídos via IA a partir do arquivo ${req.file.originalname}`);

      res.status(201).json({ id: candidateId, ...candidateData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process resume' });
    }
  });

  app.get('/api/candidates', async (req, res) => {
    const { tenantId, unitId, search, status, source } = req.query;
    let query = 'SELECT * FROM candidates WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    if (unitId && unitId !== 'master') {
      query += ' AND unit_id = ?';
      params.push(unitId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR desired_position LIKE ? OR hard_skills LIKE ? OR professional_summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY full_name ASC';

    try {
      const candidates = await db.prepare(query).all(...params);
      res.json(candidates);
    } catch (error: any) {
      console.error('[GET /api/candidates] SQL ERROR:', error?.message, '\nQUERY:', query, '\nPARAMS:', params);
      res.status(500).json({ error: 'Failed to fetch candidates', detail: error?.message });
    }
  });

  app.get('/api/candidates/:id', async (req, res) => {
    try {
      const candidate = await db.prepare('SELECT * FROM candidates WHERE id = ? AND deleted_at IS NULL').get(req.params.id) as any;
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      candidate.files = await db.prepare('SELECT * FROM candidate_files WHERE candidate_id = ?').all(candidate.id);
      candidate.matches = await db.prepare(`
        SELECT m.*, j.title as job_title, j.city as job_city, j.state as job_state
        FROM candidate_job_matches m
        JOIN jobs j ON m.job_id = j.id
        WHERE m.candidate_id = ?
      `).all(candidate.id);
      candidate.disc = await db.prepare('SELECT * FROM candidate_disc_results WHERE candidate_id = ?').get(candidate.id);
      candidate.history = await db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(candidate.id);

      res.json(candidate);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  app.get('/api/candidates/:candidateId/cv/download', async (req, res) => {
    try {
      const file = await db.prepare(`
        SELECT cf.*
        FROM candidate_files cf
        JOIN candidates c ON c.id = cf.candidate_id
        WHERE cf.candidate_id = ? AND c.deleted_at IS NULL
        ORDER BY cf.created_at DESC
        LIMIT 1
      `).get(req.params.candidateId) as any;

      if (!file) return res.status(404).json({ error: 'No CV found for this candidate' });
      if (!file.file_path || !fs.existsSync(file.file_path)) return res.status(404).json({ error: 'File not found on disk' });

      return res.download(file.file_path, file.file_name);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to download CV' });
    }
  });

  app.get('/api/candidates/:candidateId/files/:fileId', async (req, res) => {
    try {
      const file = await db.prepare(`
        SELECT cf.*
        FROM candidate_files cf
        JOIN candidates c ON c.id = cf.candidate_id
        WHERE cf.id = ? AND cf.candidate_id = ? AND c.deleted_at IS NULL
      `).get(req.params.fileId, req.params.candidateId) as any;

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!file.file_path || !fs.existsSync(file.file_path)) {
        return res.status(404).json({ error: 'Stored file not found' });
      }

      if (req.query.download === '1') {
        return res.download(file.file_path, file.file_name);
      }

      if (file.file_type) {
        res.type(file.file_type);
      }

      res.sendFile(path.resolve(file.file_path));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to serve candidate file' });
    }
  });

  app.post('/api/candidates', async (req, res) => {
    const candidate = req.body;
    if (!candidate.full_name || !candidate.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => candidate[k]);

    const query = `INSERT INTO candidates (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

    try {
      const result = await db.prepare(query).run(...values);
      res.status(201).json({ id: result.lastInsertRowid, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  });

  app.put('/api/candidates/:id', async (req, res) => {
    const candidate = req.body;
    const { id } = req.params;

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && k !== 'files' && k !== 'matches' && k !== 'disc' && k !== 'history');
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => candidate[k]);

    const query = `UPDATE candidates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    try {
      await db.prepare(query).run(...values, id);
      res.json({ id, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', async (req, res) => {
    const candidateId = req.params.id;
    try {
      const candFiles = await db.prepare('SELECT file_path FROM candidate_files WHERE candidate_id = ?').all(candidateId) as any[];
      for (const f of candFiles) {
        if (f.file_path && fs.existsSync(f.file_path)) {
          await fs.promises.unlink(f.file_path).catch(err => console.error(`Failed to delete candidate file: ${f.file_path}`, err));
        }
      }

      const importFiles = await db.prepare('SELECT file_path FROM import_files WHERE candidate_id = ?').all(candidateId) as any[];
      for (const f of importFiles) {
        if (f.file_path && fs.existsSync(f.file_path)) {
          await fs.promises.unlink(f.file_path).catch(err => console.error(`Failed to delete import file: ${f.file_path}`, err));
        }
      }

      await db.prepare('UPDATE candidates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(candidateId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  app.post('/api/candidates/:id/link-job', async (req, res) => {
    const { id } = req.params;
    const { job_id, tenant_id } = req.body;

    try {
      const existing = await db.prepare('SELECT id FROM candidate_job_matches WHERE candidate_id = ? AND job_id = ?').get(id, job_id);
      if (existing) return res.status(400).json({ error: 'Candidate already linked to this job' });

      await db.prepare('INSERT INTO candidate_job_matches (candidate_id, job_id, tenant_id, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(id, job_id, tenant_id);

      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id, 'LINK', 'Vaga Vinculada', 'Candidato foi vinculado a uma nova oportunidade.');

      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to link job' });
    }
  });

  app.get('/api/candidates/:id/history', async (req, res) => {
    try {
      const history = await db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.post('/api/candidates/:id/history', async (req, res) => {
    const { id } = req.params;
    const { event_type, title, description, job_id } = req.body;
    try {
      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id || null, event_type, title, description);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add history' });
    }
  });

  app.get('/api/candidates/:id/ai-scores', async (req, res) => {
    try {
      const scores = await db.prepare(
        `SELECT r.job_id, r.compatibility_score, r.classification, j.title as job_title
         FROM ai_search_results r
         LEFT JOIN jobs j ON j.id = r.job_id
         WHERE r.candidate_id = ?
         ORDER BY r.compatibility_score DESC`
      ).all(req.params.id) as any[];
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch AI scores' });
    }
  });

  app.post('/api/candidates/:id/analyze-job/:jobId', async (req, res) => {
    const { id, jobId } = req.params;

    try {
      const candidate = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;

      if (!candidate || !job) return res.status(404).json({ error: 'Candidate or Job not found' });

      const ai = createGeminiClient();

      const prompt = `
        Você é um especialista em recrutamento e seleção com IA. Compare o candidato com a vaga e retorne um relatório detalhado em JSON.

        Vaga:
        Título: ${job.title}
        Requisitos: ${job.technical_requirements}
        Mandatórios: ${job.mandatory_requirements}
        Eliminatórios: ${job.eliminatory_criteria}
        Local: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Anos Exp Mínimos: ${job.min_experience_years}

        Candidato:
        Nome: ${candidate.full_name}
        Experiência: ${candidate.professional_experiences}
        Resumo: ${candidate.professional_summary}
        Skills: ${candidate.hard_skills}
        Local: ${candidate.city}/${candidate.state}
        Modelo Desejado: ${candidate.desired_work_model}
        Tempo Exp: ${candidate.experience_years} anos
        CNH: ${candidate.has_cnh ? 'Sim, cat ' + candidate.cnh_category : 'Não'}

        JSON Schema:
        {
          "compatibility_score": number (0-100),
          "compatibility_classification": "Alto Fit" | "Médio Fit" | "Baixo Fit" | "Incompatível",
          "compatibility_summary": string,
          "strengths": string[] (principais pontos fortes),
          "attention_points": string[] (pontos de atenção),
          "requirements_met": string[] (requisitos preenchidos),
          "requirements_partial": string[] (parcialmente atendidos),
          "requirements_missing": string[] (faltantes),
          "eliminatory_flags": string[] (critérios eliminatórios feridos),
          "interview_questions": string[] (sugestões de perguntas),
          "risk_analysis": string,
          "final_recommendation": string
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2200,
          reasoningEffort: 'medium',
          operationLabel: 'análise de compatibilidade candidato-vaga',
        }
      });

      const analysis = JSON.parse(result.text || '{}');

      const updateQuery = `
        UPDATE candidate_job_matches
        SET
          compatibility_score = ?,
          compatibility_classification = ?,
          compatibility_summary = ?,
          strengths = ?,
          attention_points = ?,
          requirements_met = ?,
          requirements_partial = ?,
          requirements_missing = ?,
          eliminatory_flags = ?,
          interview_questions = ?,
          risk_analysis = ?,
          final_recommendation = ?,
          ai_analysis_json = ?,
          analyzed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND job_id = ?
      `;

      await db.prepare(updateQuery).run(
        analysis.compatibility_score,
        analysis.compatibility_classification,
        analysis.compatibility_summary,
        JSON.stringify(analysis.strengths),
        JSON.stringify(analysis.attention_points),
        JSON.stringify(analysis.requirements_met),
        JSON.stringify(analysis.requirements_partial),
        JSON.stringify(analysis.requirements_missing),
        JSON.stringify(analysis.eliminatory_flags),
        JSON.stringify(analysis.interview_questions),
        analysis.risk_analysis,
        analysis.final_recommendation,
        JSON.stringify(analysis),
        id,
        jobId
      );

      await db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, jobId, 'AI_ANALYSIS', 'Análise IA Realizada', `Score de compatibilidade: ${analysis.compatibility_score}%`);

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });
}

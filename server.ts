import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initDb } from './src/lib/db';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  initDb();

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Candidate File Import
  app.post('/api/candidates/import-file', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { unitId, tenantId } = req.body;

    try {
      let text = '';
      const extension = path.extname(req.file.originalname).toLowerCase();

      if (extension === '.pdf') {
        const data = await pdf(req.file.buffer);
        text = data.text;
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });
      
      const candidateData = JSON.parse(result.text || '{}');

      // Save to DB
      const keys = Object.keys(candidateData).filter(k => k !== 'id');
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => candidateData[k]);
      
      const insertQuery = `
        INSERT INTO candidates (${keys.join(',')}, tenant_id, unit_id, source, status, created_at, updated_at) 
        VALUES (${placeholders}, ?, ?, 'Importação', 'Novo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const insertResult = db.prepare(insertQuery).run(...values, tenantId, unitId);
      const candidateId = insertResult.lastInsertRowid;

      // Save file record
      db.prepare('INSERT INTO candidate_files (candidate_id, file_name, file_type, file_size, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(candidateId, req.file.originalname, req.file.mimetype, req.file.size, tenantId || 'fadel');

      // Log history
      db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(candidateId, 'IMPORT', 'Currículo Importado', `Dados extraídos via IA a partir do arquivo ${req.file.originalname}`);

      res.status(201).json({ id: candidateId, ...candidateData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process resume' });
    }
  });

  // Jobs Endpoints
  app.get('/api/jobs', (req, res) => {
    const { unitId, tenantId, status, search } = req.query;
    let query = 'SELECT * FROM jobs WHERE deleted_at IS NULL';
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

    if (search) {
      query += ' AND (title LIKE ? OR city LIKE ? OR department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const jobs = db.prepare(query).all(...params);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/:id', (req, res) => {
    try {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', (req, res) => {
    const job = req.body;
    if (!job.title || !job.city || !job.state) {
      return res.status(400).json({ error: 'Title, city and state are required' });
    }

    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => job[k]);

    const query = `INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    
    try {
      const result = db.prepare(query).run(...values);
      res.status(201).json({ id: result.lastInsertRowid, ...job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  });

  app.put('/api/jobs/:id', (req, res) => {
    const job = req.body;
    const { id } = req.params;

    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id');
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => job[k]);

    const query = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      db.prepare(query).run(...values, id);
      res.json({ id, ...job });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  app.patch('/api/jobs/:id/status', (req, res) => {
    const { status } = req.body;
    try {
      db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  app.patch('/api/jobs/:id/publication', (req, res) => {
    const { is_public } = req.body;
    try {
      db.prepare('UPDATE jobs SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_public ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update publication' });
    }
  });

  app.delete('/api/jobs/:id', (req, res) => {
    try {
      db.prepare('UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete job' });
    }
  });

  app.get('/api/jobs/:id/candidates', (req, res) => {
    try {
      const candidates = db.prepare(`
        SELECT c.*, m.compatibility_score, m.status as match_status 
        FROM candidates c
        JOIN candidate_job_matches m ON c.id = m.candidate_id
        WHERE m.job_id = ? AND c.deleted_at IS NULL
      `).all(req.params.id);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch applied candidates' });
    }
  });

  // Job Import Endpoints
  app.post('/api/jobs/import', (req, res) => {
    const { tenant_id, unit_id, file_name, file_type, file_size } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO job_imports (tenant_id, unit_id, file_name, file_type, file_size, status)
        VALUES (?, ?, ?, ?, ?, 'uploaded')
      `).run(tenant_id, unit_id, file_name, file_type, file_size);
      
      res.status(201).json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job import' });
    }
  });

  app.get('/api/jobs/import/:id', (req, res) => {
    try {
      const importData = db.prepare('SELECT * FROM job_imports WHERE id = ?').get(req.params.id);
      if (!importData) return res.status(404).json({ error: 'Import not found' });
      res.json(importData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import details' });
    }
  });

  app.post('/api/jobs/import/:id/analyze', async (req, res) => {
    const { id } = req.params;
    try {
      const importData = db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });

      db.prepare('UPDATE job_imports SET status = "analyzing_ai" WHERE id = ?').run(id);

      // In a real app we'd extract text from the file.
      // Here we simulate it based on the file name if text is not provided.
      const simulatedText = importData.extracted_text || `Descrição da vaga importada do arquivo ${importData.file_name}. Esperamos um profissional com experiência em Logística, CNH categoria E, residindo em Tatuí/SP. Salário entre R$ 3.500,00 e R$ 5.000,00. Benefícios: Vale transporte, plano de saúde, seguro de vida.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Você é um especialista em recrutamento e seleção. Analise o documento de descrição de vaga abaixo e extraia as informações em JSON estruturado. 
        Não invente informações. Quando um dado não existir, retorne null. 
        Identifique requisitos obrigatórios, desejáveis, responsabilidades, localização, modelo de trabalho, tipo de contrato, experiência, formação, benefícios e critérios de compatibilidade para análise de candidatos. 
        Também sugira pesos para análise de compatibilidade com candidatos.

        Descrição da Vaga:
        ${simulatedText}

        Retorne EXATAMENTE este JSON:
        {
          "title": string,
          "department": string,
          "description": string,
          "responsibilities": string,
          "technical_requirements": string,
          "mandatory_requirements": string,
          "desirable_requirements": string,
          "eliminatory_criteria": string,
          "benefits": string,
          "city": string,
          "state": string,
          "work_model": "Presencial" | "Híbrido" | "Home Office",
          "contract_type": "CLT" | "PJ" | "Estágio" | "Temporário" | "Freelancer" | "Outro",
          "seniority_level": "Operacional" | "Júnior" | "Pleno" | "Sênior" | "Coordenação" | "Gerência" | "Diretoria",
          "education_level": string,
          "min_experience_years": number,
          "salary_min": number,
          "salary_max": number,
          "workload": string,
          "work_schedule": string,
          "requires_cnh": boolean,
          "cnh_category": string,
          "requires_travel": boolean,
          "requires_relocation": boolean,
          "tags": string,
          "compatibility_threshold": number,
          "weight_technical": number,
          "weight_experience": number,
          "weight_education": number,
          "weight_location": number,
          "weight_soft_skills": number,
          "weight_culture": number,
          "ai_summary": string,
          "confidence": {
            "title": "Alta" | "Média" | "Baixa",
            "city": "Alta" | "Média" | "Baixa",
            "salary": "Alta" | "Média" | "Baixa",
            "requirements": "Alta" | "Média" | "Baixa"
          }
        }
      `;

      const aiResult = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const textResponse = aiResult.text || "";
      const cleaned = textResponse.replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(cleaned);

      db.prepare(`
        UPDATE job_imports 
        SET status = "ready_for_review",
            extracted_text = ?,
            parsed_data_json = ?,
            confidence_json = ?,
            ai_summary = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        simulatedText,
        JSON.stringify(parsedData),
        JSON.stringify(parsedData.confidence),
        parsedData.ai_summary,
        id
      );

      res.json({ success: true, data: parsedData });
    } catch (error) {
      console.error(error);
      db.prepare('UPDATE job_imports SET status = "error", error_message = ? WHERE id = ?').run(String(error), id);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  app.post('/api/jobs/import/:id/create-job', (req, res) => {
    const { id } = req.params;
    const jobData = req.body;
    try {
      const importData = db.prepare('SELECT * FROM job_imports WHERE id = ?').get(id) as any;
      if (!importData) return res.status(404).json({ error: 'Import not found' });

      const keys = Object.keys(jobData).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'confidence');
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => jobData[k]);

      const query = `INSERT INTO jobs (${keys.join(',')}, tenant_id, unit_id, created_at, updated_at) VALUES (${placeholders}, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      
      const result = db.prepare(query).run(...values, importData.tenant_id, importData.unit_id);
      const jobId = result.lastInsertRowid;

      db.prepare('UPDATE job_imports SET status = "created_job", job_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(jobId, id);

      res.json({ success: true, jobId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create job from import' });
    }
  });

  app.delete('/api/jobs/import/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM job_imports WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete import' });
    }
  });

  // Gemini AI Generation
  app.post('/api/jobs/:id/generate-publication-text', async (req, res) => {
    const { channel, tone = 'profissional' } = req.body;
    const { id } = req.params;

    try {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
      if (!job) return res.status(404).json({ error: 'Job not found' });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `
        Você é um especialista em recrutamento e seleção. Gere um texto para divulgação da vaga abaixo no canal ${channel}.
        Tom desejado: ${tone}.
        
        Dados da Vaga:
        Título: ${job.title}
        Departamento: ${job.department}
        Cidade/Estado: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Contrato: ${job.contract_type}
        Descrição: ${job.description}
        Responsabilidades: ${job.responsibilities}
        Requisitos: ${job.technical_requirements}
        Benefícios: ${job.benefits}

        Formato de Resposta:
        Título Sugerido: [Título]
        Texto Completo: [Descrição detalhada]
        Texto Curto: [Resumo para redes sociais]
        Hashtags: [Relevantes]
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      res.json({ text: result.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate text with AI' });
    }
  });

  // Stats Endpoint for Dashboard
  app.get('/api/dashboard/overview', (req, res) => {
    const { unitId, tenantId, period = '30d' } = req.query;
    try {
      const p = period === 'all' ? '10 year' : period === '90d' ? '90 days' : period === '30d' ? '30 days' : '7 days';
      const unitFilter = (alias?: string) => {
        const prefix = alias ? `${alias}.` : '';
        return unitId && unitId !== 'master' ? `AND ${prefix}unit_id = ?` : '';
      };
      const unitParams = unitId && unitId !== 'master' ? [unitId] : [];

      // 1. Core Stats
      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM jobs WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND status = 'Aberta') as active_jobs,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL) as total_candidates,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND created_at >= date('now', '-${p}')) as new_candidates,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE compatibility_score >= 80) as compatible_candidates,
          (SELECT COUNT(*) FROM hr_tool_responses) as tool_responses
      `).get(tenantId, ...unitParams, tenantId, ...unitParams, tenantId, ...unitParams) as any;

      // 2. Funnel Data
      const funnel = db.prepare(`
        SELECT 
          status, COUNT(*) as count 
        FROM candidate_job_matches 
        GROUP BY status
      `).all() as any[];

      // 3. Recent Jobs
      const recentJobs = db.prepare(`
        SELECT j.id, j.title, j.city, j.state, j.status, j.created_at,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id) as candidates_count,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id AND compatibility_score >= 80) as compatible_count
        FROM jobs j
        WHERE j.tenant_id = ? ${unitFilter('j')} AND j.deleted_at IS NULL
        ORDER BY j.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      // 4. Recommended Candidates (Top recent matches)
      const recommendations = db.prepare(`
        SELECT c.id, c.full_name, c.city, c.state, j.title as job_title, m.compatibility_score, m.compatibility_classification as classification
        FROM candidate_job_matches m
        JOIN candidates c ON m.candidate_id = c.id
        JOIN jobs j ON m.job_id = j.id
        WHERE c.tenant_id = ? ${unitFilter('c')} AND m.compatibility_score >= 70
        ORDER BY m.compatibility_score DESC, c.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      // 5. Recent Imports
      const recentImports = db.prepare(`
        SELECT id, name, created_at, total_files, processed_files, created_candidates, status
        FROM import_batches
        WHERE tenant_id = ? ${unitFilter()}
        ORDER BY created_at DESC
        LIMIT 3
      `).all(tenantId, ...unitParams);

      // 6. Distribution Charts
      const charts = {
        candidatesByStatus: db.prepare(`
          SELECT status, COUNT(*) as value FROM candidates WHERE tenant_id = ? ${unitFilter()} GROUP BY status
        `).all(tenantId, ...unitParams),
        compatibilityMédia: db.prepare(`
          SELECT j.title as name, AVG(m.compatibility_score) as value 
          FROM jobs j 
          JOIN candidate_job_matches m ON j.id = m.job_id 
          WHERE j.tenant_id = ? ${unitFilter('j')}
          GROUP BY j.id
        `).all(tenantId, ...unitParams),
        discDistribution: db.prepare(`
          SELECT predominant_profile as name, COUNT(*) as value 
          FROM candidate_disc_results r
          JOIN candidates c ON r.candidate_id = c.id
          WHERE c.tenant_id = ? ${unitFilter('c')}
          GROUP BY predominant_profile
        `).all(tenantId, ...unitParams)
      };

      // 7. Smart Alerts & Suggestions
      const alerts = [];
      const criticalJobs = (recentJobs as any[]).filter(j => j.candidates_count === 0 && j.status === 'Aberta');
      criticalJobs.forEach(j => {
        alerts.push({
          type: 'danger',
          title: 'Vaga sem candidatos',
          message: `A vaga "${j.title}" está aberta há ${Math.floor((Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias e não possui candidatos.`,
          action: 'Revisar requisitos'
        });
      });

      const highMatches = (recommendations as any[]).filter(r => r.compatibility_score >= 90);
      if (highMatches.length > 0) {
        alerts.push({
          type: 'success',
          title: 'Talentos detectados',
          message: `Existem ${highMatches.length} candidatos com compatibilidade superior a 90% aguardando revisão.`,
          action: 'Ver candidatos'
        });
      }

      // 8. Unit Summary
      const unitSummary = db.prepare(`
        SELECT 
          u.id, 
          u.name,
          (SELECT COUNT(*) FROM jobs WHERE unit_id = u.id AND deleted_at IS NULL AND status = 'Aberta') as active_jobs,
          (SELECT COUNT(*) FROM candidates WHERE unit_id = u.id AND deleted_at IS NULL) as total_candidates,
          (SELECT COUNT(*) FROM candidate_job_matches m JOIN jobs j ON m.job_id = j.id WHERE j.unit_id = u.id AND m.status = 'Contratado') as hires
        FROM units u
        WHERE u.tenant_id = ?
      `).all(tenantId);

      res.json({
        stats,
        funnel,
        recentJobs,
        recommendations,
        recentImports,
        charts,
        alerts,
        unitSummary
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Stats Endpoint for Dashboard (Legacy)
  app.get('/api/stats', (req, res) => {
    const { unitId } = req.query;
    try {
      let where = 'WHERE deleted_at IS NULL';
      const params: any[] = [];
      if (unitId && unitId !== 'master') {
        where += ' AND unit_id = ?';
        params.push(unitId);
      }

      const jobsCount = db.prepare(`SELECT COUNT(*) as count FROM jobs ${where}`).get(...params) as any;
      
      let candidateWhere = 'WHERE deleted_at IS NULL';
      const candidateParams: any[] = [];
      if (unitId && unitId !== 'master') {
        candidateWhere += ' AND unit_id = ?';
        candidateParams.push(unitId);
      }
      const candidatesCount = db.prepare(`SELECT COUNT(*) as count FROM candidates ${candidateWhere}`).get(...candidateParams) as any;
      const openJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs ${where} AND status = 'Aberta'`).get(...params) as any;
      const applicationsCount = db.prepare(`SELECT COUNT(*) as count FROM candidate_job_matches`).get() as any;

      res.json({
        jobsCount: jobsCount.count,
        candidatesCount: candidatesCount.count,
        applicationsCount: applicationsCount.count,
        openJobs: openJobs.count
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Candidates Endpoints
  app.get('/api/candidates', (req, res) => {
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
      query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR desired_position LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const candidates = db.prepare(query).all(...params);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  app.get('/api/candidates/:id', (req, res) => {
    try {
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ? AND deleted_at IS NULL').get(req.params.id) as any;
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      // Fetch related data
      candidate.files = db.prepare('SELECT * FROM candidate_files WHERE candidate_id = ?').all(candidate.id);
      candidate.matches = db.prepare(`
        SELECT m.*, j.title as job_title, j.city as job_city, j.state as job_state 
        FROM candidate_job_matches m 
        JOIN jobs j ON m.job_id = j.id 
        WHERE m.candidate_id = ?
      `).all(candidate.id);
      candidate.disc = db.prepare('SELECT * FROM candidate_disc_results WHERE candidate_id = ?').get(candidate.id);
      candidate.history = db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(candidate.id);

      res.json(candidate);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  app.post('/api/candidates', (req, res) => {
    const candidate = req.body;
    if (!candidate.full_name || !candidate.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => candidate[k]);

    const query = `INSERT INTO candidates (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    
    try {
      const result = db.prepare(query).run(...values);
      res.status(201).json({ id: result.lastInsertRowid, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  });

  app.put('/api/candidates/:id', (req, res) => {
    const candidate = req.body;
    const { id } = req.params;

    const keys = Object.keys(candidate).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && k !== 'files' && k !== 'matches' && k !== 'disc' && k !== 'history');
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => candidate[k]);

    const query = `UPDATE candidates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      db.prepare(query).run(...values, id);
      res.json({ id, ...candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', (req, res) => {
    try {
      db.prepare('UPDATE candidates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  app.post('/api/candidates/:id/link-job', (req, res) => {
    const { id } = req.params;
    const { job_id, tenant_id } = req.body;

    try {
      const existing = db.prepare('SELECT id FROM candidate_job_matches WHERE candidate_id = ? AND job_id = ?').get(id, job_id);
      if (existing) return res.status(400).json({ error: 'Candidate already linked to this job' });

      db.prepare('INSERT INTO candidate_job_matches (candidate_id, job_id, tenant_id, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(id, job_id, tenant_id);
      
      // Log history
      db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id, 'LINK', 'Vaga Vinculada', 'Candidato foi vinculado a uma nova oportunidade.');

      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to link job' });
    }
  });

  app.get('/api/candidates/:id/history', (req, res) => {
    try {
      const history = db.prepare('SELECT * FROM candidate_history WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.post('/api/candidates/:id/history', (req, res) => {
    const { id } = req.params;
    const { event_type, title, description, job_id } = req.body;
    try {
      db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, job_id || null, event_type, title, description);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add history' });
    }
  });

  // AI Compatibility Analysis
  app.post('/api/candidates/:id/analyze-job/:jobId', async (req, res) => {
    const { id, jobId } = req.params;
    const { tenant_id } = req.body;

    try {
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;

      if (!candidate || !job) return res.status(404).json({ error: 'Candidate or Job not found' });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
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
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });
      
      const analysis = JSON.parse(result.text || '{}');

      // Update match in DB
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

      db.prepare(updateQuery).run(
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

    // Log history
      db.prepare('INSERT INTO candidate_history (candidate_id, job_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, jobId, 'AI_ANALYSIS', 'Análise IA Realizada', `Score de compatibilidade: ${analysis.compatibility_score}%`);

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  // --- Nexus AI Endpoints ---

  app.get('/api/nexus-ai/settings', (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      const settings = db.prepare('SELECT * FROM ai_matching_settings WHERE tenant_id = ? AND unit_id = ?').get(tenantId, unitId);
      if (!settings) {
        // Return default if not exists
        return res.json({
          default_precision_mode: 'Equilibrada',
          default_compatibility_threshold: 70,
          default_max_results: 20,
          default_distance_radius_km: 50,
          weight_location: 10,
          weight_experience: 20,
          weight_hard_skills: 20,
          weight_soft_skills: 15,
          weight_disc: 15,
          weight_education: 10,
          weight_salary: 5,
          weight_work_model: 5
        });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/nexus-ai/settings', (req, res) => {
    const settings = req.body;
    const { tenant_id, unit_id } = settings;

    const keys = Object.keys(settings).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => settings[k]);

    const query = `
      INSERT INTO ai_matching_settings (${keys.join(',')}, created_at, updated_at) 
      VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(tenant_id, unit_id) DO UPDATE SET 
        ${keys.map(k => `${k} = excluded.${k}`).join(',')},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      db.prepare(query).run(...values);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.post('/api/nexus-ai/match-job', async (req, res) => {
    const { 
      jobId, 
      tenantId, 
      unitId, 
      precisionMode, 
      minScore, 
      maxResults, 
      radius, 
      locationRule,
      onlyWithResume,
      onlyWithDisc,
      statusFilter,
      sourceFilter
    } = req.body;

    try {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Job not found' });

      // Create session
      const sessionResult = db.prepare(`
        INSERT INTO ai_search_sessions 
        (tenant_id, unit_id, job_id, search_type, precision_mode, compatibility_threshold, max_results, distance_radius_km, location_rule, only_with_resume, only_with_disc, created_at)
        VALUES (?, ?, ?, 'match-job', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(tenantId, unitId, jobId, precisionMode || 'Equilibrada', minScore || 70, maxResults || 50, radius, locationRule, onlyWithResume ? 1 : 0, onlyWithDisc ? 1 : 0);
      
      const sessionId = sessionResult.lastInsertRowid;

      // Fetch candidates
      let candQuery = 'SELECT * FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL';
      const candParams: any[] = [tenantId];

      if (unitId && unitId !== 'master') {
        candQuery += ' AND unit_id = ?';
        candParams.push(unitId);
      }

      if (statusFilter && statusFilter !== 'Todos') {
        candQuery += ' AND status = ?';
        candParams.push(statusFilter);
      }

      if (sourceFilter && sourceFilter !== 'Todos') {
        candQuery += ' AND source = ?';
        candParams.push(sourceFilter);
      }

      const candidates = db.prepare(candQuery).all(...candParams) as any[];

      // Fetch DISC for candidates
      for (const cand of candidates) {
        cand.disc = db.prepare('SELECT predominant_profile FROM candidate_disc_results WHERE candidate_id = ?').get(cand.id);
      }

      // AI Matching Logic
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const candidatesToProcess = candidates.slice(0, 50); 

      const prompt = `
        Você é o Nexus AI, sistema de inteligência de recrutamento.
        Sua tarefa é comparar uma lista de candidatos com uma vaga específica.
        Avalie requisitos obrigatórios, desejáveis, experiência, localização, modelo de trabalho, formação, habilidades, DISC e critérios eliminatórios.
        
        Vaga:
        Título: ${job.title}
        Local: ${job.city}/${job.state}
        Modelo: ${job.work_model}
        Requisitos: ${job.mandatory_requirements}
        Descrição: ${job.description}
        Experiência Mínima: ${job.min_experience_years} anos
        
        Configuração de Busca:
        Precisão: ${precisionMode} (Flexível, Equilibrada ou Rigorosa - siga o rigor solicitado)
        Raio Max Distância: ${radius} km
        Regra Localização: ${locationRule} (Peso dado à proximidade)
        
        Candidatos:
        ${candidatesToProcess.map(c => `ID: ${c.id}, Nome: ${c.full_name}, Local: ${c.city}/${c.state}, Exp: ${c.experience_years}y, Skills: ${c.hard_skills}, Modelo: ${c.desired_work_model}, DISC: ${c.disc?.predominant_profile || 'N/A'}`).join('\n')}
        
        Regras de Negócio:
        - Se Vaga Presencial, a localização é crítica.
        - Pontue de 0 a 100 baseando-se no FIT real.
        - 90-100: Altíssimo Fit, 80-89: Alto Fit, 70-79: Fit Moderado.
        
        Retorne APENAS um JSON:
        {
          "results": [
            {
              "candidate_id": number,
              "compatibility_score": number,
              "classification": string,
              "distance_km": number,
              "has_disc": boolean,
              "disc_profile": string,
              "strengths": string[],
              "attention_points": string[],
              "recommendation_reason": string,
              "risk_reason": string
            }
          ],
          "summary": string (resumo geral da busca)
        }
      `;

      const aiResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(aiResult.text || '{"results": [], "summary": ""}');
      
      // Save results
      const insertResultStmt = db.prepare(`
        INSERT INTO ai_search_results 
        (session_id, candidate_id, job_id, compatibility_score, classification, distance_km, has_disc, disc_profile, strengths, attention_points, recommendation_reason, risk_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const resItem of analysis.results) {
        if (resItem.compatibility_score >= (minScore || 0)) {
          insertResultStmt.run(
            sessionId,
            resItem.candidate_id,
            jobId,
            resItem.compatibility_score,
            resItem.classification,
            resItem.distance_km,
            resItem.has_disc ? 1 : 0,
            resItem.disc_profile || null,
            JSON.stringify(resItem.strengths),
            JSON.stringify(resItem.attention_points),
            resItem.recommendation_reason,
            resItem.risk_reason
          );
        }
      }

      // Update session summary
      db.prepare('UPDATE ai_search_sessions SET summary = ? WHERE id = ?').run(analysis.summary, sessionId);

      res.json({ sessionId, summary: analysis.summary, results: analysis.results });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Match job failed' });
    }
  });

  app.post('/api/nexus-ai/chat', async (req, res) => {
    const { message, tenantId, unitId, sessionId } = req.body;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      // Fetch history for context
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const sessionRes = db.prepare('INSERT INTO ai_search_sessions (tenant_id, unit_id, search_type, created_at) VALUES (?, ?, "chat", CURRENT_TIMESTAMP)').run(tenantId, unitId);
        currentSessionId = sessionRes.lastInsertRowid;
      }

      const history = db.prepare('SELECT role, message FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(currentSessionId) as any[];

      const systemPrompt = `
        Você é o Nexus AI, o assistente inteligente central do Nexus AI Recruitment OS.
        Sua missão é ajudar o RH a encontrar os melhores candidatos, analisar perfis, comparar currículos e responder dúvidas sobre o banco de talentos.
        
        Diretrizes:
        1. Seja profissional, eficiente e direto.
        2. Use os dados reais do sistema. Não invente candidatos.
        3. Se o usuário pedir para encontrar candidatos, sugira usar a ferramenta de "Match de Vaga".
        4. Analise dados de DISC se disponíveis.
        5. Considere localização e modelo de trabalho.
        
        Dados disponíveis (Contexto Atual):
        Tenant: ${tenantId}
        Unidade: ${unitId}
      `;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.message }] })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents
      });

      // Save user message
      db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "user", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, unitId, currentSessionId, message);

      // Save assistant response
      db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "assistant", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, unitId, currentSessionId, result.text);

      res.json({ message: result.text, sessionId: currentSessionId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Chat failed' });
    }
  });

  app.get('/api/nexus-ai/sessions', (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      const sessions = db.prepare('SELECT * FROM ai_search_sessions WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // --- HR Tools Endpoints ---

  app.get('/api/hr-tools', (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      let query = 'SELECT * FROM hr_tools WHERE tenant_id = ? AND deleted_at IS NULL';
      const params = [tenantId];
      if (unitId && unitId !== 'master') {
        query += ' AND unit_id = ?';
        params.push(unitId);
      }
      const tools = db.prepare(query).all(...params);
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HR tools' });
    }
  });

  app.get('/api/hr-tools/dashboard', (req, res) => {
    const { tenantId, unitId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    try {
      const unitFilter = unitId && unitId !== 'master' ? 'AND unit_id = ?' : '';
      const params = unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId];

      const totalSent = db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? ${unitFilter}`).get(...params) as any || { count: 0 };
      const totalReceived = db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? AND status = "Concluído" ${unitFilter}`).get(...params) as any || { count: 0 };
      
      const candidatesWithDiscQuery = unitId && unitId !== 'master' 
        ? 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ? AND c.unit_id = ?'
        : 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ?';
      const candidatesWithDisc = db.prepare(candidatesWithDiscQuery).get(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId])) as any || { count: 0 };
      
      const activeForms = db.prepare(`SELECT COUNT(*) as count FROM hr_tools WHERE tenant_id = ? AND status = "Ativo" ${unitFilter}`).get(...params) as any || { count: 0 };

      // DISC Distribution
      const discDistributionQuery = unitId && unitId !== 'master'
        ? `SELECT r.predominant_profile, COUNT(*) as count 
           FROM candidate_disc_results r 
           JOIN candidates c ON r.candidate_id = c.id 
           WHERE c.tenant_id = ? AND c.unit_id = ?
           GROUP BY r.predominant_profile`
        : `SELECT r.predominant_profile, COUNT(*) as count 
           FROM candidate_disc_results r 
           JOIN candidates c ON r.candidate_id = c.id 
           WHERE c.tenant_id = ?
           GROUP BY r.predominant_profile`;
      const discDistribution = db.prepare(discDistributionQuery).all(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId]));

      // Tool usage
      const toolUsage = db.prepare(`
        SELECT t.name, COUNT(r.id) as count
        FROM hr_tools t
        LEFT JOIN hr_tool_responses r ON t.id = r.tool_id
        WHERE t.tenant_id = ? ${unitFilter.replace('unit_id', 't.unit_id')}
        GROUP BY t.id
      `).all(...params);

      // Status funnel
      const statusFunnel = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM hr_tool_responses
        WHERE tenant_id = ? ${unitFilter}
        GROUP BY status
      `).all(...params);

      res.json({
        indicators: {
          sent: totalSent.count || 0,
          received: totalReceived.count || 0,
          completionRate: (totalSent.count || 0) > 0 ? Math.round(((totalReceived.count || 0) / (totalSent.count || 1)) * 100) : 0,
          discCount: candidatesWithDisc.count || 0,
          activeForms: activeForms.count || 0
        },
        charts: {
          disc: discDistribution || [],
          usage: toolUsage || [],
          funnel: statusFunnel || []
        }
      });
    } catch (error: any) {
      console.error('HR Dashboard Error:', error);
      res.status(500).json({ error: 'Failed to fetch HR dashboard data', details: error.message });
    }
  });

  app.get('/api/hr-tools/:id', (req, res) => {
    try {
      const tool = db.prepare('SELECT * FROM hr_tools WHERE id = ?').get(req.params.id);
      const questions = db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all(req.params.id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool details' });
    }
  });

  app.post('/api/hr-tools', (req, res) => {
    const { tenant_id, unit_id, name, type, description, questions } = req.body;
    try {
      const slug = name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(2, 7);
      
      const result = db.transaction(() => {
        const toolInsert = db.prepare(`
          INSERT INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug, status)
          VALUES (?, ?, ?, ?, ?, ?, 'Ativo')
        `).run(tenant_id, unit_id, name, type, description, slug);

        const toolId = toolInsert.lastInsertRowid;

        if (questions && Array.isArray(questions)) {
          const questionInsert = db.prepare(`
            INSERT INTO hr_tool_questions (tool_id, question_text, question_type, is_required, is_eliminatory, expected_answer, options_json, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          questions.forEach((q, idx) => {
            questionInsert.run(
              toolId,
              q.question_text,
              q.question_type,
              q.is_required ? 1 : 0,
              q.is_eliminatory ? 1 : 0,
              q.expected_answer,
              q.options_json ? JSON.stringify(q.options_json) : null,
              idx
            );
          });
        }
        return toolId;
      })();

      res.json({ id: result, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create tool' });
    }
  });

  app.delete('/api/hr-tools/:id', (req, res) => {
    try {
      db.transaction(() => {
        db.prepare('DELETE FROM hr_tool_answers WHERE response_id IN (SELECT id FROM hr_tool_responses WHERE tool_id = ?)').run(req.params.id);
        db.prepare('DELETE FROM hr_tool_responses WHERE tool_id = ?').run(req.params.id);
        db.prepare('DELETE FROM hr_tool_questions WHERE tool_id = ?').run(req.params.id);
        db.prepare('DELETE FROM hr_tools WHERE id = ?').run(req.params.id);
      })();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete tool' });
    }
  });

  app.get('/api/hr-tools/all/responses', (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      let query = `
        SELECT r.*, c.full_name as candidate_name, j.title as job_title, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE t.tenant_id = ?
      `;
      const params = [tenantId];
      
      if (unitId && unitId !== 'master') {
        query += ' AND r.unit_id = ?';
        params.push(unitId);
      }
      
      query += ' ORDER BY r.created_at DESC';
      
      const responses = db.prepare(query).all(...params);
      res.json(responses);
    } catch (error) {
       console.error(error);
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.get('/api/hr-tools/:id/responses', (req, res) => {
    try {
      const responses = db.prepare(`
        SELECT r.*, c.full_name as candidate_name, j.title as job_title
        FROM hr_tool_responses r
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.tool_id = ?
        ORDER BY r.created_at DESC
      `).all(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.post('/api/hr-tools/responses/:responseId/analyze', async (req, res) => {
    try {
      const response = db.prepare('SELECT * FROM hr_tool_responses WHERE id = ?').get(req.params.responseId) as any;
      const answers = db.prepare(`
        SELECT a.*, q.question_text, q.question_type
        FROM hr_tool_answers a
        JOIN hr_tool_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
      `).all(req.params.responseId) as any[];

      const candidate = response.candidate_id ? db.prepare('SELECT * FROM candidates WHERE id = ?').get(response.candidate_id) as any : null;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Você é um especialista sênior em Recrutamento e Seleção. Analise as respostas deste formulário de RH aplicadas ao candidato ${candidate?.full_name || 'Anônimo'}.
        
        Respostas:
        ${answers.map(a => `Pergunta: ${a.question_text}\nResposta: ${a.answer_text}`).join('\n\n')}
        
        Gere um parecer profissional estruturado:
        1. Resumo Executivo das respostas.
        2. Pontos Fortes identificados.
        3. Pontos de Atenção/Dúvida.
        4. Recomendação (Prosseguir, Avaliar com Cautela ou Reprovar).
        5. Sugestões de perguntas para a próxima entrevista.
        
        Retorne um JSON:
        {
          "summary": string,
          "strengths": string[],
          "attention_points": string[],
          "recommendation": string,
          "suggested_questions": string[],
          "score_estimate": number (0-100)
        }
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(result.text || '{}');

      db.prepare(`
        UPDATE hr_tool_responses 
        SET ai_summary = ?, ai_analysis_json = ?, score = ?, classification = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(analysis.summary, result.text, analysis.score_estimate, analysis.recommendation, req.params.responseId);

      res.json({ success: true, analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  app.get('/api/candidates/:id/hr-tools', (req, res) => {
    try {
      const evaluations = db.prepare(`
        SELECT r.*, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.candidate_id = ?
        ORDER BY r.created_at DESC
      `).all(req.params.id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate tools' });
    }
  });

  // --- Public Tool Endpoints ---

  app.get('/api/public/hr-tools/:slug', (req, res) => {
    try {
      const tool = db.prepare('SELECT * FROM hr_tools WHERE public_slug = ? AND status = "Ativo"').get(req.params.slug);
      if (!tool) return res.status(404).json({ error: 'Tool not found or inactive' });

      const questions = db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all((tool as any).id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool' });
    }
  });

  app.post('/api/public/hr-tools/:slug/submit', (req, res) => {
    const { candidateInfo, answers, jobId } = req.body;
    const { slug } = req.params;

    try {
      const tool = db.prepare('SELECT * FROM hr_tools WHERE public_slug = ?').get(slug) as any;
      if (!tool) return res.status(404).json({ error: 'Tool not found' });

      // 1. Find or create candidate
      let candidateId: number | bigint;
      const existingCandidate = db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(candidateInfo.email, tool.tenant_id) as any;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        const newCandRes = db.prepare(`
          INSERT INTO candidates (tenant_id, unit_id, full_name, email, phone, source, status)
          VALUES (?, ?, ?, ?, ?, 'Ferramenta RH', 'Novo')
        `).run(tool.tenant_id, tool.unit_id, candidateInfo.full_name, candidateInfo.email, candidateInfo.phone);
        candidateId = newCandRes.lastInsertRowid;
      }

      // 2. Create response
      const responseRes = db.prepare(`
        INSERT INTO hr_tool_responses (tenant_id, unit_id, tool_id, candidate_id, job_id, status, completed_at)
        VALUES (?, ?, ?, ?, ?, 'Concluído', CURRENT_TIMESTAMP)
      `).run(tool.tenant_id, tool.unit_id, tool.id, candidateId, jobId || null);

      const responseId = responseRes.lastInsertRowid;

      // 3. Save answers
      const answerInsert = db.prepare(`
        INSERT INTO hr_tool_answers (response_id, question_id, answer_text, answer_json)
        VALUES (?, ?, ?, ?)
      `);

      answers.forEach((ans: any) => {
        answerInsert.run(
          responseId,
          ans.question_id,
          typeof ans.value === 'object' ? null : String(ans.value),
          typeof ans.value === 'object' ? JSON.stringify(ans.value) : null
        );
      });

      // 4. If it's a DISC tool, process DISC logic (simplified for demo)
      if (tool.type === 'DISC') {
        const profiles = ['Dominância', 'Influência', 'Estabilidade', 'Conformidade'];
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
        
        db.prepare(`
          INSERT INTO candidate_disc_results (
            candidate_id, predominant_profile, behavioral_summary, created_at, updated_at
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          candidateId, 
          randomProfile, 
          `Perfil ${randomProfile} identificado via Ferramenta de RH.`
        );
        
        // Log in history
        db.prepare('INSERT INTO candidate_history (candidate_id, event_type, title, description) VALUES (?, "ASSESSMENT", "DISC Concluído", ?)')
          .run(candidateId, `Candidato concluiu a avaliação DISC: ${randomProfile}`);
      }

      res.json({ success: true, responseId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Submission failed' });
    }
  });

  // --- Mass Import Endpoints ---

  app.get('/api/imports/dashboard', (req, res) => {
    const { tenantId } = req.query;
    try {
      const stats = db.prepare(`
        SELECT 
          SUM(total_files) as total_files,
          SUM(processed_files) as processed_files,
          SUM(created_candidates) as created_candidates,
          SUM(duplicate_files) as duplicate_files,
          SUM(error_files) as error_files
        FROM import_batches
        WHERE tenant_id = ?
      `).get(tenantId) as any;

      const monthlyTrend = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(total_files) as files
        FROM import_batches
        WHERE tenant_id = ?
        GROUP BY month
        LIMIT 6
      `).all(tenantId);

      res.json({ stats, monthlyTrend });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import dashboard stats' });
    }
  });

  app.get('/api/imports', (req, res) => {
    const { tenantId } = req.query;
    try {
      const batches = db.prepare(`
        SELECT b.*, j.title as job_title
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.tenant_id = ?
        ORDER BY b.created_at DESC
      `).all(tenantId);
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch imports' });
    }
  });

  app.post('/api/imports', (req, res) => {
    const { tenant_id, unit_id, name, job_id, import_type, analysis_mode, precision_mode, compatibility_threshold, duplicate_strategy } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO import_batches (
          tenant_id, unit_id, name, job_id, import_type, analysis_mode, 
          precision_mode, compatibility_threshold, duplicate_strategy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        tenant_id, unit_id, name || `Lote ${new Date().toLocaleDateString()}`, 
        job_id || null, import_type || 'mixed', analysis_mode || 'full',
        precision_mode || 'Equilibrada', compatibility_threshold || 70, duplicate_strategy || 'manual'
      );
      res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create import batch' });
    }
  });

  app.get('/api/imports/:id', (req, res) => {
    try {
      const batch = db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(req.params.id);
      
      const files = db.prepare('SELECT * FROM import_files WHERE batch_id = ?').all(req.params.id);
      
      res.json({ ...batch as any, files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch batch details' });
    }
  });

  app.post('/api/imports/:id/files', (req, res) => {
    const { files, tenant_id, unit_id } = req.body; // Mock files for demo
    try {
      const batchId = req.params.id;
      const insertFile = db.prepare(`
        INSERT INTO import_files (batch_id, tenant_id, unit_id, file_name, file_type, file_size, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
      `);

      db.transaction(() => {
        files.forEach((f: any) => {
          insertFile.run(batchId, tenant_id, unit_id, f.name, f.type, f.size);
        });
        
        db.prepare('UPDATE import_batches SET total_files = total_files + ? WHERE id = ?').run(files.length, batchId);
      })();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add files to batch' });
    }
  });

  app.post('/api/imports/:id/start', async (req, res) => {
    const batchId = req.params.id;
    try {
      const batch = db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(batchId) as any;

      const files = db.prepare('SELECT * FROM import_files WHERE batch_id = ? AND status = "uploaded"').all(batchId) as any[];

      db.prepare('UPDATE import_batches SET status = "processing" WHERE id = ?').run(batchId);

      // Start processing in background (simulated since we return response)
      // For this app, we'll process them and then respond when done or simulated sequential
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      for (const file of files) {
        db.prepare('UPDATE import_files SET status = "processing", progress = 10, duplicate_status = "none", duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?').run(file.id);

        // Simulation code: we don't have the actual PDF content, so we use the filename to simulate text
        const simulatedText = `Currículo de demonstração para o arquivo ${file.file_name}. Candidato com experiência em Logística e Operações.`;
        
        const prompt = `
          Você é um especialista em recrutamento. Analise o texto do currículo e extraia os dados do candidato em JSON estruturado.
          Se houver uma vaga vinculada, compare o currículo com a vaga.
          
          Currículo:
          ${simulatedText}
          
          Vaga:
          ${batch.job_title ? `${batch.job_title}: ${batch.job_description}` : 'Nenhuma vaga vinculada'}
          
          Retorne um JSON:
          {
            "name": string,
            "email": string,
            "phone": string,
            "city": string,
            "state": string,
            "role": string,
            "summary": string,
            "experience_years": number,
            "skills": string[],
            "compatibility_score": number (0-100),
            "recommendation": string,
            "strengths": string[],
            "attention_points": string[]
          }
        `;

        try {
          const aiResult = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          const textResponse = aiResult.text || "";
          
          let data;
          try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            data = JSON.parse(jsonMatch[0]);
          } catch (parseErr) {
            console.error("Failed to parse JSON from AI response:", textResponse);
            throw new Error(`Falha ao converter resposta da IA em dados estruturados: ${parseErr.message}`);
          }

          // Check for duplication (by email)
          const existing = db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(data.email, batch.tenant_id) as any;
          
          let status = 'completed';
          let duplicateStatus = 'none';
          let duplicateCandidateId = null;

          if (existing) {
            status = 'duplicate';
            duplicateStatus = 'email';
            duplicateCandidateId = existing.id;
          }

          db.prepare(`
            UPDATE import_files 
            SET status = ?, 
                progress = 100, 
                extracted_text = ?, 
                parsed_data_json = ?, 
                ai_summary = ?,
                duplicate_status = ?,
                duplicate_candidate_id = ?,
                compatibility_score = ?,
                compatibility_classification = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            status, 
            simulatedText, 
            JSON.stringify(data), 
            data.summary, 
            duplicateStatus, 
            duplicateCandidateId, 
            data.compatibility_score,
            data.recommendation,
            file.id
          );

          // Update batch counters
          db.prepare(`
            UPDATE import_batches 
            SET processed_files = processed_files + 1,
                duplicate_files = duplicate_files + ${duplicateStatus !== 'none' ? 1 : 0},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(batchId);

        } catch (err) {
          console.error(`Error processing file ${file.id}:`, err);
          db.prepare('UPDATE import_files SET status = "error", error_message = ? WHERE id = ?').run(String(err), file.id);
          db.prepare('UPDATE import_batches SET error_files = error_files + 1 WHERE id = ?').run(batchId);
        }
      }

      db.prepare('UPDATE import_batches SET status = "completed" WHERE id = ?').run(batchId);
      res.json({ success: true });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Processing failed' });
    }
  });

  app.post('/api/imports/files/:id/reprocess', async (req, res) => {
    const fileId = req.params.id;
    try {
      const file = db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      const batch = db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(file.batch_id) as any;

      db.prepare('UPDATE import_files SET status = "uploaded" WHERE id = ?').run(fileId);
      
      // Reuse logic from /start but for just one file
      // In a real app we'd extract this to a service function
      res.json({ success: true, message: 'Reprocessamento iniciado' });
      
      // Background process (simulated)
      (async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        db.prepare('UPDATE import_files SET status = "processing", progress = 10, duplicate_status = "none", duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?').run(fileId);

        const simulatedText = `Currículo de demonstração para o arquivo ${file.file_name}. Candidato com experiência em Logística e Operações.`;
        const prompt = `Extraia dados em JSON: ${simulatedText}. Vaga: ${batch.job_title || 'Nenhuma'}`;

        try {
          const aiResult = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          const textResponse = aiResult.text || "";
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found");
          const data = JSON.parse(jsonMatch[0]);

          const existing = db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ?').get(data.email, batch.tenant_id) as any;
          let status = 'completed';
          let duplicateStatus = 'none';
          let duplicateCandidateId = null;

          if (existing) {
            status = 'duplicate';
            duplicateStatus = 'email';
            duplicateCandidateId = existing.id;
          }

          db.prepare(`
            UPDATE import_files 
            SET status = ?, progress = 100, extracted_text = ?, parsed_data_json = ?, ai_summary = ?,
                duplicate_status = ?, duplicate_candidate_id = ?, compatibility_score = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(status, simulatedText, JSON.stringify(data), data.summary, duplicateStatus, duplicateCandidateId, data.compatibility_score, fileId);

          db.prepare('UPDATE import_batches SET processed_files = (SELECT COUNT(*) FROM import_files WHERE batch_id = ? AND status IN ("completed", "duplicate", "error")), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(file.batch_id, file.batch_id);
        } catch (err) {
          db.prepare('UPDATE import_files SET status = "error", error_message = ? WHERE id = ?').run(err.message, fileId);
        }
      })();

    } catch (error) {
      res.status(500).json({ error: 'Failed to reprocess file' });
    }
  });

  app.delete('/api/imports/files/:id', (req, res) => {
    const fileId = req.params.id;
    try {
      const file = db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      db.transaction(() => {
        db.prepare('DELETE FROM import_files WHERE id = ?').run(fileId);
        db.prepare('UPDATE import_batches SET total_files = total_files - 1 WHERE id = ?').run(file.batch_id);
      })();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.post('/api/imports/:id/commit', (req, res) => {
    const batchId = req.params.id;
    try {
      const files = db.prepare('SELECT * FROM import_files WHERE batch_id = ? AND status IN ("completed", "duplicate")').all(batchId) as any[];
      const batch = db.prepare('SELECT * FROM import_batches WHERE id = ?').get(batchId) as any;

      db.transaction(() => {
        for (const file of files) {
          const data = JSON.parse(file.parsed_data_json);
          
          if (file.status === 'completed') {
            // Create new candidate
            const candRes = db.prepare(`
              INSERT INTO candidates (
                tenant_id, unit_id, full_name, email, phone, city, state, 
                desired_position, summary, experience_years, hard_skills, source, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importação em Massa', 'Novo')
            `).run(
              file.tenant_id, file.unit_id, data.name, data.email, data.phone, data.city, data.state,
              data.role, data.summary, data.experience_years, data.skills.join(', ')
            );

            const candId = candRes.lastInsertRowid;

            // Link to job if batch has job
            if (batch.job_id) {
              db.prepare(`
                INSERT INTO candidate_job_matches (candidate_id, job_id, compatibility_score, classification, status)
                VALUES (?, ?, ?, ?, 'Triagem')
              `).run(candId, batch.job_id, file.compatibility_score, file.compatibility_classification);
            }

            db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed" WHERE id = ?').run(candId, file.id);
            db.prepare('UPDATE import_batches SET created_candidates = created_candidates + 1 WHERE id = ?').run(batchId);
          } 
          else if (file.status === 'duplicate' && batch.duplicate_strategy === 'update') {
             // Update existing
             db.prepare(`
               UPDATE candidates 
               SET full_name = ?, phone = ?, city = ?, state = ?, summary = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?
             `).run(data.name, data.phone, data.city, data.state, data.summary, file.duplicate_candidate_id);
             
             db.prepare('UPDATE import_files SET status = "committed" WHERE id = ?').run(file.id);
             db.prepare('UPDATE import_batches SET updated_candidates = updated_candidates + 1 WHERE id = ?').run(batchId);
          }
        }
      })();

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Commit failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FAILED TO START SERVER:', err);
  process.exit(1);
});

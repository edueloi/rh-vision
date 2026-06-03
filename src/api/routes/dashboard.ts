import { Express } from 'express';
import db from '../../lib/db';
import { upload } from '../helpers/files';
import { extractResumeTextFromBuffer } from '../helpers/files';
import { createAIClient as createGeminiClient, GEMINI_MODEL } from '../helpers/ai';
import { parseJsonFromAiResponseSafe } from '../helpers/resume';

export function registerDashboardRoutes(app: Express) {
  app.get('/api/dashboard/overview', async (req, res) => {
    const { unitId, tenantId, period = '30d' } = req.query;
    try {
      const periodMap: Record<string, string> = {
        all: '10 year',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
        '180d': '180 days',
        '365d': '365 days',
      };
      const p = periodMap[String(period)] || '30 days';
      const unitFilter = (alias?: string) => {
        const prefix = alias ? `${alias}.` : '';
        return unitId && unitId !== 'master' ? `AND ${prefix}unit_id = ?` : '';
      };
      const unitParams = unitId && unitId !== 'master' ? [unitId] : [];

      const stats = await db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM jobs WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND status = 'Aberta') as active_jobs,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL) as total_candidates,
          (SELECT COUNT(*) FROM candidates WHERE tenant_id = ? ${unitFilter()} AND deleted_at IS NULL AND created_at >= date('now', '-${p}')) as new_candidates,
          (SELECT COUNT(*) FROM ai_search_results r JOIN ai_search_sessions s ON r.session_id = s.id WHERE s.tenant_id = ? AND r.compatibility_score >= 80) as compatible_candidates,
          (SELECT COUNT(*) FROM hr_tool_responses) as tool_responses
      `).get(tenantId, ...unitParams, tenantId, ...unitParams, tenantId, ...unitParams, tenantId) as any;

      const FUNNEL_STATUS_LIST = ['Triagem', 'IA Match', 'Entrevista', 'Entrevista Realizada', 'Finalista', 'Aprovado', 'Contratado', 'Desistência', 'Sem Sucesso'];
      const funnelRows = await db.prepare(`
        SELECT
          m.status, COUNT(*) as count
        FROM candidate_job_matches m
        JOIN jobs j ON m.job_id = j.id
        WHERE j.tenant_id = ? ${unitFilter('j')}
        GROUP BY m.status
      `).all(tenantId, ...unitParams) as any[];

      const funnel = FUNNEL_STATUS_LIST.map(s => ({
        status: s,
        count: (funnelRows.find((r: any) => r.status === s)?.count ?? 0)
      }));

      const recentJobs = await db.prepare(`
        SELECT j.id, j.title, j.city, j.state, j.status, j.created_at,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id) as candidates_count,
          (SELECT COUNT(*) FROM candidate_job_matches WHERE job_id = j.id AND compatibility_score >= 80) as compatible_count
        FROM jobs j
        WHERE j.tenant_id = ? ${unitFilter('j')} AND j.deleted_at IS NULL
        ORDER BY j.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      const recommendations = await db.prepare(`
        SELECT c.id, c.full_name, c.city, c.state, j.title as job_title, m.compatibility_score, m.compatibility_classification as classification
        FROM candidate_job_matches m
        JOIN candidates c ON m.candidate_id = c.id
        JOIN jobs j ON m.job_id = j.id
        WHERE c.tenant_id = ? ${unitFilter('c')} AND m.compatibility_score >= 70
        ORDER BY m.compatibility_score DESC, c.created_at DESC
        LIMIT 5
      `).all(tenantId, ...unitParams);

      const recentImports = await db.prepare(`
        SELECT id, name, created_at, total_files, processed_files, created_candidates, status
        FROM import_batches
        WHERE tenant_id = ? ${unitFilter()}
        ORDER BY created_at DESC
        LIMIT 3
      `).all(tenantId, ...unitParams);

      const charts = {
        candidatesByStatus: await db.prepare(`
          SELECT status, COUNT(*) as value FROM candidates WHERE tenant_id = ? ${unitFilter()} GROUP BY status
        `).all(tenantId, ...unitParams),
        compatibilityMedia: await db.prepare(`
          SELECT j.title as name, AVG(m.compatibility_score) as value
          FROM jobs j
          JOIN candidate_job_matches m ON j.id = m.job_id
          WHERE j.tenant_id = ? ${unitFilter('j')}
          GROUP BY j.id
        `).all(tenantId, ...unitParams),
        discDistribution: await db.prepare(`
          SELECT predominant_profile as name, COUNT(*) as value
          FROM candidate_disc_results r
          JOIN candidates c ON r.candidate_id = c.id
          WHERE c.tenant_id = ? ${unitFilter('c')}
          GROUP BY predominant_profile
        `).all(tenantId, ...unitParams)
      };

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

      const unitSummary = await db.prepare(`
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

  app.get('/api/stats', async (req, res) => {
    const { unitId } = req.query;
    try {
      let where = 'WHERE deleted_at IS NULL';
      const params: any[] = [];
      if (unitId && unitId !== 'master') {
        where += ' AND unit_id = ?';
        params.push(unitId);
      }

      const jobsCount = await db.prepare(`SELECT COUNT(*) as count FROM jobs ${where}`).get(...params) as any;

      let candidateWhere = 'WHERE deleted_at IS NULL';
      const candidateParams: any[] = [];
      if (unitId && unitId !== 'master') {
        candidateWhere += ' AND unit_id = ?';
        candidateParams.push(unitId);
      }
      const candidatesCount = await db.prepare(`SELECT COUNT(*) as count FROM candidates ${candidateWhere}`).get(...candidateParams) as any;
      const openJobs = await db.prepare(`SELECT COUNT(*) as count FROM jobs ${where} AND status = 'Aberta'`).get(...params) as any;
      const applicationsCount = await db.prepare(`SELECT COUNT(*) as count FROM candidate_job_matches`).get() as any;

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

  app.post('/api/ai/parse-resume', upload.single('resume') as any, async (req, res) => {
    console.log('--- AI RESUME PARSE REQUEST RECEIVED ---');
    try {
      const file = req.file;
      if (!file) {
        console.error('[PARSE] Nenhum arquivo recebido no Multer');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      console.log('[PARSE] Arquivo recebido:', file.originalname, 'Tipo:', file.mimetype);

      const text = await extractResumeTextFromBuffer(file.buffer, file.originalname, file.mimetype);
      if (!text || text.trim().length === 0) {
        console.warn('[PARSE] Nenhum texto extraído do arquivo');
      }

      console.log('[PARSE] Chamando OpenAI...');
      const ai = createGeminiClient();

      const prompt = `
        Você é Aurora, assistente de recrutamento inteligente da Develoi.
        Sua missão é extrair ABSOLUTAMENTE TUDO do currículo abaixo com o máximo de inteligência e precisão.
        NÃO PULE NENHUMA SEÇÃO. Leia CADA LINHA do currículo.
        Se um campo não existir no currículo, retorne null. Mas se existir, EXTRAIA.

        REGRAS ESPECÍFICAS DE INTELIGÊNCIA:
        1. CARGO ATUAL/DESEJADO: Identifique o cargo principal no cabeçalho ou resumo (ex: "Engenheiro de Software Full Stack"). Se houver um título claro no topo do currículo, esse é o "desired_position".
        2. AGRUPAMENTO POR EMPRESA: Se o candidato teve múltiplas promoções ou cargos na MESMA empresa (ex: Estagiário -> Júnior -> Pleno), agrupe-os em um único bloco de experiência se possível, ou garanta que o nome da empresa seja IDÊNTICO para facilitar a leitura. No campo "period", some o tempo total ou descreva a evolução.
        3. DETALHAMENTO DE PROJETOS: Se houver uma seção de projetos ou portfólio, extraia as tecnologias e o papel do candidato.

        CAMPOS JSON:
        - "experiences_list": ARRAY com emprego/experiência. Campos: company, role, period, location, description (atividades resumidas).
        - "education_list": ARRAY com formação. Campos: course, institution, status, degree_type, start_date, end_date.
        - "hard_skills": String com TODAS as tecnologias e ferramentas (ex: Angular, Node.js, TypeScript, PostgreSQL).
        - "experience_years": Número total de anos de carreira.
        - "desired_position": O título profissional principal do candidato (ex: Engenheiro de Software Full Stack).

        Texto do Currículo:
        ${text}

        JSON de resposta:
        {
          "full_name": string | null,
          "email": string | null,
          "phone": string | null,
          "cpf": string | null,
          "birth_date": string | null,
          "city": string | null,
          "state": string | null,
          "address": string | null,
          "linkedin_url": string | null,
          "portfolio_url": string | null,
          "desired_position": string | null,
          "desired_area": string | null,
          "desired_salary": number | null,
          "experience_years": number | null,
          "education_level": string | null,
          "hard_skills": string | null,
          "soft_skills": string | null,
          "highlights": string | null,
          "professional_summary": string | null,
          "desired_work_model": string | null,
          "desired_contract_type": string | null,
          "has_cnh": boolean | null,
          "cnh_category": string | null,
          "available_to_travel": boolean | null,
          "available_to_relocate": boolean | null,
          "experiences_list": [{ "company": string, "role": string, "period": string, "location": string | null, "description": string }],
          "education_list": [{ "course": string, "institution": string, "status": string, "degree_type": string | null, "start_date": string | null, "end_date": string | null }],
          "certifications_list": [{ "name": string, "institution": string | null, "year": string | null }],
          "projects_list": [{ "name": string, "description": string, "technologies": string | null }],
          "languages_list": [{ "language": string, "level": string }]
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2600,
          reasoningEffort: 'medium',
          operationLabel: 'extração completa de currículo',
        }
      });

      const data = parseJsonFromAiResponseSafe(result.text || '{}');
      console.log('[PARSE] ✅ Extração completa:');
      console.log('  Nome:', data.full_name);
      console.log('  Experiências:', data.experiences_list?.length || 0);
      console.log('  Formações:', data.education_list?.length || 0);
      console.log('  Certificações:', data.certifications_list?.length || 0);
      console.log('  Projetos:', data.projects_list?.length || 0);
      console.log('  Idiomas:', data.languages_list?.length || 0);
      console.log('  Hard Skills:', data.hard_skills?.substring(0, 80) || 'N/A');
      console.log('  Soft Skills:', data.soft_skills?.substring(0, 80) || 'N/A');
      res.json(data);
    } catch (error: any) {
      console.error('[PARSE] Erro Crítico:', error);
      res.status(500).json({
        error: error.message || 'Falha ao processar currículo',
        details: error.stack
      });
    }
  });
}

import { Express } from 'express';
import db from '../../lib/db';
import { createAIClient as createGeminiClient, GEMINI_MODEL } from '../helpers/ai';

export function registerHrToolRoutes(app: Express) {
  app.get('/api/hr-tools', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      let query = 'SELECT * FROM hr_tools WHERE tenant_id = ? AND deleted_at IS NULL';
      const params = [tenantId];
      if (unitId && unitId !== 'master') {
        query += ' AND unit_id = ?';
        params.push(unitId);
      }
      const tools = await db.prepare(query).all(...params);
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HR tools' });
    }
  });

  app.get('/api/hr-tools/dashboard', async (req, res) => {
    const { tenantId, unitId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    try {
      const unitFilter = unitId && unitId !== 'master' ? 'AND unit_id = ?' : '';
      const params = unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId];

      const totalSentRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? ${unitFilter}`).get(...params) as any;
      const totalSent = { count: Number(totalSentRaw?.count || 0) };

      const totalReceivedRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tool_responses WHERE tenant_id = ? AND status = 'Concluído' ${unitFilter}`).get(...params) as any;
      const totalReceived = { count: Number(totalReceivedRaw?.count || 0) };

      const candidatesWithDiscQuery = unitId && unitId !== 'master'
        ? 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ? AND c.unit_id = ?'
        : 'SELECT COUNT(DISTINCT r.candidate_id) as count FROM candidate_disc_results r JOIN candidates c ON r.candidate_id = c.id WHERE c.tenant_id = ?';
      const candidatesWithDiscRaw = await db.prepare(candidatesWithDiscQuery).get(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId])) as any;
      const candidatesWithDisc = { count: Number(candidatesWithDiscRaw?.count || 0) };

      const activeFormsRaw = await db.prepare(`SELECT COUNT(*) as count FROM hr_tools WHERE tenant_id = ? AND status = 'Ativo' ${unitFilter}`).get(...params) as any;
      const activeForms = { count: Number(activeFormsRaw?.count || 0) };

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
      const discDistribution = (await db.prepare(discDistributionQuery).all(...(unitId && unitId !== 'master' ? [tenantId, unitId] : [tenantId])))
        .map((d: any) => ({ ...d, count: Number(d.count || 0) }));

      const toolUsage = await db.prepare(`
        SELECT t.name, COUNT(r.id) as count
        FROM hr_tools t
        LEFT JOIN hr_tool_responses r ON t.id = r.tool_id
        WHERE t.tenant_id = ? ${unitFilter.replace('unit_id', 't.unit_id')}
        GROUP BY t.id
      `).all(...params);

      const statusFunnel = await db.prepare(`
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

  app.get('/api/hr-tools/all/responses', async (req, res) => {
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

      const responses = await db.prepare(query).all(...params);
      res.json(responses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.get('/api/hr-tools/responses/:responseId', async (req, res) => {
    try {
      const response = await db.prepare(`
        SELECT r.*, c.full_name as candidate_name, c.email as candidate_email, j.title as job_title, t.name as tool_name, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        LEFT JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.id = ?
      `).get(req.params.responseId) as any;

      if (!response) return res.status(404).json({ error: 'Response not found' });

      const answers = await db.prepare(`
        SELECT a.*, q.question_text, q.question_type
        FROM hr_tool_answers a
        JOIN hr_tool_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
        ORDER BY q.position ASC
      `).all(req.params.responseId);

      res.json({ ...response, answers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch response details' });
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

  app.get('/api/hr-tools/:id', async (req, res) => {
    try {
      const tool = await db.prepare('SELECT * FROM hr_tools WHERE id = ?').get(req.params.id);
      const questions = await db.prepare('SELECT * FROM hr_tool_questions WHERE tool_id = ? ORDER BY position ASC').all(req.params.id);
      res.json({ ...tool as any, questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tool details' });
    }
  });

  app.post('/api/hr-tools', async (req, res) => {
    const { tenant_id, unit_id, name, type, description, questions } = req.body;
    try {
      const slug = name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(2, 7);

      const toolInsert = await db.prepare(`
        INSERT INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Ativo')
      `).run(tenant_id, unit_id, name, type, description, slug);

      const toolId = toolInsert.lastInsertRowid;

      if (questions && Array.isArray(questions)) {
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx];
          await db.prepare(`
            INSERT INTO hr_tool_questions (tool_id, question_text, question_type, is_required, is_eliminatory, expected_answer, options_json, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            toolId,
            q.question_text,
            q.question_type,
            q.is_required ? 1 : 0,
            q.is_eliminatory ? 1 : 0,
            q.expected_answer,
            q.options_json ? JSON.stringify(q.options_json) : null,
            idx
          );
        }
      }

      res.json({ id: toolId, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create tool' });
    }
  });

  app.delete('/api/hr-tools/:id', async (req, res) => {
    try {
      await db.prepare('DELETE FROM hr_tool_answers WHERE response_id IN (SELECT id FROM hr_tool_responses WHERE tool_id = ?)').run(req.params.id);
      await db.prepare('DELETE FROM hr_tool_responses WHERE tool_id = ?').run(req.params.id);
      await db.prepare('DELETE FROM hr_tool_questions WHERE tool_id = ?').run(req.params.id);
      await db.prepare('DELETE FROM hr_tools WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete tool' });
    }
  });

  app.post('/api/hr-tools/responses/:responseId/analyze', async (req, res) => {
    try {
      const responseId = req.params.responseId;
      const response = await db.prepare(`
        SELECT r.*, t.name as tool_name, t.description as tool_description, t.type as tool_type
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.id = ?
      `).get(responseId) as any;

      if (!response) return res.status(404).json({ error: 'Response not found' });

      const answers = await db.prepare(`
        SELECT a.*, q.question_text, q.question_type
        FROM hr_tool_answers a
        JOIN hr_tool_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
      `).all(responseId) as any[];

      const candidate = response.candidate_id ? await db.prepare('SELECT * FROM candidates WHERE id = ?').get(response.candidate_id) as any : null;
      const isDisc = response.tool_name.toLowerCase().includes('disc') || (response.tool_type && response.tool_type.toLowerCase().includes('disc'));

      const ai = createGeminiClient();

      const prompt = `
        Você é Aurora, especialista sênior em Recrutamento e Seleção.
        Analise as respostas do formulário "${response.tool_name}" para o candidato ${candidate?.full_name || 'Anônimo'}.

        RESPOSTAS:
        ${answers.map((a: any) => `Pergunta: ${a.question_text}\nResposta: ${a.answer_text}`).join('\n\n')}

        ${isDisc ? `Como esta é uma avaliação DISC, você DEVE calcular e retornar as pontuações para os 4 perfis:
        - Dominância (D): Foco em resultados, rapidez, competitividade.
        - Influência (I): Foco em pessoas, comunicação, otimismo.
        - Estabilidade (S): Foco em colaboração, persistência, ritmo constante.
        - Conformidade (C): Foco em detalhes, precisão, regras.` : ''}

        Gere um parecer profissional estruturado em JSON:
        {
          "summary": "Resumo executivo do perfil (máx 60 palavras)",
          "score_estimate": number (0-100),
          "recommendation": "Prosseguir" | "Atenção" | "Reprovar",
          "strengths": string[],
          "attention_points": string[],
          "suggested_questions": string[],
          ${isDisc ? `"disc_scores": { "D": number, "I": number, "S": number, "C": number }, "predominant_profile": "D" | "I" | "S" | "C"` : ''}
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1500,
          reasoningEffort: 'medium',
          operationLabel: 'parecer estruturado de ferramenta RH',
        }
      });

      const analysis = JSON.parse(result.text || '{}');

      await db.prepare(`
        UPDATE hr_tool_responses
        SET ai_summary = ?, ai_analysis_json = ?, score = ?, classification = ?, status = 'Concluído', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(analysis.summary, result.text, analysis.score_estimate, analysis.recommendation, responseId);

      if (isDisc && analysis.disc_scores) {
        try {
          await db.prepare(`
            INSERT INTO candidate_disc_results (candidate_id, predominant_profile, disc_d, disc_i, disc_s, disc_c)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              predominant_profile = VALUES(predominant_profile),
              disc_d = VALUES(disc_d),
              disc_i = VALUES(disc_i),
              disc_s = VALUES(disc_s),
              disc_c = VALUES(disc_c)
          `).run(
            response.candidate_id,
            analysis.predominant_profile || '?',
            analysis.disc_scores.D || 0,
            analysis.disc_scores.I || 0,
            analysis.disc_scores.S || 0,
            analysis.disc_scores.C || 0
          );
        } catch (e) {
          console.error('DISC Save Error:', e);
        }
      }

      res.json({ success: true, analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  app.get('/api/candidates/:id/hr-tools', async (req, res) => {
    try {
      const evaluations = await db.prepare(`
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
}

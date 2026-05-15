import { Express } from 'express';
import db from '../../lib/db';
import { createAIClient as createGeminiClient, GEMINI_MODEL } from '../helpers/ai';

export function registerDiscRoutes(app: Express) {
  app.get('/api/disc/results', async (req, res) => {
    const { tenantId, unitId } = req.query as any;
    try {
      let q = `
        SELECT d.*, c.full_name, c.email, c.phone, c.city, c.state, c.unit_id as candidate_unit_id
        FROM candidate_disc_results d
        JOIN candidates c ON d.candidate_id = c.id
        JOIN (
          SELECT candidate_id, MAX(id) as max_id
          FROM candidate_disc_results
          GROUP BY candidate_id
        ) latest ON d.id = latest.max_id
        WHERE c.tenant_id = ?
      `;
      const params: any[] = [tenantId];
      if (unitId && unitId !== 'master') { q += ' AND c.unit_id = ?'; params.push(unitId); }
      q += ' ORDER BY d.created_at DESC';
      const rows = await db.prepare(q).all(...params);
      res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch DISC results' }); }
  });

  app.get('/api/disc/results/:id', async (req, res) => {
    try {
      const disc = await db.prepare(`
        SELECT d.*, c.full_name, c.email, c.phone, c.city, c.state
        FROM candidate_disc_results d
        JOIN candidates c ON d.candidate_id = c.id
        WHERE d.id = ?
      `).get(req.params.id);
      if (!disc) return res.status(404).json({ error: 'Not found' });

      const response = await db.prepare(`
        SELECT r.id, r.ai_analysis_json, r.ai_summary, r.completed_at
        FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.candidate_id = ? AND (t.type = 'DISC' OR LOWER(t.name) LIKE '%disc%')
        ORDER BY r.created_at DESC LIMIT 1
      `).get((disc as any).candidate_id);

      let answers: any[] = [];
      if (response) {
        answers = await db.prepare(`
          SELECT a.answer_text, a.answer_json, q.question_text, q.question_type, q.position
          FROM hr_tool_answers a
          JOIN hr_tool_questions q ON a.question_id = q.id
          WHERE a.response_id = ?
          ORDER BY q.position ASC
        `).all((response as any).id);
      }
      res.json({ ...disc as any, response, answers });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch DISC result' }); }
  });

  app.post('/api/disc/results/:id/analyze', async (req, res) => {
    try {
      const disc = await db.prepare(`
        SELECT d.*, c.full_name, c.email
        FROM candidate_disc_results d
        JOIN candidates c ON d.candidate_id = c.id
        WHERE d.id = ?
      `).get(req.params.id) as any;
      if (!disc) return res.status(404).json({ error: 'Not found' });

      const response = await db.prepare(`
        SELECT r.id FROM hr_tool_responses r
        JOIN hr_tools t ON r.tool_id = t.id
        WHERE r.candidate_id = ? AND (t.type = 'DISC' OR LOWER(t.name) LIKE '%disc%')
        ORDER BY r.created_at DESC LIMIT 1
      `).get(disc.candidate_id) as any;

      let answers: any[] = [];
      if (response) {
        answers = await db.prepare(`
          SELECT a.answer_text, q.question_text
          FROM hr_tool_answers a
          JOIN hr_tool_questions q ON a.question_id = q.id
          WHERE a.response_id = ?
          ORDER BY q.position ASC
        `).all(response.id);
      }

      const ai = createGeminiClient();
      const prompt = `
        Você é Aurora, especialista comportamental certificada em DISC.
        Analise o perfil DISC do candidato: ${disc.full_name}.

        Pontuações atuais: D=${disc.disc_d || 0}, I=${disc.disc_i || 0}, S=${disc.disc_s || 0}, C=${disc.disc_c || 0}
        ${answers.length > 0 ? `\nRespostas do formulário:\n${answers.map((a: any) => `P: ${a.question_text}\nR: ${a.answer_text}`).join('\n\n')}` : ''}

        Gere análise completa em JSON:
        {
          "disc_scores": { "D": number(0-100), "I": number(0-100), "S": number(0-100), "C": number(0-100) },
          "predominant_profile": "D"|"I"|"S"|"C",
          "secondary_profile": "D"|"I"|"S"|"C",
          "behavioral_summary": "string (3-4 parágrafos profissionais)",
          "strengths": string[5],
          "attention_points": string[3],
          "communication_style": "string (como se comunica melhor)",
          "leadership_style": "string (estilo de liderança)",
          "ideal_environment": "string (ambiente de trabalho ideal)",
          "motivators": string[4],
          "derailers": string[3],
          "suggested_roles": string[4]
        }
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192, reasoningEffort: 'medium', operationLabel: 'disc-full-analysis' }
      });

      let rawText = result.text || '{}';
      rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      if (!rawText.endsWith('}')) {
        const lastBrace = rawText.lastIndexOf('}');
        rawText = lastBrace >= 0 ? rawText.slice(0, lastBrace + 1) + '}' : '{}';
      }
      const analysis = JSON.parse(rawText);
      const scores = analysis.disc_scores || {};

      await db.prepare(`
        UPDATE candidate_disc_results SET
          disc_d = ?, disc_i = ?, disc_s = ?, disc_c = ?,
          predominant_profile = ?,
          behavioral_summary = ?,
          strengths = ?,
          attention_points = ?,
          communication_style = ?,
          leadership_style = ?,
          ideal_environment = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        scores.D || disc.disc_d || 0,
        scores.I || disc.disc_i || 0,
        scores.S || disc.disc_s || 0,
        scores.C || disc.disc_c || 0,
        analysis.predominant_profile || disc.predominant_profile,
        analysis.behavioral_summary || null,
        JSON.stringify(analysis.strengths || []),
        JSON.stringify(analysis.attention_points || []),
        analysis.communication_style || null,
        analysis.leadership_style || null,
        analysis.ideal_environment || null,
        req.params.id
      );

      res.json({ success: true, analysis });
    } catch (err) { console.error(err); res.status(500).json({ error: 'DISC analysis failed' }); }
  });

  app.post('/api/disc/links', async (req, res) => {
    const { tenantId, unitId, candidateId, label, jobId } = req.body;
    try {
      let tool = await db.prepare(
        "SELECT * FROM hr_tools WHERE tenant_id = ? AND type = 'DISC' AND status = 'Ativo' ORDER BY created_at ASC LIMIT 1"
      ).get(tenantId) as any;

      if (!tool) {
        const slug = 'disc-' + tenantId + '-' + Math.random().toString(36).substring(2, 7);
        const ins = await db.prepare(`
          INSERT INTO hr_tools (tenant_id, unit_id, name, type, description, public_slug, status)
          VALUES (?, ?, 'Avaliação DISC', 'DISC', 'Avaliação comportamental DISC.', ?, 'Ativo')
        `).run(tenantId, unitId, slug);
        tool = await db.prepare('SELECT * FROM hr_tools WHERE id = ?').get(ins.lastInsertRowid);
      }

      const responseRes = await db.prepare(`
        INSERT INTO hr_tool_responses (tenant_id, unit_id, tool_id, candidate_id, job_id, status)
        VALUES (?, ?, ?, ?, ?, 'Pendente')
      `).run(tenantId, unitId || tool.unit_id, tool.id, candidateId || null, jobId || null);

      const link = `${req.protocol}://${req.get('host')}/public/tools/${tool.public_slug}`;
      res.json({ success: true, link, slug: tool.public_slug, responseId: responseRes.lastInsertRowid });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create DISC link' }); }
  });
}

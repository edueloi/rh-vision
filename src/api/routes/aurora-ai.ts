import { Express } from 'express';
import db from '../../lib/db';
import { createAIClient as createGeminiClient, GEMINI_MODEL, normalizeAuroraChatReply, GeminiTemporaryUnavailableError } from '../helpers/ai';
import type { AIMessage, AIMessageRole } from '../helpers/ai';

export function registerAuroraAIRoutes(app: Express) {
  app.get('/api/aurora-ai/settings', async (req, res) => {
    const { tenantId, unitId } = req.query;
    try {
      const settings = await db.prepare('SELECT * FROM ai_matching_settings WHERE tenant_id = ? AND unit_id = ?').get(tenantId, unitId);
      if (!settings) {
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

  app.put('/api/aurora-ai/settings', async (req, res) => {
    const settings = req.body;

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
      await db.prepare(query).run(...values);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.get('/api/aurora-ai/matches/:jobId', async (req, res) => {
    try {
      const minScore = Number(req.query.minScore) || 0;
      const results = await db.prepare(`
        SELECT r.*, c.full_name, c.city, c.state, c.email, c.phone,
               COALESCE(cs.contact_status, '') as contact_status,
               cs.contact_notes,
               COALESCE(m.status, 'Triagem') as funnel_stage
        FROM ai_search_results r
        JOIN candidates c ON r.candidate_id = c.id
        LEFT JOIN candidate_contact_statuses cs ON cs.candidate_id = r.candidate_id AND cs.job_id = r.job_id
        LEFT JOIN candidate_job_matches m ON m.candidate_id = r.candidate_id AND m.job_id = r.job_id
        WHERE r.job_id = ? AND r.compatibility_score >= ?
        ORDER BY r.compatibility_score DESC, c.full_name ASC
        LIMIT 50
      `).all(req.params.jobId, minScore) as any[];

      const BLOCKING_CONTACT_STATUSES = ['ja_trabalhando', 'sem_interesse', 'nao_sucedido'];
      const BLOCKING_FUNNEL_STAGES = ['IA Match', 'Entrevista', 'Entrevista Realizada', 'Finalista', 'Aprovado', 'Contratado', 'Desistência', 'Sem Sucesso'];
      const parsedResults = results
        .filter((r: any) => !BLOCKING_CONTACT_STATUSES.includes(r.contact_status))
        .filter((r: any) => !BLOCKING_FUNNEL_STAGES.includes(r.funnel_stage))
        .map((r: any) => ({
          ...r,
          has_disc: r.has_disc === 1,
          strengths: typeof r.strengths === 'string' ? JSON.parse(r.strengths || '[]') : r.strengths,
          attention_points: typeof r.attention_points === 'string' ? JSON.parse(r.attention_points || '[]') : r.attention_points
        }));

      res.json(parsedResults);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
  });

  app.patch('/api/aurora-ai/matches/:jobId/contact/:candidateId', async (req, res) => {
    try {
      const { jobId, candidateId } = req.params;
      const { contact_status, contact_notes, tenant_id } = req.body;
      await db.prepare(`
        INSERT INTO candidate_contact_statuses (tenant_id, candidate_id, job_id, contact_status, contact_notes, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          contact_status = VALUES(contact_status),
          contact_notes  = VALUES(contact_notes),
          updated_at     = CURRENT_TIMESTAMP
      `).run(tenant_id, candidateId, jobId, contact_status ?? '', contact_notes ?? null);
      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save contact status' });
    }
  });

  app.patch('/api/aurora-ai/matches/:jobId/stage/:candidateId', async (req, res) => {
    try {
      const { jobId, candidateId } = req.params;
      const { funnel_stage } = req.body;

      const VALID_STAGES = ['Triagem', 'IA Match', 'Entrevista', 'Entrevista Realizada', 'Finalista', 'Aprovado', 'Contratado', 'Desistência', 'Sem Sucesso'];
      if (!VALID_STAGES.includes(funnel_stage)) {
        return res.status(400).json({ error: 'Invalid funnel_stage' });
      }

      const existing = await db.prepare(
        `SELECT id FROM candidate_job_matches WHERE candidate_id = ? AND job_id = ?`
      ).get(candidateId, jobId) as any;

      if (existing) {
        await db.prepare(
          `UPDATE candidate_job_matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ? AND job_id = ?`
        ).run(funnel_stage, candidateId, jobId);
      } else {
        await db.prepare(
          `INSERT INTO candidate_job_matches (candidate_id, job_id, status, compatibility_score) VALUES (?, ?, ?, 0)`
        ).run(candidateId, jobId, funnel_stage);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update funnel stage' });
    }
  });

  app.post('/api/aurora-ai/match-job', async (req, res) => {
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
      batchId,
      statusFilter,
      sourceFilter,
      filters,
    } = req.body;

    const numericMinScore = Number(minScore) || 0;

    try {
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      if (!job) return res.status(404).json({ error: 'Job not found' });

      const filtersSnapshot = filters ?? { precisionMode, minScore, radius, onlyWithDisc };

      const sessionResult = await db.prepare(`
        INSERT INTO ai_search_sessions
        (tenant_id, unit_id, job_id, search_type, precision_mode, compatibility_threshold, max_results, distance_radius_km, location_rule, only_with_resume, only_with_disc, filters_json, created_at)
        VALUES (?, ?, ?, 'match-job', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(tenantId, unitId, jobId, precisionMode || 'Equilibrada', minScore || 70, maxResults || 50, radius, locationRule, onlyWithResume ? 1 : 0, onlyWithDisc ? 1 : 0, JSON.stringify(filtersSnapshot));

      const sessionId = sessionResult.lastInsertRowid;

      let candQuery: string;
      let candParams: any[];

      if (batchId) {
        candQuery = `
          SELECT c.* FROM candidates c
          INNER JOIN import_files f ON f.candidate_id = c.id
          WHERE f.batch_id = ? AND f.candidate_id IS NOT NULL AND c.tenant_id = ? AND c.deleted_at IS NULL
        `;
        candParams = [batchId, tenantId];
      } else {
        candQuery = 'SELECT * FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL';
        candParams = [tenantId];

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
      }

      const candidates = await db.prepare(candQuery).all(...candParams) as any[];

      for (const cand of candidates) {
        cand.disc = await db.prepare(`
          SELECT predominant_profile, disc_d, disc_i, disc_s, disc_c
          FROM candidate_disc_results
          WHERE candidate_id = ?
          ORDER BY id DESC LIMIT 1
        `).get(cand.id);
      }

      const ai = createGeminiClient();

      const filteredCandidates = onlyWithDisc
        ? candidates.filter((c: any) => c.disc && c.disc.predominant_profile)
        : candidates;

      const scoreThreshold = Math.max(0, numericMinScore);

      const cachedRows = await db.prepare(
        'SELECT candidate_id, compatibility_score, classification, distance_km, strengths, attention_points, recommendation_reason, risk_reason, has_disc, disc_profile FROM ai_search_results WHERE job_id = ?'
      ).all(jobId) as any[];
      const cachedMap = new Map<number, any>(cachedRows.map((r: any) => [Number(r.candidate_id), r]));

      const cachedCandidates = filteredCandidates.filter((c: any) => cachedMap.has(Number(c.id)));
      const newCandidates    = filteredCandidates.filter((c: any) => !cachedMap.has(Number(c.id)));

      const candidatesToProcess = newCandidates.slice(0, 50);

      let newAiResults: any[] = [];
      let summary = `${cachedCandidates.length} candidato(s) recuperado(s) do cache.`;

      if (candidatesToProcess.length > 0) {
        const jobChecklist = [
          job.requires_cnh ? `CNH obrigatória categoria ${job.cnh_category || 'não especificada'}` : null,
          job.requires_travel ? 'Disponibilidade para viagens obrigatória' : null,
          job.requires_relocation ? 'Disponibilidade para mudança de cidade/estado obrigatória' : null,
          job.min_experience_years ? `Mínimo ${job.min_experience_years} ano(s) de experiência` : null,
          job.work_model === 'Presencial' ? `Presença física em ${job.city}/${job.state} obrigatória` : null,
        ].filter(Boolean).join('\n- ');

        const prompt = `
        Você é a Aurora AI, sistema analítico de recrutamento corporativo.
        Avalie CADA candidato de forma INDEPENDENTE e ABSOLUTA em relação à vaga — NÃO compare candidatos entre si.
        O score deve refletir SOMENTE a aderência do candidato à vaga, ignorando os demais.

        ══════════════════════════════════════
        VAGA ALVO
        ══════════════════════════════════════
        Título: ${job.title}
        Local: ${job.city}/${job.state} | Modelo: ${job.work_model}
        Exp. mínima: ${job.min_experience_years ?? 0} ano(s)
        Requisitos obrigatórios:
        ${(job.mandatory_requirements || 'Não informado').substring(0, 800)}
        Requisitos técnicos:
        ${(job.technical_requirements || 'Não informado').substring(0, 500)}
        Requisitos desejáveis:
        ${(job.desirable_requirements || 'Não informado').substring(0, 400)}
        Descrição da função:
        ${(job.description || 'Não informado').substring(0, 600)}

        CHECKLIST DE REQUISITOS CRÍTICOS DA VAGA (cruze com cada candidato):
        ${jobChecklist ? `- ${jobChecklist}` : '- Nenhum requisito crítico adicional identificado'}

        ══════════════════════════════════════
        REGRAS DE SCORING (aplique na ordem, de forma determinística)
        ══════════════════════════════════════
        ATENÇÃO: o que importa é o CARGO/FUNÇÃO exercida pelo candidato, NÃO o setor da empresa onde trabalhou.
        Exemplo: alguém que trabalhou como "Analista Administrativo" em empresa de transporte NÃO tem experiência
        em "Técnico de Frota" — a função é diferente, mesmo que tenha feito tarefas periféricas de frota.
        Se nas experiências o candidato realizou ATIVIDADES da função (mesmo que o cargo tenha outro nome), registre
        isso nos strengths com o contexto exato: "Realizou X na empresa Y como parte das atividades do cargo Z".

        1. CARGO/FUNÇÃO (peso 50%):
           - Exerceu a função exata ou muito próxima (mesmo nome ou sinônimo direto)? → Score máx 100 neste critério.
           - Exerceu cargo diferente mas com ATIVIDADES diretas da função (ex: admin que fazia controle de frota)? → Score máx 65 neste critério. Score final máx 65.
           - Cargo e atividades de área completamente diferente? → Score máx 30 neste critério. Score final máx 45.
        2. LOCALIZAÇÃO (peso 20%):
           - Presencial: candidato na cidade ou dentro de ${radius} km? → Score máx 100.
           - Fora do raio? → Desconte 20 pontos do total. Score máx 50 neste critério.
           - Remoto/Híbrido: localização não penaliza.
        3. FORMAÇÃO (peso 15%): compatível com o exigido? Avalie proporcionalmente.
        4. SKILLS TÉCNICAS (peso 15%): habilidades batem com os requisitos? Avalie proporcionalmente.
        Precisão: ${precisionMode}${precisionMode === 'Rigorosa' ? ' — sem cargo EXATO na função: score total máx 45.' : precisionMode === 'Equilibrada' ? ' — considere atividades realizadas mesmo que o cargo tenha nome diferente, mas seja claro nos attention_points.' : ' — seja generoso com candidatos que tenham potencial, mas sempre explique nos attention_points.'}

        CLASSIFICAÇÃO FINAL:
        - 0–40: Incompatível | 41–69: Fit Baixo | 70–89: Alto Fit | 90–100: Altíssimo Fit

        ══════════════════════════════════════
        INSTRUÇÕES PARA attention_points (OBRIGATÓRIO)
        ══════════════════════════════════════
        SEMPRE inclua nos attention_points o cruzamento explícito de cada item abaixo:

        A) CARGO vs FUNÇÃO DA VAGA:
           - Se o cargo exercido é diferente do título da vaga mas tem atividades relacionadas:
             "⚠ Cargo exercido: [cargo do candidato] — não é [título da vaga], porém realizou [atividade específica] na empresa [X]"
           - Se o cargo é completamente diferente sem atividades relacionadas:
             "✗ Sem experiência na função de [título da vaga] — histórico é de [área do candidato]"

        B) REQUISITOS CRÍTICOS DA VAGA (um item por requisito):
           - CNH: "✓ CNH cat. X declarada" / "✗ CNH não informada no currículo — vaga exige cat. ${job.cnh_category || 'não especificada'}" / "⚠ Menciona condução de veículos mas CNH não declarada explicitamente"
           - Viagens: se exigido, informar se candidato declarou disponibilidade
           - Mudança: se exigido, informar se candidato declarou disponibilidade
           - Exp. mínima: "✓ X anos identificados" / "✗ Tempo de experiência insuficiente ou não identificado"

        NÃO deixe nenhum desses itens sem cruzamento nos attention_points.

        ══════════════════════════════════════
        CANDIDATOS
        ══════════════════════════════════════
        ${candidatesToProcess.map((c: any) => `
=== ID:${c.id} | ${c.full_name} | ${c.city}/${c.state}
Cargo desejado: ${c.desired_position || 'N/I'} | Área: ${c.desired_area || 'N/I'}
Formação: ${c.education_level || 'N/I'} | ${(c.academic_education || '').substring(0, 250)}
CNH declarada: ${c.has_cnh ? `Sim — categoria ${c.cnh_category || 'não especificada'}` : 'Não declarada'}
Disponível para viagens: ${c.available_to_travel ? 'Sim' : 'Não declarado'}
Resumo: ${(c.professional_summary || '').substring(0, 500)}
Experiências: ${(c.professional_experiences || 'Não informado').substring(0, 1500)}
Skills técnicas: ${(c.hard_skills || 'N/I').substring(0, 250)}
Skills comportamentais: ${(c.soft_skills || 'N/I').substring(0, 200)}
DISC: ${c.disc?.predominant_profile ? `${c.disc.predominant_profile} (D:${c.disc.disc_d||0} I:${c.disc.disc_i||0} S:${c.disc.disc_s||0} C:${c.disc.disc_c||0})` : 'Não avaliado'}`).join('\n')}

        REGRA FINAL: inclua no results SOMENTE candidatos com compatibility_score >= ${scoreThreshold}. Candidatos abaixo de ${scoreThreshold} OMITA completamente.
        Retorne SOMENTE JSON válido sem markdown:
        {"results":[{"candidate_id":number,"compatibility_score":number,"classification":"string","distance_km":number,"strengths":["string"],"attention_points":["string"],"recommendation_reason":"string","risk_reason":"string"}],"summary":"string"}
      `;

        const aiResult = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 16000,
            temperature: 0.0,
            operationLabel: 'match inteligente de vaga',
          }
        });

        let analysis: any;
        try {
          analysis = JSON.parse(aiResult.text || '{"results":[],"summary":""}');
        } catch {
          const partial = aiResult.text || '';
          const matchPartial = partial.match(/"results"\s*:\s*(\[[\s\S]*)/);
          if (matchPartial) {
            let arr = matchPartial[1];
            const lastComplete = arr.lastIndexOf('}');
            if (lastComplete !== -1) arr = arr.substring(0, lastComplete + 1) + ']';
            try {
              analysis = { results: JSON.parse(arr), summary: 'Análise parcial (resposta truncada)' };
            } catch {
              analysis = { results: [], summary: 'Erro ao processar resposta da IA' };
            }
          } else {
            analysis = { results: [], summary: 'Erro ao processar resposta da IA' };
          }
        }

        newAiResults = analysis.results;
        summary = analysis.summary;

        const insertResultStmt = db.prepare(`
          INSERT INTO ai_search_results
          (session_id, candidate_id, job_id, compatibility_score, classification, distance_km, has_disc, disc_profile, strengths, attention_points, recommendation_reason, risk_reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        for (const resItem of newAiResults) {
          if (resItem.compatibility_score >= numericMinScore) {
            const cand = candidates.find((c: any) => Number(c.id) === Number(resItem.candidate_id));
            const hasDisc = !!(cand?.disc?.predominant_profile);
            await insertResultStmt.run(
              sessionId,
              resItem.candidate_id,
              jobId,
              resItem.compatibility_score,
              resItem.classification,
              resItem.distance_km,
              hasDisc ? 1 : 0,
              cand?.disc?.predominant_profile || null,
              JSON.stringify(resItem.strengths),
              JSON.stringify(resItem.attention_points),
              resItem.recommendation_reason,
              resItem.risk_reason
            );
          }
        }
      }

      await db.prepare('UPDATE ai_search_sessions SET summary = ? WHERE id = ?').run(summary, sessionId);

      const cachedAsResults = cachedCandidates
        .map((c: any) => {
          const row = cachedMap.get(Number(c.id));
          return {
            candidate_id: c.id,
            compatibility_score: row.compatibility_score,
            classification: row.classification,
            distance_km: row.distance_km,
            strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : (row.strengths || []),
            attention_points: typeof row.attention_points === 'string' ? JSON.parse(row.attention_points) : (row.attention_points || []),
            recommendation_reason: row.recommendation_reason,
            risk_reason: row.risk_reason,
            full_name: c.full_name,
            city: c.city,
            state: c.state,
            has_disc: !!(c.disc?.predominant_profile),
            disc_profile: c.disc?.predominant_profile || null,
            disc_d: c.disc?.disc_d || 0,
            disc_i: c.disc?.disc_i || 0,
            disc_s: c.disc?.disc_s || 0,
            disc_c: c.disc?.disc_c || 0,
            from_cache: true,
          };
        })
        .filter((r: any) => r.compatibility_score >= numericMinScore);

      const newAsResults = newAiResults
        .filter((resItem: any) => resItem.compatibility_score >= numericMinScore)
        .map((resItem: any) => {
          const candidate = candidates.find((c: any) => Number(c.id) === Number(resItem.candidate_id));
          return {
            ...resItem,
            full_name: candidate?.full_name || 'Candidato',
            city: candidate?.city || 'Localidade',
            state: candidate?.state || 'NI',
            has_disc: !!(candidate?.disc?.predominant_profile),
            disc_profile: candidate?.disc?.predominant_profile || null,
            disc_d: candidate?.disc?.disc_d || 0,
            disc_i: candidate?.disc?.disc_i || 0,
            disc_s: candidate?.disc?.disc_s || 0,
            disc_c: candidate?.disc?.disc_c || 0,
          };
        });

      const enhancedResults = [...cachedAsResults, ...newAsResults];
      enhancedResults.sort((a: any, b: any) => {
        if (b.compatibility_score !== a.compatibility_score) return b.compatibility_score - a.compatibility_score;
        return a.full_name.localeCompare(b.full_name);
      });

      res.json({ sessionId, summary, results: enhancedResults });
    } catch (error: any) {
      console.error('[match-job]', error?.message || error);
      res.status(500).json({ error: 'Match job failed', detail: error?.message });
    }
  });

  app.post('/api/aurora-ai/chat', async (req, res) => {
    const { message, tenantId, unitId, sessionId } = req.body;
    let effectiveUnitId = unitId;
    let currentSessionId = sessionId;

    try {
      if (!message?.trim()) {
        return res.status(400).json({ error: 'Mensagem obrigatória' });
      }

      const ai = createGeminiClient();
      const normalizedMessage = String(message).trim();
      const wantsDetailedReply = /(detalh|explic|complet|passo a passo|relat[oó]rio|aprofund|an[aá]lise completa)/i.test(normalizedMessage);
      const wantsAction = /(cri(a|ar|e)|atualiz|modific|altera|remov|delet|exclu|abr(e|ir)|fech(a|ar)|reabr)/i.test(normalizedMessage);

      if (effectiveUnitId === 'master') {
        const masterUnit = await db.prepare('SELECT id FROM units WHERE tenant_id = ? AND is_master = 1 LIMIT 1').get(tenantId) as any;
        effectiveUnitId = masterUnit?.id || unitId;
      }

      if (!currentSessionId) {
        const sessionRes = await db.prepare('INSERT INTO ai_search_sessions (tenant_id, unit_id, search_type, created_at) VALUES (?, ?, "chat", CURRENT_TIMESTAMP)').run(tenantId, effectiveUnitId);
        currentSessionId = sessionRes.lastInsertRowid;
      }

      const history = await db.prepare('SELECT role, message FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(currentSessionId) as any[];
      const recentHistory = history.slice(-6);

      let jobQuery = `SELECT id, title, city, status FROM jobs WHERE tenant_id = ? AND deleted_at IS NULL`;
      let jobParams: any[] = [tenantId];
      if (unitId !== 'master') {
        jobQuery += ` AND unit_id = ?`;
        jobParams.push(effectiveUnitId);
      }
      jobQuery += ` LIMIT 100`;
      const jobs = await db.prepare(jobQuery).all(...jobParams) as any[];
      const jobsList = jobs.map((j: any) => `- Vaga #${j.id}: ${j.title} (${j.city || 'Remoto'}) | Status: ${j.status}`).join('\n');

      let candQuery = `SELECT id, full_name, desired_position, city, experience_years, hard_skills, status FROM candidates WHERE tenant_id = ? AND deleted_at IS NULL`;
      let candParams: any[] = [tenantId];
      if (unitId !== 'master') {
        candQuery += ` AND unit_id = ?`;
        candParams.push(effectiveUnitId);
      }
      candQuery += ` LIMIT 100`;
      const candidates = await db.prepare(candQuery).all(...candParams) as any[];
      const candidatesList = candidates.map((c: any) => `- Candidato #${c.id} ${c.full_name} | Cargo: ${c.desired_position || '-'} | Local: ${c.city || '-'} | Exp: ${c.experience_years || 0} anos | Skills: ${c.hard_skills?.substring(0, 50) || '-'} | Status: ${c.status}`).join('\n');

      const systemPrompt = `
        Você é a Aurora AI, assistente de recrutamento inteligente da Develoi.
        Sua missão é responder perguntas do recrutador sobre o sistema, candidatos e vagas.
        Responda sempre em português do Brasil, de forma clara e profissional.

        Diretrizes:
        1. Baseie-se nos dados do sistema listados abaixo. NÃO invente candidatos ou vagas.
        2. Responda curto e direto por padrão.
        3. Não repita "Eu sou a Aurora" em toda mensagem.
        4. CRIAÇÃO DE VAGA:
           - Se o usuário pedir para criar uma vaga mas não informar o título, responda apenas: "Qual o título da vaga e a cidade?"
           - Se o usuário fornecer dados da vaga, use SOMENTE os campos que ele explicitamente informou.
           - NUNCA invente campos como salário, benefícios, experiência ou qualquer informação não fornecida pelo usuário.
           - Campos permitidos no data: title, city, state, department, status, description, work_model, employment_type, mandatory_requirements, hard_skills.
           - Inclua apenas os campos que o usuário mencionou. Omita todos os outros.
           - SEMPRE escreva UMA frase curta de confirmação ANTES do bloco <action>:
           Vaga criada como rascunho!
           <action>
           {"type":"create_job","data":{"title":"Título","city":"Cidade","status":"Rascunho"}}
           </action>
        5. Para atualizar vaga (apenas com campos que o usuário pediu alterar):
           Vaga atualizada!
           <action>
           {"type":"update_job","job_id":123,"data":{"status":"Aberta"}}
           </action>

        === VAGAS ===
        ${jobsList || 'Nenhuma vaga.'}

        === CANDIDATOS ===
        ${candidatesList || 'Nenhum candidato.'}
      `;

      const contents: AIMessage[] = [
        ...recentHistory.map((h: any) => ({
          role: (h.role === 'assistant' ? 'model' : 'user') as AIMessageRole,
          parts: [{ text: h.message }]
        })),
        { role: 'user' as AIMessageRole, parts: [{ text: normalizedMessage }] }
      ];

      await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "user", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, effectiveUnitId, currentSessionId, normalizedMessage);

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents,
        config: {
          temperature: 0.4,
          maxOutputTokens: wantsDetailedReply ? 800 : wantsAction ? 500 : 300,
          reasoningEffort: 'medium',
          verbosity: 'medium',
          instructions: systemPrompt,
          operationLabel: 'chat da Aurora',
        }
      });

      if (!result.text?.trim()) {
        console.warn('[Aurora AI] Modelo retornou resposta vazia. Usando fallback.');
        result.text = 'Não consegui processar sua solicitação agora. Poderia reformular a pergunta?';
      }

      let responseText = normalizeAuroraChatReply(result.text) || 'Como posso ajudar?';

      const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
      let actionResultMsg = '';
      if (actionMatch) {
        try {
          const actionJson = JSON.parse(actionMatch[1].trim());
          if (actionJson.type === 'create_job') {
            const data = { ...actionJson.data, tenant_id: tenantId, unit_id: effectiveUnitId };
            const keys = Object.keys(data);
            const placeholders = keys.map(() => '?').join(',');
            const values = keys.map((k: string) => data[k]);
            const r = await db.prepare(`INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(...values);
            actionResultMsg = `\n\n[SISTEMA: Vaga "${data.title || ''}" criada com sucesso! ID: #${r.lastInsertRowid}]`;
          } else if (actionJson.type === 'update_job' && actionJson.job_id) {
            const updates = [];
            const params = [];
            for (const [key, value] of Object.entries(actionJson.data)) {
              updates.push(`${key} = ?`);
              params.push(value);
            }
            if (updates.length > 0) {
              params.push(actionJson.job_id, tenantId);
              await db.prepare(`UPDATE jobs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`).run(...params);
              actionResultMsg = `\n\n[SISTEMA: Vaga #${actionJson.job_id} atualizada com sucesso!]`;
            }
          }
        } catch (e) {
          console.error("Action parse error", e);
        }
        responseText = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim() + actionResultMsg;
      }

      await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "assistant", ?, CURRENT_TIMESTAMP)')
        .run(tenantId, effectiveUnitId, currentSessionId, responseText);

      res.json({ message: responseText, sessionId: currentSessionId });
    } catch (error) {
      if (error instanceof GeminiTemporaryUnavailableError) {
        const fallbackMessage = 'A Aurora está com alta demanda no provedor de IA no momento. Tente novamente em alguns instantes.';

        if (currentSessionId) {
          await db.prepare('INSERT INTO ai_chat_messages (tenant_id, unit_id, session_id, role, message, created_at) VALUES (?, ?, ?, "assistant", ?, CURRENT_TIMESTAMP)')
            .run(tenantId, effectiveUnitId, currentSessionId, fallbackMessage);
        }

        console.warn(`[Aurora AI] ${(error as any).message}`);
        return res.json({ message: fallbackMessage, sessionId: currentSessionId });
      }

      console.error(error);
      res.status(500).json({ error: 'Chat failed' });
    }
  });

  app.get('/api/aurora-ai/sessions', async (req, res) => {
    const { tenantId } = req.query;
    try {
      const sessions = await db.prepare('SELECT * FROM ai_search_sessions WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
      const parsed = sessions.map((s: any) => {
        let filters: any = null;
        if (s.filters_json) {
          try { filters = JSON.parse(s.filters_json); } catch { /* ignore */ }
        }
        return { ...s, filters };
      });
      res.json(parsed);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });
}

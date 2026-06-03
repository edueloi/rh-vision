import { Express } from 'express';
import db from '../../lib/db';
import { createAIClient as createGeminiClient, GEMINI_MODEL, normalizeAuroraChatReply, GeminiTemporaryUnavailableError } from '../helpers/ai';
import type { AIMessage, AIMessageRole } from '../helpers/ai';
import { checkAiAnalysisLimit, incrementAiAnalysis } from '../helpers/tenant-limits';

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
      // Verificar limite de análises IA do mês
      if (tenantId) {
        const limitCheck = checkAiAnalysisLimit(tenantId);
        if (!limitCheck.allowed) {
          return res.status(403).json({ error: limitCheck.error, limit_exceeded: 'ai_analyses', current: limitCheck.current, limit: limitCheck.limit });
        }
      }

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

        const precisionRules = precisionMode === 'Rigorosa'
          ? `MODO RIGOROSO: candidato sem o cargo ou função EXATA (ou sinônimo direto) da vaga → score máximo 35. Sem as skills técnicas centrais → score máximo 40. Sem experiência mínima exigida → score máximo 30. Seja inflexível.`
          : precisionMode === 'Equilibrada'
          ? `MODO EQUILIBRADO: aceite candidatos que exerceram ATIVIDADES da função mesmo com cargo de nome diferente, mas penalize proporcionalmente. Cargo totalmente diferente → score máximo 60.`
          : `MODO FLEXÍVEL: valorize potencial e habilidades transferíveis, mas NUNCA atribua score ≥ 70 a quem nunca exerceu nenhuma atividade relacionada à função.`;

        const prompt = `
Você é a Aurora AI, motor analítico de recrutamento de precisão cirúrgica.
Sua missão: identificar candidatos genuinamente qualificados para a vaga — NÃO fazer correspondência superficial por palavras-chave.

═══════════════════════════════════════════
REGRA DE OURO — LEIA ANTES DE TUDO
═══════════════════════════════════════════
Um candidato SÓ pode ter score alto se:
  1. Já EXERCEU a função (ou função diretamente equivalente) da vaga — não apenas "trabalhou no setor"
  2. Possui as habilidades técnicas CENTRAIS da função
  3. Atende a experiência mínima exigida

EXEMPLOS DE ERROS PROIBIDOS (score alto indevido):
  ✗ Faxineiro → Analista de TI: NUNCA. Score máx 10.
  ✗ Gerente → Assistente de Limpeza: NUNCA. Score máx 15.
  ✗ Dev Júnior/Estagiário → Vaga Sênior (≥5 anos): Score máx 30, mesmo que tenha as linguagens.
  ✗ Vendedor → Engenheiro de Software: Score máx 10. Saber Excel não faz ninguém dev.
  ✗ Assistente Admin → Desenvolvedor: sem HTML/CSS/JS/linguagem de programação real → Score máx 15.
  ✗ Cargo operacional → Cargo estratégico/gestão sem experiência de liderança: Score máx 35.

EXEMPLOS DE ACERTOS ESPERADOS:
  ✓ Desenvolvedor Python 5 anos → Vaga Dev Python Sênior: score 85–95.
  ✓ Faxineira 3 anos → Vaga Auxiliar de Limpeza: score 80–95.
  ✓ Analista RH 2 anos → Vaga Analista RH Pleno: score 70–85.
  ✓ Dev Júnior 1 ano → Vaga Dev Júnior: score 65–80 dependendo das skills.

REGRA DE SENIORIDADE (OBRIGATÓRIA — aplicar nos dois sentidos):
  ABAIXO DA VAGA (sub-qualificado):
  - Vaga SÊNIOR (ou exige ≥4 anos): candidato com < 3 anos → score máx 30.
  - Vaga PLENO (ou exige 2–4 anos): candidato com < 1 ano → score máx 35.

  ACIMA DA VAGA (sobre-qualificado — risco real):
  - Vaga JÚNIOR (0–2 anos exigidos): candidato com ≥ 5 anos de experiência → score máx 55.
    Motivo: risco ALTO de desmotivação, abandono rápido e sub-aproveitamento. Mencione OBRIGATORIAMENTE nos attention_points.
  - Vaga JÚNIOR: candidato com cargo de PLENO ou SÊNIOR no último registro → score máx 60.
    Mesmo que tenha todas as skills — a senioridade incompatível é um risco operacional real.
  - Vaga ESTÁGIO: qualquer profissional com empregos formais ≥ 2 anos → score máx 40.

  EXCEÇÃO SOBRE-QUALIFICADO: Se o candidato declarar explicitamente que deseja transição de área ou recolocação em nível inferior, o teto sobe para 70 — mas mencione a ressalva.

═══════════════════════════════════════════
VAGA ALVO
═══════════════════════════════════════════
Título: ${job.title}
Local: ${job.city}/${job.state} | Modelo: ${job.work_model || 'Não informado'}
Experiência mínima exigida: ${job.min_experience_years ?? 0} ano(s)
Requisitos OBRIGATÓRIOS:
${(job.mandatory_requirements || 'Não especificado').substring(0, 900)}
Skills técnicas exigidas:
${(job.technical_requirements || 'Não especificado').substring(0, 600)}
Skills desejáveis:
${(job.desirable_requirements || 'Não especificado').substring(0, 400)}
Descrição da função:
${(job.description || 'Não especificado').substring(0, 700)}
Checklist crítico:
${jobChecklist ? `- ${jobChecklist}` : '- Nenhum requisito crítico adicional'}

═══════════════════════════════════════════
CRITÉRIOS DE PONTUAÇÃO (aplique deterministicamente)
═══════════════════════════════════════════
Peso 1 — FUNÇÃO/CARGO EXERCIDO (50 pts máx):
  - Função idêntica ou sinônimo direto com experiência suficiente → 45–50 pts
  - Função muito próxima (mesma área, cargo diferente mas atividades idênticas) → 30–40 pts
  - Função da mesma área mas com atividades diferentes → 15–25 pts
  - Área completamente diferente → 0–10 pts (TETO ABSOLUTO: score final máx 35)

Peso 2 — EXPERIÊNCIA/SENIORIDADE (20 pts máx):
  - Atende ou supera o tempo mínimo exigido → 18–20 pts
  - Ligeiramente abaixo (até 50% a menos) → 10–14 pts
  - Muito abaixo (menos de 50% do mínimo) → 0–6 pts

Peso 3 — SKILLS TÉCNICAS (20 pts máx):
  - Possui ≥ 80% das skills centrais listadas → 17–20 pts
  - Possui 50–79% → 10–14 pts
  - Possui < 50% → 0–8 pts
  - ATENÇÃO: para vagas técnicas (dev, TI, engenharia, saúde), skills são ELIMINATÓRIAS. Sem as principais → pts 0.

Peso 4 — LOCALIZAÇÃO (10 pts máx):
  - Presencial/Híbrido e dentro de ${radius || 50} km → 10 pts
  - Fora do raio → 3–5 pts
  - Remoto: localização não penaliza → 10 pts

SCORE FINAL = soma dos 4 critérios (0–100)
CLASSIFICAÇÃO:
  0–39: Incompatível | 40–59: Fit Baixo | 60–79: Alto Fit | 80–100: Altíssimo Fit

${precisionRules}

═══════════════════════════════════════════
FORMATO DOS attention_points (OBRIGATÓRIO — inclua sempre)
═══════════════════════════════════════════
Sempre inclua, na ordem:
1. "✓ Função: [confirme se exerceu ou não a função]" — OU "✗ Função: [explique o gap]"
2. "⏱ Experiência: [X anos identificados] vs [Y exigidos]"
3. Skills principais: "✓ [skill presente]" ou "✗ [skill ausente que é central]"
4. Se fora do raio: "📍 [cidade do candidato] — fora do raio de ${radius || 50}km de ${job.city}"
${job.requires_cnh ? `5. "CNH: [✓ cat.X declarada / ✗ não informada / ⚠ mencionada mas não declarada]"` : ''}
${job.requires_travel ? `6. "Viagens: [✓ disponível declarado / ✗ não declarado]"` : ''}
${job.min_experience_years ? `7. "Senioridade: [confirme nível identificado vs exigido]"` : ''}

═══════════════════════════════════════════
CANDIDATOS PARA AVALIAÇÃO
═══════════════════════════════════════════
${candidatesToProcess.map((c: any) => `
--- ID:${c.id} | ${c.full_name} | ${c.city}/${c.state} ---
Cargo/posição desejada: ${c.desired_position || 'Não informado'}
Área de atuação: ${c.desired_area || 'Não informada'}
Anos de experiência: ${c.experience_years ?? 'Não informado'}
Nível de formação: ${(() => {
  // Prioridade: education_level direto → detectar do education_json → academic_education
  if (c.education_level) return c.education_level;
  try {
    const eduList = JSON.parse(c.education_json || '[]');
    if (eduList.length > 0) {
      const top = eduList.find((e: any) => /pós|mba|mestrado|doutorado/i.test(e.course || e.degree_type || ''))
        || eduList.find((e: any) => /superior|gradua/i.test(e.course || e.degree_type || ''))
        || eduList[0];
      const label = top?.degree_type || top?.course || '';
      if (/pós|pós-grad|especializ/i.test(label)) return 'Pós/MBA';
      if (/mba/i.test(label)) return 'Pós/MBA';
      if (/mestrado/i.test(label)) return 'Mestrado/Doutorado';
      if (/doutorado/i.test(label)) return 'Mestrado/Doutorado';
      if (/superior|gradua|bacharela|licencia/i.test(label)) return 'Superior Completo';
      if (/técnico/i.test(label)) return 'Técnico';
      if (label) return label;
    }
  } catch { /* ignore */ }
  return c.academic_education ? 'Informado no texto' : 'Não informado';
})()}
Formação acadêmica (detalhada): ${(() => {
  try {
    const list = JSON.parse(c.education_json || '[]');
    if (list.length > 0) return list.map((e: any) => `${e.course || ''}${e.institution ? ` — ${e.institution}` : ''}${e.status ? ` (${e.status})` : ''}`).join('; ');
  } catch { /* ignore */ }
  return (c.academic_education || 'Não informada').substring(0, 300);
})()}
CNH: ${c.has_cnh ? `Sim — cat. ${c.cnh_category || 'não especificada'}` : 'Não declarada'}
Disponível para viagens: ${c.available_to_travel ? 'Sim' : 'Não declarado'}
Resumo profissional: ${(c.professional_summary || 'Não informado').substring(0, 600)}
Experiências profissionais:
${(c.professional_experiences || 'Não informado').substring(0, 1800)}
Skills técnicas (hard skills): ${(c.hard_skills || 'Não informado').substring(0, 400)}
Competências comportamentais (soft skills): ${(c.soft_skills || 'Não informado').substring(0, 250)}
Perfil DISC: ${c.disc?.predominant_profile ? `${c.disc.predominant_profile} (D:${c.disc.disc_d||0}% I:${c.disc.disc_i||0}% S:${c.disc.disc_s||0}% C:${c.disc.disc_c||0}%)` : 'Não avaliado'}
`).join('\n')}

═══════════════════════════════════════════
INSTRUÇÃO FINAL
═══════════════════════════════════════════
- Avalie CADA candidato de forma COMPLETAMENTE INDEPENDENTE.
- Seja HONESTO: um score de 50 para um candidato inadequado é melhor que dar 75 por generosidade.
- O recrutador confia nos seus scores para tomar decisões reais. Scores inflados geram contratações erradas.
- Inclua SOMENTE candidatos com compatibility_score >= ${scoreThreshold}. Omita os demais.
- recommendation_reason: 1–2 frases objetivas sobre POR QUE é ou não é adequado.
- risk_reason: principal risco concreto se contratado (ou "Nenhum risco relevante identificado").

Retorne SOMENTE JSON válido sem markdown:
{"results":[{"candidate_id":number,"compatibility_score":number,"classification":"string","distance_km":number|null,"strengths":["string"],"attention_points":["string"],"recommendation_reason":"string","risk_reason":"string"}],"summary":"string"}
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
        // Incrementa contador de análises do mês
        if (tenantId) incrementAiAnalysis(tenantId);

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

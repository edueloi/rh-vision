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

        // ── Regras específicas por modo de precisão ─────────────────────────────
        const precisionBlock = precisionMode === 'Rigorosa' ? `
══════════════════════════════════════════════════════
MODO RIGOROSO — CRITÉRIOS DE ELIMINAÇÃO ABSOLUTOS
══════════════════════════════════════════════════════
Você está operando como um Head de RH sênior de empresa de alta exigência.
Cada aprovação tem custo real de contratação, treinamento e risco operacional.
Seja inflexível. Dúvida = reprovação.

ELIMINATÓRIOS ABSOLUTOS (score máx 25 se qualquer um se aplicar):
  E1. Não exerceu a função exata ou sinônimo direto da vaga em nenhum emprego formal.
  E2. Falta ≥ 1 requisito OBRIGATÓRIO listado na vaga (CNH, experiência mínima, certificação mandatória etc.).
  E3. Menos de 70% das skills técnicas CENTRAIS da vaga.
  E4. Para vagas presenciais: mora a mais de ${radius || 50}km sem declarar disponibilidade de mudança.
  E5. Sobre-qualificado: último cargo 2+ níveis acima da vaga (ex: Gerente → Assistente). Score máx 30.

TETOS RÍGIDOS POR SITUAÇÃO:
  - Cargo diferente, mesmo setor, atividades sobrepostas → score máx 55
  - Candidato atende função mas falta 1 requisito obrigatório → score máx 50
  - Sub-qualificado (< 60% da experiência exigida) → score máx 40
  - Sobre-qualificado grave (≥ 2 níveis acima) → score máx 30
  - Área completamente diferente → score máx 15

ESCALA DE SCORES (RIGOROSA — use toda a amplitude):
  90–100: Candidato perfeito. Função idêntica + todos os requisitos + experiência adequada + skills completas.
  80–89:  Excelente. Atende 95%+ dos critérios. Pequenos gaps em desejáveis.
  70–79:  Bom. Atende todos os obrigatórios, gaps apenas em desejáveis ou experiência ligeiramente acima do mínimo.
  60–69:  Aceitável com ressalvas. Atende a função mas tem gap em 1 requisito não eliminatório.
  50–59:  Fraco. Múltiplos gaps. Só considerar se pool for muito escasso.
  40–49:  Muito fraco. Avançar só em caso de extrema escassez.
  0–39:   Incompatível. Não avança.

REGRA DE OURO DO MODO RIGOROSO:
  Score ≥ 80 SOMENTE se o candidato cumpre 100% dos eliminatórios e ≥ 90% dos requisitos totais.
  Score ≥ 70 SOMENTE se todos os eliminatórios passam e gap existe apenas em requisitos desejáveis.
  Qualquer eliminatório reprovado = teto de 50, independente das outras qualidades.`

        : precisionMode === 'Equilibrada' ? `
══════════════════════════════════════════════════════
MODO EQUILIBRADO — ANÁLISE TÉCNICA COM CONTEXTO
══════════════════════════════════════════════════════
Você está operando como um Analista Sênior de RH experiente.
Avalie competências reais, não apenas títulos de cargo. Considere trajetória e contexto.
Mas seja honesto — generosidade injustificada prejudica o recrutador.

PRINCÍPIOS DO MODO EQUILIBRADO:
  1. Cargo diferente mas atividades idênticas = válido (ex: "Assistente de Logística" que geria frota = válido para "Coordenador de Frota").
     → Registre nos strengths com contexto: "Exerceu atividades de X no cargo Y na empresa Z"
  2. Skills parciais = penalização proporcional, não eliminação automática.
  3. Experiência ligeiramente abaixo do mínimo (<25% a menos) = aceitável com penalização.
  4. Formação superior à exigida = positivo (sem penalização).
  5. Sobre-qualificado moderado (1 nível acima) = aceitável COM alerta obrigatório nos attention_points.

TETOS POR SITUAÇÃO:
  - Área completamente diferente, sem atividades relacionadas → score máx 30
  - Cargo diferente, atividades sobrepostas (≥50%) → score máx 75
  - Falta 1 requisito obrigatório técnico → score máx 65
  - Sub-qualificado (25–50% abaixo do mínimo) → score máx 60
  - Sobre-qualificado (1 nível acima) → score máx 70, com alerta obrigatório
  - Sobre-qualificado grave (≥2 níveis) → score máx 45

ESCALA DE SCORES (EQUILIBRADA):
  85–100: Candidato forte. Função idêntica/equivalente + requisitos + skills. Pode ter 1 gap menor em desejável.
  70–84:  Bom candidato. Atende critérios centrais. Gaps menores aceitáveis.
  55–69:  Candidato com potencial. Atende parcialmente. Gaps em requisitos não eliminatórios.
  40–54:  Candidato fraco mas com algum mérito. Gaps relevantes que precisam ser avaliados presencialmente.
  0–39:   Incompatível. Não avança.`

        : `
══════════════════════════════════════════════════════
MODO FLEXÍVEL — AVALIAÇÃO DE POTENCIAL E TRANSFERÊNCIA
══════════════════════════════════════════════════════
Você está operando como um Recrutador com foco em potencial e crescimento.
Valorize trajetória, aptidão, habilidades transferíveis e motivação implícita.
Use para vagas com escassez de candidatos ideais ou posições de desenvolvimento.

PRINCÍPIOS DO MODO FLEXÍVEL:
  1. Habilidades transferíveis contam. Ex: ex-militar → segurança; professor → treinamento corporativo.
  2. Trajetória de crescimento rápida = fator positivo mesmo sem experiência exata.
  3. Formação de alto nível pode compensar parcialmente experiência prática.
  4. Certificações e projetos pessoais na área contam como experiência complementar.
  5. Mesmo no modo flexível: áreas SEM NENHUMA conexão com a vaga = score máx 35.

LIMITES INVIOLÁVEIS MESMO NO MODO FLEXÍVEL:
  - Zero conexão com a área da vaga → score máx 35 (ex: garçom → engenheiro de software).
  - Falta de habilidade técnica básica e não-transferível → score máx 50 (ex: nenhum contato com programação para vaga dev).
  - Sobre-qualificado grave (≥2 níveis acima, sem justificativa) → score máx 55.

TETOS POR SITUAÇÃO:
  - Área diferente mas com habilidades altamente transferíveis → score máx 65
  - Candidato em transição de carreira com bagagem relevante → score máx 70
  - Skills incompletas mas trajetória de aprendizado rápido → score máx 72
  - Sub-qualificado mas potencial evidente → score máx 65

ESCALA DE SCORES (FLEXÍVEL):
  80–100: Candidato muito bom para o perfil. Combina ou supera os principais critérios.
  65–79:  Bom potencial. Vale entrevistar.
  50–64:  Potencial com ressalvas significativas. Entrevista opcional.
  35–49:  Baixo potencial. Só se pool for muito restrito.
  0–34:   Incompatível mesmo com critérios flexíveis.`;

        const prompt = `
Você é a Aurora AI — especialista sênior em análise de currículos, triagem e recrutamento.
Você combina o rigor analítico de um Head de Talent Acquisition com a precisão de um sistema de matching por competências.
Sua avaliação define quem o recrutador vai entrevistar. Erros de avaliação têm custo real.

══════════════════════════════════════════════════════
PRINCÍPIOS UNIVERSAIS (válidos em qualquer modo)
══════════════════════════════════════════════════════
1. AVALIE O QUE O CANDIDATO FEZ, não apenas onde trabalhou.
   → "Trabalhou na área" ≠ "Exerceu a função". Um auxiliar administrativo em transportadora NÃO é motorista.

2. SENIORIDADE É BIDIRECIONAL — ambas direções têm risco:
   SUB-QUALIFICADO: não atinge o nível necessário para entregar.
   SOBRE-QUALIFICADO: risco real de desmotivação, saída precoce e custo de reposição.

   Regras de sub-qualificação:
   → Vaga exige ≥4 anos (Sênior): candidato com <3 anos → score máx 35
   → Vaga exige 2–4 anos (Pleno): candidato com <1 ano → score máx 40
   → Vaga exige ≥1 ano: estagiário sem experiência → score máx 30

   Regras de sobre-qualificação:
   → Vaga Júnior (0–2 anos): candidato com ≥5 anos → score máx 55 + alerta obrigatório
   → Vaga Júnior: último cargo Pleno/Sênior → score máx 60 + alerta obrigatório
   → Vaga Estágio: profissional com ≥2 empregos formais → score máx 40
   → Exceção: candidato declara explicitamente querer o nível → teto +15 pts, mas alerta permanece

3. SKILLS TÉCNICAS SÃO VERIFICADAS COM EVIDÊNCIA:
   → Não basta mencionar a skill — precisa aparecer em experiências, projetos ou certificações reais.
   → "Conhecimento básico" ≠ "Domínio". Para vagas técnicas, nível insuficiente = não atende.

4. NUNCA INFLE SCORE:
   → Um 65 honesto é mais valioso que um 80 otimista.
   → O recrutador usa seus scores para priorizar entrevistas. Score inflado = entrevista desperdiçada.

5. FORMAÇÃO COMPLEMENTA, NÃO SUBSTITUI EXPERIÊNCIA:
   → Pós-graduação ou MBA são positivos, mas não compensam anos de experiência faltando na função.
   → Exceção: vagas que listam formação como requisito eliminatório.

══════════════════════════════════════════════════════
VAGA ALVO
══════════════════════════════════════════════════════
Título: ${job.title}
Local: ${job.city}/${job.state} | Modelo: ${job.work_model || 'Não informado'}
Senioridade declarada: ${job.seniority_level || 'Não informada'}
Experiência mínima exigida: ${job.min_experience_years ?? 0} ano(s)
Requisitos OBRIGATÓRIOS:
${(job.mandatory_requirements || 'Não especificado').substring(0, 900)}
Skills técnicas exigidas:
${(job.technical_requirements || 'Não especificado').substring(0, 600)}
Skills desejáveis:
${(job.desirable_requirements || 'Não especificado').substring(0, 400)}
Descrição da função e responsabilidades:
${(job.description || 'Não especificado').substring(0, 700)}
Checklist crítico da vaga:
${jobChecklist ? `- ${jobChecklist}` : '- Nenhum requisito crítico adicional identificado'}

══════════════════════════════════════════════════════
SISTEMA DE PONTUAÇÃO UNIVERSAL
══════════════════════════════════════════════════════
Calcule cada dimensão separadamente e some ao final:

[A] ADERÊNCIA FUNCIONAL — peso 45 pts
  Pergunta central: "Esse candidato JÁ FEZ este trabalho?"
  45 pts → Exerceu função idêntica ou sinônimo direto. Entregas comprováveis na área.
  35 pts → Função muito próxima. Atividades sobrepostas ≥75% com a vaga.
  22 pts → Mesma área de negócio, atividades sobrepostas 40–74%.
  10 pts → Área diferente, mas atividades transferíveis identificáveis (<40% sobreposição).
   0 pts → Área completamente diferente. Sem transferência relevante. (TETO FINAL: 30 pts)

[B] EXPERIÊNCIA E SENIORIDADE — peso 20 pts
  20 pts → Tempo ≥ mínimo exigido E nível de senioridade compatível com a vaga.
  15 pts → Tempo ≥ mínimo, mas nível levemente diferente (1 nível acima ou abaixo).
   8 pts → Tempo 50–99% do mínimo exigido.
   3 pts → Tempo <50% do mínimo exigido.
   0 pts → Sem experiência mensurável na área.
  Aplique os tetos de sobre/sub-qualificação dos princípios universais.

[C] SKILLS TÉCNICAS — peso 25 pts
  25 pts → Possui e comprova ≥90% das skills centrais da vaga.
  18 pts → Possui e comprova 70–89% das skills centrais.
  10 pts → Possui e comprova 50–69% das skills centrais.
   4 pts → Possui e comprova <50% das skills centrais.
   0 pts → Falta skills fundamentais não negociáveis da vaga.
  Para vagas técnicas: skills centrais ausentes = máximo 4 pts nesta dimensão.

[D] LOCALIZAÇÃO — peso 10 pts
  10 pts → Dentro do raio de ${radius || 50}km OU vaga remota.
   6 pts → Fora do raio mas dentro de 2x o raio, declara disponibilidade.
   3 pts → Fora do raio, sem declaração de disponibilidade.
   0 pts → Fora do raio + vaga presencial obrigatória + sem disponibilidade declarada.

SCORE FINAL = A + B + C + D (0–100)
CLASSIFICAÇÃO FINAL:
  80–100: Altíssimo Fit → Entrevistar com prioridade
  65–79:  Alto Fit → Entrevistar
  45–64:  Fit Parcial → Entrevistar com cautela / só se pool restrito
  25–44:  Fit Baixo → Não recomendado
  0–24:   Incompatível → Desconsiderar

${precisionBlock}

══════════════════════════════════════════════════════
FORMATO DOS CAMPOS DE SAÍDA (obrigatório e preciso)
══════════════════════════════════════════════════════
strengths (pontos fortes — seja específico, cite evidências do currículo):
  → "Exerceu função de X por Y anos na empresa Z com entregas de [descrição]"
  → "Domínio comprovado de [skill] evidenciado em [experiência/projeto]"
  → "Formação em [área] alinhada ao requisito da vaga"

attention_points (pontos de atenção — sempre inclua todos os itens aplicáveis):
  1. Função: "✓ Exerceu [função exata]" OU "⚠ Exerceu [função próxima], não exata" OU "✗ Nunca exerceu a função"
  2. Experiência: "⏱ [X] anos identificados vs [Y] exigidos — [adequado/abaixo/acima]"
  3. Skills: liste cada skill central → "✓ [skill]" ou "✗ [skill ausente — impacto: alto/médio]"
  4. Localização: "📍 [cidade] — [dentro do raio / fora: Xkm de ${job.city}]"
  5. Senioridade: "🎯 Nível identificado: [Júnior/Pleno/Sênior] vs vaga: [nível da vaga] — [compatível/risco alto/risco baixo]"
  ${job.requires_cnh ? `6. CNH: "✓ CNH cat.[X] declarada" OU "✗ CNH não declarada — requisito obrigatório" OU "⚠ Condução mencionada sem CNH explícita"` : ''}
  ${job.requires_travel ? `7. Viagens: "✓ Disponibilidade declarada" OU "✗ Não declarado — requisito da vaga"` : ''}
  Se sobre-qualificado: "⚠ SOBRE-QUALIFICADO: [cargo/nível] acima do esperado — risco de desmotivação e turnover em [prazo estimado]"

recommendation_reason: 2–3 frases. Responda: "Por que esse candidato é (ou não é) a escolha certa para ESSA vaga?"
risk_reason: O risco MAIS RELEVANTE e concreto se contratado. Se não há risco relevante, diga "Nenhum risco operacional significativo identificado."

══════════════════════════════════════════════════════
CANDIDATOS PARA AVALIAÇÃO
══════════════════════════════════════════════════════
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

══════════════════════════════════════════════════════
INSTRUÇÃO FINAL DE EXECUÇÃO
══════════════════════════════════════════════════════
- Avalie CADA candidato de forma COMPLETAMENTE INDEPENDENTE — não compare candidatos entre si.
- Calcule as 4 dimensões (A, B, C, D) explicitamente na sua análise interna antes de definir o score.
- Aplique os tetos do modo ${precisionMode} sem exceções não justificadas.
- Seja PRECISO E HONESTO: scores inflados destroem a credibilidade do sistema e prejudicam o recrutador.
- Use toda a amplitude da escala — não agrupe scores em 70–80. Use 45, 52, 67, 73, 88 etc.
- Inclua SOMENTE candidatos com compatibility_score >= ${scoreThreshold}. Omita completamente os demais.
- Se o pool for insuficiente, retorne results vazio — não force aprovações.
- O campo summary deve informar: quantos candidatos avaliados, quantos passaram, e o perfil geral do pool.

Retorne SOMENTE JSON válido sem markdown:
{"results":[{"candidate_id":number,"compatibility_score":number,"classification":"string","distance_km":number|null,"strengths":["string"],"attention_points":["string"],"recommendation_reason":"string","risk_reason":"string"}],"summary":"string"}
`;

        // Temperatura por modo: Rigorosa=0 (determinístico), Equilibrada=0.05, Flexível=0.1
        const analysisTemperature = precisionMode === 'Rigorosa' ? 0.0 : precisionMode === 'Equilibrada' ? 0.05 : 0.1;

        const aiResult = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 20000,
            temperature: analysisTemperature,
            operationLabel: `match-${precisionMode.toLowerCase()}`,
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

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function matchResumeWithJob(
  job: any,
  candidate: any,
  resumeText?: string
) {
  const prompt = `
    Você é um especialista em recrutamento e seleção. Sua tarefa é realizar uma análise de compatibilidade profunda entre o Candidato e a Vaga abaixo.
    
    DADOS DA VAGA:
    Título: ${job.title}
    Descrição: ${job.description}
    Requisitos Obrigatórios: ${job.mandatory_requirements || 'N/A'}
    Requisitos Desejáveis: ${job.desirable_requirements || 'N/A'}
    Critérios Eliminatórios: ${job.eliminatory_criteria || 'N/A'}
    Local: ${job.city}/${job.state} (${job.work_model})
    Experiência Mínima: ${job.min_experience_years} anos
    Escolaridade Exigida: ${job.education_level || 'N/A'}
    
    DADOS DO CANDIDATO:
    Nome: ${candidate.full_name}
    Pretensão: ${candidate.desired_salary || 'N/A'}
    Escolaridade: ${candidate.education_level || 'N/A'}
    Experiência: ${candidate.experience_years || 0} anos
    Local: ${candidate.city}/${candidate.state} (${candidate.desired_work_model || 'N/A'})
    Resumo Profissional: ${candidate.professional_summary || 'N/A'}
    Skills: ${candidate.hard_skills || 'N/A'}
    
    TEXTO DO CURRÍCULO (EXTRAÍDO):
    ${resumeText || candidate.professional_experiences || 'N/A'}
    
    ANALISE E RETORNE UM JSON COM:
    - score: 0 a 100 (número)
    - classification: "Alto Fit" (85-100), "Médio Fit" (60-84), "Baixo Fit" (30-59), "Incompatível" (0-29)
    - summary: Resumo executivo da análise (parágrafo humano)
    - strengths: Lista de 3 a 5 pontos fortes
    - attention_points: Lista de 3 a 5 pontos que requerem atenção ou investigação
    - requirements_met: Lista de requisitos atendidos
    - requirements_partial: Lista de requisitos parcialmente atendidos
    - requirements_missing: Lista de requisitos não encontrados
    - eliminatory_flags: Lista de critérios eliminatórios encontrados que o candidato NÃO atende (se houver)
    - interview_questions: Sugestão de 3 a 5 perguntas específicas para a entrevista com este candidato
    - risk_analysis: Breve análise de riscos (ex: turnover, gaps técnicos, distância geográfica)
    - final_recommendation: Recomendação final objetiva
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            classification: { type: Type.STRING },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            attention_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            requirements_met: { type: Type.ARRAY, items: { type: Type.STRING } },
            requirements_partial: { type: Type.ARRAY, items: { type: Type.STRING } },
            requirements_missing: { type: Type.ARRAY, items: { type: Type.STRING } },
            eliminatory_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            interview_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            risk_analysis: { type: Type.STRING },
            final_recommendation: { type: Type.STRING }
          },
          required: ["score", "classification", "summary", "strengths", "attention_points", "requirements_met", "requirements_partial", "requirements_missing", "interview_questions", "risk_analysis", "final_recommendation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Match Error:", error);
    throw error;
  }
}

export async function generateJobPromotionText(job: any, channel: string) {
  const prompt = `
    Você é um especialista em recrutamento e seleção e marketing de recrutamento.
    Gere um texto profissional, claro, atrativo e objetivo para divulgação da vaga abaixo para o canal: ${channel}.
    
    O texto deve destacar: título, responsabilidades essenciais, requisitos chaves, principais benefícios e como se candidatar através do link oficial.
    Mantenha um tom ${channel === 'WhatsApp' ? 'direto e ágil' : channel === 'LinkedIn' ? 'profissional e inspirador' : 'claro e informativo'}.
    
    DADOS DA VAGA:
    Título: ${job.title}
    Departamento: ${job.department}
    Local: ${job.city}/${job.state} (${job.work_model})
    Contrato: ${job.contract_type}
    Descrição: ${job.description}
    Requisitos: ${job.technical_requirements}
    Benefícios: ${job.benefits}
    Link para Candidatura: ${window.location.origin}/portal/${job.public_slug}
    
    Retorne um JSON com:
    - title: Um título atraente para a postagem.
    - full_text: O corpo do texto completo formatado com emojis adequados ao canal.
    - short_text: Uma versão curta (pique "teaser").
    - hashtags: Uma lista de 5 a 10 hashtags relevantes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            full_text: { type: Type.STRING },
            short_text: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "full_text", "short_text", "hashtags"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Promotion Error:", error);
    return { title: job.title, full_text: `Vaga para ${job.title} aberta!`, short_text: "Nova Oportunidade!", hashtags: ["#vagas", "#rh"] };
  }
}

export async function analyzeDISC(responses: string) {
  const prompt = `
    Baseado nas respostas do candidato abaixo para um questionário comportamental, realize uma análise DISC.
    Respostas: ${responses}
    
    Determine a porcentagem para cada perfil: Dominância (D), Influência (I), Estabilidade (S) e Conformidade (C).
    Retorne um JSON com as porcentagens e um resumo do perfil comportamental.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            d: { type: Type.NUMBER },
            i: { type: Type.NUMBER },
            s: { type: Type.NUMBER },
            c: { type: Type.NUMBER },
            profile_summary: { type: Type.STRING }
          },
          required: ["d", "i", "s", "c", "profile_summary"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini DISC Error:", error);
    return { d: 25, i: 25, s: 25, c: 25, profile_summary: "Análise inconclusiva." };
  }
}

export async function summarizeCandidate(candidate: any) {
  const prompt = `
    Você é um analista de RH sênior. Gere um resumo profissional claro, objetivo e humano sobre o candidato abaixo, destacando experiência, principais competências e diferenciais detectados.
    
    CANDIDATO:
    Nome: ${candidate.full_name}
    Cargo: ${candidate.desired_position}
    Resumo: ${candidate.professional_summary}
    Experiência: ${candidate.experience_years} anos
    Skills: ${candidate.hard_skills}
    
    Retorne uma string com o resumo.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Summarize Error:", error);
    return "Erro ao gerar resumo.";
  }
}

export async function parseResumeData(resumeText: string) {
  const prompt = `
    Você é um especialista em recrutamento. Analise o texto do currículo abaixo e extraia os dados do candidato em formato JSON estruturado. 
    Se uma informação não existir, retorne null. Não invente informações.
    
    CURRÍCULO:
    ${resumeText}
    
    CAMPOS PARA EXTRAÇÃO:
    - full_name: Nome completo
    - email: E-mail
    - phone: Telefone (formato string)
    - city: Cidade
    - state: Estado (UF, ex: SP)
    - linkedin_url: Link do LinkedIn
    - portfolio_url: Link do Portfólio
    - desired_position: Cargo de interesse (baseado no objetivo ou última experiência)
    - professional_summary: Um breve resumo profissional (2-3 parágrafos)
    - experience_years: Tempo total aproximado de experiência em anos (número)
    - education_level: Grau de escolaridade (ex: Superior Completo)
    - hard_skills: Lista de competências técnicas (string separada por vírgula)
    - soft_skills: Lista de competências comportamentais (string separada por vírgula)
    - languages: Idiomas citados (string separada por vírgula)
    - has_cnh: true/false se possuir CNH
    - cnh_category: Categoria da CNH (ex: B, D, E)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            full_name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING, nullable: true },
            city: { type: Type.STRING, nullable: true },
            state: { type: Type.STRING, nullable: true },
            linkedin_url: { type: Type.STRING, nullable: true },
            portfolio_url: { type: Type.STRING, nullable: true },
            desired_position: { type: Type.STRING, nullable: true },
            professional_summary: { type: Type.STRING, nullable: true },
            experience_years: { type: Type.NUMBER, nullable: true },
            education_level: { type: Type.STRING, nullable: true },
            hard_skills: { type: Type.STRING, nullable: true },
            soft_skills: { type: Type.STRING, nullable: true },
            languages: { type: Type.STRING, nullable: true },
            has_cnh: { type: Type.BOOLEAN, nullable: true },
            cnh_category: { type: Type.STRING, nullable: true }
          },
          required: ["full_name", "email"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
}

export async function nexusAiChat(
  messages: { role: string; content: string }[],
  context: any
) {
  const prompt = `
    Você é o Nexus AI, o assistente inteligente de recrutamento e seleção oficial do Nexus AI Recruitment OS.
    Sua missão é ajudar o RH a tomar decisões melhores e mais rápidas usando inteligência artificial.
    
    DIRETRIZES:
    - Seja profissional, consultivo, empático e focado em dados.
    - Nunca invente informações sobre candidatos, vagas ou resultados.
    - Se não houver dados, diga "Não encontrei informações suficientes".
    - Você pode sugerir ações como: "Deseja que eu compare este candidato com a vaga X?" ou "Posso gerar perguntas de entrevista para este perfil".
    - Se o usuário pedir para buscar ou analisar algo, explique como você fará isso ou peça os parâmetros necessários.
    
    CONTEXTO ATUAL DO SISTEMA:
    Vagas Ativas: ${context.jobsCount}
    Total de Candidatos: ${context.candidatesCount}
    Sua Unidade: ${context.unitName}
    
    HISTÓRICO DA CONVERSA:
    ${messages.map(m => `${m.role === 'user' ? 'Usuário' : 'Nexus AI'}: ${m.content}`).join('\n')}
    
    Nexus AI:
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Desculpe, tive um problema ao processar sua solicitação. Como posso ajudar?";
  }
}

export async function summarizeShortlist(
  job: any,
  results: any[]
) {
  const prompt = `
    Como um Consultor de RH Sênior, analise a lista de candidatos pré-selecionados para a vaga "${job.title}".
    
    DADOS DA VAGA:
    ${job.description}
    Cidade: ${job.city}
    Modelo: ${job.work_model}
    
    RESULTADOS DA ANÁLISE (Top ${results.length}):
    ${results.map((r, i) => `${i+1}. ${r.full_name} (${r.city}) - Score: ${r.compatibility_score}% - Motivo: ${r.recommendation_reason}`).join('\n')}
    
    GERE UM RESUMO EXECUTIVO (SHORTLIST ANALYSIS) CONTENDO:
    1. Quantos candidatos foram analisados e quantos atingiram o fit ideal.
    2. Visão geral da aderência (especialmente técnica e geográfica).
    3. Destaque dos 3 principais candidatos e por que eles são os melhores.
    4. Principais riscos ou gaps encontrados no banco atual.
    5. Sugestão de próximos passos (ex: entrevistas, testes técnicos, expansão do raio de busca).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Summarize Shortlist Error:", error);
    return "Fim da análise.";
  }
}

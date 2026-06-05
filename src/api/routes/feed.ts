import { Express } from 'express';
import db from '../../lib/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str: string | null | undefined): string {
  if (!str) return '';
  return `<![CDATA[${String(str).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function stripHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function rfc822(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toUTCString();
  return new Date(dateStr).toUTCString();
}

function iso(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  return new Date(dateStr).toISOString();
}

function salaryText(min: number | null, max: number | null): string {
  if (!min && !max) return '';
  if (min && max) return `R$ ${min.toLocaleString('pt-BR')} - R$ ${max.toLocaleString('pt-BR')}`;
  if (min) return `A partir de R$ ${min.toLocaleString('pt-BR')}`;
  return `Até R$ ${max!.toLocaleString('pt-BR')}`;
}

function contractToEnglish(type: string | null): string {
  if (!type) return 'fulltime';
  if (type === 'CLT') return 'fulltime';
  if (type === 'PJ') return 'contract';
  if (type === 'Estágio') return 'intern';
  if (type === 'Temporário') return 'temporary';
  if (type === 'Freelancer') return 'parttime';
  return 'other';
}

function contractToIndeed(type: string | null): string {
  if (!type) return 'Full-time';
  if (type === 'CLT') return 'Full-time';
  if (type === 'PJ') return 'Contractor';
  if (type === 'Estágio') return 'Intern';
  if (type === 'Temporário') return 'Temporary';
  if (type === 'Freelancer') return 'Part-time';
  return type;
}

function buildDesc(job: any): string {
  return [
    job.description,
    job.responsibilities      ? `\nResponsabilidades:\n${job.responsibilities}` : '',
    job.technical_requirements ? `\nRequisitos Técnicos:\n${job.technical_requirements}` : '',
    job.mandatory_requirements ? `\nRequisitos Obrigatórios:\n${job.mandatory_requirements}` : '',
    job.desirable_requirements ? `\nDiferenciais:\n${job.desirable_requirements}` : '',
    job.benefits               ? `\nBenefícios:\n${job.benefits}` : '',
    job.work_model             ? `\nModalidade: ${job.work_model}` : '',
    job.contract_type          ? `\nContrato: ${job.contract_type}` : '',
    salaryText(job.salary_min, job.salary_max) ? `\nRemuneração: ${salaryText(job.salary_min, job.salary_max)}` : '',
  ].filter(Boolean).join('\n');
}

function getBaseUrl(): string {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

function jobUrl(job: any, base: string): string {
  const slug = job.public_slug || job.id;
  return `${base}/vaga/${slug}`;
}

function portalUrl(job: any, base: string): string {
  const slug = job.public_slug || job.id;
  return `${base}/empregos/vaga/${slug}`;
}

async function fetchJobs(tenantId?: string): Promise<any[]> {
  let q = `
    SELECT j.*, t.company_name, t.name AS tenant_name
    FROM jobs j
    LEFT JOIN tenants t ON j.tenant_id = t.id
    WHERE j.deleted_at IS NULL AND j.is_public = 1 AND j.status = 'Aberta'
  `;
  const params: any[] = [];
  if (tenantId) { q += ' AND j.tenant_id = ?'; params.push(tenantId); }
  q += ' ORDER BY j.created_at DESC LIMIT 1000';
  return db.prepare(q).all(...params) as any[];
}

export function registerFeedRoutes(app: Express) {

  // ── Feed RSS genérico (Vagas.com.br, Infojobs, agregadores) ─────────────────
  // URL: /feed/vagas.xml
  app.get('/feed/vagas.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const salary = salaryText(job.salary_min, job.salary_max);
        const desc   = stripHtml(buildDesc(job));
        const comp   = job.company_name || job.tenant_name || 'Empresa';

        return `  <item>
    <title>${esc(job.title)}</title>
    <link>${esc(url)}</link>
    <guid isPermaLink="true">${esc(url)}</guid>
    <pubDate>${rfc822(job.created_at)}</pubDate>
    <description>${esc(desc)}</description>
    <location>${esc([job.city, job.state].filter(Boolean).join(', '))}</location>
    <city>${esc(job.city)}</city>
    <state>${esc(job.state)}</state>
    <country>Brasil</country>
    <company>${esc(comp)}</company>
    <jobtype>${esc(job.contract_type || 'CLT')}</jobtype>
    <category>${esc(job.department || 'Geral')}</category>${salary ? `\n    <salary>${esc(salary)}</salary>` : ''}
    <referencenumber>${job.id}</referencenumber>
  </item>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vagas de Emprego — Triagem Smart</title>
    <link>${base}/empregos</link>
    <description>Oportunidades publicadas na plataforma Triagem Smart</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/feed/vagas.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/vagas.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Indeed (formato oficial publisher) ──────────────────────────────────────
  // URL: /feed/indeed.xml
  // Cadastro: https://indeed.com/publisher
  app.get('/feed/indeed.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base        = getBaseUrl();
      const publisher   = process.env.PUBLISHER_NAME || 'Triagem Smart';
      const applyEmail  = process.env.INDEED_APPLY_EMAIL || '';

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || publisher;
        const salary = salaryText(job.salary_min, job.salary_max);
        const desc   = stripHtml(buildDesc(job));

        return `  <job>
    <title>${cdata(job.title)}</title>
    <date>${cdata(rfc822(job.created_at))}</date>
    <referencenumber>${cdata(String(job.id))}</referencenumber>
    <url>${cdata(url)}</url>
    <company>${cdata(comp)}</company>
    <city>${cdata(job.city || '')}</city>
    <state>${cdata(job.state || '')}</state>
    <country>${cdata('BR')}</country>
    <postalcode>${cdata('')}</postalcode>
    <description>${cdata(desc)}</description>${salary ? `\n    <salary>${cdata(salary + ' por mês')}</salary>` : ''}${job.department ? `\n    <category>${cdata(job.department)}</category>` : ''}
    <jobtype>${cdata(contractToIndeed(job.contract_type))}</jobtype>${job.work_model === 'Home Office' ? '\n    <remotetype><![CDATA[Remote]]></remotetype>' : ''}${applyEmail ? `\n    <email>${cdata(applyEmail)}</email>` : ''}
  </job>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>${cdata(publisher)}</publisher>
  <publisherurl>${cdata(base + '/empregos')}</publisherurl>
  <lastBuildDate>${cdata(new Date().toUTCString())}</lastBuildDate>
${items}
</source>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.send(xml);
    } catch (e) {
      console.error('[feed/indeed.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Jooble (formato de feed de parceiro) ────────────────────────────────────
  // URL: /feed/jooble.xml
  // Cadastro: https://jooble.org/feed/  (enviar URL do feed para partnerships@jooble.org)
  app.get('/feed/jooble.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const salary = salaryText(job.salary_min, job.salary_max);
        const desc   = stripHtml(buildDesc(job));

        return `  <job>
    <title>${cdata(job.title)}</title>
    <url>${cdata(url)}</url>
    <body>${cdata(desc)}</body>
    <company>${cdata(comp)}</company>
    <type>${cdata(contractToEnglish(job.contract_type))}</type>
    <location>${cdata([job.city, job.state, 'Brasil'].filter(Boolean).join(', '))}</location>
    <salary>${cdata(salary || 'A combinar')}</salary>
    <category>${cdata(job.department || 'Geral')}</category>
    <postedAt>${cdata(iso(job.created_at))}</postedAt>
    <updatedAt>${cdata(iso(job.updated_at))}</updatedAt>
  </job>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<jobs>
${items}
</jobs>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/jooble.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Careerjet (formato XML de parceiro) ─────────────────────────────────────
  // URL: /feed/careerjet.xml
  // Cadastro: https://www.careerjet.com.br/content/publisher.html
  app.get('/feed/careerjet.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const salary = salaryText(job.salary_min, job.salary_max);
        const desc   = stripHtml(buildDesc(job));

        return `  <job>
    <title>${cdata(job.title)}</title>
    <url>${cdata(url)}</url>
    <description>${cdata(desc)}</description>
    <company>${cdata(comp)}</company>
    <locations>${cdata([job.city, job.state].filter(Boolean).join(', '))}</locations>
    <category>${cdata(job.department || 'Geral')}</category>
    <salary>${cdata(salary)}</salary>
    <date>${cdata(iso(job.created_at))}</date>
    <referencenumber>${cdata(String(job.id))}</referencenumber>${job.work_model === 'Home Office' ? '\n    <onsite_remote><![CDATA[remote]]></onsite_remote>' : job.work_model === 'Híbrido' ? '\n    <onsite_remote><![CDATA[hybrid]]></onsite_remote>' : ''}
  </job>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<jobs>
${items}
</jobs>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/careerjet.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Talent.com / Neuvoo (formato XML) ───────────────────────────────────────
  // URL: /feed/talent.xml
  // Cadastro: https://www.talent.com/partner  (enviar URL para partnerships@talent.com)
  app.get('/feed/talent.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const salary = salaryText(job.salary_min, job.salary_max);
        const desc   = stripHtml(buildDesc(job));

        return `  <job>
    <title>${cdata(job.title)}</title>
    <url>${cdata(url)}</url>
    <description>${cdata(desc)}</description>
    <company>${cdata(comp)}</company>
    <city>${cdata(job.city || '')}</city>
    <country>${cdata('BR')}</country>
    <jobtype>${cdata(contractToEnglish(job.contract_type))}</jobtype>
    <category>${cdata(job.department || 'Geral')}</category>
    <salary>${cdata(salary)}</salary>
    <id>${cdata(String(job.id))}</id>
    <date>${cdata(iso(job.created_at))}</date>
    <remote>${cdata(job.work_model === 'Home Office' ? '1' : '0')}</remote>
  </job>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
${items}
</source>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/talent.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Jobrapido ────────────────────────────────────────────────────────────────
  // URL: /feed/jobrapido.xml
  // Cadastro: https://br.jobrapido.com/contact (parceria de feed RSS padrão)
  app.get('/feed/jobrapido.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <item>
    <title>${esc(job.title + (comp ? ' — ' + comp : ''))}</title>
    <link>${esc(url)}</link>
    <guid isPermaLink="true">${esc(url)}</guid>
    <pubDate>${rfc822(job.created_at)}</pubDate>
    <description>${esc(desc)}</description>
    <author>${esc(comp)}</author>
    <category>${esc(job.department || 'Geral')}</category>
    <location>${esc([job.city, job.state, 'Brasil'].filter(Boolean).join(', '))}</location>${salary ? `\n    <salary>${esc(salary)}</salary>` : ''}
  </item>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Vagas — Triagem Smart</title>
    <link>${base}/empregos</link>
    <description>Vagas abertas na plataforma Triagem Smart</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/jobrapido.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── BNE — Banco Nacional de Empregos ────────────────────────────────────────
  // URL: /feed/bne.xml
  // Cadastro: https://www.bne.com.br/anunciante (plano pago, enviar feed por email)
  app.get('/feed/bne.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <vaga>
    <titulo>${esc(job.title)}</titulo>
    <empresa>${esc(comp)}</empresa>
    <cidade>${esc(job.city || '')}</cidade>
    <estado>${esc(job.state || '')}</estado>
    <descricao>${esc(desc)}</descricao>
    <salario>${esc(salary || 'A combinar')}</salario>
    <tipo_contrato>${esc(job.contract_type || 'CLT')}</tipo_contrato>
    <modalidade>${esc(job.work_model || 'Presencial')}</modalidade>
    <area>${esc(job.department || 'Geral')}</area>
    <nivel>${esc(job.seniority_level || '')}</nivel>
    <link>${esc(url)}</link>
    <data_publicacao>${esc(iso(job.created_at))}</data_publicacao>
    <referencia>${job.id}</referencia>
  </vaga>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<vagas>
${items}
</vagas>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/bne.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Empregos.com.br ─────────────────────────────────────────────────────────
  // URL: /feed/empregos.xml
  // Cadastro: https://www.empregos.com.br/parceiros (enviar feed por email parceiros@empregos.com.br)
  app.get('/feed/empregos.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <vaga>
    <titulo>${cdata(job.title)}</titulo>
    <empresa>${cdata(comp)}</empresa>
    <cidade>${cdata(job.city || '')}</cidade>
    <estado>${cdata(job.state || '')}</estado>
    <pais>Brasil</pais>
    <descricao>${cdata(desc)}</descricao>
    <salario>${cdata(salary || 'A combinar')}</salario>
    <tipo>${cdata(job.contract_type || 'CLT')}</tipo>
    <categoria>${cdata(job.department || 'Geral')}</categoria>
    <nivel>${cdata(job.seniority_level || '')}</nivel>
    <url>${cdata(url)}</url>
    <data>${cdata(iso(job.created_at))}</data>
    <codigo>${job.id}</codigo>
  </vaga>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<vagas>
${items}
</vagas>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/empregos.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Infojobs Brasil (RSS padrão) ─────────────────────────────────────────────
  // URL: /feed/infojobs.xml
  // Cadastro: https://www.infojobs.com.br/anuncie (plano pago, feed enviado por email)
  app.get('/feed/infojobs.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <job>
    <id>${job.id}</id>
    <title>${esc(job.title)}</title>
    <company>${esc(comp)}</company>
    <city>${esc(job.city || '')}</city>
    <state>${esc(job.state || '')}</state>
    <country>BR</country>
    <description>${esc(desc)}</description>
    <salary>${esc(salary || 'A combinar')}</salary>
    <contract_type>${esc(job.contract_type || 'CLT')}</contract_type>
    <work_mode>${esc(job.work_model || 'Presencial')}</work_mode>
    <department>${esc(job.department || '')}</department>
    <seniority>${esc(job.seniority_level || '')}</seniority>
    <url>${esc(url)}</url>
    <published_at>${esc(iso(job.created_at))}</published_at>
  </job>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<jobs>
${items}
</jobs>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/infojobs.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Catho (XML de integração ATS) ───────────────────────────────────────────
  // URL: /feed/catho.xml
  // Cadastro: https://anunciante.catho.com.br/ (plano pago, integração via email)
  app.get('/feed/catho.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <oportunidade>
    <codigo_externo>${job.id}</codigo_externo>
    <titulo>${esc(job.title)}</titulo>
    <empresa>${esc(comp)}</empresa>
    <cidade>${esc(job.city || '')}</cidade>
    <estado>${esc(job.state || '')}</estado>
    <descricao>${esc(desc)}</descricao>
    <salario>${esc(salary || 'A combinar')}</salario>
    <tipo_contratacao>${esc(job.contract_type || 'CLT')}</tipo_contratacao>
    <modelo_trabalho>${esc(job.work_model || 'Presencial')}</modelo_trabalho>
    <area_atuacao>${esc(job.department || 'Geral')}</area_atuacao>
    <nivel>${esc(job.seniority_level || '')}</nivel>
    <escolaridade>${esc(job.education_level || '')}</escolaridade>
    <link>${esc(url)}</link>
    <data_publicacao>${esc(iso(job.created_at))}</data_publicacao>
  </oportunidade>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<oportunidades>
${items}
</oportunidades>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/catho.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Vagas.com.br (XML de integração) ────────────────────────────────────────
  // URL: /feed/vagas-com.xml
  // Cadastro: https://www.vagas.com.br/sistema-de-recrutamento (plano pago)
  app.get('/feed/vagas-com.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const url    = jobUrl(job, base);
        const comp   = job.company_name || job.tenant_name || 'Empresa';
        const desc   = stripHtml(buildDesc(job));
        const salary = salaryText(job.salary_min, job.salary_max);

        return `  <vaga>
    <codigo>${job.id}</codigo>
    <titulo>${esc(job.title)}</titulo>
    <empresa>${esc(comp)}</empresa>
    <local_trabalho>
      <cidade>${esc(job.city || '')}</cidade>
      <estado>${esc(job.state || '')}</estado>
    </local_trabalho>
    <descricao><![CDATA[${desc}]]></descricao>
    <beneficios>${esc(job.benefits || '')}</beneficios>
    <nivel_hierarquico>${esc(job.seniority_level || '')}</nivel_hierarquico>
    <area_atuacao>${esc(job.department || '')}</area_atuacao>
    <tipo_contratacao>${esc(job.contract_type || 'CLT')}</tipo_contratacao>
    <regime>${esc(job.work_model || 'Presencial')}</regime>
    <salario>${esc(salary || 'A combinar')}</salario>
    <link>${esc(url)}</link>
    <data_publicacao>${esc(iso(job.created_at))}</data_publicacao>
  </vaga>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<vagas>
${items}
</vagas>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/vagas-com.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── SINE / Emprega Brasil (exportação guiada) ────────────────────────────────
  // O SINE não tem API pública de importação. Este feed exporta no formato
  // compatível com o Portal do Empregador (empregabrasil.mte.gov.br)
  // para copiar/colar ou usar como base de cadastro.
  // URL: /feed/sine.xml
  app.get('/feed/sine.xml', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => {
        const comp = job.company_name || job.tenant_name || 'Empresa';
        const desc = stripHtml(buildDesc(job));

        return `  <vaga>
    <titulo_vaga>${esc(job.title)}</titulo_vaga>
    <empresa>${esc(comp)}</empresa>
    <municipio>${esc(job.city || '')}</municipio>
    <uf>${esc(job.state || '')}</uf>
    <descricao_atividades>${esc(desc)}</descricao_atividades>
    <salario>${esc(salaryText(job.salary_min, job.salary_max) || 'A combinar')}</salario>
    <tipo_contrato>${esc(job.contract_type || 'CLT')}</tipo_contrato>
    <escolaridade>${esc(job.education_level || 'Não informado')}</escolaridade>
    <nivel_experiencia>${esc(job.seniority_level || 'Não informado')}</nivel_experiencia>
    <cnh_exigida>${job.requires_cnh ? 'Sim' : 'Não'}</cnh_exigida>
    <categoria_cnh>${esc(job.cnh_category || '')}</categoria_cnh>
    <link_externo>${esc(jobUrl(job, base))}</link_externo>
    <data_publicacao>${esc(iso(job.created_at))}</data_publicacao>
  </vaga>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Feed para auxiliar no cadastro no Portal do Empregador (empregabrasil.mte.gov.br) -->
<!-- O SINE não possui API pública de importação. Use este arquivo como referência. -->
<vagas>
${items}
</vagas>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e) {
      console.error('[feed/sine.xml]', e);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // ── Feed JSON universal ──────────────────────────────────────────────────────
  // URL: /feed/vagas.json
  app.get('/feed/vagas.json', async (req, res) => {
    const { tenantId } = req.query as any;
    try {
      const jobs = await fetchJobs(tenantId);
      const base = getBaseUrl();

      const items = jobs.map(job => ({
        id:              String(job.id),
        url:             jobUrl(job, base),
        portal_url:      portalUrl(job, base),
        title:           job.title,
        company:         job.company_name || job.tenant_name || '',
        city:            job.city,
        state:           job.state,
        country:         'BR',
        work_model:      job.work_model,
        contract_type:   job.contract_type,
        seniority_level: job.seniority_level,
        education_level: job.education_level,
        department:      job.department,
        salary_min:      job.salary_min,
        salary_max:      job.salary_max,
        salary_text:     salaryText(job.salary_min, job.salary_max) || 'A combinar',
        description:     stripHtml(job.description),
        responsibilities:stripHtml(job.responsibilities),
        requirements:    stripHtml(job.mandatory_requirements || job.technical_requirements),
        benefits:        stripHtml(job.benefits),
        requires_cnh:    Boolean(job.requires_cnh),
        cnh_category:    job.cnh_category,
        posted_at:       iso(job.created_at),
        updated_at:      iso(job.updated_at),
      }));

      res.json({ total: items.length, generated_at: new Date().toISOString(), jobs: items });
    } catch (e) {
      res.status(500).json({ error: 'Feed unavailable' });
    }
  });

  // ── Schema.org JobPosting individual ────────────────────────────────────────
  // URL: /api/public/jobs/:slugOrId/schema
  app.get('/api/public/jobs/:slugOrId/schema', async (req, res) => {
    const { slugOrId } = req.params;
    try {
      const job = await db.prepare(
        `SELECT j.*, t.company_name, t.name AS tenant_name
         FROM jobs j LEFT JOIN tenants t ON j.tenant_id = t.id
         WHERE (j.public_slug = ? OR j.id = ?) AND j.deleted_at IS NULL AND j.is_public = 1`
      ).get(slugOrId, slugOrId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      const base    = getBaseUrl();
      const url     = jobUrl(job, base);
      const schema: Record<string, any> = {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: job.title,
        description: stripHtml(buildDesc(job)),
        datePosted: iso(job.created_at),
        validThrough: new Date(new Date(job.created_at).getTime() + 90 * 86400000).toISOString(),
        employmentType: job.contract_type === 'CLT' ? 'FULL_TIME' : job.contract_type === 'PJ' ? 'CONTRACTOR' : job.contract_type === 'Estágio' ? 'INTERN' : job.contract_type === 'Temporário' ? 'TEMPORARY' : 'OTHER',
        hiringOrganization: { '@type': 'Organization', name: job.company_name || job.tenant_name || 'Triagem Smart' },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.city, addressRegion: job.state, addressCountry: 'BR' } },
        url,
      };
      if (job.work_model === 'Home Office') schema.jobLocationType = 'TELECOMMUTE';
      if (job.salary_min || job.salary_max) {
        schema.baseSalary = { '@type': 'MonetaryAmount', currency: 'BRL', value: { '@type': 'QuantitativeValue', ...(job.salary_min ? { minValue: job.salary_min } : {}), ...(job.salary_max ? { maxValue: job.salary_max } : {}), unitText: 'MONTH' } };
      }
      if (job.seniority_level) schema.experienceRequirements = job.seniority_level;
      if (job.education_level) schema.educationRequirements = job.education_level;
      res.json(schema);
    } catch (e) {
      res.status(500).json({ error: 'Schema unavailable' });
    }
  });

  // ── Portal público — vagas de todos os tenants ───────────────────────────────
  // URL: /api/public/jobs
  app.get('/api/public/jobs', async (req, res) => {
    const { search, city, state, work_model, contract_type, department } = req.query as any;
    try {
      let q = `
        SELECT j.id, j.title, j.department, j.city, j.state, j.work_model,
               j.contract_type, j.seniority_level, j.salary_min, j.salary_max,
               j.description, j.responsibilities, j.technical_requirements,
               j.mandatory_requirements, j.desirable_requirements, j.benefits,
               j.public_slug, j.created_at,
               t.company_name, t.name AS tenant_name
        FROM jobs j
        LEFT JOIN tenants t ON j.tenant_id = t.id
        WHERE j.deleted_at IS NULL AND j.is_public = 1 AND j.status = 'Aberta'
      `;
      const params: any[] = [];

      if (search) {
        q += ` AND (j.title LIKE ? OR j.department LIKE ? OR j.city LIKE ? OR t.company_name LIKE ? OR t.name LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
      }
      if (city)          { q += ' AND j.city = ?';          params.push(city); }
      if (state)         { q += ' AND j.state = ?';         params.push(state); }
      if (work_model)    { q += ' AND j.work_model = ?';    params.push(work_model); }
      if (contract_type) { q += ' AND j.contract_type = ?'; params.push(contract_type); }
      if (department)    { q += ' AND j.department = ?';    params.push(department); }

      q += ' ORDER BY j.created_at DESC LIMIT 500';
      const jobs = await db.prepare(q).all(...params) as any[];
      res.json(jobs);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  // ── Vaga pública por slug ou id ──────────────────────────────────────────────
  // URL: /api/public/jobs/:slugOrId
  app.get('/api/public/jobs/:slugOrId', async (req, res) => {
    const { slugOrId } = req.params;
    try {
      const job = await db.prepare(
        `SELECT j.*, t.company_name, t.name AS tenant_name, t.email AS tenant_email
         FROM jobs j LEFT JOIN tenants t ON j.tenant_id = t.id
         WHERE (j.public_slug = ? OR j.id = ?) AND j.deleted_at IS NULL`
      ).get(slugOrId, slugOrId) as any;
      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
      res.json(job);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });
}

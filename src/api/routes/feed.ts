import { Express } from 'express';
import db from '../../lib/db';

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toUTCString();
  return new Date(dateStr).toUTCString();
}

function isoDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  return new Date(dateStr).toISOString();
}

function buildSalaryText(min: number | null, max: number | null): string {
  if (!min && !max) return '';
  if (min && max) return `R$ ${min.toLocaleString('pt-BR')} - R$ ${max.toLocaleString('pt-BR')}`;
  if (min) return `A partir de R$ ${min.toLocaleString('pt-BR')}`;
  return `Até R$ ${max!.toLocaleString('pt-BR')}`;
}

function workModelToEnglish(model: string | null): string {
  if (!model) return 'TELECOMMUTE';
  if (model === 'Home Office') return 'TELECOMMUTE';
  if (model === 'Híbrido') return 'HYBRID';
  return 'ONSITE';
}

function getBaseUrl(): string {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

export function registerFeedRoutes(app: Express) {
  // RSS/XML feed para Indeed, Vagas.com.br, Infojobs, Catho
  app.get('/feed/vagas.xml', async (req, res) => {
    const { tenantId } = req.query;

    try {
      let query = `SELECT * FROM jobs WHERE deleted_at IS NULL AND is_public = 1 AND status = 'Aberta'`;
      const params: any[] = [];

      if (tenantId) {
        query += ' AND tenant_id = ?';
        params.push(tenantId);
      }

      query += ' ORDER BY created_at DESC LIMIT 500';

      const jobs = await db.prepare(query).all(...params) as any[];

      const baseUrl = getBaseUrl();

      const items = jobs.map(job => {
        const jobUrl = job.public_slug
          ? `${baseUrl}/vaga/${job.public_slug}`
          : `${baseUrl}/vaga/${job.id}`;

        const salary = buildSalaryText(job.salary_min, job.salary_max);
        const location = [job.city, job.state].filter(Boolean).join(', ');

        const descriptionParts = [
          job.description,
          job.responsibilities ? `\n\nResponsabilidades:\n${job.responsibilities}` : '',
          job.technical_requirements ? `\n\nRequisitos Técnicos:\n${job.technical_requirements}` : '',
          job.mandatory_requirements ? `\n\nRequisitos Obrigatórios:\n${job.mandatory_requirements}` : '',
          job.desirable_requirements ? `\n\nRequisitos Desejáveis:\n${job.desirable_requirements}` : '',
          job.benefits ? `\n\nBenefícios:\n${job.benefits}` : '',
          salary ? `\n\nSalário: ${salary}` : '',
          job.work_model ? `\n\nModelo de trabalho: ${job.work_model}` : '',
          job.contract_type ? `\nTipo de contrato: ${job.contract_type}` : '',
        ].filter(Boolean).join('');

        return `
    <item>
      <title>${escapeXml(job.title)}</title>
      <link>${escapeXml(jobUrl)}</link>
      <guid isPermaLink="true">${escapeXml(jobUrl)}</guid>
      <pubDate>${formatDate(job.created_at)}</pubDate>
      <description>${escapeXml(descriptionParts)}</description>
      <location>${escapeXml(location)}</location>
      <city>${escapeXml(job.city)}</city>
      <state>${escapeXml(job.state)}</state>
      <country>Brasil</country>
      <jobtype>${escapeXml(job.contract_type || 'CLT')}</jobtype>
      <category>${escapeXml(job.department || 'Geral')}</category>
      ${salary ? `<salary>${escapeXml(salary)}</salary>` : ''}
      <referencenumber>${job.id}</referencenumber>
      <company>${escapeXml(job.tenant_id)}</company>
    </item>`;
      }).join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vagas de Emprego - RH Vision</title>
    <link>${baseUrl}</link>
    <description>Vagas de emprego publicadas na plataforma RH Vision</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed/vagas.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (error) {
      console.error('[feed] error:', error);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // Feed JSON alternativo (alguns agregadores preferem)
  app.get('/feed/vagas.json', async (req, res) => {
    const { tenantId } = req.query;

    try {
      let query = `SELECT * FROM jobs WHERE deleted_at IS NULL AND is_public = 1 AND status = 'Aberta'`;
      const params: any[] = [];

      if (tenantId) {
        query += ' AND tenant_id = ?';
        params.push(tenantId);
      }

      query += ' ORDER BY created_at DESC LIMIT 500';

      const jobs = await db.prepare(query).all(...params) as any[];
      const baseUrl = getBaseUrl();

      const items = jobs.map(job => ({
        id: String(job.id),
        url: job.public_slug ? `${baseUrl}/vaga/${job.public_slug}` : `${baseUrl}/vaga/${job.id}`,
        title: job.title,
        company: job.tenant_id,
        city: job.city,
        state: job.state,
        country: 'Brasil',
        work_model: job.work_model,
        contract_type: job.contract_type,
        seniority_level: job.seniority_level,
        department: job.department,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        description: job.description,
        responsibilities: job.responsibilities,
        requirements: job.mandatory_requirements || job.technical_requirements,
        benefits: job.benefits,
        posted_at: job.created_at,
        updated_at: job.updated_at,
      }));

      res.json({ total: items.length, jobs: items });
    } catch (error) {
      res.status(500).json({ error: 'Feed unavailable' });
    }
  });

  // Schema.org JobPosting para Google for Jobs (retorna JSON-LD de uma vaga)
  app.get('/api/public/jobs/:slugOrId/schema', async (req, res) => {
    const { slugOrId } = req.params;
    try {
      const job = await db.prepare(
        `SELECT j.*, t.company_name, t.name as tenant_name
         FROM jobs j
         LEFT JOIN tenants t ON j.tenant_id = t.id
         WHERE (j.public_slug = ? OR j.id = ?)
           AND j.deleted_at IS NULL AND j.is_public = 1`
      ).get(slugOrId, slugOrId) as any;

      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

      const baseUrl = getBaseUrl();
      const jobUrl = job.public_slug ? `${baseUrl}/vaga/${job.public_slug}` : `${baseUrl}/vaga/${job.id}`;

      const schema: Record<string, any> = {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: job.title,
        description: [
          job.description,
          job.responsibilities ? `Responsabilidades: ${job.responsibilities}` : null,
          job.technical_requirements ? `Requisitos: ${job.technical_requirements}` : null,
          job.benefits ? `Benefícios: ${job.benefits}` : null,
        ].filter(Boolean).join('\n\n'),
        datePosted: isoDate(job.created_at),
        validThrough: new Date(new Date(job.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        employmentType: job.contract_type === 'CLT' ? 'FULL_TIME' : job.contract_type === 'PJ' ? 'CONTRACTOR' : job.contract_type === 'Estágio' ? 'INTERN' : 'OTHER',
        hiringOrganization: {
          '@type': 'Organization',
          name: job.company_name || job.tenant_name || 'RH Vision',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: job.city,
            addressRegion: job.state,
            addressCountry: 'BR',
          },
        },
        url: jobUrl,
      };

      if (job.work_model === 'Home Office') {
        schema.jobLocationType = 'TELECOMMUTE';
      }

      if (job.salary_min || job.salary_max) {
        schema.baseSalary = {
          '@type': 'MonetaryAmount',
          currency: 'BRL',
          value: {
            '@type': 'QuantitativeValue',
            minValue: job.salary_min || undefined,
            maxValue: job.salary_max || undefined,
            unitText: 'MONTH',
          },
        };
      }

      if (job.seniority_level) {
        schema.experienceRequirements = job.seniority_level;
      }

      if (job.education_level) {
        schema.educationRequirements = job.education_level;
      }

      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: 'Schema unavailable' });
    }
  });

  // Feed no formato oficial do Indeed (source/job com CDATA)
  app.get('/feed/indeed.xml', async (req, res) => {
    const { tenantId } = req.query;

    try {
      let query = `
        SELECT j.*, t.company_name, t.name as tenant_name
        FROM jobs j
        LEFT JOIN tenants t ON j.tenant_id = t.id
        WHERE j.deleted_at IS NULL AND j.is_public = 1 AND j.status = 'Aberta'
      `;
      const params: any[] = [];

      if (tenantId) {
        query += ' AND j.tenant_id = ?';
        params.push(tenantId);
      }

      query += ' ORDER BY j.created_at DESC LIMIT 1000';

      const jobs = await db.prepare(query).all(...params) as any[];
      const baseUrl = getBaseUrl();
      const publisherName = process.env.PUBLISHER_NAME || 'Triagem Smart';

      const jobItems = jobs.map(job => {
        const jobUrl = job.public_slug
          ? `${baseUrl}/vaga/${job.public_slug}`
          : `${baseUrl}/vaga/${job.id}`;

        const company = job.company_name || job.tenant_name || publisherName;
        const salary = buildSalaryText(job.salary_min, job.salary_max);

        const descParts = [
          job.description,
          job.responsibilities      ? `\nResponsabilidades:\n${job.responsibilities}` : '',
          job.technical_requirements ? `\nRequisitos Técnicos:\n${job.technical_requirements}` : '',
          job.mandatory_requirements ? `\nRequisitos Obrigatórios:\n${job.mandatory_requirements}` : '',
          job.desirable_requirements ? `\nDiferenciais:\n${job.desirable_requirements}` : '',
          job.benefits               ? `\nBenefícios:\n${job.benefits}` : '',
          job.work_model             ? `\nModelo: ${job.work_model}` : '',
          job.contract_type          ? `\nContrato: ${job.contract_type}` : '',
          salary                     ? `\nRemuneração: ${salary}` : '',
        ].filter(Boolean).join('\n');

        // Strip HTML tags for plain text description
        const plainDesc = descParts.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();

        return `
  <job>
    <title><![CDATA[${job.title || ''}]]></title>
    <date><![CDATA[${formatDate(job.created_at)}]]></date>
    <referencenumber><![CDATA[${job.id}]]></referencenumber>
    <url><![CDATA[${jobUrl}]]></url>
    <company><![CDATA[${company}]]></company>
    <city><![CDATA[${job.city || ''}]]></city>
    <state><![CDATA[${job.state || ''}]]></state>
    <country><![CDATA[BR]]></country>
    <postalcode><![CDATA[]]></postalcode>
    <description><![CDATA[${plainDesc}]]></description>
    ${salary ? `<salary><![CDATA[${salary} por mês]]></salary>` : ''}
    ${job.department ? `<category><![CDATA[${job.department}]]></category>` : ''}
    ${job.contract_type ? `<jobtype><![CDATA[${job.contract_type}]]></jobtype>` : ''}
    ${job.work_model === 'Home Office' ? '<remotetype><![CDATA[Remote]]></remotetype>' : ''}
    <email><![CDATA[${process.env.INDEED_APPLY_EMAIL || ''}]]></email>
  </job>`;
      }).join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher><![CDATA[${publisherName}]]></publisher>
  <publisherurl><![CDATA[${baseUrl}]]></publisherurl>
  <lastBuildDate><![CDATA[${new Date().toUTCString()}]]></lastBuildDate>
  ${jobItems}
</source>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.send(xml);
    } catch (error) {
      console.error('[feed/indeed] error:', error);
      res.status(500).send('<?xml version="1.0"?><error>Feed unavailable</error>');
    }
  });

  // Buscar vaga pública por slug ou id
  // Nota: qualquer vaga não deletada é acessível pelo link direto.
  // O campo is_public controla apenas se aparece no feed/portal — não o acesso pelo link.
  app.get('/api/public/jobs/:slugOrId', async (req, res) => {
    const { slugOrId } = req.params;
    try {
      const job = await db.prepare(
        `SELECT j.*, t.company_name, t.name as tenant_name, t.email as tenant_email
         FROM jobs j
         LEFT JOIN tenants t ON j.tenant_id = t.id
         WHERE (j.public_slug = ? OR j.id = ?)
           AND j.deleted_at IS NULL`
      ).get(slugOrId, slugOrId) as any;

      if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });
}

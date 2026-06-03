/**
 * LinkedIn Job Posting Bot — Playwright
 * Requires: LINKEDIN_EMAIL, LINKEDIN_PASSWORD in .env
 * Optional: LINKEDIN_BOT_HEADLESS=false (show browser window for debug)
 *
 * Flow:
 *  1. Launch Chrome (system install via channel:'chrome')
 *  2. Try to reuse saved session (.linkedin-session/cookies.json)
 *  3. If not logged in: fill login form and wait
 *  4. Navigate to job posting form and fill all fields
 *  5. Submit and return the LinkedIn job URL
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '../../../.linkedin-session');
const SESSION_FILE = path.join(SESSION_DIR, 'cookies.json');

export interface LinkedInJobPayload {
  title: string;
  company?: string;
  city?: string;
  state?: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  workModel?: string;
  contractType?: string;
  seniorityLevel?: string;
  publicUrl?: string;
}

export type PublishStatus =
  | 'pending'
  | 'logging_in'
  | 'navigating'
  | 'filling_form'
  | 'submitting'
  | 'done'
  | 'error';

export interface PublishResult {
  success: boolean;
  linkedinUrl?: string;
  error?: string;
  screenshot?: string;
}

type ProgressCallback = (status: PublishStatus, detail?: string) => void;

// ─── helpers ─────────────────────────────────────────────────────────────────

function mapWorkplaceType(m?: string) {
  if (m === 'Home Office') return 'Remote';
  if (m === 'Híbrido') return 'Hybrid';
  return 'On-site';
}

function mapEmploymentType(c?: string) {
  if (c === 'PJ') return 'Contract';
  if (c === 'Estágio') return 'Internship';
  if (c === 'Temporário') return 'Temporary';
  return 'Full-time';
}

function mapExperienceLevel(s?: string) {
  if (!s) return 'Mid-Senior level';
  const l = s.toLowerCase();
  if (l.includes('estági') || l.includes('trainee')) return 'Internship';
  if (l.includes('júnior') || l.includes('junior') || l.includes('jr')) return 'Entry level';
  if (l.includes('pleno')) return 'Associate';
  if (l.includes('sênior') || l.includes('senior') || l.includes('sr')) return 'Mid-Senior level';
  if (l.includes('lead') || l.includes('gerente') || l.includes('diretor')) return 'Director';
  return 'Mid-Senior level';
}

function buildDescription(job: LinkedInJobPayload): string {
  return [
    job.description,
    job.responsibilities && `\nResponsabilidades:\n${job.responsibilities}`,
    job.requirements && `\nRequisitos:\n${job.requirements}`,
    job.benefits && `\nBenefícios:\n${job.benefits}`,
    job.publicUrl && `\nCandidatar-se: ${job.publicUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

async function screenshot(page: Page): Promise<string | undefined> {
  try {
    return (await page.screenshot({ type: 'png' })).toString('base64');
  } catch {
    return undefined;
  }
}

// ─── session ─────────────────────────────────────────────────────────────────

async function saveSession(ctx: BrowserContext) {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(await ctx.cookies(), null, 2));
}

async function loadSession(ctx: BrowserContext): Promise<boolean> {
  if (!fs.existsSync(SESSION_FILE)) return false;
  try {
    await ctx.addCookies(JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')));
    return true;
  } catch {
    return false;
  }
}

// ─── login ───────────────────────────────────────────────────────────────────

async function ensureLoggedIn(page: Page, ctx: BrowserContext, onProgress: ProgressCallback): Promise<void> {
  const email = process.env.LINKEDIN_EMAIL?.trim();
  const password = process.env.LINKEDIN_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error('Configure LINKEDIN_EMAIL e LINKEDIN_PASSWORD no arquivo .env');
  }

  // Try reusing existing session
  const hadSession = await loadSession(ctx);
  if (hadSession) {
    onProgress('logging_in', 'Verificando sessão salva...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    if (page.url().includes('/feed') || page.url().includes('/mynetwork')) {
      console.log('[linkedin-bot] Session reused OK');
      return;
    }
    console.log('[linkedin-bot] Saved session expired, logging in again...');
  }

  onProgress('logging_in', 'Acessando página de login...');

  // Navigate to login with a realistic wait
  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 40000,
  });

  // Wait for the page to fully render (avoid bot detection)
  await page.waitForTimeout(2000 + Math.random() * 1000);

  // Check if we were already redirected to feed
  if (page.url().includes('/feed') || page.url().includes('/mynetwork')) {
    console.log('[linkedin-bot] Already logged in after navigation');
    await saveSession(ctx);
    return;
  }

  // Wait for username field with longer timeout
  const usernameLocator = page.locator('#username, input[name="session_key"], input[autocomplete="username"]').first();
  try {
    await usernameLocator.waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    const html = await page.content().catch(() => '');
    const blocked = html.includes('authwall') || html.includes('checkpoint') || page.url().includes('authwall');
    if (blocked) {
      throw new Error('LinkedIn bloqueou o acesso. Tente com LINKEDIN_BOT_HEADLESS=false para ver o browser e fazer login manualmente.');
    }
    throw new Error(`Campo de login não encontrou em 30s. URL atual: ${page.url()}`);
  }

  onProgress('logging_in', 'Preenchendo credenciais...');

  // Type slowly to avoid bot detection
  await usernameLocator.click();
  await page.waitForTimeout(300);
  for (const char of email) {
    await page.keyboard.type(char, { delay: 30 + Math.random() * 40 });
  }

  await page.waitForTimeout(500);

  const passwordLocator = page.locator('#password, input[name="session_password"], input[type="password"]').first();
  await passwordLocator.click();
  await page.waitForTimeout(300);
  for (const char of password) {
    await page.keyboard.type(char, { delay: 30 + Math.random() * 40 });
  }

  await page.waitForTimeout(800);
  await page.click('button[type="submit"], [data-litms-control-urn*="login-submit"]');

  onProgress('logging_in', 'Aguardando resposta do LinkedIn...');

  // Wait up to 45s — LinkedIn is slow
  await page.waitForTimeout(3000);
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 45000 }).catch(() => {});

  const finalUrl = page.url();

  if (finalUrl.includes('/checkpoint') || finalUrl.includes('/challenge') || finalUrl.includes('/two-step')) {
    throw new Error(
      'LinkedIn pediu verificação em 2 fatores (2FA).\n\n' +
      'Para resolver: adicione LINKEDIN_BOT_HEADLESS=false no .env, reinicie o servidor, ' +
      'clique em "Publicar automaticamente" e complete o 2FA na janela que abrir. ' +
      'Depois o bot salvará os cookies e não pedirá mais.'
    );
  }

  if (!finalUrl.includes('/feed') && !finalUrl.includes('/mynetwork') && !finalUrl.includes('/jobs')) {
    throw new Error(`Login não concluído. URL após submit: ${finalUrl}. Verifique email e senha.`);
  }

  await saveSession(ctx);
  console.log('[linkedin-bot] Login successful, session saved');
}

// ─── fill form ───────────────────────────────────────────────────────────────

async function dbg(page: Page, label: string) {
  const s = await screenshot(page);
  if (s) {
    const dir = path.join(path.dirname(SESSION_DIR), '.linkedin-debug');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}-${label}.png`), Buffer.from(s, 'base64'));
  }
  console.log(`[linkedin-bot] [dbg] ${label} | url=${page.url()}`);
}

async function fillJobForm(page: Page, job: LinkedInJobPayload, onProgress: ProgressCallback): Promise<string> {
  onProgress('navigating', 'Acessando página de vagas do LinkedIn...');

  // Navigate to /jobs/ and click "Anunciar vaga de graça"
  await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await dbg(page, '1-jobs-page');

  const postJobLinkSel = [
    'a:has-text("Anunciar vaga de graça")',
    'a:has-text("Post a free job")',
    'a:has-text("Post a job")',
    'a[href*="job-posting"]',
  ].join(', ');
  const postJobLink = page.locator(postJobLinkSel).first();
  if (await postJobLink.isVisible({ timeout: 6000 }).catch(() => false)) {
    await postJobLink.click();
    await page.waitForTimeout(3000);
  } else {
    await page.goto('https://www.linkedin.com/job-posting/v2/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
  }
  await dbg(page, '2-landing');

  onProgress('filling_form', 'Preenchendo cargo...');

  // ── Cargo ──
  const titleSel = [
    'input[placeholder*="cargo" i]',
    'input[placeholder*="Cargo" i]',
    'input[aria-label*="Cargo" i]',
    'input[placeholder*="Job title" i]',
    'input[aria-label*="Job title" i]',
    'input[id*="job-title"]',
  ].join(', ');
  const titleInput = page.locator(titleSel).first();
  await titleInput.waitFor({ state: 'visible', timeout: 20000 });
  await titleInput.click({ clickCount: 3 });
  await titleInput.fill(job.title);
  await page.waitForTimeout(600);

  // ── Empresa ──
  if (job.company) {
    const companySel = [
      'input[aria-label*="Empresa" i]',
      'input[placeholder*="Empresa" i]',
      'input[aria-label*="Company" i]',
      'input[placeholder*="Company" i]',
    ].join(', ');
    const companyInput = page.locator(companySel).first();
    if (await companyInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await companyInput.click();
      await companyInput.fill(job.company);
      await page.waitForTimeout(1000);
      const firstOpt = page.locator('[role="option"]').first();
      if (await firstOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOpt.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // ── "Redigir por conta própria" (skip LinkedIn AI) ──
  const manualBtn = page.locator([
    'button:has-text("Redigir por conta própria")',
    'a:has-text("Redigir por conta própria")',
    'button:has-text("Write it yourself")',
  ].join(', ')).first();
  if (await manualBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await manualBtn.click();
    await page.waitForTimeout(2500);
  }
  await dbg(page, '3-after-manual-write');

  // ── LinkedIn job posting is a SINGLE-PAGE form — no "Next" between fields ──
  // All fields (location, type, description) are on the same /form/description/ page.
  // We scroll down to each field and fill it in order.

  onProgress('filling_form', 'Preenchendo localização e tipo de trabalho...');

  // ── Workplace type (select dropdown) ──
  const workplacePt: Record<string, string> = { 'On-site': 'Presencial', 'Remote': 'Remoto', 'Hybrid': 'Híbrido' };
  const wpValue = mapWorkplaceType(job.workModel);
  // It's a <select> on this form
  const wpSelect = page.locator('select').filter({ hasText: /Presencial|On-site|Remote|Remoto|Hybrid|Híbrido/ }).first();
  if (await wpSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await wpSelect.selectOption({ label: workplacePt[wpValue] ?? wpValue }).catch(async () => {
      await wpSelect.selectOption({ label: wpValue }).catch(() => {});
    });
  } else {
    // Try by aria-label
    const wpEl = page.locator([
      'select[aria-label*="Tipo de local" i]',
      'select[aria-label*="Workplace" i]',
    ].join(', ')).first();
    if (await wpEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wpEl.selectOption({ label: workplacePt[wpValue] ?? wpValue }).catch(() => {});
    }
  }
  await page.waitForTimeout(500);

  // ── Location (Localidade da vaga) ──
  if (job.city || job.state) {
    const locationQuery = [job.city, job.state].filter(Boolean).join(', ');
    const locSel = [
      'input[aria-label*="Localidade" i]',
      'input[aria-label*="Local" i]',
      'input[aria-label*="Location" i]',
      'input[placeholder*="Cidade" i]',
      'input[placeholder*="City" i]',
    ].join(', ');
    const locInput = page.locator(locSel).first();
    if (await locInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await locInput.scrollIntoViewIfNeeded();
      await locInput.click();
      await locInput.fill('');
      await locInput.type(locationQuery, { delay: 40 });
      await page.waitForTimeout(2000);
      const firstOpt = page.locator('[role="option"]').first();
      if (await firstOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOpt.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // ── Employment type (Tipo de vaga) ──
  const empType = mapEmploymentType(job.contractType);
  const empTypePt: Record<string, string> = {
    'Full-time': 'Tempo integral',
    'Part-time': 'Meio período',
    'Contract': 'Autônomo',
    'Temporary': 'Temporário',
    'Internship': 'Estágio',
  };
  const empSelect = page.locator([
    'select[aria-label*="Tipo de vaga" i]',
    'select[aria-label*="Employment type" i]',
  ].join(', ')).first();
  if (await empSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await empSelect.scrollIntoViewIfNeeded();
    await empSelect.selectOption({ label: empTypePt[empType] ?? empType }).catch(async () => {
      await empSelect.selectOption({ label: empType }).catch(() => {});
    });
    await page.waitForTimeout(300);
  }

  await dbg(page, '4-fields-filled');

  onProgress('filling_form', 'Preenchendo descrição...');

  // ── Description (contenteditable rich text editor) ──
  const descText = buildDescription(job);
  const descEl = page.locator('div[contenteditable="true"]').first();
  if (await descEl.isVisible({ timeout: 15000 }).catch(() => false)) {
    await descEl.scrollIntoViewIfNeeded();
    await descEl.click();
    await page.waitForTimeout(400);
    // Clear existing content
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    // Type in chunks
    const chunkSize = 400;
    for (let i = 0; i < descText.length; i += chunkSize) {
      await page.keyboard.type(descText.slice(i, i + chunkSize), { delay: 3 });
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(600);
    await dbg(page, '5-description-filled');
  } else {
    await dbg(page, '5-description-NOT-FOUND');
    console.warn('[linkedin-bot] Description field not found!');
  }

  onProgress('submitting', 'Publicando vaga no LinkedIn...');
  await dbg(page, '6-before-publish');

  // ── Scroll to bottom and find the publish button ──
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await dbg(page, '7-scrolled-bottom');

  // Log ALL buttons on page for debug
  const allBtnsInfo = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim().substring(0, 80),
      type: b.type,
      disabled: b.disabled,
      ariaLabel: b.getAttribute('aria-label'),
      classes: b.className.substring(0, 80),
    }))
  );
  console.log('[linkedin-bot] All buttons on page:', JSON.stringify(allBtnsInfo, null, 2));

  let published = false;

  // Strategy 1: Submit button (most reliable)
  const submitBtn = page.locator('button[type="submit"]').last();
  if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const txt = await submitBtn.textContent().catch(() => '');
    console.log(`[linkedin-bot] Found submit button: "${txt?.trim()}"`);
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await submitBtn.click();
    await page.waitForTimeout(5000);
    await dbg(page, '8-after-submit-button');
    published = true;
  }

  // Strategy 2: Try all possible publish button texts (PT + EN)
  if (!published) {
    const publishLabels = [
      'Publicar vaga',
      'Publicar',
      'Post job',
      'Post',
      'Publish',
      'Enviar',
      'Submit',
    ];
    for (const label of publishLabels) {
      const btn = page.locator(`button:has-text("${label}")`).last();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        const disabled = await btn.isDisabled().catch(() => false);
        if (disabled) {
          console.log(`[linkedin-bot] Button "${label}" found but disabled — skipping`);
          continue;
        }
        await btn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await btn.click();
        await page.waitForTimeout(5000);
        await dbg(page, `8-after-publish-${label.replace(/ /g, '-')}`);
        published = true;
        break;
      }
    }
  }

  // Strategy 3: artdeco-button--primary (LinkedIn's primary action button class)
  if (!published) {
    const primaryBtn = page.locator('button.artdeco-button--primary, button[data-control-name*="submit"], button[data-control-name*="post"]').last();
    if (await primaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const txt = await primaryBtn.textContent().catch(() => '');
      console.log(`[linkedin-bot] Found primary button: "${txt?.trim()}"`);
      await primaryBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await primaryBtn.click();
      await page.waitForTimeout(5000);
      await dbg(page, '8-after-primary-button');
      published = true;
    }
  }

  // Strategy 4: Last resort — last visible non-disabled button
  if (!published) {
    const allBtns = await page.locator('button:not([disabled])').all();
    if (allBtns.length > 0) {
      const lastBtn = allBtns[allBtns.length - 1];
      const txt = await lastBtn.textContent().catch(() => '');
      console.log(`[linkedin-bot] Last resort: clicking last button "${txt?.trim()}"`);
      await lastBtn.scrollIntoViewIfNeeded();
      await lastBtn.click();
      await page.waitForTimeout(5000);
      published = true;
    }
    await dbg(page, '8-last-resort-button');
  }

  await dbg(page, '9-final');
  return extractJobUrl(page);
}

async function clickNext(page: Page) {
  const nextSel = [
    'button:has-text("Next")',
    'button:has-text("Continue")',
    'button:has-text("Próximo")',
  ].join(', ');
  const btn = page.locator(nextSel).first();
  if (await btn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1500);
  }
}

async function selectDropdownOption(page: Page, label: string, value: string) {
  const sel = `select[aria-label*="${label}" i], [data-test*="${label.toLowerCase().replace(/ /g, '-')}"]`;
  const el = page.locator(sel).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    const tag = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => 'div');
    if (tag === 'select') {
      await el.selectOption({ label: value }).catch(() => {});
    } else {
      await el.click().catch(() => {});
      await page.locator(`[role="option"]:has-text("${value}")`).first().click().catch(() => {});
    }
  }
}

function extractJobUrl(page: Page): string {
  const url = page.url();
  const m = url.match(/linkedin\.com\/(?:jobs\/view|talent\/job-posting[^/]*)\/.*?(\d{8,})/);
  if (m) return `https://www.linkedin.com/jobs/view/${m[1]}`;
  return url.includes('linkedin.com') ? url : 'https://www.linkedin.com/jobs/';
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function publishJobToLinkedIn(
  job: LinkedInJobPayload,
  onProgress: ProgressCallback = () => {},
): Promise<PublishResult> {
  let browser: Browser | null = null;

  try {
    const headless = process.env.LINKEDIN_BOT_HEADLESS !== 'false';
    console.log(`[linkedin-bot] launching Chrome headless=${headless}`);

    // Prefer system Chrome (more trusted by LinkedIn), fall back to Playwright Chromium
    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        slowMo: 50,
      });
    } catch (launchErr) {
      console.warn('[linkedin-bot] Chrome not found, falling back to Playwright Chromium:', launchErr);
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        slowMo: 50,
      });
    }

    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      extraHTTPHeaders: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
      },
    });

    // Mask automation flags
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await ensureLoggedIn(page, ctx, onProgress);
    const linkedinUrl = await fillJobForm(page, job, onProgress);
    await saveSession(ctx);
    await browser.close();

    return { success: true, linkedinUrl };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[linkedin-bot] error:', msg);

    let screenshotB64: string | undefined;
    try {
      if (browser) {
        const pages = browser.contexts()[0]?.pages();
        if (pages?.length) screenshotB64 = await screenshot(pages[0]);
      }
    } catch {}

    await browser?.close().catch(() => {});
    return { success: false, error: msg, screenshot: screenshotB64 };
  }
}

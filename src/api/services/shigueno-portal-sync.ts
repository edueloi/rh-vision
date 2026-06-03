// Serviço de sync: empurra vagas do RH Vision → Portal Shigueno automaticamente
// O tenant precisa ter sync_shigueno = true no banco (configurável pelo Super Admin)

import db from '../../lib/db';

const SHIGUENO_URL = process.env.SHIGUENO_PORTAL_URL || 'http://localhost:3008';
const WEBHOOK_SECRET = process.env.SHIGUENO_WEBHOOK_SECRET || 'shigueno-webhook-2026';

function isSyncEnabled(tenant_id: string): boolean {
  try {
    const row = db.prepare('SELECT sync_shigueno FROM tenants WHERE id = ?').get(tenant_id) as any;
    return row?.sync_shigueno === 1 || row?.sync_shigueno === true;
  } catch {
    return false;
  }
}

export async function pushJobToShiguenoPortal(
  action: 'upsert' | 'delete',
  job: {
    id: number;
    tenant_id: string;
    title: string;
    department?: string | null;
    description?: string | null;
    mandatory_requirements?: string | null;
    city?: string;
    state?: string;
    status?: string;
  }
): Promise<void> {
  // Verifica dinamicamente se o tenant tem sync ativado
  if (!isSyncEnabled(job.tenant_id)) return;

  try {
    const response = await fetch(`${SHIGUENO_URL}/api/rh-vision/push-vacancy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        action,
        job: {
          rh_vision_id: job.id,
          title: job.title,
          department: job.department,
          description: job.description,
          mandatory_requirements: job.mandatory_requirements,
          city: job.city,
          state: job.state,
          status: job.status,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Shigueno Portal Sync] HTTP ${response.status}: ${text}`);
    } else {
      console.log(`[Shigueno Portal Sync] ✔ ${action} job ${job.id} (${job.title})`);
    }
  } catch (err) {
    console.error('[Shigueno Portal Sync] Falha ao conectar no portal:', err);
  }
}

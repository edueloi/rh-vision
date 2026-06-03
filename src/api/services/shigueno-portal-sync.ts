// Serviço de sync: empurra vagas do RH Vision → Portal Shigueno automaticamente

const SHIGUENO_URL = process.env.SHIGUENO_PORTAL_URL || 'http://localhost:3008';
const WEBHOOK_SECRET = process.env.SHIGUENO_WEBHOOK_SECRET || 'shigueno-webhook-2026';

// Tenant(s) que devem ser sincronizados com o portal Shigueno.
// Defina SHIGUENO_TENANT_IDS no .env com IDs separados por vírgula.
// Ex: SHIGUENO_TENANT_IDS=shigueno,shigueno-ycjk
// Se não definido, qualquer tenant é sincronizado (modo permissivo).
const RAW_TENANT_IDS = process.env.SHIGUENO_TENANT_IDS || '';
const ALLOWED_TENANT_IDS: string[] = RAW_TENANT_IDS
  ? RAW_TENANT_IDS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

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
  // Se SHIGUENO_TENANT_IDS estiver definido, só sincroniza tenants da lista.
  // Se não estiver definido, sincroniza todos (útil em ambientes de teste).
  if (ALLOWED_TENANT_IDS.length > 0 && !ALLOWED_TENANT_IDS.includes(job.tenant_id)) return;

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
    }
  } catch (err) {
    console.error('[Shigueno Portal Sync] Falha ao conectar no portal:', err);
  }
}

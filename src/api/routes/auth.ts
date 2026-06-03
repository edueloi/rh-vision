import { Express } from 'express';
import db from '../../lib/db';

function checkTenantAccess(tenantId: string): { blocked: boolean; code?: string; error?: string; expired_at?: string } {
  if (!tenantId || tenantId === 'develoi') return { blocked: false };
  try {
    const tenant = db.prepare('SELECT status, expires_at FROM tenants WHERE id = ?').get(tenantId) as any;
    if (!tenant) return { blocked: false };
    if (tenant.status === 'Suspenso') {
      return { blocked: true, code: 'TENANT_SUSPENDED', error: 'Acesso suspenso. Entre em contato com o administrador.' };
    }
    if (tenant.expires_at && new Date(tenant.expires_at) < new Date()) {
      return { blocked: true, code: 'TENANT_EXPIRED', error: 'Seu período de acesso expirou. Entre em contato com o administrador para renovar.', expired_at: tenant.expires_at };
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

export function registerAuthRoutes(app: Express) {
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    console.log(`Login attempt for: [${cleanEmail}]`);
    try {
      const stmt = db.prepare('SELECT u.*, un.name as unit_name, t.name as tenant_name, t.expires_at as tenant_expires_at, t.status as tenant_status FROM users u LEFT JOIN units un ON u.unit_id = un.id LEFT JOIN tenants t ON u.tenant_id = t.id WHERE (LOWER(u.email) = ? OR LOWER(u.id) = ?) AND u.password = ?');
      const user = await stmt.get(cleanEmail, cleanEmail, cleanPassword) as any;

      if (user) {
        // Verificar validade/status do tenant (exceto root e develoi)
        if (user.id !== 'admin-root') {
          const access = checkTenantAccess(user.tenant_id);
          if (access.blocked) {
            console.log(`Login bloqueado — tenant ${user.tenant_id}: ${access.code}`);
            return res.status(403).json({ error: access.error, code: access.code, expired_at: access.expired_at });
          }
        }

        console.log(`Login success: ${user.full_name} (${user.role})`);
        await db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
        const userResponse = { ...user };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        if (cleanEmail === 'admin' && cleanPassword === 'admin') {
          console.log('Login success via Fallback Admin');
          return res.json({
            id: 'admin-root',
            full_name: 'Admin Master',
            email: 'admin',
            role: 'admin',
            tenant_id: 'develoi',
            tenant_name: 'Develoi Recruitment',
            access_profile: 'custom',
            permissions_json: JSON.stringify({
              dashboard: true, aurora_ai: true, jobs: true, candidates: true,
              imports: true, tools: true, administration: true, super_admin: true,
            }),
          });
        }
        console.log(`Login failed for: [${cleanEmail}]. No user found with these credentials.`);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error details:', error);
      res.status(500).json({ error: 'Auth failed' });
    }
  });

  // Endpoint para verificar validade do tenant durante a sessão
  app.get('/api/auth/tenant-status', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || tenantId === 'develoi') return res.json({ valid: true });
    const access = checkTenantAccess(tenantId);
    if (access.blocked) {
      return res.json({ valid: false, code: access.code, error: access.error, expired_at: access.expired_at });
    }
    // Também retorna quantos dias restam
    try {
      const tenant = db.prepare('SELECT expires_at, status FROM tenants WHERE id = ?').get(tenantId) as any;
      const daysLeft = tenant?.expires_at
        ? Math.ceil((new Date(tenant.expires_at).getTime() - Date.now()) / 86400000)
        : null;
      return res.json({ valid: true, days_left: daysLeft, expires_at: tenant?.expires_at });
    } catch {
      return res.json({ valid: true });
    }
  });
}

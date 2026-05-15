import { Request, Response } from 'express';
import db from '../../lib/db';

export async function getCallerUser(req: Request): Promise<{ id: string; tenant_id: string; role: string } | null> {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) return null;
  if (userId === 'admin-root') return { id: 'admin-root', tenant_id: 'develoi', role: 'admin' };
  const user = await db.prepare('SELECT id, tenant_id, role FROM users WHERE id = ?').get(userId) as any;
  return user || null;
}

export function isRootCaller(req: Request): boolean {
  return req.headers['x-user-id'] === 'admin-root';
}

export async function assertTenantAccess(req: Request, res: Response, tenantId: string): Promise<boolean> {
  const caller = await getCallerUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  if (caller.id === 'admin-root') return true;
  if (caller.tenant_id !== tenantId) {
    res.status(403).json({ error: 'Access denied to this tenant' });
    return false;
  }
  return true;
}

export function getTenantMasterUnitId(tenantId: string) {
  return `master-${tenantId}`;
}

export function getTenantOwnerUserId(tenantId: string) {
  return `admin-${tenantId}`;
}

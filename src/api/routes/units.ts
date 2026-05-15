import { Express } from 'express';
import db from '../../lib/db';
import { assertTenantAccess, getTenantMasterUnitId } from '../middleware/auth';

export function registerUnitRoutes(app: Express) {
  app.get('/api/units', async (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'develoi';
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const units = await db.prepare('SELECT * FROM units WHERE tenant_id = ? ORDER BY is_master DESC, name ASC').all(tenantId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  });

  app.post('/api/units', async (req, res) => {
    const unit = req.body;
    const tenantId = unit.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const id = unit.id || Math.random().toString(36).substr(2, 9);
      await db.prepare(`
        INSERT INTO units (id, tenant_id, parent_id, name, company_name, responsible_name, phone, email, city, state, country, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        tenantId,
        unit.parent_id || null,
        unit.name,
        unit.company_name || null,
        unit.responsible_name || null,
        unit.phone || null,
        unit.email || null,
        unit.city || null,
        unit.state || null,
        unit.country || 'Brasil',
        0
      );
      res.json({ id, ...unit });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create unit' });
    }
  });

  app.put('/api/units/:id', async (req, res) => {
    const { id } = req.params;
    const unit = req.body;
    try {
      const existing = await db.prepare('SELECT tenant_id FROM units WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'Unit not found' });
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare(`
        UPDATE units SET
          name = ?, parent_id = ?, company_name = ?, responsible_name = ?,
          phone = ?, email = ?, city = ?, state = ?, country = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        unit.name, unit.parent_id || null, unit.company_name || null,
        unit.responsible_name || null, unit.phone || null, unit.email || null,
        unit.city || null, unit.state || null, unit.country || 'Brasil', id
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update unit' });
    }
  });

  app.delete('/api/units/:id', async (req, res) => {
    try {
      const existing = await db.prepare('SELECT id, tenant_id, is_master FROM units WHERE id = ?').get(req.params.id) as any;
      if (!existing) return res.status(404).json({ error: 'Unit not found' });
      if (existing.is_master || existing.id === getTenantMasterUnitId(existing.tenant_id)) {
        return res.status(403).json({ error: 'Cannot delete the initial master unit' });
      }
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  });
}

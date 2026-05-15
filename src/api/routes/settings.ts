import { Express } from 'express';
import { prisma } from '../../lib/db';

export function registerSettingsRoutes(app: Express) {
  app.get('/api/settings', async (req, res) => {
    const { tenantId } = req.query as { tenantId: string };
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO tenant_settings (tenant_id, auto_delete_enabled, auto_delete_interval, auto_delete_target)
         VALUES (?, 0, '6_months', 'candidates')
         ON DUPLICATE KEY UPDATE tenant_id = tenant_id`,
        tenantId
      );
      const rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
        tenantId
      );
      const row = rows[0] ?? null;
      if (!row) return res.status(404).json({ error: 'Settings not found.' });
      res.json({
        id: Number(row.id),
        tenant_id: row.tenant_id,
        auto_delete_enabled: Boolean(Number(row.auto_delete_enabled)),
        auto_delete_interval: row.auto_delete_interval ?? '6_months',
        auto_delete_target: row.auto_delete_target ?? 'candidates',
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    } catch (err) {
      console.error('[settings GET]', err);
      res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
  });

  app.put('/api/settings', async (req, res) => {
    const { tenantId } = req.query as { tenantId: string };
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const { auto_delete_enabled, auto_delete_interval, auto_delete_target } = req.body;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO tenant_settings (tenant_id, auto_delete_enabled, auto_delete_interval, auto_delete_target)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           auto_delete_enabled = VALUES(auto_delete_enabled),
           auto_delete_interval = VALUES(auto_delete_interval),
           auto_delete_target = VALUES(auto_delete_target)`,
        tenantId,
        auto_delete_enabled ? 1 : 0,
        auto_delete_interval ?? '6_months',
        auto_delete_target ?? 'candidates'
      );
      const rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
        tenantId
      );
      const updated = rows[0] ?? null;
      res.json({
        id: Number(updated?.id),
        tenant_id: updated?.tenant_id,
        auto_delete_enabled: Boolean(Number(updated?.auto_delete_enabled)),
        auto_delete_interval: updated?.auto_delete_interval ?? '6_months',
        auto_delete_target: updated?.auto_delete_target ?? 'candidates',
        created_at: updated?.created_at,
        updated_at: updated?.updated_at,
      });
    } catch (err) {
      console.error('[settings PUT]', err);
      res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
  });

  app.get('/api/user-preferences', async (req, res) => {
    const { userId, key } = req.query as { userId?: string; key?: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
      if (key) {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT `key`, value FROM user_preferences WHERE user_id = ? AND `key` = ? LIMIT 1',
          userId, key
        );
        if (!rows[0]) return res.json({ key, value: null });
        let parsed: any = rows[0].value;
        try { parsed = JSON.parse(rows[0].value); } catch { /* keep string */ }
        return res.json({ key, value: parsed });
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT `key`, value FROM user_preferences WHERE user_id = ?',
        userId
      );
      const result: Record<string, any> = {};
      for (const r of rows) {
        try { result[r.key] = JSON.parse(r.value); } catch { result[r.key] = r.value; }
      }
      return res.json(result);
    } catch (err) {
      console.error('[user-preferences GET]', err);
      res.status(500).json({ error: 'Erro ao carregar preferências.' });
    }
  });

  app.put('/api/user-preferences', async (req, res) => {
    const { userId, tenantId, key, value, prefs } = req.body;
    if (!userId || !tenantId) return res.status(400).json({ error: 'userId and tenantId required' });
    try {
      const entries: Array<{ key: string; value: string }> = prefs
        ? Object.entries(prefs).map(([k, v]) => ({ key: k, value: JSON.stringify(v) }))
        : [{ key, value: JSON.stringify(value) }];

      for (const e of entries) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO user_preferences (user_id, tenant_id, \`key\`, value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
          userId, tenantId, e.key, e.value
        );
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[user-preferences PUT]', err);
      res.status(500).json({ error: 'Erro ao salvar preferências.' });
    }
  });
}

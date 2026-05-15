import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../../lib/db';
import {
  getDefaultAccessProfile,
  normalizeAccessPermissions,
  stringifyAccessPermissions,
} from '../../lib/access';
import { getCallerUser, assertTenantAccess, getTenantOwnerUserId } from '../middleware/auth';
import { photoUpload } from '../helpers/files';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export function registerUserRoutes(app: Express) {
  app.use('/uploads', express.static(uploadsDir));

  app.get('/api/users', async (req, res) => {
    const { unitId } = req.query;
    const tenantId = (req.query.tenantId as string) || 'develoi';
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      let query = "SELECT u.*, un.name as unit_name FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.tenant_id = ? AND u.id <> 'admin-root'";
      const params: any[] = [tenantId];
      if (unitId && unitId !== 'master') {
        query += ' AND u.unit_id = ?';
        params.push(unitId);
      }
      const users = await db.prepare(query).all(...params);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const user = req.body;
    const tenantId = user.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
    if (!await assertTenantAccess(req, res, tenantId)) return;
    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').get(tenantId) as any;
      if (tenant.max_users && Number(userCount?.count || 0) >= Number(tenant.max_users)) {
        return res.status(400).json({ error: 'Limite de usuários do cliente atingido' });
      }

      const id = 'user-' + Math.random().toString(36).substr(2, 9);
      const accessProfile = user.access_profile || getDefaultAccessProfile(user.role);
      const safePermissions = normalizeAccessPermissions(user.permissions_json, accessProfile);
      safePermissions.super_admin = false;

      await db.prepare(`
        INSERT INTO users (id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        tenantId,
        user.unit_id || null,
        user.full_name,
        user.email,
        user.password,
        user.role || 'user',
        user.status || 'Ativo',
        accessProfile,
        stringifyAccessPermissions(safePermissions, accessProfile)
      );
      res.json({ id, ...user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const user = req.body;
    try {
      const existing = await db.prepare('SELECT tenant_id, access_profile FROM users WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });

      const caller = await getCallerUser(req);
      const isSelf = caller && caller.id === id;

      if (!isSelf && !await assertTenantAccess(req, res, existing.tenant_id)) return;

      const accessProfile = user.access_profile || existing.access_profile || 'rh-operacao';
      const safePermissions = user.permissions_json
        ? normalizeAccessPermissions(user.permissions_json, accessProfile)
        : null;

      if (safePermissions) {
        safePermissions.super_admin = false;
      }

      await db.prepare(`
        UPDATE users SET
          full_name = ?,
          email = ?,
          role = ?,
          status = ?,
          unit_id = ?,
          access_profile = ?,
          permissions_json = COALESCE(?, permissions_json)
        WHERE id = ?
      `).run(
        user.full_name,
        user.email,
        user.role || existing.role,
        user.status || existing.status,
        user.unit_id || existing.unit_id,
        accessProfile,
        safePermissions ? stringifyAccessPermissions(safePermissions, accessProfile) : null,
        id
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.patch('/api/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }
    try {
      const user = await db.prepare('SELECT id, password FROM users WHERE id = ?').get(id) as any;
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (user.password !== current_password) {
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }
      await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(new_password, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao alterar senha.' });
    }
  });

  app.post('/api/users/:id/photo', photoUpload.single('file'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const existing = await db.prepare('SELECT photo_url FROM users WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });

      if (existing.photo_url && existing.photo_url.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), existing.photo_url.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const photoUrl = `/uploads/${req.file.filename}`;
      await db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(photoUrl, id);

      res.json({ success: true, photo_url: photoUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  app.delete('/api/users/:id/photo', async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await db.prepare('SELECT photo_url FROM users WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });

      if (existing.photo_url && existing.photo_url.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), existing.photo_url.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      await db.prepare('UPDATE users SET photo_url = NULL WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const existing = await db.prepare('SELECT tenant_id, id FROM users WHERE id = ?').get(req.params.id) as any;
      if (!existing) return res.status(404).json({ error: 'User not found' });
      if (existing.id === 'admin-root') return res.status(403).json({ error: 'Cannot delete root admin' });
      const caller = await getCallerUser(req);
      if (!caller) return res.status(401).json({ error: 'Unauthorized' });
      if (existing.id === caller.id) {
        return res.status(403).json({ error: 'Cannot delete your own user' });
      }
      if (existing.id === getTenantOwnerUserId(existing.tenant_id)) {
        return res.status(403).json({ error: 'Cannot delete the initial tenant administrator' });
      }
      if (!await assertTenantAccess(req, res, existing.tenant_id)) return;
      await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
}

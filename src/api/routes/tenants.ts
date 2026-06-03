import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import db, { prisma } from '../../lib/db';
import {
  getDefaultAccessProfile,
  normalizeAccessPermissions,
  stringifyAccessPermissions,
} from '../../lib/access';
import { isRootCaller } from '../middleware/auth';
import { addDays, toSqlDateTime, getPlanLabel, getTenantContractStatus } from '../helpers/dates';
import { IMPORT_UPLOADS_DIR } from '../helpers/files';
import { getTenantUsage } from '../helpers/tenant-limits';

export function registerTenantRoutes(app: Express) {
  app.get('/api/tenants', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can view tenants' });
    }
    try {
      const tenants = await db.prepare(`
        SELECT
          t.*,
          COUNT(u.id) as total_users,
          SUM(CASE WHEN u.status = 'Ativo' THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN u.role = 'admin' THEN 1 ELSE 0 END) as admin_users,
          MAX(u.last_login) as last_login
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id
        GROUP BY t.id
        ORDER BY datetime(t.created_at) DESC
      `).all() as any[];

      res.json(
        tenants.map((tenant) => ({
          ...tenant,
          total_users: Number(tenant.total_users || 0),
          active_users: Number(tenant.active_users || 0),
          admin_users: Number(tenant.admin_users || 0),
          validity_days: Number(tenant.validity_days || 30),
          max_users: Number(tenant.max_users || 0),
          contract_status: getTenantContractStatus(tenant.expires_at, tenant.status),
        }))
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  });

  app.post('/api/tenants/provision', async (req, res) => {
    const {
      name,
      document,
      responsible_name,
      email,
      password,
      phone,
      validity_days,
      plan_label,
      max_users,
      access_profile,
      permissions_json,
    } = req.body;
    try {
      const tenantId = name.toLowerCase().replace(/\s+/g, '-').substring(0, 15) + '-' + Math.random().toString(36).substr(2, 4);
      const validityDays = Math.max(1, Number(validity_days || 30));
      const startsAt = toSqlDateTime(new Date());
      const expiresAt = toSqlDateTime(addDays(startsAt, validityDays));
      const accessProfile = access_profile || 'rh-operacao';

      await db.prepare(`
        INSERT INTO tenants (
          id, name, document, status, plan_label, validity_days, starts_at, expires_at, max_users, access_profile
        ) VALUES (?, ?, ?, 'Ativo', ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        name,
        document || '',
        plan_label || getPlanLabel(validityDays),
        validityDays,
        startsAt,
        expiresAt,
        Number(max_users || 3),
        accessProfile
      );

      const ownerAccessProfile = 'admin-mestre';
      const ownerPermissions = normalizeAccessPermissions(
        permissions_json,
        ownerAccessProfile
      );

      const unitId = 'master-' + tenantId;
      await db.prepare(`
        INSERT INTO units (id, tenant_id, name, company_name, responsible_name, phone, email, country, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(unitId, tenantId, `Matriz - ${name}`, name, responsible_name, phone, email, 'Brasil');

      const userId = 'admin-' + tenantId;
      await db.prepare(`
        INSERT INTO users (
          id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json
        )
        VALUES (?, ?, ?, ?, ?, ?, 'admin', 'Ativo', ?, ?)
      `).run(
        userId,
        tenantId,
        unitId,
        responsible_name,
        email,
        password,
        ownerAccessProfile,
        stringifyAccessPermissions(ownerPermissions, ownerAccessProfile)
      );

      res.json({ success: true, tenantId, userId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to provision tenant' });
    }
  });

  app.get('/api/tenants/:id/accesses', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can view tenant accesses' });
    }
    try {
      const accesses = await db.prepare(`
        SELECT u.*, un.name as unit_name
        FROM users u
        LEFT JOIN units un ON u.unit_id = un.id
        WHERE u.tenant_id = ? AND u.id <> 'admin-root'
        ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END, u.full_name ASC
      `).all(req.params.id);
      res.json(accesses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant accesses' });
    }
  });

  app.post('/api/tenants/:id/accesses', async (req, res) => {
    const { id: tenantId } = req.params;
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can provision tenant accesses' });
    }
    const { full_name, email, password, role, status, access_profile, permissions_json, unit_id } = req.body;

    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const accessCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').get(tenantId) as any;
      if (tenant.max_users && Number(accessCount?.count || 0) >= Number(tenant.max_users)) {
        return res.status(400).json({ error: 'Tenant reached max user limit' });
      }

      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      const accessProfile = access_profile || tenant.access_profile || getDefaultAccessProfile(role);
      const resolvedPermissions = normalizeAccessPermissions(permissions_json, accessProfile);
      resolvedPermissions.super_admin = false;
      const masterUnitId = await db.prepare('SELECT id FROM units WHERE tenant_id = ? AND is_master = 1').get(tenantId) as any;

      await db.prepare(`
        INSERT INTO users (
          id, tenant_id, unit_id, full_name, email, password, role, status, access_profile, permissions_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        tenantId,
        unit_id || masterUnitId?.id || null,
        full_name,
        email,
        password,
        role || 'user',
        status || 'Ativo',
        accessProfile,
        stringifyAccessPermissions(resolvedPermissions, accessProfile)
      );

      res.status(201).json({ success: true, id: userId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create tenant access' });
    }
  });

  // Uso atual do tenant (vagas, candidatos, análises do mês)
  app.get('/api/tenants/:id/usage', async (req, res) => {
    if (!isRootCaller(req)) return res.status(403).json({ error: 'Only root admin' });
    try {
      res.json(getTenantUsage(req.params.id));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  // Atualizar limites do tenant
  app.patch('/api/tenants/:id/limits', async (req, res) => {
    if (!isRootCaller(req)) return res.status(403).json({ error: 'Only root admin' });
    const { id } = req.params;
    const { max_jobs, max_candidates, max_ai_analyses_month } = req.body;
    try {
      await db.prepare(`
        UPDATE tenants SET
          max_jobs = ?,
          max_candidates = ?,
          max_ai_analyses_month = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        Number(max_jobs ?? 0),
        Number(max_candidates ?? 0),
        Number(max_ai_analyses_month ?? 0),
        id
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update limits' });
    }
  });

  // Toggle sincronização com portal Shigueno — ativado/desativado pelo Super Admin
  app.patch('/api/tenants/:id/sync-shigueno', async (req, res) => {
    if (!isRootCaller(req)) return res.status(403).json({ error: 'Only root admin' });
    const { id } = req.params;
    const { sync_shigueno } = req.body;
    try {
      await db.prepare('UPDATE tenants SET sync_shigueno = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(sync_shigueno ? 1 : 0, id);
      res.json({ success: true, sync_shigueno: !!sync_shigueno });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update sync_shigueno' });
    }
  });

  app.patch('/api/tenants/:id/settings', async (req, res) => {
    const { id } = req.params;
    const { validity_days, plan_label, max_users, access_profile, status } = req.body;

    try {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any;
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const validityDays = Math.max(1, Number(validity_days || tenant.validity_days || 30));
      const startsAt = toSqlDateTime(new Date());
      const expiresAt = toSqlDateTime(addDays(startsAt, validityDays));
      const accessProfile = access_profile || tenant.access_profile || 'admin-mestre';

      await db.prepare(`
        UPDATE tenants
        SET
          status = ?,
          plan_label = ?,
          validity_days = ?,
          starts_at = ?,
          expires_at = ?,
          max_users = ?,
          access_profile = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        status || 'Ativo',
        plan_label || getPlanLabel(validityDays),
        validityDays,
        startsAt,
        expiresAt,
        Number(max_users || tenant.max_users || 3),
        accessProfile,
        id
      );

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update tenant settings' });
    }
  });

  app.delete('/api/tenants/:id', async (req, res) => {
    if (!isRootCaller(req)) {
      return res.status(403).json({ error: 'Only root admin can delete tenants' });
    }
    const tenantId = req.params.id;
    if (tenantId === 'develoi') {
      return res.status(403).json({ error: 'Cannot delete root tenant' });
    }
    let deleteStep = 'start';
    try {
      deleteStep = 'load stored files';
      const storedFiles = [
        ...(await db.prepare('SELECT file_path FROM import_files WHERE tenant_id = ? AND file_path IS NOT NULL').all(tenantId) as any[]),
        ...(await db.prepare('SELECT file_path FROM job_imports WHERE tenant_id = ? AND file_path IS NOT NULL').all(tenantId) as any[]),
        ...(await db.prepare(`
          SELECT cf.file_path
          FROM candidate_files cf
          JOIN candidates c ON c.id = cf.candidate_id
          WHERE c.tenant_id = ? AND cf.file_path IS NOT NULL
        `).all(tenantId) as any[]),
      ]
        .map((row) => row?.file_path)
        .filter(Boolean);

      deleteStep = 'transaction';
      await prisma.$transaction(async (tx) => {
        deleteStep = 'delete hr_tool_answers by response';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_answers WHERE response_id IN (SELECT id FROM hr_tool_responses WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete hr_tool_answers by question';
        await tx.$executeRawUnsafe(`
          DELETE FROM hr_tool_answers
          WHERE question_id IN (
            SELECT q.id
            FROM hr_tool_questions q
            JOIN hr_tools t ON t.id = q.tool_id
            WHERE t.tenant_id = ?
          )
        `, tenantId);
        deleteStep = 'delete ai_search_results';
        await tx.$executeRawUnsafe('DELETE FROM ai_search_results WHERE session_id IN (SELECT id FROM ai_search_sessions WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete ai_chat_messages';
        await tx.$executeRawUnsafe('DELETE FROM ai_chat_messages WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete ai_search_sessions';
        await tx.$executeRawUnsafe('DELETE FROM ai_search_sessions WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete ai_matching_settings';
        await tx.$executeRawUnsafe('DELETE FROM ai_matching_settings WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete candidate_disc_results';
        await tx.$executeRawUnsafe('DELETE FROM candidate_disc_results WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete candidate_history';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_history
          WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
             OR job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)
        `, tenantId, tenantId);
        deleteStep = 'delete candidate_job_matches';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_job_matches
          WHERE tenant_id = ?
             OR candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
             OR job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)
        `, tenantId, tenantId, tenantId);
        deleteStep = 'delete candidate_files';
        await tx.$executeRawUnsafe(`
          DELETE FROM candidate_files
          WHERE candidate_id IN (SELECT id FROM candidates WHERE tenant_id = ?)
        `, tenantId);
        deleteStep = 'delete job_publication_texts';
        await tx.$executeRawUnsafe('DELETE FROM job_publication_texts WHERE job_id IN (SELECT id FROM jobs WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete import_batch_events';
        await tx.$executeRawUnsafe('DELETE FROM import_batch_events WHERE batch_id IN (SELECT id FROM import_batches WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete import_files';
        await tx.$executeRawUnsafe('DELETE FROM import_files WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete import_batches';
        await tx.$executeRawUnsafe('DELETE FROM import_batches WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete job_imports';
        await tx.$executeRawUnsafe('DELETE FROM job_imports WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete hr_tool_responses';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_responses WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete hr_tool_questions';
        await tx.$executeRawUnsafe('DELETE FROM hr_tool_questions WHERE tool_id IN (SELECT id FROM hr_tools WHERE tenant_id = ?)', tenantId);
        deleteStep = 'delete hr_tools';
        await tx.$executeRawUnsafe('DELETE FROM hr_tools WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete candidates';
        await tx.$executeRawUnsafe('DELETE FROM candidates WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete jobs';
        await tx.$executeRawUnsafe('DELETE FROM jobs WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete users';
        await tx.$executeRawUnsafe('DELETE FROM users WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete units';
        await tx.$executeRawUnsafe('DELETE FROM units WHERE tenant_id = ?', tenantId);
        deleteStep = 'delete tenant';
        await tx.$executeRawUnsafe('DELETE FROM tenants WHERE id = ?', tenantId);
      });

      deleteStep = 'delete filesystem';
      for (const filePath of new Set(storedFiles)) {
        if (filePath && fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath).catch(() => undefined);
        }
      }

      const tenantStorageDir = path.join(IMPORT_UPLOADS_DIR, tenantId);
      if (fs.existsSync(tenantStorageDir)) {
        await fs.promises.rm(tenantStorageDir, { recursive: true, force: true }).catch(() => undefined);
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Failed to delete tenant',
        step: deleteStep,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

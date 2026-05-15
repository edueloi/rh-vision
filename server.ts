import dotenv from 'dotenv';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb } from './src/lib/db';
import { jsonReplacer } from './src/api/helpers/ai';
import { ensureUnitCountryColumn, ensureContactStatusTable, ensureUserPreferencesTable } from './src/api/helpers/db-init';

// Route registrations
import { registerAuthRoutes } from './src/api/routes/auth';
import { registerJobRoutes } from './src/api/routes/jobs';
import { registerCandidateRoutes } from './src/api/routes/candidates';
import { registerImportRoutes } from './src/api/routes/imports';
import { registerAuroraAIRoutes } from './src/api/routes/aurora-ai';
import { registerDiscRoutes } from './src/api/routes/disc';
import { registerHrToolRoutes } from './src/api/routes/hr-tools';
import { registerDashboardRoutes } from './src/api/routes/dashboard';
import { registerTenantRoutes } from './src/api/routes/tenants';
import { registerUnitRoutes } from './src/api/routes/units';
import { registerUserRoutes } from './src/api/routes/users';
import { registerSettingsRoutes } from './src/api/routes/settings';
import { registerPublicRoutes } from './src/api/routes/public';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recover stuck imports from previous crash
import db from './src/lib/db';
try {
  const stuckFiles = db.prepare("SELECT COUNT(*) as n FROM import_files WHERE status = 'processing'").get() as any;
  if (stuckFiles?.n > 0) {
    db.prepare("UPDATE import_files SET status = 'uploaded', progress = 0 WHERE status = 'processing'").run();
    console.log(`[recovery] Reset ${stuckFiles.n} stuck import_files back to 'uploaded'`);
  }
  const stuckBatches = db.prepare("SELECT COUNT(*) as n FROM import_batches WHERE status = 'processing'").get() as any;
  if (stuckBatches?.n > 0) {
    db.prepare("UPDATE import_batches SET status = 'pending' WHERE status = 'processing'").run();
    console.log(`[recovery] Reset ${stuckBatches.n} stuck import_batches back to 'pending'`);
  }
} catch (recoveryErr) {
  console.error('[recovery] Error resetting stuck imports:', recoveryErr);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Initialize DB
  await initDb();
  await ensureUnitCountryColumn();
  await ensureContactStatusTable();
  await ensureUserPreferencesTable();

  app.use(cors());
  app.use(express.json());
  app.set('json replacer', jsonReplacer);

  // Register all route modules
  registerAuthRoutes(app);
  registerDashboardRoutes(app);
  registerJobRoutes(app);
  registerCandidateRoutes(app);
  registerImportRoutes(app);
  registerAuroraAIRoutes(app);
  registerDiscRoutes(app);
  registerHrToolRoutes(app);
  registerPublicRoutes(app);
  registerTenantRoutes(app);
  registerUnitRoutes(app);
  registerUserRoutes(app);
  registerSettingsRoutes(app);

  const server = createHttpServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server }
      },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      try {
        const template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.url, template);
        res.status(200).setHeader('Content-Type', 'text/html');
        res.end(html);
      } catch (error) {
        next(error);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FAILED TO START SERVER:', err);
  process.exit(1);
});

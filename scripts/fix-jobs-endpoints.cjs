const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

// Normalize to LF for matching
const normalized = content.replace(/\r\n/g, '\n');

const broken = "  app.post('/api/jobs', async (req, res) => {\n    try {\n      await db.prepare(query).run(...values, id);\n      res.json({ id, ...job });\n    } catch (error) {\n      res.status(500).json({ error: 'Failed to update job' });\n    }\n  });";

const fixed = [
  "  app.post('/api/jobs', async (req, res) => {",
  "    const job = req.body;",
  "    if (!job.title || !job.city || !job.state) {",
  "      return res.status(400).json({ error: 'Title, city and state are required' });",
  "    }",
  "    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !k.startsWith('_'));",
  "    const placeholders = keys.map(() => '?').join(',');",
  "    const values = keys.map(k => job[k]);",
  "    const query = `INSERT INTO jobs (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;",
  "    try {",
  "      const result = await db.prepare(query).run(...values);",
  "      res.status(201).json({ id: result.lastInsertRowid, ...job });",
  "    } catch (error) {",
  "      console.error(error);",
  "      res.status(500).json({ error: 'Failed to create job' });",
  "    }",
  "  });",
  "",
  "  app.put('/api/jobs/:id', async (req, res) => {",
  "    const job = req.body;",
  "    const { id } = req.params;",
  "    const keys = Object.keys(job).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tenant_id' && !k.startsWith('_'));",
  "    const setClause = keys.map(k => `${k} = ?`).join(',');",
  "    const values = keys.map(k => job[k]);",
  "    const query = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;",
  "    try {",
  "      await db.prepare(query).run(...values, id);",
  "      res.json({ id, ...job });",
  "    } catch (error) {",
  "      console.error(error);",
  "      res.status(500).json({ error: 'Failed to update job' });",
  "    }",
  "  });",
].join('\n');

if (!normalized.includes(broken)) {
  console.error('PATTERN NOT FOUND in server.ts');
  process.exit(1);
}

const patched = normalized.replace(broken, fixed);
// Write back with CRLF
fs.writeFileSync('server.ts', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('OK - POST /api/jobs and PUT /api/jobs/:id restored successfully');

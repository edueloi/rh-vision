import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "prisma", "migrations");

function splitStatements(sql) {
  return sql
    .replace(/\r\n/g, "\n")
    .split(/;(?=\s*(?:\n|$))/g)
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

function normalizeStatement(statement) {
  return statement.replace(/\s+/g, " ").trim().toUpperCase();
}

function assertSafeStatement(statement, filename) {
  const normalized = normalizeStatement(statement);

  const blockedPatterns = [
    { regex: /^DROP\s+(DATABASE|SCHEMA|TABLE|INDEX)\b/, reason: "DROP não é permitido" },
    { regex: /^TRUNCATE\b/, reason: "TRUNCATE não é permitido" },
    { regex: /^DELETE\s+FROM\b/, reason: "DELETE não é permitido" },
    { regex: /^RENAME\s+TABLE\b/, reason: "RENAME TABLE não é permitido" },
    { regex: /^ALTER\s+TABLE\b.*\bDROP\s+(COLUMN|INDEX|PRIMARY\s+KEY|FOREIGN\s+KEY)\b/, reason: "ALTER TABLE com DROP não é permitido" },
  ];

  for (const rule of blockedPatterns) {
    if (rule.regex.test(normalized)) {
      throw new Error(
        `Migração bloqueada por segurança em ${filename}: ${rule.reason}.`
      );
    }
  }
}

function isIgnorableMigrationError(error) {
  const message = String(error?.message || error || "");
  return [
    "Duplicate column name",
    "already exists",
    "Duplicate key name",
    "Multiple primary key defined",
    "check that column/key exists",
  ].some((snippet) => message.includes(snippet));
}

async function ensureMigrationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_runtime_migrations (
      id INT NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY app_runtime_migrations_filename_key (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getStandaloneSqlFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function alreadyApplied(filename) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT filename FROM app_runtime_migrations WHERE filename = ? LIMIT 1`,
    filename
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function markApplied(filename) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_runtime_migrations (filename) VALUES (?)`,
    filename
  );
}

async function applyFile(filename) {
  const fullPath = path.join(migrationsDir, filename);
  const rawSql = await fs.readFile(fullPath, "utf8");
  const statements = splitStatements(rawSql);

  if (statements.length === 0) {
    console.log(`- ${filename}: sem comandos para aplicar`);
    await markApplied(filename);
    return;
  }

  console.log(`- Aplicando ${filename} (${statements.length} comando(s))`);

  for (const statement of statements) {
    assertSafeStatement(statement, filename);

    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      if (isIgnorableMigrationError(error)) {
        console.log(`  • ignorado: ${String(error?.message || error).split("\n")[0]}`);
        continue;
      }

      console.error(`  • falhou em ${filename}`);
      console.error(statement);
      throw error;
    }
  }

  await markApplied(filename);
  console.log(`  • concluído`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não foi definido no arquivo .env.");
    process.exit(1);
  }

  await ensureMigrationTable();

  const files = await getStandaloneSqlFiles();
  if (files.length === 0) {
    console.log("Nenhuma migração SQL solta encontrada em prisma/migrations.");
    return;
  }

  let appliedCount = 0;

  for (const filename of files) {
    if (await alreadyApplied(filename)) {
      console.log(`- ${filename}: já aplicada`);
      continue;
    }

    await applyFile(filename);
    appliedCount += 1;
  }

  if (appliedCount === 0) {
    console.log("Banco já está atualizado.");
  } else {
    console.log(`Migração concluída. ${appliedCount} arquivo(s) aplicado(s).`);
  }
}

main()
  .catch((error) => {
    console.error("Falha ao executar migrate.js");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

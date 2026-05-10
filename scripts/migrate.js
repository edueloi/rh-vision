import "dotenv/config";
import { spawnSync } from "node:child_process";

const mode = process.argv[2] || "dev";
const migrationName = process.argv[3] || "init";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(npxCommand, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não foi definido no arquivo .env.");
  process.exit(1);
}

if (mode === "deploy") {
  run(["prisma", "migrate", "deploy"]);
  run(["prisma", "generate"]);
  process.exit(0);
}

if (mode === "status") {
  run(["prisma", "migrate", "status"]);
  process.exit(0);
}

if (mode === "push") {
  run(["prisma", "db", "push"]);
  run(["prisma", "generate"]);
  process.exit(0);
}

if (mode === "baseline") {
  run(["prisma", "migrate", "resolve", "--applied", migrationName]);
  process.exit(0);
}

run(["prisma", "migrate", "dev", "--name", migrationName]);
run(["prisma", "generate"]);

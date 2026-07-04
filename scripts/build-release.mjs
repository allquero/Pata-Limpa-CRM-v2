#!/usr/bin/env node
/**
 * Build de produção — gera a pasta release/ e o pacote pata-limpa-crm.zip.
 *
 * Uso:
 *   node scripts/build-release.mjs
 *
 * O que faz:
 *   1. Build do frontend React/Vite (BASE_PATH=/, NODE_ENV=production)
 *   2. Build do backend Express (esbuild, ESM bundle)
 *   3. Copia o dist do frontend para dentro do dist do backend (dist/public/)
 *   4. Cria a pasta release/ com tudo necessário para iniciar com:
 *        NODE_ENV=production DATABASE_URL=... node dist/index.mjs
 *   5. Gera dump do banco PostgreSQL (schema + dados, sem tabela sessions)
 *   6. Empacota tudo em pata-limpa-crm.zip para deploy na Hostinger/VPS
 *
 * Arquivos gerados (em .gitignore — não vão para o repositório):
 *   release/           ← pasta com o bundle de produção
 *   pata-limpa-crm.sql ← dump do banco (sem tokens de sessão)
 *   pata-limpa-crm.zip ← pacote completo para download/deploy
 */

import { cp, mkdir, rm, writeFile, readdir, readFile } from "node:fs/promises";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execSync, execFileSync } from "node:child_process";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RELEASE_DIR = path.join(ROOT, "release");
const FRONTEND_DIST = path.join(ROOT, "artifacts/grooming-crm/dist/public");
const BACKEND_DIST = path.join(ROOT, "artifacts/api-server/dist");
const SQL_DUMP = path.join(ROOT, "pata-limpa-crm.sql");
const ZIP_PATH = path.join(ROOT, "pata-limpa-crm.zip");

function run(cmd, extraEnv = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

// 1. Build frontend
run("pnpm --filter @workspace/grooming-crm run build", {
  NODE_ENV: "production",
  BASE_PATH: "/",
});

// 2. Build backend
run("pnpm --filter @workspace/api-server run build", {
  NODE_ENV: "production",
});

// 3. Copy frontend assets into backend dist/public
console.log("\n▶ Copiando frontend → dist/public/");
if (!existsSync(FRONTEND_DIST)) {
  throw new Error(`Frontend dist não encontrado: ${FRONTEND_DIST}`);
}
await cp(FRONTEND_DIST, path.join(BACKEND_DIST, "public"), { recursive: true });

// 4. Assemble release/
console.log("\n▶ Montando release/");
await rm(RELEASE_DIR, { recursive: true, force: true });
await mkdir(RELEASE_DIR, { recursive: true });

await cp(BACKEND_DIST, path.join(RELEASE_DIR, "dist"), { recursive: true });

// Remove source maps — não devem ser expostos em produção.
// (O esbuild já não gera .map com NODE_ENV=production; este passo é uma garantia extra.)
const distDir = path.join(RELEASE_DIR, "dist");
const distEntries = await readdir(distDir);
const mapFiles = distEntries.filter((f) => f.endsWith(".map"));
if (mapFiles.length > 0) {
  console.log(`\n▶ Removendo source maps da release: ${mapFiles.join(", ")}`);
  await Promise.all(mapFiles.map((f) => rm(path.join(distDir, f))));
} else {
  console.log("\n▶ Nenhum source map encontrado na release (esbuild não gerou em prod).");
}

await writeFile(
  path.join(RELEASE_DIR, "package.json"),
  JSON.stringify(
    {
      name: "pata-limpa-crm",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        start: "node dist/index.mjs",
      },
      engines: { node: ">=22" },
    },
    null,
    2,
  ),
);

// 5. Gerar dump do banco (schema + dados, exceto sessões ativas)
console.log("\n▶ Gerando dump do banco de dados...");
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn("⚠️  DATABASE_URL não definida — pulando geração do dump SQL.");
} else {
  try {
    execFileSync("pg_dump", [
      dbUrl,
      "--no-owner",
      "--no-acl",
      "--format=plain",
      // Exclui apenas os DADOS de sessions (tokens sensíveis); schema é mantido
      "--exclude-table-data=public.sessions",
      `--file=${SQL_DUMP}`,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    // Remove linha \restrict do Neon (token de auth específico, inválido em PostgreSQL padrão)
    let sql = await readFile(SQL_DUMP, "utf8");
    sql = sql.replace(/^\\restrict .*\n?/m, "");
    await writeFile(SQL_DUMP, sql);

    const lines = sql.split("\n").length;
    console.log(`✅ Dump gerado: pata-limpa-crm.sql (${lines} linhas, sem dados de sessão)`);
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString() : err.message;
    console.warn(`⚠️  pg_dump falhou: ${msg}`);
    console.warn("   Gere o dump manualmente com:");
    console.warn(`   pg_dump "$DATABASE_URL" --no-owner --no-acl --exclude-table-data=public.sessions > pata-limpa-crm.sql`);
  }
}

// 6. Empacotar em pata-limpa-crm.zip via Python (disponível no ambiente)
console.log("\n▶ Empacotando pata-limpa-crm.zip...");
const pyTmp = path.join(os.tmpdir(), "_pata_limpa_zip.py");
const pyCode = [
  "import zipfile, pathlib",
  `root = pathlib.Path("${ROOT.replace(/\\/g, "/")}")`,
  `zip_path = root / "pata-limpa-crm.zip"`,
  "entries = [",
  `    (root / "release" / "package.json", "package.json"),`,
  `    (root / ".env.example",             ".env.example"),`,
  `    (root / "README-DEPLOY.md",         "README-DEPLOY.md"),`,
  `    (root / "pata-limpa-crm.sql",       "pata-limpa-crm.sql"),`,
  "]",
  `with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:`,
  "    for src, arc in entries:",
  "        if src.exists():",
  "            zf.write(src, arc)",
  `            print("  + " + arc)`,
  "        else:",
  `            print("  - " + arc + " (nao encontrado, pulado)")`,
  `    dist_dir = root / "release" / "dist"`,
  "    for fpath in sorted(dist_dir.rglob(\"*\")):",
  "        if fpath.is_file():",
  `            arc = "dist/" + str(fpath.relative_to(dist_dir))`,
  "            zf.write(fpath, arc)",
  `            print("  + " + arc)`,
  "size_mb = zip_path.stat().st_size / 1024 / 1024",
  `print("ZIP: pata-limpa-crm.zip ({:.1f} MB)".format(size_mb))`,
].join("\n");

writeFileSync(pyTmp, pyCode);
try {
  execSync(`python3 "${pyTmp}"`, { cwd: ROOT, stdio: "inherit" });
} finally {
  try { unlinkSync(pyTmp); } catch (_) { /* ignore */ }
}

console.log(`
✅ Pacote de deploy pronto!

Arquivos gerados (em .gitignore — não versionados):
  release/              ← pasta com o bundle (para deploy direto)
  pata-limpa-crm.sql   ← dump do banco (sem tokens de sessão)
  pata-limpa-crm.zip   ← pacote completo para baixar e fazer upload

Conteúdo do zip:
  package.json          ← script de start
  .env.example          ← template de variáveis de ambiente
  README-DEPLOY.md      ← guia completo de deploy
  pata-limpa-crm.sql   ← dump do banco
  dist/index.mjs        ← servidor Express bundlado
  dist/public/          ← frontend React compilado
  dist/pino-*.mjs       ← workers de logging

Para fazer deploy na Hostinger/VPS:
  1. Baixe pata-limpa-crm.zip pelo painel do Replit
  2. Siga o passo a passo em README-DEPLOY.md (incluído no zip)
`);

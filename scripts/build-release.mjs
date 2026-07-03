#!/usr/bin/env node
/**
 * Build de produção — gera a pasta release/ pronta para deploy na Hostinger.
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
 */

import { cp, mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RELEASE_DIR = path.join(ROOT, "release");
const FRONTEND_DIST = path.join(ROOT, "artifacts/grooming-crm/dist/public");
const BACKEND_DIST = path.join(ROOT, "artifacts/api-server/dist");

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
        start: "node --enable-source-maps dist/index.mjs",
      },
      engines: { node: ">=22" },
    },
    null,
    2,
  ),
);

console.log(`
✅ Release pronta em: release/

Estrutura:
  release/
    package.json        ← só o script start
    dist/
      index.mjs         ← servidor Express (bundle ESM, sem source map)
      public/           ← frontend React compilado
        index.html
        assets/
      pino-*.mjs        ← workers de logging (pino)

Para fazer deploy (Hostinger ou qualquer VPS Node.js):
  1. Faça upload do conteúdo de release/ para o servidor
  2. Configure as variáveis de ambiente:
       NODE_ENV=production
       DATABASE_URL=postgres://...
       PORT=3000          (opcional, padrão: 3000)
       ADMIN_EMAIL=...
       ADMIN_PASSWORD=...
  3. Inicie com:
       node dist/index.mjs
`);

/**
 * Data fix: associate the development tenant with the correct user_id.
 *
 * Root cause: the tenant row (id=1) in the development database was created
 * before the admin task that added user_id to tenants, so user_id was left
 * empty (""). requireTenant does WHERE user_id = req.user.id, finds no row,
 * and returns 403 — blocking every protected route for every user.
 *
 * Fix: set user_id on the existing dev tenant to the active user's ID.
 * Production tenant (id=2, user_id='33500bf3-...') was already correct and
 * is NOT touched by this script (guarded by NODE_ENV check below).
 *
 * Production verification (manual, confirmed 2026-05-19):
 *   SELECT id, user_id, access_start, access_end FROM tenants ORDER BY id;
 *   id | user_id                              | access_start | access_end
 *    2 | 33500bf3-2849-4fde-acab-6607e41382ce | 2026-05-19   | 2026-08-19
 *   All prod tenants have non-empty user_id — no prod update needed.
 *
 * Usage (development only):
 *   pnpm --filter @workspace/scripts run fix-dev-tenant-user-id
 *
 * Verification after running:
 *   SELECT id, user_id FROM tenants WHERE id = 1;
 *   -- expected: user_id = '37402339'
 */

import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DEV_TENANT_ID = 1;
const DEV_USER_ID = "37402339"; // allquero@gmail.com — active Replit dev user

async function main() {
  const env = process.env.NODE_ENV ?? "development";
  if (env !== "development") {
    console.error(
      `Refusing to run: NODE_ENV is '${env}', expected 'development'.` +
      " This script only targets dev-specific data and must not run in production."
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("prod") || dbUrl.includes("production")) {
    console.error(
      "Refusing to run: DATABASE_URL appears to point at a production database." +
      " Aborting to avoid unintended data changes."
    );
    process.exit(1);
  }

  const [before] = await db
    .select({ id: tenantsTable.id, userId: tenantsTable.userId })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, DEV_TENANT_ID));

  if (!before) {
    console.log(`Tenant id=${DEV_TENANT_ID} not found — nothing to do.`);
    process.exit(0);
  }

  if (before.userId === DEV_USER_ID) {
    console.log(`Tenant id=${DEV_TENANT_ID} already has user_id='${DEV_USER_ID}' — no update needed.`);
    process.exit(0);
  }

  console.log(`Updating tenant id=${DEV_TENANT_ID}: user_id '${before.userId ?? ""}' → '${DEV_USER_ID}'`);

  const [after] = await db
    .update(tenantsTable)
    .set({ userId: DEV_USER_ID })
    .where(eq(tenantsTable.id, DEV_TENANT_ID))
    .returning({ id: tenantsTable.id, userId: tenantsTable.userId });

  console.log(`Done. tenant id=${after.id} now has user_id='${after.userId}'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("fix-dev-tenant-user-id failed:", err);
  process.exit(1);
});

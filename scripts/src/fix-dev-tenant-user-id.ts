/**
 * Data fix: associate the development tenant with the correct user_id.
 *
 * Root cause: the tenant row (id=1) in the development database was created
 * before the admin task that added user_id to tenants, so user_id was left
 * empty (""). requireTenant does WHERE user_id = req.user.id, finds no row,
 * and returns 403 — blocking every protected route for every user.
 *
 * Fix: set user_id on the existing dev tenant to the active user's ID.
 * Production tenant (id=2, user_id='33500bf3-...') is already correct and
 * is NOT touched by this script.
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

/**
 * Backfill: creates package_sales rows for existing recurring appointment groups
 * that were created before the package_sales table existed.
 *
 * For each unique (tenantId, recurringGroupId) in appointments that does NOT
 * already have a matching row in package_sales, we insert a package_sales row
 * using the data available from the appointments and the related package.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backfill-package-sales
 *
 * Safe to re-run (idempotent via unique constraint on recurring_group_id).
 */

import { db } from "@workspace/db";
import {
  appointmentsTable,
  packageSalesTable,
  packagesTable,
  petsTable,
} from "@workspace/db";
import { isNotNull, notInArray, sql, inArray } from "drizzle-orm";

async function main() {
  console.log("🔍 Looking for recurring appointment groups without package_sales rows...");

  // 1. Get all distinct recurringGroupIds that have a packageId set
  const groupsWithPackage = await db
    .selectDistinct({
      tenantId: appointmentsTable.tenantId,
      clientId: appointmentsTable.clientId,
      petId: appointmentsTable.petId,
      packageId: appointmentsTable.packageId,
      recurringGroupId: appointmentsTable.recurringGroupId,
    })
    .from(appointmentsTable)
    .where(isNotNull(appointmentsTable.recurringGroupId));

  if (groupsWithPackage.length === 0) {
    console.log("✅ No recurring groups found, nothing to backfill.");
    return;
  }

  // 2. Find which groups already have package_sales rows
  const existingGroupIds = await db
    .select({ recurringGroupId: packageSalesTable.recurringGroupId })
    .from(packageSalesTable);
  const existingSet = new Set(existingGroupIds.map(r => r.recurringGroupId));

  const toBackfill = groupsWithPackage.filter(
    g => g.recurringGroupId && !existingSet.has(g.recurringGroupId) && g.packageId != null
  );

  if (toBackfill.length === 0) {
    console.log("✅ All recurring groups already have package_sales rows.");
    return;
  }

  console.log(`📦 Found ${toBackfill.length} group(s) to backfill.`);

  let created = 0;
  let skipped = 0;

  for (const group of toBackfill) {
    const { tenantId, clientId, petId, packageId, recurringGroupId } = group;

    if (!recurringGroupId || !packageId) {
      skipped++;
      continue;
    }

    // Count sessions in this group
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointmentsTable)
      .where(
        sql`${appointmentsTable.recurringGroupId} = ${recurringGroupId}`
      );

    const weeks = count ?? 1;

    // Get earliest appointment date as saleDate
    const [earliest] = await db
      .select({ scheduledDate: appointmentsTable.scheduledDate })
      .from(appointmentsTable)
      .where(sql`${appointmentsTable.recurringGroupId} = ${recurringGroupId}`)
      .orderBy(appointmentsTable.scheduledDate)
      .limit(1);

    const saleDate = earliest
      ? new Date(earliest.scheduledDate).toISOString().substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    // Get package price for pet size (if pet exists)
    let totalPrice: string | null = null;
    if (petId) {
      const [petRow] = await db
        .select({ size: petsTable.size })
        .from(petsTable)
        .where(sql`${petsTable.id} = ${petId}`);

      const [pkgRow] = await db
        .select({ priceBySizes: packagesTable.priceBySizes })
        .from(packagesTable)
        .where(sql`${packagesTable.id} = ${packageId}`);

      if (petRow && pkgRow) {
        const priceBySizes = pkgRow.priceBySizes as Array<{ size: string; price: number }> ?? [];
        const entry = priceBySizes.find(p => p.size === petRow.size);
        if (entry) totalPrice = String(entry.price);
      }
    }

    try {
      await db.insert(packageSalesTable).values({
        tenantId: tenantId!,
        clientId: clientId!,
        petId: petId ?? null,
        packageId,
        recurringGroupId,
        totalPrice,
        weeks,
        saleDate,
      });
      console.log(`  ✔ Created package_sale for group ${recurringGroupId} (${weeks} sessões)`);
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique")) {
        console.log(`  ⏭ Skipped group ${recurringGroupId} (already exists)`);
        skipped++;
      } else {
        console.error(`  ✗ Error for group ${recurringGroupId}:`, msg);
        skipped++;
      }
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped/already existed: ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

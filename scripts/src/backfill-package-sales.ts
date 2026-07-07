/**
 * Backfill: creates package_sales rows for existing recurring appointment groups
 * that were created before the package_sales table existed.
 *
 * Price inference strategy (per group):
 *   1. Require pet name AND package name to be known (derived from appt/package rows).
 *   2. Find financial_entries where:
 *        - tenantId matches
 *        - type = 'receita'
 *        - date is within ±1 day of the earliest appointment in the group
 *        - description contains the package name (case-insensitive)
 *        - description contains the pet name (case-insensitive) — used as client proxy
 *          since financial_entries lacks a clientId column
 *   3. If exactly one entry matches ALL conditions → use its amount as totalPrice
 *   4. Any other case (0 matches, multiple, unknown package/pet) → totalPrice = NULL
 *      and the group is added to the "pending review" report for manual action.
 *
 * Groups where packageId IS NULL are also recorded as pending (unknown package).
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
  financialEntriesTable,
} from "@workspace/db";
import { and, eq, gte, lte, isNotNull, sql } from "drizzle-orm";

type PendingGroup = {
  recurringGroupId: string;
  tenantId: number;
  clientId: number;
  packageName: string | null;
  petName: string | null;
  saleDate: string;
  weeks: number;
  reason: string;
};

async function main() {
  console.log("🔍 Looking for recurring appointment groups without package_sales rows...\n");

  // 1. Get ALL distinct groups (including those with null packageId)
  const allGroups = await db
    .selectDistinct({
      tenantId: appointmentsTable.tenantId,
      clientId: appointmentsTable.clientId,
      petId: appointmentsTable.petId,
      packageId: appointmentsTable.packageId,
      recurringGroupId: appointmentsTable.recurringGroupId,
    })
    .from(appointmentsTable)
    .where(isNotNull(appointmentsTable.recurringGroupId));

  if (allGroups.length === 0) {
    console.log("✅ No recurring groups found, nothing to backfill.");
    return;
  }

  // 2. Find which groups already have package_sales rows
  const existingRows = await db
    .select({ recurringGroupId: packageSalesTable.recurringGroupId })
    .from(packageSalesTable);
  const existingSet = new Set(existingRows.map(r => r.recurringGroupId));

  const toBackfill = allGroups.filter(
    g => g.recurringGroupId && !existingSet.has(g.recurringGroupId)
  );

  if (toBackfill.length === 0) {
    console.log("✅ All recurring groups already have package_sales rows.");
    return;
  }

  console.log(`📦 Found ${toBackfill.length} group(s) to backfill.\n`);

  let created = 0;
  let skipped = 0;
  const pendingReview: PendingGroup[] = [];

  for (const group of toBackfill) {
    const { tenantId, clientId, petId, packageId, recurringGroupId } = group;

    if (!recurringGroupId || !tenantId || !clientId) {
      skipped++;
      continue;
    }

    // Count sessions and get earliest appointment date
    const sessionRows = await db
      .select({ scheduledDate: appointmentsTable.scheduledDate })
      .from(appointmentsTable)
      .where(sql`${appointmentsTable.recurringGroupId} = ${recurringGroupId}`)
      .orderBy(appointmentsTable.scheduledDate);

    const weeks = sessionRows.length;
    const earliestAppt = sessionRows[0];
    const saleDate = earliestAppt
      ? new Date(earliestAppt.scheduledDate).toISOString().substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    // Fetch package info (may be null if package was deleted or never set)
    let packageName: string | null = null;
    if (packageId) {
      const [pkgRow] = await db
        .select({ name: packagesTable.name })
        .from(packagesTable)
        .where(eq(packagesTable.id, packageId));
      packageName = pkgRow?.name ?? null;
    }

    // Fetch pet name
    let petName: string | null = null;
    if (petId) {
      const [petRow] = await db
        .select({ name: petsTable.name })
        .from(petsTable)
        .where(eq(petsTable.id, petId));
      petName = petRow?.name ?? null;
    }

    // Price inference: search financial_entries within ±1 day of saleDate,
    // matching tenantId + type=receita + package name + pet name (client proxy).
    // financial_entries has no clientId column, so pet name is required as client proxy.
    // If either is unknown, or match is ambiguous, set totalPrice=NULL.
    let totalPrice: string | null = null;
    let ambiguityReason = "";

    if (!packageId) {
      ambiguityReason = "packageId is NULL — package-based appointment without packageId set";
    } else if (!packageName) {
      ambiguityReason = "Package record not found (may have been deleted)";
    } else if (!petName) {
      ambiguityReason = "Pet record not found — cannot correlate with financial_entries (no clientId column)";
    } else {
      const saleDateObj = new Date(saleDate);
      const dayBefore = new Date(saleDateObj);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(saleDateObj);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const candidates = await db
        .select({
          amount: financialEntriesTable.amount,
          description: financialEntriesTable.description,
          date: financialEntriesTable.date,
        })
        .from(financialEntriesTable)
        .where(
          and(
            eq(financialEntriesTable.tenantId, tenantId),
            eq(financialEntriesTable.type, "receita"),
            gte(financialEntriesTable.date, dayBefore.toISOString().substring(0, 10)),
            lte(financialEntriesTable.date, dayAfter.toISOString().substring(0, 10)),
            sql`lower(${financialEntriesTable.description}) like ${`%${packageName.toLowerCase()}%`}`,
            sql`lower(${financialEntriesTable.description}) like ${`%${petName.toLowerCase()}%`}`,
          )
        );

      if (candidates.length === 1) {
        totalPrice = String(parseFloat(candidates[0]!.amount));
      } else if (candidates.length === 0) {
        ambiguityReason = `No financial_entries match (package="${packageName}", pet="${petName}", ±1d of ${saleDate})`;
      } else {
        ambiguityReason = `${candidates.length} candidates found (amounts: ${candidates.map(c => c.amount).join(", ")}) — ambiguous`;
      }
    }

    if (ambiguityReason) {
      pendingReview.push({
        recurringGroupId,
        tenantId,
        clientId,
        packageName,
        petName,
        saleDate,
        weeks,
        reason: ambiguityReason,
      });
    }

    // Insert the row. totalPrice=null when ambiguous (still tracks the group).
    try {
      await db.insert(packageSalesTable).values({
        tenantId,
        clientId,
        petId: petId ?? null,
        packageId: packageId ?? null,
        recurringGroupId,
        totalPrice,
        weeks,
        saleDate,
      });

      const priceDisplay = totalPrice != null
        ? `R$ ${parseFloat(totalPrice).toFixed(2)}`
        : "NULL (pendente revisão)";
      console.log(
        `  ✔ ${recurringGroupId.substring(0, 8)}… | ${packageName ?? "?"} | ${petName ?? "?"} | ${weeks} sessões | preço: ${priceDisplay}`
      );
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique")) {
        console.log(`  ⏭ Já existe: ${recurringGroupId.substring(0, 8)}…`);
        skipped++;
      } else {
        console.error(`  ✗ Erro no grupo ${recurringGroupId.substring(0, 8)}…:`, msg);
        skipped++;
      }
    }
  }

  console.log(`\n✅ Concluído. Criados: ${created} | Ignorados: ${skipped}`);

  if (pendingReview.length > 0) {
    console.log(`\n⚠️  REVISÃO MANUAL NECESSÁRIA — ${pendingReview.length} grupo(s) com total_price = NULL:`);
    console.log("─".repeat(80));
    for (const g of pendingReview) {
      console.log(`  Grupo   : ${g.recurringGroupId}`);
      console.log(`  Tenant  : ${g.tenantId} | Cliente: ${g.clientId} | Pacote: ${g.packageName ?? "?"} | Pet: ${g.petName ?? "?"}`);
      console.log(`  Venda   : ${g.saleDate} | ${g.weeks} sessões`);
      console.log(`  Motivo  : ${g.reason}`);
      console.log(`  Ação SQL: UPDATE package_sales SET total_price = <valor> WHERE recurring_group_id = '${g.recurringGroupId}';`);
      console.log("─".repeat(80));
    }
  } else if (created > 0) {
    console.log("\n✅ Todos os grupos foram processados sem ambiguidades.");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

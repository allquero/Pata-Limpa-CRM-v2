/**
 * Backfill: convert legacy packages with serviceItems into the new sessions[] format.
 *
 * Conversion logic (mirrors the legacy sell endpoint behaviour):
 *   - Sort serviceItems by quantity descending.
 *   - The item with the highest quantity (mainItem) defines the number of sessions.
 *   - Sessions 1 .. N-1 contain only the mainItem service.
 *   - Session N (last) contains the mainItem service PLUS all extra services.
 *   - Session labels default to "Semana 1", "Semana 2", etc.
 *
 * Example:
 *   serviceItems = [{serviceName:"Banho", quantity:4}, {serviceName:"Tosa", quantity:1}]
 *   → sessions = [
 *       { label:"Semana 1", serviceNames:["Banho"] },
 *       { label:"Semana 2", serviceNames:["Banho"] },
 *       { label:"Semana 3", serviceNames:["Banho"] },
 *       { label:"Semana 4", serviceNames:["Banho","Tosa"] },
 *     ]
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backfill-package-sessions
 *
 * Safe to re-run (idempotent — skips packages where sessions is already set).
 */

import { db, packagesTable } from "@workspace/db";
import type { ServiceItem, PackageSession } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

async function main() {
  const legacyPackages = await db
    .select()
    .from(packagesTable)
    .where(isNull(packagesTable.sessions));

  const needsBackfill = legacyPackages.filter(pkg => {
    const items = (pkg.serviceItems as ServiceItem[]) ?? [];
    return items.length > 0;
  });

  console.log(`Found ${legacyPackages.length} package(s) without sessions.`);
  console.log(`  → ${needsBackfill.length} have serviceItems to convert.`);
  console.log(`  → ${legacyPackages.length - needsBackfill.length} have no serviceItems (skipping).`);

  if (needsBackfill.length === 0) {
    console.log("Nothing to do. Exiting.");
    return;
  }

  let converted = 0;
  for (const pkg of needsBackfill) {
    const items = (pkg.serviceItems as ServiceItem[]).slice().sort((a, b) => b.quantity - a.quantity);
    const mainItem = items[0]!;
    const extraItems = items.slice(1);
    const numSessions = Math.min(mainItem.quantity, 52);

    const sessions: PackageSession[] = Array.from({ length: numSessions }, (_, i) => {
      const isLast = i === numSessions - 1;
      return {
        label: `Semana ${i + 1}`,
        serviceNames: isLast
          ? [mainItem.serviceName, ...extraItems.map(e => e.serviceName)]
          : [mainItem.serviceName],
      };
    });

    await db
      .update(packagesTable)
      .set({ sessions })
      .where(eq(packagesTable.id, pkg.id));

    console.log(`  Converted pkg #${pkg.id} "${pkg.name}" → ${sessions.length} session(s)`);
    converted++;
  }

  console.log(`\nDone. Converted ${converted} package(s).`);
}

main().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});

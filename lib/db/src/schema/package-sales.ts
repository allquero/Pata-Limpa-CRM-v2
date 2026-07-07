import { pgTable, serial, integer, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { clientsTable } from "./clients";
import { petsTable } from "./pets";
import { packagesTable } from "./packages";

export const packageSalesTable = pgTable("package_sales", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  petId: integer("pet_id").references(() => petsTable.id, { onDelete: "set null" }),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "set null" }),
  recurringGroupId: text("recurring_group_id").notNull().unique(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
  weeks: integer("weeks"),
  saleDate: date("sale_date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackageSaleSchema = createInsertSchema(packageSalesTable).omit({ id: true, createdAt: true });
export type InsertPackageSale = z.infer<typeof insertPackageSaleSchema>;
export type PackageSale = typeof packageSalesTable.$inferSelect;

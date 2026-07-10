import { pgTable, serial, text, timestamp, uniqueIndex, varchar, date, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const DEFAULT_PET_SIZES = ["mini", "pequeno", "medio", "grande", "gigante"] as const;
export const DEFAULT_COAT_TYPES = ["curto", "longo"] as const;

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  accessStart: date("access_start"),
  accessEnd: date("access_end"),
  schedulingMethod: varchar("scheduling_method", { length: 20 }).notNull().default("hora"),
  utcOffset: integer("utc_offset").notNull().default(-3),
  petSizes: jsonb("pet_sizes").$type<string[]>().default(["mini", "pequeno", "medio", "grande", "gigante"]),
  coatTypes: jsonb("coat_types").$type<string[]>().default(["curto", "longo"]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("tenants_user_id_unique").on(table.userId),
]);

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;

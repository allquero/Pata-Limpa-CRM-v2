import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const serviceItemSchema = z.object({
  serviceName: z.string(),
  quantity: z.number().int().min(1),
});
export type ServiceItem = z.infer<typeof serviceItemSchema>;

export const priceBySize = z.object({
  size: z.string(),
  price: z.number(),
});
export type PriceBySize = z.infer<typeof priceBySize>;

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  serviceItems: jsonb("service_items").notNull().default([]).$type<ServiceItem[]>(),
  priceBySizes: jsonb("price_by_sizes").notNull().default([]).$type<PriceBySize[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  serviceItems: z.array(serviceItemSchema).default([]),
  priceBySizes: z.array(priceBySize).default([]),
});
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const templateTypeEnum = ["confirmacao", "lembrete", "leads", "agradecimento"] as const;
export type TemplateType = typeof templateTypeEnum[number];

export const messageTemplatesTable = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<TemplateType>(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplatesTable.$inferSelect;

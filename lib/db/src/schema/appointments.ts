import { pgTable, serial, text, integer, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { clientsTable } from "./clients";
import { petsTable } from "./pets";
import { servicesTable } from "./services";
import { packagesTable } from "./packages";

export const appointmentStatusEnum = ["aguardando", "em_atendimento", "concluido", "cancelado"] as const;
export type AppointmentStatus = typeof appointmentStatusEnum[number];

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  petId: integer("pet_id").notNull().references(() => petsTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "set null" }),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("aguardando").$type<AppointmentStatus>(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  extraServiceIds: json("extra_service_ids").$type<number[]>(),
  recurringWeeks: integer("recurring_weeks"),
  recurringGroupId: text("recurring_group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;

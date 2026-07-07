import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

// ── Portes padrão (configuráveis por empresa) ───────────────────────────────
export const defaultPorteEnum = ["mini", "pequeno", "medio", "grande", "gigante"] as const;
export type DefaultPorte = (typeof defaultPorteEnum)[number];

// ── Pelagens padrão (configuráveis por empresa) ─────────────────────────────
export const defaultCoatEnum = ["curto", "longo"] as const;
export type DefaultCoat = (typeof defaultCoatEnum)[number];

// Mantido para compatibilidade com dados legados durante migração
export const legacySizeEnum = [
  "mini_curto", "mini_longo",
  "pequeno_curto", "pequeno_longo",
  "medio_curto", "medio_longo",
  "grande_curto", "grande_longo",
  "gigante",
] as const;

// ── Tabela principal ────────────────────────────────────────────────────────
export const petsTable = pgTable("pets", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  breed: text("breed"),
  size: text("size").notNull(),  // porte do pet (ex: "pequeno", "medio")
  coat: text("coat"),            // pelagem do pet (ex: "curto", "longo")

  sex: text("sex").$type<"macho" | "femea">(),
  neutered: boolean("neutered").default(false),
  behavior: text("behavior"),
  healthNotes: text("health_notes"),
  photoUrl: text("photo_url"),
  groomingPreferences: text("grooming_preferences"),
  senior: boolean("senior").default(false),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPetSchema = createInsertSchema(petsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof petsTable.$inferSelect;

// Mantido para compatibilidade com código existente
export const petSizeEnum = legacySizeEnum;
export type PetSize = string;

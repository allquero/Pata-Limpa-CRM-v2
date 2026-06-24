import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

// ── Portes disponíveis ──────────────────────────────────────────────────────
export const petSizeEnum = [
  "mini_curto",
  "mini_longo",
  "pequeno_curto",
  "pequeno_longo",
  "medio_curto",
  "medio_longo",
  "grande_curto",
  "grande_longo",
  "gigante",
] as const;
export type PetSize = (typeof petSizeEnum)[number];

// ── Tabela principal ────────────────────────────────────────────────────────
export const petsTable = pgTable("pets", {
  id: serial("id").primaryKey(),

  // Vínculo com o tutor (um tutor pode ter N pets, cada um com CRUD próprio)
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),

  // Identificação básica
  name: text("name").notNull(),
  breed: text("breed"),                          // raça
  size: text("size").notNull().$type<PetSize>(), // porte — define preço automaticamente

  // Dados clínicos / comportamentais
  sex: text("sex").$type<"macho" | "femea">(),  // sexo
  neutered: boolean("neutered").default(false),  // castrado?
  coat: text("coat"),                            // tipo de pelagem (curta, longa, crespa, dupla…)
  behavior: text("behavior"),                    // agitado, morde, assustado…
  healthNotes: text("health_notes"),             // alergias, condições de saúde
  photoUrl: text("photo_url"),                   // foto para identificação visual na agenda

  // Preferências de tosa (registradas pelo tutor ou profissional)
  groomingPreferences: text("grooming_preferences"),

  // Idoso — precisa de cuidados especiais
  senior: boolean("senior").default(false),

  // Observações gerais (campo livre)
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── Schemas de validação ────────────────────────────────────────────────────
export const insertPetSchema = createInsertSchema(petsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof petsTable.$inferSelect;
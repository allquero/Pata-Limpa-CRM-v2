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

// ── Tipo de cliente ─────────────────────────────────────────────────────────
// pacotista → plano mensal recorrente com dia fixo
// eventual  → avulso, preço cheio com desconto opcional
export const petTypeEnum = ["pacotista", "eventual"] as const;
export type PetType = (typeof petTypeEnum)[number];

// ── Frequência de visita (somente pacotista) ────────────────────────────────
// semanal   → toda semana no dia fixo (4 ou 5 visitas/mês)
// quinzenal → a cada duas semanas (2 ou 3 visitas/mês)
//             usado para raças grandes/peludas (Golden, Husky, Lhasa etc.)
export const petFrequencyEnum = ["semanal", "quinzenal"] as const;
export type PetFrequency = (typeof petFrequencyEnum)[number];

// ── Dia fixo da semana (0 = domingo … 6 = sábado) ──────────────────────────
// O sistema usa isso para calcular automaticamente quantas visitas
// cabem no mês e gerar o valor da cobrança mensal.
export const weekDayEnum = [0, 1, 2, 3, 4, 5, 6] as const;
export type WeekDay = (typeof weekDayEnum)[number];

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

  // Tipo de cliente: pacotista ou eventual
  petType: text("pet_type").notNull().default("eventual").$type<PetType>(),

  // ── Campos exclusivos para pacotistas ──────────────────────────────────
  // Frequência: semanal (toda semana) ou quinzenal (a cada 2 semanas)
  frequency: text("frequency").$type<PetFrequency>(),

  // Dia fixo da semana (ex: 2 = terça-feira)
  // O sistema usa isso para calcular quantas visitas cabem no mês
  appointmentDay: integer("appointment_day").$type<WeekDay>(),

  // Preço por visita já com desconto de pacote
  // O valor mensal = pricePerVisit × qtd de visitas calculadas no mês
  pricePerVisit: text("price_per_visit"),        // numeric como string (ex: "45.00")

  // Para pacote quinzenal: data da primeira visita do pacote
  // O sistema usa isso para saber quais são as "terças" do pet no calendário
  firstVisitDate: timestamp("first_visit_date", { withTimezone: true }),

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
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine(
    (data) => {
      // Se for pacotista, frequência e dia da semana são obrigatórios
      if (data.petType === "pacotista") {
        return !!data.frequency && data.appointmentDay !== undefined && data.appointmentDay !== null;
      }
      return true;
    },
    {
      message: "Pacotista requer frequência e dia fixo da semana",
      path: ["frequency"],
    }
  );

export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof petsTable.$inferSelect;
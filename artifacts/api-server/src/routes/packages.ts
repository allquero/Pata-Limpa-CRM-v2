import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as zod from "zod";
import {
  db,
  packagesTable,
  appointmentsTable,
  petsTable,
  servicesTable,
  financialEntriesTable,
  clientsTable,
} from "@workspace/db";
import type { ServiceItem, PriceBySize } from "@workspace/db";
import { requireTenant } from "../middlewares/requireTenant";

const MAX_PACKAGE_SESSIONS = 52;

const ServiceItemSchema = zod.object({
  serviceName: zod.string().min(1).max(100),
  quantity: zod.number().int().min(1).max(MAX_PACKAGE_SESSIONS),
});

const PriceBySizeSchema = zod.object({
  size: zod.string().min(1).max(50),
  price: zod.number().min(0),
});

const PackageBodySchema = zod.object({
  name: zod.string().min(1).max(200),
  description: zod.string().max(1000).optional().nullable(),
  serviceItems: zod.array(ServiceItemSchema).max(20).optional(),
  priceBySizes: zod.array(PriceBySizeSchema).max(20).optional(),
});

const PackageUpdateSchema = PackageBodySchema.partial();

const router: IRouter = Router();

router.use(requireTenant);

const parsePackage = (pkg: typeof packagesTable.$inferSelect) => ({
  ...pkg,
  serviceItems: (pkg.serviceItems as ServiceItem[]) ?? [],
  priceBySizes: (pkg.priceBySizes as PriceBySize[]) ?? [],
});

async function getFullAppointment(id: number) {
  const rows = await db
    .select({
      appointment: appointmentsTable,
      pet: petsTable,
      client: clientsTable,
      service: { id: servicesTable.id, name: servicesTable.name, price: servicesTable.price },
      package: { id: packagesTable.id, name: packagesTable.name },
    })
    .from(appointmentsTable)
    .leftJoin(petsTable, eq(appointmentsTable.petId, petsTable.id))
    .leftJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(packagesTable, eq(appointmentsTable.packageId, packagesTable.id))
    .where(eq(appointmentsTable.id, id));

  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row.appointment,
    totalPrice: parseFloat(row.appointment.totalPrice),
    pet: row.pet!,
    client: row.client!,
    service: row.service?.id ? { ...row.service, price: parseFloat(row.service.price) } : null,
    package: row.package?.id ? row.package : null,
  };
}

router.get("/packages", async (req, res): Promise<void> => {
  const pkgs = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.tenantId, req.tenantId!))
    .orderBy(packagesTable.name);
  res.json(pkgs.map(parsePackage));
});

router.post("/packages", async (req, res): Promise<void> => {
  const parsed = PackageBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, description, serviceItems = [], priceBySizes = [] } = parsed.data;
  const [pkg] = await db
    .insert(packagesTable)
    .values({
      tenantId: req.tenantId!,
      name,
      description: description ?? null,
      serviceItems,
      priceBySizes,
    })
    .returning();
  res.status(201).json(parsePackage(pkg));
});

router.get("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(and(eq(packagesTable.id, id), eq(packagesTable.tenantId, req.tenantId!)));
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.json(parsePackage(pkg));
});

router.patch("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = PackageUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  if (parsed.data.serviceItems !== undefined) updateData.serviceItems = parsed.data.serviceItems;
  if (parsed.data.priceBySizes !== undefined) updateData.priceBySizes = parsed.data.priceBySizes;
  const [pkg] = await db
    .update(packagesTable)
    .set(updateData)
    .where(and(eq(packagesTable.id, id), eq(packagesTable.tenantId, req.tenantId!)))
    .returning();
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.json(parsePackage(pkg));
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [pkg] = await db
    .delete(packagesTable)
    .where(and(eq(packagesTable.id, id), eq(packagesTable.tenantId, req.tenantId!)))
    .returning();
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.sendStatus(204);
});

router.post("/packages/:id/sell", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const body = req.body as Record<string, unknown>;
  const { clientId, petId, startDate, startTime, notes } = body;

  if (!clientId || !petId || !startDate || !startTime) {
    res.status(400).json({ error: "clientId, petId, startDate e startTime são obrigatórios" });
    return;
  }

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(and(eq(packagesTable.id, id), eq(packagesTable.tenantId, req.tenantId!)));
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }

  const [ownerClientRow] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, Number(clientId)), eq(clientsTable.tenantId, req.tenantId!)));
  if (!ownerClientRow) { res.status(403).json({ error: "Acesso negado" }); return; }

  const [pet] = await db
    .select()
    .from(petsTable)
    .where(and(eq(petsTable.id, Number(petId)), eq(petsTable.clientId, Number(clientId))));
  if (!pet) { res.status(404).json({ error: "Pet não encontrado ou não pertence a este cliente" }); return; }

  const serviceItems = (pkg.serviceItems as ServiceItem[]) ?? [];
  const priceBySizes = (pkg.priceBySizes as PriceBySize[]) ?? [];

  if (serviceItems.length === 0) {
    res.status(400).json({ error: "Pacote sem serviços definidos" });
    return;
  }

  const priceEntry = priceBySizes.find(p => p.size === pet.size);
  const packagePrice = priceEntry ? priceEntry.price : 0;

  const sortedItems = [...serviceItems].sort((a, b) => b.quantity - a.quantity);
  const mainItem = sortedItems[0]!;
  const extraItems = sortedItems.slice(1);
  const numSessions = Math.min(mainItem.quantity, MAX_PACKAGE_SESSIONS);

  const allServices = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.tenantId, req.tenantId!));
  const mainService = allServices.find(s => s.name === mainItem.serviceName);
  const mainServiceId = mainService?.id ?? null;

  const [year, month, day] = (startDate as string).split("-").map(Number);
  const [hour, minute] = (startTime as string).split(":").map(Number);
  const baseDate = new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);

  const groupId = randomUUID();
  const insertedIds: number[] = [];

  for (let i = 0; i < numSessions; i++) {
    const scheduledDate = new Date(baseDate);
    scheduledDate.setDate(scheduledDate.getDate() + i * 7);

    const isLastSession = i === numSessions - 1;
    const extraNote =
      isLastSession && extraItems.length > 0
        ? `Inclui: ${extraItems.map(e => e.serviceName).join(" + ")}`
        : null;
    const sessionNotes = [notes as string | undefined, extraNote].filter(Boolean).join(" | ") || null;

    const [appt] = await db
      .insert(appointmentsTable)
      .values({
        tenantId: req.tenantId!,
        clientId: Number(clientId),
        petId: Number(petId),
        serviceId: mainServiceId,
        packageId: id,
        scheduledDate,
        status: "aguardando",
        totalPrice: "0",
        notes: sessionNotes,
        recurringGroupId: groupId,
        recurringWeeks: numSessions,
      })
      .returning();
    insertedIds.push(appt.id);
  }

  const dateStr = (startDate as string).substring(0, 10);
  const [financialEntry] = await db
    .insert(financialEntriesTable)
    .values({
      tenantId: req.tenantId!,
      type: "receita",
      description: `Venda de pacote: ${pkg.name} — ${pet.name}`,
      amount: String(packagePrice),
      date: dateStr,
      category: "Pacotes",
    })
    .returning();

  const appointments = await Promise.all(insertedIds.map(appId => getFullAppointment(appId)));

  res.status(201).json({
    appointments,
    financialEntry: { ...financialEntry, amount: parseFloat(financialEntry.amount) },
  });
});

export default router;

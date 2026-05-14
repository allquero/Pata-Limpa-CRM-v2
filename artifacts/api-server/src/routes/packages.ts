import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
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

const router: IRouter = Router();

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
  const raw = req.query as Record<string, string>;
  const tenantId = raw.tenantId ? Number(raw.tenantId) : undefined;
  const pkgs = await db
    .select()
    .from(packagesTable)
    .where(tenantId ? eq(packagesTable.tenantId, tenantId) : undefined)
    .orderBy(packagesTable.name);
  res.json(pkgs.map(parsePackage));
});

router.post("/packages", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.tenantId || !body.name) {
    res.status(400).json({ error: "tenantId e name são obrigatórios" });
    return;
  }
  const serviceItems: ServiceItem[] = Array.isArray(body.serviceItems) ? body.serviceItems : [];
  const priceBySizes: PriceBySize[] = Array.isArray(body.priceBySizes) ? body.priceBySizes : [];
  const [pkg] = await db
    .insert(packagesTable)
    .values({
      tenantId: Number(body.tenantId),
      name: String(body.name),
      description: body.description ? String(body.description) : null,
      serviceItems,
      priceBySizes,
    })
    .returning();
  res.status(201).json(parsePackage(pkg));
});

router.get("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, id));
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.json(parsePackage(pkg));
});

router.patch("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = String(body.name);
  if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
  if (body.serviceItems !== undefined) updateData.serviceItems = Array.isArray(body.serviceItems) ? body.serviceItems : [];
  if (body.priceBySizes !== undefined) updateData.priceBySizes = Array.isArray(body.priceBySizes) ? body.priceBySizes : [];
  const [pkg] = await db.update(packagesTable).set(updateData).where(eq(packagesTable.id, id)).returning();
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.json(parsePackage(pkg));
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [pkg] = await db.delete(packagesTable).where(eq(packagesTable.id, id)).returning();
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  res.sendStatus(204);
});

router.post("/packages/:id/sell", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const body = req.body as Record<string, unknown>;
  const { tenantId, clientId, petId, startDate, startTime, notes } = body;

  if (!tenantId || !clientId || !petId || !startDate || !startTime) {
    res.status(400).json({ error: "tenantId, clientId, petId, startDate e startTime são obrigatórios" });
    return;
  }

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, id));
  if (!pkg) { res.status(404).json({ error: "Pacote não encontrado" }); return; }

  const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, Number(petId)));
  if (!pet) { res.status(404).json({ error: "Pet não encontrado" }); return; }

  const serviceItems = (pkg.serviceItems as ServiceItem[]) ?? [];
  const priceBySizes = (pkg.priceBySizes as PriceBySize[]) ?? [];

  if (serviceItems.length === 0) {
    res.status(400).json({ error: "Pacote sem serviços definidos" });
    return;
  }

  const priceEntry = priceBySizes.find(p => p.size === pet.size);
  const packagePrice = priceEntry ? priceEntry.price : 0;

  // Main item = highest quantity (usually the bath service)
  const sortedItems = [...serviceItems].sort((a, b) => b.quantity - a.quantity);
  const mainItem = sortedItems[0]!;
  const extraItems = sortedItems.slice(1);
  const numSessions = mainItem.quantity;

  // Look up serviceId for the main service by name
  const allServices = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.tenantId, Number(tenantId)));
  const mainService = allServices.find(s => s.name === mainItem.serviceName);
  const mainServiceId = mainService?.id ?? null;

  // Build base datetime from "YYYY-MM-DD" + "HH:MM"
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
        tenantId: Number(tenantId),
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
      tenantId: Number(tenantId),
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

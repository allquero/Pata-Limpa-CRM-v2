import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, petsTable, clientsTable, servicesTable, packagesTable } from "@workspace/db";
import type { AppointmentStatus } from "@workspace/db";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
  UpdateAppointmentStatusParams,
  UpdateAppointmentStatusBody,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { requireTenant } from "../middlewares/requireTenant";

async function verifyEntitiesBelongToTenant(
  tenantId: number,
  refs: { clientId?: number; petId?: number; serviceId?: number | null; packageId?: number | null },
): Promise<string | null> {
  const { clientId, petId, serviceId, packageId } = refs;

  if (clientId != null) {
    const [c] = await db.select({ id: clientsTable.id }).from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, tenantId)));
    if (!c) return "clientId não pertence a este tenant";
  }

  if (petId != null) {
    const rows = await db.select({ id: petsTable.id }).from(petsTable)
      .innerJoin(clientsTable, and(eq(petsTable.clientId, clientsTable.id), eq(clientsTable.tenantId, tenantId)))
      .where(eq(petsTable.id, petId));
    if (!rows[0]) return "petId não pertence a este tenant";
  }

  if (serviceId != null) {
    const [s] = await db.select({ id: servicesTable.id }).from(servicesTable)
      .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.tenantId, tenantId)));
    if (!s) return "serviceId não pertence a este tenant";
  }

  if (packageId != null) {
    const [p] = await db.select({ id: packagesTable.id }).from(packagesTable)
      .where(and(eq(packagesTable.id, packageId), eq(packagesTable.tenantId, tenantId)));
    if (!p) return "packageId não pertence a este tenant";
  }

  return null;
}

const router: IRouter = Router();

router.use(requireTenant);

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

router.get("/appointments", async (req, res): Promise<void> => {
  const rawQuery = req.query as Record<string, string>;
  const petId = rawQuery.petId ? Number(rawQuery.petId) : undefined;
  const clientId = rawQuery.clientId ? Number(rawQuery.clientId) : undefined;
  const status = rawQuery.status as AppointmentStatus | undefined;
  const date = rawQuery.date ? new Date(rawQuery.date) : undefined;
  const startDate = rawQuery.startDate ? new Date(rawQuery.startDate) : undefined;
  const endDate = rawQuery.endDate ? new Date(rawQuery.endDate) : undefined;

  const conditions = [eq(appointmentsTable.tenantId, req.tenantId!)];
  if (status) conditions.push(eq(appointmentsTable.status, status as AppointmentStatus));
  if (petId) conditions.push(eq(appointmentsTable.petId, petId));
  if (clientId) conditions.push(eq(appointmentsTable.clientId, clientId));
  if (date) {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(appointmentsTable.scheduledDate, start));
    conditions.push(lte(appointmentsTable.scheduledDate, end));
  } else {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(appointmentsTable.scheduledDate, start));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(appointmentsTable.scheduledDate, end));
    }
  }

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
    .where(and(...conditions))
    .orderBy(appointmentsTable.scheduledDate);

  const result = rows.map(row => ({
    ...row.appointment,
    totalPrice: parseFloat(row.appointment.totalPrice),
    pet: row.pet!,
    client: row.client!,
    service: row.service?.id ? { ...row.service, price: parseFloat(row.service.price) } : null,
    package: row.package?.id ? row.package : null,
  }));

  res.json(result);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { recurringWeeks, ...baseData } = parsed.data;

  const ownershipError = await verifyEntitiesBelongToTenant(req.tenantId!, {
    clientId: baseData.clientId,
    petId: baseData.petId,
    serviceId: baseData.serviceId,
    packageId: baseData.packageId,
  });
  if (ownershipError) {
    res.status(403).json({ error: ownershipError });
    return;
  }

  const weeks = Math.min(recurringWeeks && recurringWeeks > 1 ? recurringWeeks : 1, 52);
  const groupId = weeks > 1 ? randomUUID() : null;
  const baseDate = new Date(baseData.scheduledDate);

  const insertedIds: number[] = [];

  for (let i = 0; i < weeks; i++) {
    const scheduledDate = new Date(baseDate);
    scheduledDate.setDate(scheduledDate.getDate() + i * 7);

    const [appt] = await db.insert(appointmentsTable).values({
      ...baseData,
      tenantId: req.tenantId!,
      totalPrice: String(baseData.totalPrice),
      scheduledDate,
      recurringWeeks: weeks > 1 ? weeks : null,
      recurringGroupId: groupId,
    }).returning();
    insertedIds.push(appt.id);
  }

  const appointments = await Promise.all(insertedIds.map(id => getFullAppointment(id)));
  res.status(201).json(appointments);
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const appt = await getFullAppointment(params.data.id);
  if (!appt || appt.tenantId !== req.tenantId!) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.json(appt);
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select({ id: appointmentsTable.id })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.tenantId, req.tenantId!)));
  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const ownershipError = await verifyEntitiesBelongToTenant(req.tenantId!, {
    petId: parsed.data.petId ?? undefined,
    serviceId: parsed.data.serviceId,
    packageId: parsed.data.packageId,
  });
  if (ownershipError) {
    res.status(403).json({ error: ownershipError });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.totalPrice !== undefined) updateData.totalPrice = String(parsed.data.totalPrice);
  if (parsed.data.scheduledDate !== undefined) updateData.scheduledDate = new Date(parsed.data.scheduledDate);
  await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, params.data.id));
  const appt = await getFullAppointment(params.data.id);
  if (!appt) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.json(appt);
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [appt] = await db
    .delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.tenantId, req.tenantId!)))
    .returning();
  if (!appt) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/appointments/:id/status", async (req, res): Promise<void> => {
  const params = UpdateAppointmentStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select({ id: appointmentsTable.id })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.tenantId, req.tenantId!)));
  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  await db.update(appointmentsTable).set({ status: parsed.data.status }).where(eq(appointmentsTable.id, params.data.id));
  const appt = await getFullAppointment(params.data.id);
  if (!appt) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.json(appt);
});

export default router;

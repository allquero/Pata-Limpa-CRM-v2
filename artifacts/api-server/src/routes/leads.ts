import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, clientsTable, appointmentsTable, petsTable } from "@workspace/db";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/leads", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const minDaysSince = raw.minDaysSince ? Number(raw.minDaysSince) : undefined;

  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.tenantId, req.tenantId!));

  const leads = await Promise.all(clients.map(async (client) => {
    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.clientId, client.id))
      .orderBy(desc(appointmentsTable.scheduledDate));

    const pets = await db
      .select({ id: petsTable.id, name: petsTable.name, size: petsTable.size })
      .from(petsTable)
      .where(eq(petsTable.clientId, client.id));

    const lastAppt = appointments[0];
    let daysSinceLastAppointment: number | null = null;
    if (lastAppt) {
      const diff = Date.now() - new Date(lastAppt.scheduledDate).getTime();
      daysSinceLastAppointment = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    return {
      clientId: client.id,
      clientName: client.name,
      phone: client.phone ?? null,
      daysSinceLastAppointment,
      lastAppointmentDate: lastAppt?.scheduledDate?.toISOString() ?? null,
      totalAppointments: appointments.length,
      pets,
    };
  }));

  const filtered = minDaysSince != null
    ? leads.filter(l => l.daysSinceLastAppointment == null || l.daysSinceLastAppointment >= minDaysSince)
    : leads;

  res.json(filtered);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, appointmentsTable, clientsTable, financialEntriesTable, petsTable, servicesTable, packagesTable } from "@workspace/db";
import type { FinancialType } from "@workspace/db";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

const toDateStr = (d: string): string => d.substring(0, 10);

router.get("/reports/revenue", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const startDate = raw.startDate ? toDateStr(raw.startDate) : undefined;
  const endDate = raw.endDate ? toDateStr(raw.endDate) : undefined;

  const conditions = [
    eq(financialEntriesTable.type, "receita" as FinancialType),
    eq(financialEntriesTable.tenantId, req.tenantId!),
  ];
  if (startDate) conditions.push(gte(financialEntriesTable.date, startDate) as any);
  if (endDate) conditions.push(lte(financialEntriesTable.date, endDate) as any);

  const entries = await db
    .select()
    .from(financialEntriesTable)
    .where(and(...conditions))
    .orderBy(financialEntriesTable.date);

  const totalRevenue = entries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalAppointments = entries.length;
  const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  const byPeriod: Record<string, { revenue: number; count: number }> = {};
  for (const e of entries) {
    const period = e.date.substring(0, 7);
    if (!byPeriod[period]) byPeriod[period] = { revenue: 0, count: 0 };
    byPeriod[period].revenue += parseFloat(e.amount);
    byPeriod[period].count += 1;
  }

  const data = Object.entries(byPeriod).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => ({
    period,
    revenue: v.revenue,
    count: v.count,
  }));

  res.json({ totalRevenue, totalAppointments, averageTicket, data });
});

router.get("/reports/appointments", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const startDate = raw.startDate ? new Date(raw.startDate) : undefined;
  const endDate = raw.endDate ? new Date(raw.endDate) : undefined;

  const apptConditions = [eq(appointmentsTable.tenantId, req.tenantId!)];
  if (startDate) {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    apptConditions.push(gte(appointmentsTable.scheduledDate, s));
  }
  if (endDate) {
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    apptConditions.push(lte(appointmentsTable.scheduledDate, e));
  }

  const rows = await db
    .select({ appointment: appointmentsTable, pet: petsTable })
    .from(appointmentsTable)
    .leftJoin(petsTable, eq(appointmentsTable.petId, petsTable.id))
    .where(and(...apptConditions));

  const total = rows.length;
  const statusCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};
  const dateCounts: Record<string, number> = {};

  for (const { appointment, pet } of rows) {
    statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
    if (pet?.size) sizeCounts[pet.size] = (sizeCounts[pet.size] || 0) + 1;
    const date = appointment.scheduledDate.toISOString().substring(0, 10);
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  }

  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const bySize = Object.entries(sizeCounts).map(([size, count]) => ({ size, count })).sort((a, b) => b.count - a.count);
  const data = Object.entries(dateCounts).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

  res.json({ total, byStatus, bySize, data });
});

router.get("/reports/top-clients", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const maxLimit = raw.limit ? Number(raw.limit) : 10;

  const appts = await db
    .select({ appointment: appointmentsTable, client: clientsTable })
    .from(appointmentsTable)
    .leftJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .where(eq(appointmentsTable.tenantId, req.tenantId!))
    .orderBy(desc(appointmentsTable.scheduledDate));

  const byClient: Record<number, { clientId: number; clientName: string; totalRevenue: number; totalAppointments: number; lastAppointmentDate: string | null }> = {};
  for (const { appointment, client } of appts) {
    if (!client) continue;
    if (!byClient[client.id]) {
      byClient[client.id] = { clientId: client.id, clientName: client.name, totalRevenue: 0, totalAppointments: 0, lastAppointmentDate: null };
    }
    byClient[client.id].totalRevenue += parseFloat(appointment.totalPrice);
    byClient[client.id].totalAppointments += 1;
    if (!byClient[client.id].lastAppointmentDate) byClient[client.id].lastAppointmentDate = appointment.scheduledDate.toISOString();
  }

  const result = Object.values(byClient).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, maxLimit);
  res.json(result);
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); monthEnd.setHours(23, 59, 59, 999);

  const tenantFilter = eq(appointmentsTable.tenantId, req.tenantId!);

  const [todayAppts, weekAppts, allClients, pendingAppts] = await Promise.all([
    db.select().from(appointmentsTable).where(and(tenantFilter, gte(appointmentsTable.scheduledDate, todayStart), lte(appointmentsTable.scheduledDate, todayEnd))),
    db.select().from(appointmentsTable).where(and(tenantFilter, gte(appointmentsTable.scheduledDate, weekStart), lte(appointmentsTable.scheduledDate, weekEnd))),
    db.select().from(clientsTable).where(eq(clientsTable.tenantId, req.tenantId!)),
    db.select().from(appointmentsTable).where(and(tenantFilter, eq(appointmentsTable.status, "aguardando"))),
  ]);

  const monthStartStr = monthStart.toISOString().substring(0, 10);
  const monthEndStr = monthEnd.toISOString().substring(0, 10);
  const financialConditions = [
    eq(financialEntriesTable.type, "receita" as FinancialType),
    gte(financialEntriesTable.date, monthStartStr),
    lte(financialEntriesTable.date, monthEndStr),
    eq(financialEntriesTable.tenantId, req.tenantId!),
  ];

  const monthEntries = await db.select().from(financialEntriesTable).where(and(...financialConditions));
  const monthRevenue = monthEntries.reduce((s, e) => s + parseFloat(e.amount), 0);

  const recentRows = await db
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
    .where(tenantFilter)
    .orderBy(desc(appointmentsTable.scheduledDate))
    .limit(5);

  const recentAppointments = recentRows.map(row => ({
    ...row.appointment,
    totalPrice: parseFloat(row.appointment.totalPrice),
    pet: row.pet!,
    client: row.client!,
    service: row.service?.id ? { ...row.service, price: parseFloat(row.service.price) } : null,
    package: row.package?.id ? row.package : null,
  }));

  res.json({
    todayAppointments: todayAppts.length,
    weekAppointments: weekAppts.length,
    monthRevenue,
    activeClients: allClients.length,
    pendingAppointments: pendingAppts.length,
    recentAppointments,
  });
});

export default router;

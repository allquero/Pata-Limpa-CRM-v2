import { Router, type IRouter } from "express";
import { eq, notInArray, desc, and } from "drizzle-orm";
import { db, tenantsTable, usersTable, adminSalesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(requireAdmin);

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isOptionalString(v: unknown): v is string | undefined | null {
  return v === undefined || v === null || typeof v === "string";
}

router.get("/admin/pending-users", async (req, res): Promise<void> => {
  const usersWithTenants = db
    .select({ userId: tenantsTable.userId })
    .from(tenantsTable);

  const pendingUsers = await db
    .select()
    .from(usersTable)
    .where(notInArray(usersTable.id, usersWithTenants));

  res.json(pendingUsers);
});

router.get("/admin/tenants", async (_req, res): Promise<void> => {
  const tenants = await db
    .select()
    .from(tenantsTable)
    .orderBy(desc(tenantsTable.createdAt));
  res.json(tenants);
});

router.post("/admin/tenants", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!isString(body.userId) || !isString(body.name)) {
    res.status(400).json({ error: "userId e name são obrigatórios" });
    return;
  }
  const existing = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.userId, body.userId));
  if (existing.length > 0) {
    res.status(400).json({ error: "Usuário já possui um pet shop cadastrado" });
    return;
  }
  const [tenant] = await db
    .insert(tenantsTable)
    .values({
      userId: body.userId,
      name: body.name,
      phone: typeof body.phone === "string" && body.phone ? body.phone : null,
      email: typeof body.email === "string" && body.email ? body.email : null,
      address: typeof body.address === "string" && body.address ? body.address : null,
      accessStart: typeof body.accessStart === "string" && body.accessStart ? body.accessStart : null,
      accessEnd: typeof body.accessEnd === "string" && body.accessEnd ? body.accessEnd : null,
    })
    .returning();
  res.status(201).json(tenant);
});

router.patch("/admin/tenants/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (isOptionalString(body.phone)) update.phone = body.phone || null;
  if (isOptionalString(body.email)) update.email = body.email || null;
  if (isOptionalString(body.address)) update.address = body.address || null;
  if (isOptionalString(body.accessStart)) update.accessStart = body.accessStart || null;
  if (isOptionalString(body.accessEnd)) update.accessEnd = body.accessEnd || null;
  const [tenant] = await db
    .update(tenantsTable)
    .set(update)
    .where(eq(tenantsTable.id, id))
    .returning();
  if (!tenant) {
    res.status(404).json({ error: "Pet shop não encontrado" });
    return;
  }
  res.json(tenant);
});

router.delete("/admin/tenants/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
  res.status(204).end();
});

router.get("/admin/sales", async (_req, res): Promise<void> => {
  const sales = await db
    .select()
    .from(adminSalesTable)
    .orderBy(desc(adminSalesTable.paidAt));

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthTotal = 0;
  let yearTotal = 0;
  let allTimeTotal = 0;

  for (const sale of sales) {
    const amount = Number(sale.amount);
    const saleDate = new Date(sale.paidAt);
    allTimeTotal += amount;
    if (saleDate.getFullYear() === currentYear) {
      yearTotal += amount;
      if (saleDate.getMonth() === currentMonth) {
        monthTotal += amount;
      }
    }
  }

  res.json({ sales, monthTotal, yearTotal, allTimeTotal });
});

router.post("/admin/sales", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const tenantId = Number(body.tenantId);
  const amount = Number(body.amount);
  if (isNaN(tenantId) || tenantId <= 0) {
    res.status(400).json({ error: "tenantId inválido" });
    return;
  }
  if (!isString(body.description) || !isString(body.paidAt) || !isString(body.periodStart) || !isString(body.periodEnd)) {
    res.status(400).json({ error: "description, paidAt, periodStart e periodEnd são obrigatórios" });
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "amount inválido" });
    return;
  }
  const periodStart = body.periodStart as string;
  const periodEnd = body.periodEnd as string;
  const saleData = { description: body.description as string, amount: String(amount), paidAt: body.paidAt as string };

  const [existingTenant] = await db
    .select({ id: tenantsTable.id, accessEnd: tenantsTable.accessEnd })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  if (!existingTenant) {
    res.status(404).json({ error: "Pet shop não encontrado" });
    return;
  }

  const [sale] = await db
    .insert(adminSalesTable)
    .values({ tenantId, periodStart, periodEnd, ...saleData })
    .returning();

  const today = new Date().toISOString().slice(0, 10);
  const currentEnd = existingTenant.accessEnd;
  const newEnd = currentEnd && currentEnd > today && currentEnd > periodEnd
    ? currentEnd
    : periodEnd;

  const currentStart = await db
    .select({ accessStart: tenantsTable.accessStart })
    .from(tenantsTable)
    .where(and(eq(tenantsTable.id, tenantId)));

  const existingStart = currentStart[0]?.accessStart;
  const newStart = existingStart && existingStart <= periodStart
    ? existingStart
    : periodStart;

  await db
    .update(tenantsTable)
    .set({ accessStart: newStart, accessEnd: newEnd, updatedAt: new Date() })
    .where(eq(tenantsTable.id, tenantId));

  res.status(201).json(sale);
});

router.delete("/admin/sales/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(adminSalesTable).where(eq(adminSalesTable.id, id));
  res.status(204).end();
});

export default router;

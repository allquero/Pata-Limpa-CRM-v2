import bcrypt from "bcryptjs";
import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
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

router.get("/admin/pending-users", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: tenantsTable.id,
      name: tenantsTable.name,
      userId: tenantsTable.userId,
      loginEmail: usersTable.email,
      hasCredentials: usersTable.passwordHash,
    })
    .from(tenantsTable)
    .leftJoin(usersTable, eq(tenantsTable.userId, usersTable.id));

  const pending = rows.filter((r) => !r.userId || !r.hasCredentials);
  res.json(pending);
});

router.get("/admin/tenants", async (_req, res): Promise<void> => {
  const tenants = await db
    .select({
      id: tenantsTable.id,
      userId: tenantsTable.userId,
      name: tenantsTable.name,
      phone: tenantsTable.phone,
      email: tenantsTable.email,
      address: tenantsTable.address,
      accessStart: tenantsTable.accessStart,
      accessEnd: tenantsTable.accessEnd,
      createdAt: tenantsTable.createdAt,
      loginEmail: usersTable.email,
    })
    .from(tenantsTable)
    .leftJoin(usersTable, eq(tenantsTable.userId, usersTable.id))
    .orderBy(desc(tenantsTable.createdAt));
  res.json(tenants);
});

router.post("/admin/tenants", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  if (
    !isString(body.loginEmail) ||
    !isString(body.loginPassword) ||
    !isString(body.name)
  ) {
    res
      .status(400)
      .json({ error: "loginEmail, loginPassword e name são obrigatórios" });
    return;
  }

  const loginEmail = (body.loginEmail as string).trim().toLowerCase();

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, loginEmail));

  if (existingUser) {
    res.status(400).json({ error: "Este e-mail já está em uso" });
    return;
  }

  const passwordHash = await bcrypt.hash(body.loginPassword as string, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: loginEmail,
      passwordHash,
      isAdmin: false,
      firstName:
        typeof body.name === "string"
          ? (body.name as string).trim()
          : null,
      lastName: null,
      profileImageUrl: null,
    })
    .returning();

  const [tenant] = await db
    .insert(tenantsTable)
    .values({
      userId: user.id,
      name: (body.name as string).trim(),
      phone:
        typeof body.phone === "string" && body.phone
          ? body.phone
          : null,
      email:
        typeof body.email === "string" && body.email
          ? body.email
          : null,
      address:
        typeof body.address === "string" && body.address
          ? body.address
          : null,
      accessStart:
        typeof body.accessStart === "string" && body.accessStart
          ? body.accessStart
          : null,
      accessEnd:
        typeof body.accessEnd === "string" && body.accessEnd
          ? body.accessEnd
          : null,
    })
    .returning();

  res.status(201).json({ ...tenant, loginEmail });
});

router.patch("/admin/tenants/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim())
    update.name = body.name.trim();
  if (isOptionalString(body.phone)) update.phone = body.phone || null;
  if (isOptionalString(body.email)) update.email = body.email || null;
  if (isOptionalString(body.address)) update.address = body.address || null;
  if (isOptionalString(body.accessStart))
    update.accessStart = body.accessStart || null;
  if (isOptionalString(body.accessEnd))
    update.accessEnd = body.accessEnd || null;
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

router.patch("/admin/tenants/:id/password", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!isString(body.newPassword)) {
    res.status(400).json({ error: "newPassword é obrigatório" });
    return;
  }

  const [tenant] = await db
    .select({ userId: tenantsTable.userId })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, id));

  if (!tenant?.userId) {
    res
      .status(404)
      .json({ error: "Pet shop não encontrado ou sem usuário vinculado" });
    return;
  }

  const passwordHash = await bcrypt.hash(body.newPassword as string, 12);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, tenant.userId));

  res.json({ ok: true });
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
  if (
    !isString(body.description) ||
    !isString(body.paidAt) ||
    !isString(body.periodStart) ||
    !isString(body.periodEnd)
  ) {
    res
      .status(400)
      .json({
        error:
          "description, paidAt, periodStart e periodEnd são obrigatórios",
      });
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "amount inválido" });
    return;
  }
  const periodStart = body.periodStart as string;
  const periodEnd = body.periodEnd as string;
  if (periodEnd < periodStart) {
    res
      .status(400)
      .json({
        error: "periodEnd deve ser maior ou igual a periodStart",
      });
    return;
  }
  const saleData = {
    description: body.description as string,
    amount: String(amount),
    paidAt: body.paidAt as string,
  };

  const [existingTenant] = await db
    .select({
      id: tenantsTable.id,
      accessEnd: tenantsTable.accessEnd,
      accessStart: tenantsTable.accessStart,
    })
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

  const soldStart = new Date(periodStart);
  const soldEnd = new Date(periodEnd);
  const soldDays = Math.round(
    (soldEnd.getTime() - soldStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const today = new Date().toISOString().slice(0, 10);
  const currentEnd = existingTenant.accessEnd;
  const currentAccessStart = existingTenant.accessStart;

  let newEnd: string;
  if (currentEnd && currentEnd >= today) {
    const extendFrom = new Date(currentEnd);
    extendFrom.setDate(extendFrom.getDate() + soldDays);
    newEnd = extendFrom.toISOString().slice(0, 10);
  } else {
    newEnd = periodEnd;
  }

  const newStart =
    currentAccessStart && currentAccessStart <= periodStart
      ? currentAccessStart
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

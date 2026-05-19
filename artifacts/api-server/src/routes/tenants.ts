import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import {
  UpdateTenantBody,
  UpdateTenantParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/tenants", async (req, res): Promise<void> => {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, req.tenantId!));
  if (!tenant) {
    res.status(404).json({ error: "Tenant não encontrado" });
    return;
  }
  res.json([tenant]);
});

router.get("/tenants/:id", async (req, res): Promise<void> => {
  const params = UpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (params.data.id !== req.tenantId!) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, req.tenantId!));
  if (!tenant) {
    res.status(404).json({ error: "Tenant não encontrado" });
    return;
  }
  res.json(tenant);
});

router.patch("/tenants/:id", async (req, res): Promise<void> => {
  const params = UpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (params.data.id !== req.tenantId!) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tenant] = await db
    .update(tenantsTable)
    .set(parsed.data)
    .where(and(eq(tenantsTable.id, req.tenantId!), eq(tenantsTable.userId, req.user!.id)))
    .returning();
  if (!tenant) {
    res.status(404).json({ error: "Tenant não encontrado" });
    return;
  }
  res.json(tenant);
});

export default router;

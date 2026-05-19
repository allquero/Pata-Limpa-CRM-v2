import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  CreateServiceBody,
  UpdateServiceBody,
  GetServiceParams,
  UpdateServiceParams,
  DeleteServiceParams,
  ListServicesQueryParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/services", async (req, res): Promise<void> => {
  const query = ListServicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.tenantId, req.tenantId!))
    .orderBy(servicesTable.name);
  res.json(services.map(s => ({ ...s, price: parseFloat(s.price) })));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db
    .insert(servicesTable)
    .values({ ...parsed.data, tenantId: req.tenantId!, price: String(parsed.data.price) })
    .returning();
  res.status(201).json({ ...service, price: parseFloat(service.price) });
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.tenantId, req.tenantId!)));
  if (!service) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }
  res.json({ ...service, price: parseFloat(service.price) });
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  const [service] = await db
    .update(servicesTable)
    .set(updateData)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.tenantId, req.tenantId!)))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }
  res.json({ ...service, price: parseFloat(service.price) });
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db
    .delete(servicesTable)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.tenantId, req.tenantId!)))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;

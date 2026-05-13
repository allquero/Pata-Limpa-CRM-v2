import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, packagesTable } from "@workspace/db";
import type { ServiceItem, PriceBySize } from "@workspace/db";

const router: IRouter = Router();

const parsePackage = (pkg: typeof packagesTable.$inferSelect) => ({
  ...pkg,
  serviceItems: (pkg.serviceItems as ServiceItem[]) ?? [],
  priceBySizes: (pkg.priceBySizes as PriceBySize[]) ?? [],
});

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

export default router;

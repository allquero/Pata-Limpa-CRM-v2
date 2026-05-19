import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, petsTable, clientsTable } from "@workspace/db";
import {
  CreatePetBody,
  UpdatePetBody,
  GetPetParams,
  UpdatePetParams,
  DeletePetParams,
  ListPetsQueryParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/pets", async (req, res): Promise<void> => {
  const query = ListPetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId } = query.data;

  if (clientId) {
    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, req.tenantId!)));
    if (!client) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    const pets = await db.select().from(petsTable).where(eq(petsTable.clientId, clientId)).orderBy(petsTable.name);
    res.json(pets);
    return;
  }

  const pets = await db
    .select({ id: petsTable.id, clientId: petsTable.clientId, name: petsTable.name, breed: petsTable.breed, size: petsTable.size, notes: petsTable.notes, createdAt: petsTable.createdAt, updatedAt: petsTable.updatedAt })
    .from(petsTable)
    .innerJoin(clientsTable, eq(petsTable.clientId, clientsTable.id))
    .where(eq(clientsTable.tenantId, req.tenantId!))
    .orderBy(petsTable.name);
  res.json(pets);
});

router.post("/pets", async (req, res): Promise<void> => {
  const parsed = CreatePetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ownerClient] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.tenantId, req.tenantId!)));
  if (!ownerClient) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  const [pet] = await db.insert(petsTable).values(parsed.data).returning();
  res.status(201).json(pet);
});

router.get("/pets/:id", async (req, res): Promise<void> => {
  const params = GetPetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({ id: petsTable.id, clientId: petsTable.clientId, name: petsTable.name, breed: petsTable.breed, size: petsTable.size, notes: petsTable.notes, createdAt: petsTable.createdAt, updatedAt: petsTable.updatedAt })
    .from(petsTable)
    .innerJoin(clientsTable, and(eq(petsTable.clientId, clientsTable.id), eq(clientsTable.tenantId, req.tenantId!)))
    .where(eq(petsTable.id, params.data.id));
  if (!rows[0]) {
    res.status(404).json({ error: "Pet não encontrado" });
    return;
  }
  res.json(rows[0]);
});

router.patch("/pets/:id", async (req, res): Promise<void> => {
  const params = UpdatePetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select({ id: petsTable.id })
    .from(petsTable)
    .innerJoin(clientsTable, and(eq(petsTable.clientId, clientsTable.id), eq(clientsTable.tenantId, req.tenantId!)))
    .where(eq(petsTable.id, params.data.id));
  if (!rows[0]) {
    res.status(404).json({ error: "Pet não encontrado" });
    return;
  }
  const [pet] = await db.update(petsTable).set(parsed.data).where(eq(petsTable.id, params.data.id)).returning();
  res.json(pet);
});

router.delete("/pets/:id", async (req, res): Promise<void> => {
  const params = DeletePetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({ id: petsTable.id })
    .from(petsTable)
    .innerJoin(clientsTable, and(eq(petsTable.clientId, clientsTable.id), eq(clientsTable.tenantId, req.tenantId!)))
    .where(eq(petsTable.id, params.data.id));
  if (!rows[0]) {
    res.status(404).json({ error: "Pet não encontrado" });
    return;
  }
  await db.delete(petsTable).where(eq(petsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

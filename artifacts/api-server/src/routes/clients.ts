import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, clientsTable, petsTable } from "@workspace/db";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
  ListClientsQueryParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/clients", async (req, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { search } = query.data;

  const conditions = [eq(clientsTable.tenantId, req.tenantId!)];
  if (search) conditions.push(ilike(clientsTable.name, `%${search}%`));

  const clients = await db
    .select()
    .from(clientsTable)
    .where(and(...conditions))
    .orderBy(clientsTable.name);

  res.json(clients);
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db
    .insert(clientsTable)
    .values({ ...parsed.data, tenantId: req.tenantId! })
    .returning();
  res.status(201).json(client);
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.tenantId, req.tenantId!)));
  if (!client) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  const pets = await db.select().from(petsTable).where(eq(petsTable.clientId, params.data.id));
  res.json({ ...client, pets });
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.tenantId, req.tenantId!)))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.json(client);
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.tenantId, req.tenantId!)))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;

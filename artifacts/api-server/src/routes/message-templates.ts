import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, messageTemplatesTable } from "@workspace/db";
import {
  CreateMessageTemplateBody,
  UpdateMessageTemplateBody,
  GetMessageTemplateParams,
  UpdateMessageTemplateParams,
  DeleteMessageTemplateParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.get("/message-templates", async (req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(messageTemplatesTable)
    .where(eq(messageTemplatesTable.tenantId, req.tenantId!))
    .orderBy(messageTemplatesTable.name);
  res.json(templates);
});

router.post("/message-templates", async (req, res): Promise<void> => {
  const parsed = CreateMessageTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db
    .insert(messageTemplatesTable)
    .values({ ...parsed.data, tenantId: req.tenantId! })
    .returning();
  res.status(201).json(template);
});

router.get("/message-templates/:id", async (req, res): Promise<void> => {
  const params = GetMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [template] = await db
    .select()
    .from(messageTemplatesTable)
    .where(and(eq(messageTemplatesTable.id, params.data.id), eq(messageTemplatesTable.tenantId, req.tenantId!)));
  if (!template) {
    res.status(404).json({ error: "Template não encontrado" });
    return;
  }
  res.json(template);
});

router.patch("/message-templates/:id", async (req, res): Promise<void> => {
  const params = UpdateMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMessageTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db
    .update(messageTemplatesTable)
    .set(parsed.data)
    .where(and(eq(messageTemplatesTable.id, params.data.id), eq(messageTemplatesTable.tenantId, req.tenantId!)))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Template não encontrado" });
    return;
  }
  res.json(template);
});

router.delete("/message-templates/:id", async (req, res): Promise<void> => {
  const params = DeleteMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [template] = await db
    .delete(messageTemplatesTable)
    .where(and(eq(messageTemplatesTable.id, params.data.id), eq(messageTemplatesTable.tenantId, req.tenantId!)))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Template não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

const FALLBACK_PHONE = process.env.VITE_ADMIN_WHATSAPP ?? "5511999999999";
const FALLBACK_MESSAGE = "Olá! Quero conhecer o Pata Limpa CRM para meu pet shop.";

router.get("/config/landing", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "landing_whatsapp_phone"));

  const msgRows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "landing_whatsapp_message"));

  res.json({
    phone: rows[0]?.value ?? FALLBACK_PHONE,
    message: msgRows[0]?.value ?? FALLBACK_MESSAGE,
  });
});

export default router;

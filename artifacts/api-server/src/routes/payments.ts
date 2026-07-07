import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  paymentsTable,
  appointmentsTable,
  packageSalesTable,
  clientsTable,
} from "@workspace/db";
import {
  CreatePaymentBody,
  DeletePaymentParams,
} from "@workspace/api-zod";
import { requireTenant } from "../middlewares/requireTenant";

const router: IRouter = Router();

router.use(requireTenant);

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, appointmentId, packageSaleId, amount, paymentDate, paymentMethod, notes } = parsed.data;

  // Exactly one of appointmentId / packageSaleId must be present
  const hasAppt = appointmentId != null;
  const hasPkg = packageSaleId != null;
  if ((!hasAppt && !hasPkg) || (hasAppt && hasPkg)) {
    res.status(400).json({ error: "Forneça exatamente um de: appointmentId ou packageSaleId" });
    return;
  }

  // Verify client belongs to tenant
  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, req.tenantId!)));
  if (!client) {
    res.status(403).json({ error: "Cliente não pertence a este tenant" });
    return;
  }

  // Verify the linked record belongs to this tenant AND to the same clientId
  if (hasAppt) {
    const [appt] = await db
      .select({ id: appointmentsTable.id, clientId: appointmentsTable.clientId })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, appointmentId!), eq(appointmentsTable.tenantId, req.tenantId!)));
    if (!appt) {
      res.status(403).json({ error: "Agendamento não pertence a este tenant" });
      return;
    }
    if (appt.clientId !== clientId) {
      res.status(400).json({ error: "Agendamento não pertence a este cliente" });
      return;
    }
  }

  if (hasPkg) {
    const [ps] = await db
      .select({ id: packageSalesTable.id, clientId: packageSalesTable.clientId })
      .from(packageSalesTable)
      .where(and(eq(packageSalesTable.id, packageSaleId!), eq(packageSalesTable.tenantId, req.tenantId!)));
    if (!ps) {
      res.status(403).json({ error: "Venda de pacote não pertence a este tenant" });
      return;
    }
    if (ps.clientId !== clientId) {
      res.status(400).json({ error: "Venda de pacote não pertence a este cliente" });
      return;
    }
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      tenantId: req.tenantId!,
      clientId,
      appointmentId: appointmentId ?? null,
      packageSaleId: packageSaleId ?? null,
      amount: String(amount),
      paymentDate: paymentDate instanceof Date
        ? paymentDate.toISOString().substring(0, 10)
        : String(paymentDate),
      paymentMethod: paymentMethod ?? null,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json({
    ...payment,
    amount: parseFloat(payment.amount),
  });
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db
    .delete(paymentsTable)
    .where(and(eq(paymentsTable.id, params.data.id), eq(paymentsTable.tenantId, req.tenantId!)))
    .returning();

  if (!payment) {
    res.status(404).json({ error: "Pagamento não encontrado" });
    return;
  }

  res.sendStatus(204);
});

export default router;

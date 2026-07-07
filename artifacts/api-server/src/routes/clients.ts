import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, ilike, inArray } from "drizzle-orm";
import multer from "multer";
import {
  db,
  clientsTable,
  petsTable,
  appointmentsTable,
  servicesTable,
  packageSalesTable,
  packagesTable,
  paymentsTable,
} from "@workspace/db";
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireTenant);

// ── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "nome_cliente", "telefone", "email", "endereco", "notas_cliente",
  "nome_pet", "raca", "porte", "sexo", "castrado",
  "pelagem", "comportamento", "saude", "preferencias_tosa", "notas_pet",
];

function escapeCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvRow(cells: unknown[]): string {
  return cells.map(escapeCell).join(",");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}


// ── Client History ───────────────────────────────────────────────────────────

router.get("/clients/:id/history", async (req: Request, res: Response): Promise<void> => {
  const clientId = Number(req.params.id);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, req.tenantId!)));

  if (!client) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }

  // Get all appointments for this client
  const appts = await db
    .select({
      appt: appointmentsTable,
      service: { id: servicesTable.id, name: servicesTable.name },
      pet: { id: petsTable.id, name: petsTable.name },
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(petsTable, eq(appointmentsTable.petId, petsTable.id))
    .where(and(eq(appointmentsTable.clientId, clientId), eq(appointmentsTable.tenantId, req.tenantId!)))
    .orderBy(appointmentsTable.scheduledDate);

  // Get all payments for this client
  const allPayments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.clientId, clientId), eq(paymentsTable.tenantId, req.tenantId!)));

  // Get all package sales for this client
  const pkgSales = await db
    .select({
      sale: packageSalesTable,
      packageName: packagesTable.name,
      petName: petsTable.name,
    })
    .from(packageSalesTable)
    .leftJoin(packagesTable, eq(packageSalesTable.packageId, packagesTable.id))
    .leftJoin(petsTable, eq(packageSalesTable.petId, petsTable.id))
    .where(and(eq(packageSalesTable.clientId, clientId), eq(packageSalesTable.tenantId, req.tenantId!)));

  // Partition appointments: avulsos (no recurringGroupId or recurringGroupId not in pkgSales) vs package
  const pkgGroupIds = new Set(pkgSales.map(p => p.sale.recurringGroupId));
  const avulsosAppts = appts.filter(a => !a.appt.recurringGroupId || !pkgGroupIds.has(a.appt.recurringGroupId));
  const pkgAppts = appts.filter(a => a.appt.recurringGroupId && pkgGroupIds.has(a.appt.recurringGroupId));

  // Group package appointments by recurringGroupId
  const pkgApptsByGroup = new Map<string, typeof pkgAppts>();
  for (const a of pkgAppts) {
    const gid = a.appt.recurringGroupId!;
    if (!pkgApptsByGroup.has(gid)) pkgApptsByGroup.set(gid, []);
    pkgApptsByGroup.get(gid)!.push(a);
  }

  // Build payments indexed by appointmentId and packageSaleId
  const paymentsByApptId = new Map<number, typeof allPayments>();
  const paymentsByPkgSaleId = new Map<number, typeof allPayments>();
  for (const p of allPayments) {
    if (p.appointmentId != null) {
      if (!paymentsByApptId.has(p.appointmentId)) paymentsByApptId.set(p.appointmentId, []);
      paymentsByApptId.get(p.appointmentId)!.push(p);
    }
    if (p.packageSaleId != null) {
      if (!paymentsByPkgSaleId.has(p.packageSaleId)) paymentsByPkgSaleId.set(p.packageSaleId, []);
      paymentsByPkgSaleId.get(p.packageSaleId)!.push(p);
    }
  }

  // Build avulsos response
  const avulsos = avulsosAppts.map(a => {
    const price = parseFloat(a.appt.totalPrice);
    const apptPayments = paymentsByApptId.get(a.appt.id) ?? [];
    const totalPago = apptPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const saldo = price - totalPago;
    const statusPagamento = totalPago === 0 ? "pendente" : saldo <= 0 ? "quitado" : "parcial";
    return {
      id: a.appt.id,
      scheduledDate: a.appt.scheduledDate,
      status: a.appt.status,
      totalPrice: price,
      confirmedAt: a.appt.confirmedAt,
      notes: a.appt.notes,
      service: a.service?.id ? a.service : null,
      pet: a.pet?.id ? a.pet : null,
      totalPago: Math.round(totalPago * 100) / 100,
      saldo: Math.round(saldo * 100) / 100,
      statusPagamento,
      pagamentos: apptPayments.map(p => ({ ...p, amount: parseFloat(p.amount) })),
    };
  });

  // Build pacotes response
  const pacotes = pkgSales.map(ps => {
    const salePayments = paymentsByPkgSaleId.get(ps.sale.id) ?? [];
    const totalPago = salePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPrice = ps.sale.totalPrice != null ? parseFloat(ps.sale.totalPrice) : null;
    const saldo = totalPrice != null ? totalPrice - totalPago : null;
    const statusPagamento = totalPago === 0 ? "pendente" : saldo != null && saldo <= 0 ? "quitado" : "parcial";
    const groupAppts = pkgApptsByGroup.get(ps.sale.recurringGroupId) ?? [];
    return {
      id: ps.sale.id,
      recurringGroupId: ps.sale.recurringGroupId,
      packageName: ps.packageName ?? null,
      petName: ps.petName ?? null,
      saleDate: ps.sale.saleDate,
      totalPrice,
      weeks: ps.sale.weeks,
      totalPago: Math.round(totalPago * 100) / 100,
      saldo: saldo != null ? Math.round(saldo * 100) / 100 : null,
      statusPagamento,
      agendamentos: groupAppts.map(a => ({
        id: a.appt.id,
        scheduledDate: a.appt.scheduledDate,
        status: a.appt.status,
        confirmedAt: a.appt.confirmedAt,
      })),
      pagamentos: salePayments.map(p => ({ ...p, amount: parseFloat(p.amount) })),
    };
  });

  res.json({ client, avulsos, pacotes });
});

// ── Export ───────────────────────────────────────────────────────────────────

router.get("/clients/export", async (req: Request, res: Response): Promise<void> => {
  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.tenantId, req.tenantId!))
    .orderBy(clientsTable.name);

  const clientIds = clients.map(c => c.id);
  const pets = clientIds.length > 0
    ? await db.select().from(petsTable).where(inArray(petsTable.clientId, clientIds))
    : [];

  // Build pet map grouped by clientId
  const petsByClient = new Map<number, typeof pets>();
  for (const pet of pets) {
    if (!petsByClient.has(pet.clientId)) petsByClient.set(pet.clientId, []);
    petsByClient.get(pet.clientId)!.push(pet);
  }

  const rows: string[] = [buildCsvRow(CSV_HEADERS)];

  for (const client of clients) {
    const clientPets = petsByClient.get(client.id) ?? [];
    if (clientPets.length === 0) {
      rows.push(buildCsvRow([
        client.name, client.phone, client.email, client.address, client.notes,
        "", "", "", "", "", "", "", "", "", "",
      ]));
    } else {
      for (const pet of clientPets) {
        rows.push(buildCsvRow([
          client.name, client.phone, client.email, client.address, client.notes,
          pet.name, pet.breed, pet.size, pet.sex,
          pet.neutered ? "sim" : "nao",
          pet.coat, pet.behavior, pet.healthNotes, pet.groomingPreferences,
          pet.notes,
        ]));
      }
    }
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="clientes.csv"');
  res.send(rows.join("\n"));
});

// ── Import ───────────────────────────────────────────────────────────────────

router.post("/clients/import", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }

  const text = req.file.buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    res.status(400).json({ error: "Arquivo vazio ou sem dados (apenas cabeçalho)" });
    return;
  }

  // Parse header to find column indices
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const col = (name: string) => header.indexOf(name);

  const iNomeCliente = col("nome_cliente");
  const iTelefone = col("telefone");
  const iEmail = col("email");
  const iEndereco = col("endereco");
  const iNotasCliente = col("notas_cliente");
  const iNomePet = col("nome_pet");
  const iRaca = col("raca");
  const iPorte = col("porte");
  const iSexo = col("sexo");
  const iCastrado = col("castrado");
  const iPelagem = col("pelagem");
  const iComportamento = col("comportamento");
  const iSaude = col("saude");
  const iPrefTosa = col("preferencias_tosa");
  const iNotasPet = col("notas_pet");

  if (iNomeCliente === -1) {
    res.status(400).json({ error: "Coluna 'nome_cliente' não encontrada. Verifique o formato do arquivo." });
    return;
  }

  const result = {
    created: { clients: 0, pets: 0 },
    skipped: { clients: 0, pets: 0 },
    errors: [] as { line: number; message: string }[],
  };

  // Cache existing clients by name+phone to avoid re-querying
  const existingClients = await db
    .select({ id: clientsTable.id, name: clientsTable.name, phone: clientsTable.phone })
    .from(clientsTable)
    .where(eq(clientsTable.tenantId, req.tenantId!));

  const clientKey = (name: string, phone: string) => `${name.trim().toLowerCase()}|${phone.trim()}`;
  const clientCache = new Map<string, number>(
    existingClients.map(c => [clientKey(c.name, c.phone ?? ""), c.id])
  );
  // Track newly created clients in this import session
  const createdInSession = new Map<string, number>();

  // Pre-load existing pets for all tenant clients to enable deduplication
  const existingClientIds = existingClients.map(c => c.id);
  const existingPets = existingClientIds.length > 0
    ? await db
        .select({ clientId: petsTable.clientId, name: petsTable.name })
        .from(petsTable)
        .where(inArray(petsTable.clientId, existingClientIds))
    : [];

  const petKey = (clientId: number, name: string) => `${clientId}|${name.trim().toLowerCase()}`;
  const petCache = new Set<string>(existingPets.map(p => petKey(p.clientId, p.name)));
  // Track newly created pets in this import session
  const createdPetsInSession = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    try {
      const cells = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");

      const nomeCliente = get(iNomeCliente);
      if (!nomeCliente) {
        result.errors.push({ line: lineNum, message: "nome_cliente vazio" });
        continue;
      }

      const telefone = get(iTelefone);
      const key = clientKey(nomeCliente, telefone);

      let clientId: number;

      if (clientCache.has(key) || createdInSession.has(key)) {
        clientId = (clientCache.get(key) ?? createdInSession.get(key))!;
        result.skipped.clients++;
      } else {
        const [newClient] = await db
          .insert(clientsTable)
          .values({
            tenantId: req.tenantId!,
            name: nomeCliente,
            phone: telefone || null,
            email: get(iEmail) || null,
            address: get(iEndereco) || null,
            notes: get(iNotasCliente) || null,
          })
          .returning({ id: clientsTable.id });
        clientId = newClient.id;
        createdInSession.set(key, clientId);
        result.created.clients++;
      }

      // Pet row
      const nomePet = get(iNomePet);
      if (!nomePet) continue; // no pet on this row — that's fine

      const porte = get(iPorte);
      if (!porte) {
        result.errors.push({ line: lineNum, message: `Pet '${nomePet}': coluna 'porte' obrigatória` });
        continue;
      }

      // Deduplication: skip if a pet with same name already exists for this client
      const pKey = petKey(clientId, nomePet);
      if (petCache.has(pKey) || createdPetsInSession.has(pKey)) {
        result.skipped.pets++;
        continue;
      }

      await db.insert(petsTable).values({
        clientId,
        name: nomePet,
        breed: get(iRaca) || null,
        size: porte as any,
        sex: (get(iSexo) as any) || null,
        neutered: get(iCastrado).toLowerCase() === "sim",
        coat: get(iPelagem) || null,
        behavior: get(iComportamento) || null,
        healthNotes: get(iSaude) || null,
        groomingPreferences: get(iPrefTosa) || null,
        notes: get(iNotasPet) || null,
      });

      createdPetsInSession.add(pKey);
      result.created.pets++;
    } catch (err) {
      result.errors.push({
        line: lineNum,
        message: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  res.json(result);
});

// ── CRUD ─────────────────────────────────────────────────────────────────────

router.get("/clients", async (req: Request, res: Response): Promise<void> => {
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

router.post("/clients", async (req: Request, res: Response): Promise<void> => {
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

router.get("/clients/:id", async (req: Request, res: Response): Promise<void> => {
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

router.patch("/clients/:id", async (req: Request, res: Response): Promise<void> => {
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

router.delete("/clients/:id", async (req: Request, res: Response): Promise<void> => {
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

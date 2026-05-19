import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
    }
  }
}

export async function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }

  const [tenant] = await db
    .select({ id: tenantsTable.id, accessStart: tenantsTable.accessStart, accessEnd: tenantsTable.accessEnd })
    .from(tenantsTable)
    .where(eq(tenantsTable.userId, req.user.id));

  if (!tenant) {
    res.status(403).json({ error: "Nenhum pet shop cadastrado para este usuário" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  if (tenant.accessStart && tenant.accessEnd) {
    if (today < tenant.accessStart) {
      res.status(403).json({ error: "Período de acesso ainda não iniciado", code: "ACCESS_NOT_STARTED" });
      return;
    }
    if (today > tenant.accessEnd) {
      res.status(403).json({ error: "Período de acesso expirado", code: "ACCESS_EXPIRED" });
      return;
    }
  } else {
    res.status(403).json({ error: "Acesso pendente de aprovação", code: "ACCESS_PENDING" });
    return;
  }

  req.tenantId = tenant.id;
  next();
}

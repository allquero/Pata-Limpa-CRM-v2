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
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.userId, req.user.id));

  if (!tenant) {
    res.status(403).json({ error: "Nenhum pet shop cadastrado para este usuário" });
    return;
  }

  req.tenantId = tenant.id;
  next();
}

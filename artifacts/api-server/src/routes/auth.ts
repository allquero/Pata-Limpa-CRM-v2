import bcrypt from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable, tenantsTable } from "@workspace/db";
import {
  clearSession,
  getSessionId,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function isSameOrigin(req: Request): boolean {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  const expected = `${proto}://${host}`;

  const origin = req.headers["origin"];
  if (origin) return origin === expected;

  const referer = req.headers["referer"];
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }

  return false;
}

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  const isAdmin = req.isAuthenticated() && !!req.user.isAdmin;
  const parsed = GetCurrentAuthUserResponse.parse({
    user: req.isAuthenticated() ? req.user : null,
    isAdmin,
  });
  res.json(parsed);
});

router.get("/auth/me/tenant", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.userId, req.user.id));
  res.json({ tenant: tenant ?? null });
});

router.post("/auth/me/tenant", async (_req: Request, res: Response) => {
  res
    .status(403)
    .json({
      error:
        "Cadastro de empresas é feito pelo administrador. Entre em contato com o suporte.",
    });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      isAdmin: user.isAdmin ?? false,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ ok: true });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

export default router;

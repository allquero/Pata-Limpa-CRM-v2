import { type Request, type Response, type NextFunction } from "express";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Acesso restrito ao administrador" });
    return;
  }
  next();
}

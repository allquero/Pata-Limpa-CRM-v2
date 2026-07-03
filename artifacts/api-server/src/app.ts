import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// Em produção o Express serve o frontend compilado e lida com SPA routing.
// Em desenvolvimento o Vite dev server é um processo separado.
if (process.env.NODE_ENV === "production") {
  const __currentDir = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__currentDir, "public");
  app.use(express.static(publicDir));
  // Fallback SPA: qualquer rota que não seja /api retorna o index.html
  app.use((_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import tenantsRouter from "./tenants";
import clientsRouter from "./clients";
import petsRouter from "./pets";
import servicesRouter from "./services";
import packagesRouter from "./packages";
import appointmentsRouter from "./appointments";
import financialRouter from "./financial";
import messageTemplatesRouter from "./message-templates";
import leadsRouter from "./leads";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(tenantsRouter);
router.use(clientsRouter);
router.use(petsRouter);
router.use(servicesRouter);
router.use(packagesRouter);
router.use(appointmentsRouter);
router.use(financialRouter);
router.use(messageTemplatesRouter);
router.use(leadsRouter);
router.use(reportsRouter);

export default router;

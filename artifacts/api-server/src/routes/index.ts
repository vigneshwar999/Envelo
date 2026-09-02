import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import invoicesRouter from "./invoices";
import grantsRouter from "./grants";
import chainRouter from "./chain";
import dashboardRouter from "./dashboard";
import demoBootstrapRouter from "./demoBootstrap";
import ghostCleanupRouter from "./ghostCleanup";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Health stays public (used by the platform); everything else needs a session.
router.use(healthRouter);
// Demo bootstrap authenticates itself with a server-secret-derived token and
// must run before requireAuth (it provisions the demo accounts).
router.use(demoBootstrapRouter);
// Ghost cleanup uses the same self-authenticating token pattern and must run
// before requireAuth (the accounts it removes can never hold a session).
router.use(ghostCleanupRouter);
router.use(requireAuth);
router.use(usersRouter);
router.use(invoicesRouter);
router.use(grantsRouter);
router.use(chainRouter);
router.use(dashboardRouter);

export default router;

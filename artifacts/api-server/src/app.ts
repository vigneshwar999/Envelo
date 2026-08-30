import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

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

// Clerk proxy must come before body parsers - it streams raw bytes.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Central error handler: zod validation problems become clear 400s,
// everything else is a logged 500. Never leaks internals to the client.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (
    err instanceof Error &&
    err.name === "ZodError" &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown }).issues)
  ) {
    const issues = (
      err as unknown as {
        issues: { path: (string | number)[]; message: string }[];
      }
    ).issues;
    const first = issues[0];
    const where = first?.path?.join(".") ?? "";
    res.status(400).json({
      error: `Invalid request${where ? ` (${where})` : ""}: ${first?.message ?? "validation failed"}`,
    });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong on the server." });
});

export default app;

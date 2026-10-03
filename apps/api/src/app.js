import express from "express";
import cors from "cors";
import env from "./config/env.js";
import sql, { connectDB } from "./config/database.js";
import logger from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";
import { createMessagingProvider } from "./integrations/whatsapp/whatsapp.factory.js";
import { createWebhookRouter } from "./integrations/whatsapp/whatsapp.webhook.js";
import conversationService from "./modules/conversation/conversation.service.js";

const app = express();

// ─── Middleware ──────────────────────────────────────────
const defaultAllowed = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://kgnandahospital.com",
  "https://www.kgnandahospital.com",
  "https://kg-nanda-kappa.vercel.app",
  "https://kg-nanda-w26l.vercel.app/",
];
const envAllowed = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [];
const allowedOrigins = Array.from(new Set([...defaultAllowed, ...envAllowed]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".kgnandahospital.com")
      ) {
        return callback(null, true);
      }

      // In dev: allow everything so localhost variants don't block you
      if (env.isDev) return callback(null, true);

      // In production: block unknown origins
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use(express.static("public"));

// Request logger (dev only)
if (env.isDev) {
  app.use((req, _res, next) => {
    if (!req.url.includes("/webhook")) {
      logger.debug(`${req.method} ${req.url}`);
    }
    next();
  });
}

// ─── API Routes ─────────────────────────────────────────
app.use("/api", routes);

// ─── WhatsApp Webhook ───────────────────────────────────
const messagingProvider = createMessagingProvider();
conversationService.setProvider(messagingProvider);
app.use("/webhook/whatsapp", createWebhookRouter(messagingProvider));

// ─── Health Check ───────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await sql`SELECT 1`;
    res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Health check failed: ${err.message}`);
    res.status(503).json({
      status: "unavailable",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────
async function start() {
  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.warn("Starting server without an active database connection");
  }

  app.listen(env.port, () => {
    logger.info("=== DOCBOT API V2 WITH NEW ROUTES STARTED ===");
    logger.info(`DocBot API running on http://localhost:${env.port}`);
    logger.info("WhatsApp provider: Meta Cloud API");
    logger.info(`Environment: ${env.nodeEnv}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start:", err.message);
});

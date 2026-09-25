import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  // Fail fast if the database is unreachable
  await prisma.$connect();
  logger.info("Database connection established");

  const server = app.listen(env.port, () => {
    logger.info(`${env.appName} API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force-exit safety net
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Fatal startup error", err instanceof Error ? err.stack : err);
  process.exit(1);
});

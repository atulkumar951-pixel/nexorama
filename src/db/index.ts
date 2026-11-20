import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/digimart";

let cleanUrl = databaseUrl;
try {
  const parsed = new URL(databaseUrl);
  parsed.searchParams.delete("sslmode");
  cleanUrl = parsed.toString();
} catch {
  cleanUrl = databaseUrl.replace(/[\?&]sslmode=[^&]+/, "");
}

const isLocal =
  databaseUrl.includes("localhost") ||
  databaseUrl.includes("127.0.0.1") ||
  databaseUrl.includes("::1");

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: cleanUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000,
    max: 10,
  });

// Prevent unhandled errors from crashing the Node.js process / serverless instance
pool.on("error", (err) => {
  console.error("PostgreSQL Pool Error:", err?.message || err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);


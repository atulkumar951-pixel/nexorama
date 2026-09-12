import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });

const dbUrl = (process.env.DATABASE_URL || "").replace(":6543/", ":5432/");

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  },
} satisfies Config;

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config();

const rawUrl = (process.env.DATABASE_URL || "").replace(":6543/", ":5432/");
const databaseUrl = rawUrl.replace(/[\?&]sslmode=[^&]+/, "");

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function migrateGiftSchema() {
  const sqlFile = path.join(__dirname, "../drizzle/0001_gift_codes_mode.sql");
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  await client.connect();
  console.log("✅ Connected.");

  const rawSql = fs.readFileSync(sqlFile, "utf8");
  console.log("⏳ Applying Gift Codes schema migration...");

  try {
    await client.query(rawSql);
    console.log("✅ Gift Codes schema migration applied successfully!");
  } catch (err) {
    console.error("❌ Error applying migration:", err.message);
  } finally {
    await client.end();
  }
}

migrateGiftSchema().catch(console.error);

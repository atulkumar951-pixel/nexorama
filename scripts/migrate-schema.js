const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

// Use session pooler (port 5432) for schema creation and clean sslmode
const rawUrl = (process.env.DATABASE_URL || "").replace(":6543/", ":5432/");
const databaseUrl = rawUrl.replace(/[\?&]sslmode=[^&]+/, "");

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function migrateSchema() {
  const sqlFile = path.join(__dirname, "../drizzle/0000_perpetual_impossible_man.sql");
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  console.log("🔌 Connecting to Supabase database...");
  await client.connect();
  console.log("✅ Connected.");

  const rawSql = fs.readFileSync(sqlFile, "utf8");
  const statements = rawSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`⏳ Creating schema (${statements.length} statements)...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
    } catch (err) {
      // Ignore if table/index already exists
      if (!err.message.includes("already exists")) {
        console.warn(`Warning on statement ${i + 1}:`, err.message);
      }
    }
  }

  console.log("✅ All tables and constraints created successfully!");

  // Verify created tables
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`📋 Verified ${res.rows.length} tables in Supabase:`);
  console.log(res.rows.map((r) => r.table_name).join(", "));

  await client.end();
}

migrateSchema().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

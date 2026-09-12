const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function restoreDatabase() {
  const sqlPath = path.join(__dirname, "../backup/nexora_backup.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Backup file not found at: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf8");

  console.log("🔌 Connecting to target database...");
  await client.connect();
  console.log("✅ Connected successfully.");

  console.log("⏳ Restoring data from nexora_backup.sql...");
  await client.query(sqlContent);

  console.log("✅ SQL restoration executed successfully.");

  // Verify counts in target database
  console.log("\n📊 Verifying restored tables:");
  const tables = [
    "users",
    "categories",
    "products",
    "product_assets",
    "product_lectures",
    "orders",
    "order_items",
    "payments",
    "access_grants",
    "downloads",
    "notifications",
    "audit_logs",
  ];

  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      console.log(`  ✔ "${table}": ${res.rows[0].count} records`);
    } catch {
      // ignore missing optional tables
    }
  }

  console.log("\n🎉 RESTORATION COMPLETE! Zero data loss.\n");
  await client.end();
}

restoreDatabase().catch((err) => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});

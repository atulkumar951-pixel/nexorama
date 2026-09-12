const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function getClient() {
  const base = process.env.DATABASE_URL || "";
  if (!base) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }

  // Try ports 5432 (session pooler) and 6543 (transaction pooler)
  const candidateUrls = [
    base.replace(":6543/", ":5432/").replace(/[\?&]sslmode=[^&]+/, ""),
    base.replace(/[\?&]sslmode=[^&]+/, ""),
  ];

  for (const url of candidateUrls) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔌 Connecting (attempt ${attempt})...`);
        const client = new Client({
          connectionString: url,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        });
        await client.connect();
        return client;
      } catch (err) {
        console.warn(`Attempt ${attempt} error:`, err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  throw new Error("Failed to connect after multiple attempts.");
}

async function restoreDatabase() {
  const sqlPath = path.join(__dirname, "../backup/nexora_backup.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Backup file not found at: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf8");

  const client = await getClient();
  console.log("✅ Connected to Supabase target database.");

  console.log("⏳ Restoring all records from nexora_backup.sql...");
  await client.query(sqlContent);
  console.log("✅ SQL restoration executed successfully.");

  // Verify counts in target database
  console.log("\n📊 Verifying restored tables in Supabase:");
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
    "lecture_progress",
  ];

  let totalRestored = 0;
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const cnt = res.rows[0].count;
      totalRestored += cnt;
      console.log(`  ✔ "${table}": ${cnt} records`);
    } catch (e) {
      console.warn(`  ⚠ "${table}": ${e.message}`);
    }
  }

  console.log(`\n=========================================`);
  console.log(`🎉 RESTORATION COMPLETE! Total restored: ${totalRestored} records.`);
  console.log(`=========================================\n`);

  await client.end();
}

restoreDatabase().catch((err) => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});

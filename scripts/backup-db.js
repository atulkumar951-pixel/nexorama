const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Ensure SSL settings for cloud postgres
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// Helper to escape SQL strings
function escapeSqlValue(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  // String escaping
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function backupDatabase() {
  console.log("🔌 Connecting to database...");
  await client.connect();
  console.log("✅ Connected successfully.");

  const backupDir = path.join(__dirname, "../backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all table names in public schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map((r) => r.table_name);
  console.log(`📋 Found ${tables.length} tables to backup:`, tables.join(", "));

  // Preferred order of tables for foreign key dependencies during restoration
  const dependencyOrder = [
    "users",
    "sessions",
    "categories",
    "products",
    "product_assets",
    "product_lectures",
    "cart_items",
    "wishlist_items",
    "coupons",
    "coupon_usages",
    "orders",
    "order_items",
    "payments",
    "refunds",
    "access_grants",
    "downloads",
    "notifications",
    "banners",
    "audit_logs",
    "lecture_progress",
  ];

  // Sort tables according to dependency order, keeping any extra tables at the end
  const sortedTables = [
    ...dependencyOrder.filter((t) => tables.includes(t)),
    ...tables.filter((t) => !dependencyOrder.includes(t)),
  ];

  const fullData = {};
  let sqlStatements = `-- Nexora Database Backup\n-- Generated on: ${new Date().toISOString()}\n\n`;
  sqlStatements += `SET session_replication_role = 'replica'; -- Disable FK triggers during import\n\n`;

  let totalRows = 0;

  for (const table of sortedTables) {
    process.stdout.write(`⏳ Backing up table: "${table}" ... `);
    const dataRes = await client.query(`SELECT * FROM "${table}"`);
    const rows = dataRes.rows;
    fullData[table] = rows;
    totalRows += rows.length;

    console.log(`${rows.length} rows`);

    if (rows.length > 0) {
      sqlStatements += `-- Table: ${table} (${rows.length} rows)\n`;
      sqlStatements += `TRUNCATE TABLE "${table}" CASCADE;\n`;

      const columns = Object.keys(rows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(", ");

      // Chunk inserts in batches of 50
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const valueClauses = batch.map(
          (row) => `(${columns.map((c) => escapeSqlValue(row[c])).join(", ")})`
        );
        sqlStatements += `INSERT INTO "${table}" (${colNames}) VALUES\n  ${valueClauses.join(",\n  ")};\n`;
      }
      sqlStatements += "\n";
    }
  }

  sqlStatements += `SET session_replication_role = 'origin'; -- Re-enable FK triggers\n\n`;

  // Add sequence reset statements
  sqlStatements += `-- Reset Auto-Increment Sequences\n`;
  for (const table of sortedTables) {
    sqlStatements += `DO $$ BEGIN\n`;
    sqlStatements += `  IF pg_get_serial_sequence('"${table}"', 'id') IS NOT NULL THEN\n`;
    sqlStatements += `    PERFORM setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);\n`;
    sqlStatements += `  END IF;\n`;
    sqlStatements += `END $$;\n`;
  }

  // 1. Write JSON backup
  const jsonPath = path.join(backupDir, "nexora_backup.json");
  fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), "utf8");

  // 2. Write SQL dump
  const sqlPath = path.join(backupDir, "nexora_backup.sql");
  fs.writeFileSync(sqlPath, sqlStatements, "utf8");

  console.log("\n=========================================");
  console.log("🎉 DATABASE BACKUP COMPLETED SUCCESSFULLY!");
  console.log(`📦 Total Tables: ${sortedTables.length}`);
  console.log(`📊 Total Records: ${totalRows}`);
  console.log(`📁 JSON Backup:  ${jsonPath}`);
  console.log(`📁 SQL Script:   ${sqlPath}`);
  console.log("=========================================\n");

  await client.end();
}

backupDatabase().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});

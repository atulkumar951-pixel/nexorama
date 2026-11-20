require("dotenv").config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Pool } = require("pg");

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Checking current AVAILABLE codes...");
    const beforeRes = await pool.query("SELECT count(*) FROM gift_codes WHERE status = 'AVAILABLE'");
    console.log(`Currently AVAILABLE codes: ${beforeRes.rows[0].count}`);

    console.log("Updating all AVAILABLE gift codes to RESERVED (OUT OF STOCK)...");
    const updateRes = await pool.query(`
      UPDATE gift_codes
      SET status = 'RESERVED',
          internal_note = COALESCE(internal_note || ' | ', '') || 'OUT_OF_STOCK_BATCH_HOLD',
          updated_at = NOW()
      WHERE status = 'AVAILABLE'
    `);
    console.log(`Updated ${updateRes.rowCount} codes to RESERVED.`);

    console.log("\nVerifying stock counts per product...");
    const q = `
      SELECT gp.id, gp.name, gp.brand_name, gp.denomination,
             count(gc.id) filter (where gc.status = 'AVAILABLE') as available_codes,
             count(gc.id) filter (where gc.status = 'RESERVED') as reserved_codes,
             count(gc.id) filter (where gc.status = 'SOLD') as sold_codes
      FROM gift_products gp
      LEFT JOIN gift_codes gc ON gc.gift_product_id = gp.id
      GROUP BY gp.id, gp.name, gp.brand_name, gp.denomination
      ORDER BY gp.id
    `;
    const afterRes = await pool.query(q);
    console.log(JSON.stringify(afterRes.rows, null, 2));
  } finally {
    await pool.end();
  }
}

run().catch(console.error);

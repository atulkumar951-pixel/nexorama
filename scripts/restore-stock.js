require("dotenv").config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Pool } = require("pg");

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Restoring gift codes from RESERVED to AVAILABLE...");
    const res = await pool.query(`
      UPDATE gift_codes
      SET status = 'AVAILABLE',
          internal_note = REPLACE(internal_note, 'OUT_OF_STOCK_BATCH_HOLD', 'RESTORED'),
          updated_at = NOW()
      WHERE status = 'RESERVED' AND internal_note LIKE '%OUT_OF_STOCK_BATCH_HOLD%'
    `);
    console.log(`Restored ${res.rowCount} gift codes to AVAILABLE.`);

    const q = `
      SELECT gp.id, gp.name, gp.brand_name, gp.denomination,
             count(gc.id) filter (where gc.status = 'AVAILABLE') as available_codes,
             count(gc.id) filter (where gc.status = 'SOLD') as sold_codes
      FROM gift_products gp
      LEFT JOIN gift_codes gc ON gc.gift_product_id = gp.id
      GROUP BY gp.id, gp.name, gp.brand_name, gp.denomination
      ORDER BY gp.id
    `;
    const checkRes = await pool.query(q);
    console.log(JSON.stringify(checkRes.rows, null, 2));
  } finally {
    await pool.end();
  }
}

run().catch(console.error);

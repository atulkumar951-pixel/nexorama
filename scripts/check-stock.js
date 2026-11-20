require("dotenv").config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Pool } = require("pg");

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const q = `
      SELECT gp.id, gp.name, gp.brand_name, gp.denomination, gp.status,
             count(gc.id) filter (where gc.status = 'AVAILABLE') as available_codes,
             count(gc.id) filter (where gc.status = 'RESERVED') as reserved_codes,
             count(gc.id) filter (where gc.status = 'SOLD') as sold_codes
      FROM gift_products gp
      LEFT JOIN gift_codes gc ON gc.gift_product_id = gp.id
      GROUP BY gp.id, gp.name, gp.brand_name, gp.denomination, gp.status
      ORDER BY gp.id
    `;
    const res = await pool.query(q);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    await pool.end();
  }
}

run().catch(console.error);

require("dotenv").config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Pool } = require("pg");

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const o = await pool.query("SELECT id, order_number, status, total, order_type FROM orders WHERE order_number LIKE '%5845%' OR id = 17");
    console.log("Order:", o.rows);
    const p = await pool.query("SELECT id, order_id, status, provider, razorpay_order_id, razorpay_payment_id FROM payments WHERE order_id = 17");
    console.log("Payment:", p.rows);
    const d = await pool.query("SELECT id, order_id, gift_code_id, status, recipient_email FROM gift_code_deliveries WHERE order_id = 17");
    console.log("Deliveries:", d.rows);
  } finally {
    await pool.end();
  }
}
check();

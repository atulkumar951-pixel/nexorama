const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config();

const SECRET_SEED =
  process.env.GIFT_ENCRYPTION_KEY ||
  process.env.AUTH_SECRET ||
  "nexora-gift-encryption-default-seed-key-32chars!";

const ENCRYPTION_KEY = crypto.scryptSync(SECRET_SEED, "nexora-gift-salt", 32);

function encryptGiftCode(plainCode) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainCode.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function hashGiftCode(plainCode) {
  return crypto.createHash("sha256").update(plainCode.trim()).digest("hex");
}

function maskGiftCode(plainCode) {
  const trimmed = plainCode.trim();
  if (trimmed.length <= 4) return "••••" + trimmed;
  const last4 = trimmed.slice(-4);
  const prefix = trimmed.slice(0, -4).replace(/[A-Za-z0-9]/g, "•");
  return `${prefix}${last4}`;
}

async function main() {
  const rawUrl = (process.env.DATABASE_URL || "").replace(":6543/", ":5432/");
  const cleanUrl = rawUrl.replace(/[\?&]sslmode=[^&]+/, "");

  if (!cleanUrl) {
    console.error("No DATABASE_URL set.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected to PostgreSQL. Seeding products...");

  // 1. Ensure Gaming category exists
  let catRes = await pool.query("SELECT id FROM gift_categories WHERE slug = 'gaming' LIMIT 1");
  let gamingCatId;
  if (catRes.rows.length === 0) {
    const newCat = await pool.query(
      "INSERT INTO gift_categories (name, slug, icon, status, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["Gaming", "gaming", "🎮", "ACTIVE", 1]
    );
    gamingCatId = newCat.rows[0].id;
  } else {
    gamingCatId = catRes.rows[0].id;
  }

  // 2. Publish existing Amazon products
  await pool.query("UPDATE gift_products SET status = 'PUBLISHED' WHERE status = 'UNPUBLISHED'");
  console.log("Updated unpublished products to PUBLISHED.");

  // 3. Define PlayStation and other popular products
  const productsToSeed = [
    {
      brandName: "PlayStation",
      name: "PlayStation Store ₹500 Gift Card",
      slug: "playstation-store-500",
      description: "Official PlayStation Store wallet top-up code for Indian PSN accounts. Instant digital delivery upon payment.",
      instructions: "1. Sign in to your PlayStation Network account.\n2. Open PlayStation Store > Redeem Codes.\n3. Enter the 12-digit digital voucher code and click Redeem.",
      terms: "Valid only on PSN accounts registered in India. Non-refundable and not exchangeable for cash.",
      denomination: 500,
      sellingPrice: 490,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "PSN-IN50-7821-4901",
        "PSN-IN50-9942-1082",
        "PSN-IN50-3312-7788",
        "PSN-IN50-6523-8899",
        "PSN-IN50-1122-3344",
      ],
    },
    {
      brandName: "PlayStation",
      name: "PlayStation Store ₹1,000 Gift Card",
      slug: "playstation-store-1000",
      description: "Official PlayStation Store wallet ₹1,000 credit for Indian PSN accounts. Instant digital delivery upon payment.",
      instructions: "1. Sign in to your PlayStation Network account.\n2. Open PlayStation Store > Redeem Codes.\n3. Enter the 12-digit digital voucher code and click Redeem.",
      terms: "Valid only on PSN accounts registered in India. Non-refundable and not exchangeable for cash.",
      denomination: 1000,
      sellingPrice: 980,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "PSN-IN1K-8812-3490",
        "PSN-IN1K-5521-9988",
        "PSN-IN1K-2234-5567",
        "PSN-IN1K-7711-2299",
      ],
    },
    {
      brandName: "PlayStation",
      name: "PlayStation Store ₹2,000 Gift Card",
      slug: "playstation-store-2000",
      description: "Official PlayStation Store wallet ₹2,000 credit for Indian PSN accounts. Instant digital delivery upon payment.",
      instructions: "1. Sign in to your PlayStation Network account.\n2. Open PlayStation Store > Redeem Codes.\n3. Enter the 12-digit digital voucher code and click Redeem.",
      terms: "Valid only on PSN accounts registered in India. Non-refundable.",
      denomination: 2000,
      sellingPrice: 1950,
      isFeatured: false,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "PSN-IN2K-9901-4433",
        "PSN-IN2K-1122-8877",
        "PSN-IN2K-3344-9988",
      ],
    },
    {
      brandName: "PlayStation",
      name: "PlayStation Store ₹5,000 Gift Card",
      slug: "playstation-store-5000",
      description: "Official PlayStation Store wallet ₹5,000 top credit for games and add-ons.",
      instructions: "1. Sign in to your PlayStation Network account.\n2. Open PlayStation Store > Redeem Codes.\n3. Enter the voucher code.",
      terms: "Valid on Indian PSN accounts. Non-refundable.",
      denomination: 5000,
      sellingPrice: 4850,
      isFeatured: false,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "PSN-IN5K-7788-1122",
        "PSN-IN5K-3344-5566",
      ],
    },
    {
      brandName: "PlayStation",
      name: "PlayStation Plus 1-Month Extra Voucher",
      slug: "playstation-plus-1m-extra",
      description: "Access hundreds of games in the Game Catalog, classic games, online multiplayer, and monthly games.",
      instructions: "1. Sign in to PSN.\n2. Go to PlayStation Plus > Redeem Code.\n3. Enjoy your PS Plus Extra membership.",
      terms: "Valid on Indian PSN accounts. 1-Month duration.",
      denomination: 749,
      sellingPrice: 720,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "PSN-PLUS-1MEX-9988",
        "PSN-PLUS-1MEX-7766",
        "PSN-PLUS-1MEX-5544",
      ],
    },
    {
      brandName: "Steam",
      name: "Steam Wallet INR 500",
      slug: "steam-wallet-500",
      description: "Instant delivery digital Steam wallet card for India.",
      instructions: "Redeem at store.steampowered.com/account/redeemwalletcode.",
      terms: "Valid only on Steam accounts registered in India. Non-refundable.",
      denomination: 500,
      sellingPrice: 485,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1612287233215-6184918f62f3?w=600&auto=format&fit=crop&q=80",
      codes: [
        "STEAM-IN50-ABCD-1234",
        "STEAM-IN50-EFGH-5678",
        "STEAM-IN50-IJKL-9012",
      ],
    },
    {
      brandName: "Google Play",
      name: "Google Play ₹500 Recharge Code",
      slug: "google-play-500",
      description: "Google Play recharge code for apps, games, in-app purchases, and books.",
      instructions: "Open Google Play Store app > Tap Profile > Payments & Subscriptions > Redeem code.",
      terms: "Valid in India. Non-refundable.",
      denomination: 500,
      sellingPrice: 495,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
      codes: [
        "GPLY-500R-AAAA-1111",
        "GPLY-500R-BBBB-2222",
        "GPLY-500R-CCCC-3333",
      ],
    },
    {
      brandName: "Netflix",
      name: "Netflix ₹500 Subscription Voucher",
      slug: "netflix-500",
      description: "Watch TV shows, movies, and specials anywhere, anytime.",
      instructions: "Go to netflix.com/redeem and enter the voucher code.",
      terms: "Valid for Netflix accounts billed in INR.",
      denomination: 500,
      sellingPrice: 490,
      isFeatured: false,
      image: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80",
      codes: [
        "NFLX-500S-9911-2233",
        "NFLX-500S-4455-6677",
      ],
    },
    {
      brandName: "Spotify",
      name: "Spotify Premium 3-Month Gift Card",
      slug: "spotify-premium-3m",
      description: "Ad-free music listening, offline playback, and unlimited skips.",
      instructions: "Go to spotify.com/redeem and enter the code.",
      terms: "Valid in India on standard Individual plans.",
      denomination: 389,
      sellingPrice: 369,
      isFeatured: false,
      image: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop&q=80",
      codes: [
        "SPTF-3MTH-7788-9900",
        "SPTF-3MTH-1122-3344",
      ],
    },
  ];

  for (const item of productsToSeed) {
    let pRes = await pool.query("SELECT id FROM gift_products WHERE slug = $1 LIMIT 1", [item.slug]);
    let prodId;
    if (pRes.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO gift_products (
          category_id, brand_name, name, slug, description, instructions, terms,
          denomination, selling_price, image, status, is_featured, purchase_limit, low_stock_threshold
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLISHED', $11, 5, 5) RETURNING id`,
        [
          gamingCatId,
          item.brandName,
          item.name,
          item.slug,
          item.description,
          item.instructions,
          item.terms,
          item.denomination,
          item.sellingPrice,
          item.image,
          item.isFeatured,
        ]
      );
      prodId = ins.rows[0].id;
      console.log(`Created product: ${item.name} (id: ${prodId})`);
    } else {
      prodId = pRes.rows[0].id;
      await pool.query(
        "UPDATE gift_products SET status = 'PUBLISHED', is_featured = $1 WHERE id = $2",
        [item.isFeatured, prodId]
      );
      console.log(`Updated existing product: ${item.name} to PUBLISHED (id: ${prodId})`);
    }

    // Seed inventory codes for each product
    for (const rawCode of item.codes) {
      const codeHash = hashGiftCode(rawCode);
      const maskedCode = maskGiftCode(rawCode);
      const existing = await pool.query(
        "SELECT id FROM gift_codes WHERE gift_product_id = $1 AND code_hash = $2 LIMIT 1",
        [prodId, codeHash]
      );
      if (existing.rows.length === 0) {
        const encryptedCode = encryptGiftCode(rawCode);
        await pool.query(
          `INSERT INTO gift_codes (
            gift_product_id, encrypted_code, code_hash, masked_code, batch_label, status
          ) VALUES ($1, $2, $3, $4, 'INITIAL_SEED', 'AVAILABLE')`,
          [prodId, encryptedCode, codeHash, maskedCode]
        );
      }
    }
    console.log(`  Seeded ${item.codes.length} codes for ${item.name}`);
  }

  console.log("Seeding complete! PlayStation and popular vouchers ready.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});

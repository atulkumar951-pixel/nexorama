/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";


const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seeding database…");

  // ---------- Default Super Admin ----------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`👤 Super admin ready: ${adminEmail} / ${adminPassword} (change after first login!)`);

  // ---------- Settings defaults ----------
  const defaults: Record<string, unknown> = {
    "site.name": "Digital Marketplace",
    "site.currency": "INR",
    "site.contactEmail": "support@example.com",
    "commerce.defaultDownloadLimit": 5,
    "content.maxFileSizeMb": 200,
    "content.allowedExtensions": ["pdf", "zip", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"],
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object | string },
    });
  }
  console.log("⚙️ Default settings created");

  // ---------- Categories ----------
  const programming = await prisma.category.upsert({
    where: { slug: "programming" },
    update: {},
    create: {
      name: "Programming",
      slug: "programming",
      description: "Notes, eBooks and resources for programmers.",
      sortOrder: 1,
    },
  });
  const webdev = await prisma.category.upsert({
    where: { slug: "web-development" },
    update: {},
    create: {
      name: "Web Development",
      slug: "web-development",
      description: "HTML, CSS, JavaScript and modern frameworks.",
      parentId: programming.id,
      sortOrder: 1,
    },
  });
  const java = await prisma.category.upsert({
    where: { slug: "java" },
    update: {},
    create: {
      name: "Java",
      slug: "java",
      description: "Complete Java notes, programs and interview prep.",
      parentId: programming.id,
      sortOrder: 2,
    },
  });
  const education = await prisma.category.upsert({
    where: { slug: "education" },
    update: {},
    create: {
      name: "Education",
      slug: "education",
      description: "Engineering, science and exam preparation material.",
      sortOrder: 2,
    },
  });

  console.log("📚 Categories created");

  // ---------- Sample products ----------
  const htmlNotes = await prisma.product.upsert({
    where: { slug: "complete-html-notes" },
    update: {},
    create: {
      title: "Complete HTML Notes",
      slug: "complete-html-notes",
      shortDescription: "Everything you need to master HTML — from basics to semantic layouts.",
      description:
        "<h2>What's inside</h2><ul><li>150+ pages of structured notes</li><li>Cheatsheets &amp; quick reference</li><li>Practice exercises with solutions</li></ul>",
      categoryId: webdev.id,
      productType: "PDF",
      price: 199,
      salePrice: 99,
      isFeatured: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
      downloadLimit: 5,
      seoTitle: "Complete HTML Notes PDF — Learn HTML Fast",
      seoDescription: "Structured HTML notes with cheatsheets and exercises. Instant download.",
    },
  });

  await prisma.product.upsert({
    where: { slug: "complete-java-notes" },
    update: {},
    create: {
      title: "Complete Java Notes",
      slug: "complete-java-notes",
      shortDescription: "Core Java concepts explained clearly with runnable examples.",
      description:
        "<h2>Complete Java Notes</h2><p>OOP, collections, exceptions, streams and more — with programs you can run.</p>",
      categoryId: java.id,
      productType: "PDF",
      price: 499,
      salePrice: 199,
      isFeatured: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
      downloadLimit: 5,
    },
  });

  await prisma.product.upsert({
    where: { slug: "web-development-resources" },
    update: {},
    create: {
      title: "Web Development Resources",
      slug: "web-development-resources",
      shortDescription: "A curated ZIP of templates, snippets, and project starters.",
      description: "<p>One ZIP. Everything: HTML/CSS templates, JS snippets, and mini-projects.</p>",
      categoryId: webdev.id,
      productType: "ZIP",
      price: 299,
      status: "PUBLISHED",
      publishedAt: new Date(),
      downloadLimit: 3,
    },
  });

  const javaCourse = await prisma.product.upsert({
    where: { slug: "complete-java-lecture-series" },
    update: {},
    create: {
      title: "Complete Java Lecture Series",
      slug: "complete-java-lecture-series",
      shortDescription: "Structured video lectures covering Java from scratch.",
      description: "<p>Chapter-wise lectures. Lecture 1 is free to preview.</p>",
      categoryId: java.id,
      productType: "PLAYLIST",
      price: 999,
      salePrice: 499,
      status: "PUBLISHED",
      publishedAt: new Date(),
      lecturesActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: "engineering-mathematics-handbook" },
    update: {},
    create: {
      title: "Engineering Mathematics Handbook",
      slug: "engineering-mathematics-handbook",
      shortDescription: "Formula book + solved problems for semester exams.",
      description: "<p>Concise formulae and solved problems for quick revision.</p>",
      categoryId: education.id,
      productType: "EBOOK",
      price: 149,
      isFree: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  void htmlNotes;

  // ---------- Lectures for the playlist product ----------
  const chapter1 = await prisma.productChapter.create({
    data: { productId: javaCourse.id, title: "Getting Started", sortOrder: 1 },
  });
  await prisma.productChapter.create({
    data: { productId: javaCourse.id, title: "OOP Concepts", sortOrder: 2 },
  });

  await prisma.productLecture.create({
    data: {
      productId: javaCourse.id,
      chapterId: chapter1.id,
      title: "Lecture 1 — Introduction to Java",
      description: "What is Java, JVM/JRE/JDK, and your first program.",
      externalUrl: "https://www.youtube.com/watch?v=eIrMbAQSU34",
      provider: "youtube",
      isPreview: true,
      sortOrder: 1,
    },
  });
  await prisma.productLecture.create({
    data: {
      productId: javaCourse.id,
      chapterId: chapter1.id,
      title: "Lecture 2 — Setting Up Your Environment",
      description: "Installing the JDK and choosing an IDE.",
      externalUrl: "https://www.youtube.com/watch?v=eIrMbAQSU34",
      provider: "youtube",
      sortOrder: 2,
    },
  });

  // ---------- Welcome coupon ----------
  await prisma.coupon.upsert({
    where: { code: "WELCOME20" },
    update: {},
    create: {
      code: "WELCOME20",
      description: "20% off, maximum ₹100",
      type: "PERCENTAGE",
      value: 20,
      maximumDiscount: 100,
      perUserLimit: 1,
      status: "ACTIVE",
    },
  });

  // ---------- Sample banner ----------
  await prisma.banner.create({
    data: {
      title: "Exam Season Sale",
      subtitle: "Up to 60% off on all study material",
      buttonText: "Browse Products",
      buttonUrl: "/products",
      position: "HERO",
      priority: 10,
    },
  });

  // ---------- Gift Categories & Products ----------
  const gamingCategory = await prisma.giftCategory.upsert({
    where: { slug: "gaming" },
    update: {},
    create: {
      name: "Gaming & Entertainment",
      slug: "gaming",
      description: "Digital cards for Steam, PlayStation, Xbox, and Google Play.",
      status: "ACTIVE",
      sortOrder: 1,
    },
  });

  const shoppingCategory = await prisma.giftCategory.upsert({
    where: { slug: "shopping" },
    update: {},
    create: {
      name: "Shopping & Lifestyle",
      slug: "shopping",
      description: "Gift cards for Amazon, Flipkart, Myntra, and retail brands.",
      status: "ACTIVE",
      sortOrder: 2,
    },
  });

  const steam500 = await prisma.giftProduct.upsert({
    where: { slug: "steam-wallet-inr-500" },
    update: {},
    create: {
      categoryId: gamingCategory.id,
      brandName: "Steam",
      name: "Steam Wallet INR 500",
      slug: "steam-wallet-inr-500",
      description: "Instant delivery digital Steam wallet card for India.",
      terms: "Valid only on Steam accounts registered in India. Non-refundable.",
      instructions: "Redeem at store.steampowered.com/account/redeemwalletcode.",
      denomination: 500,
      sellingPrice: 480,
      currency: "INR",
      status: "PUBLISHED",
      featured: true,
      lowStockThreshold: 5,
    },
  });

  const amazon500 = await prisma.giftProduct.upsert({
    where: { slug: "amazon-pay-gift-card-500" },
    update: {},
    create: {
      categoryId: shoppingCategory.id,
      brandName: "Amazon",
      name: "Amazon Pay Gift Card ₹500",
      slug: "amazon-pay-gift-card-500",
      description: "Use across millions of products and bill payments on Amazon India.",
      terms: "Valid for 1 year from issuance. Added directly to Amazon Pay balance.",
      instructions: "Add to Amazon Pay balance under Your Account > Gift Cards.",
      denomination: 500,
      sellingPrice: 500,
      currency: "INR",
      status: "PUBLISHED",
      featured: true,
      lowStockThreshold: 10,
    },
  });

  // Sample encrypted codes for Steam product
  const sampleSteamCodes = [
    "STEAM-ABCD-1234-EFGH",
    "STEAM-IJKL-5678-MNOP",
    "STEAM-QRST-9012-UVWX",
  ];

  for (const rawCode of sampleSteamCodes) {
    const codeHash = crypto.createHash("sha256").update(rawCode.replace(/[\s\-_]+/g, "").toUpperCase(), "utf8").digest("hex");
    const maskedCode = rawCode.length > 8 ? `${rawCode.slice(0, 4)}••••${rawCode.slice(-4)}` : "••••••••";
    const existing = await prisma.giftCode.findUnique({
      where: { giftProductId_codeHash: { giftProductId: steam500.id, codeHash } },
    });
    if (!existing) {
      // Basic deterministic encryption for seed
      const iv = crypto.randomBytes(12);
      const secret = process.env.AUTH_SECRET || "digital-marketplace-secret-key-change-in-production-min-32-chars";
      const key = crypto.createHash("sha256").update(`${secret}::gift-code-encryption-v1`, "utf8").digest();
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([cipher.update(rawCode.replace(/[\s\-_]+/g, "").toUpperCase(), "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const encryptedCode = `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;

      await prisma.giftCode.create({
        data: {
          giftProductId: steam500.id,
          encryptedCode,
          codeHash,
          maskedCode,
          batchLabel: "INITIAL_SEED_BATCH",
          status: "AVAILABLE",
        },
      });
    }
  }

  // Sample encrypted codes for Amazon product
  const sampleAmazonCodes = [
    "AMZN-9999-AAAA-1111",
    "AMZN-8888-BBBB-2222",
  ];

  for (const rawCode of sampleAmazonCodes) {
    const codeHash = crypto.createHash("sha256").update(rawCode.replace(/[\s\-_]+/g, "").toUpperCase(), "utf8").digest("hex");
    const maskedCode = rawCode.length > 8 ? `${rawCode.slice(0, 4)}••••${rawCode.slice(-4)}` : "••••••••";
    const existing = await prisma.giftCode.findUnique({
      where: { giftProductId_codeHash: { giftProductId: amazon500.id, codeHash } },
    });
    if (!existing) {
      const iv = crypto.randomBytes(12);
      const secret = process.env.AUTH_SECRET || "digital-marketplace-secret-key-change-in-production-min-32-chars";
      const key = crypto.createHash("sha256").update(`${secret}::gift-code-encryption-v1`, "utf8").digest();
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([cipher.update(rawCode.replace(/[\s\-_]+/g, "").toUpperCase(), "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const encryptedCode = `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;

      await prisma.giftCode.create({
        data: {
          giftProductId: amazon500.id,
          encryptedCode,
          codeHash,
          maskedCode,
          batchLabel: "INITIAL_SEED_BATCH",
          status: "AVAILABLE",
        },
      });
    }
  }

  console.log("🎁 Gift categories, products, and sample inventory seeded");


  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



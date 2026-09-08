# DigiMart — Digital Marketplace Platform

A production-ready, full-stack digital products e-commerce platform built with Next.js 16 (App Router & Turbopack), Drizzle ORM, TailwindCSS, and PostgreSQL.

---

## 🚀 Features

- **Storefront & Catalog:** Categorized digital products, bundle deals, search, and responsive mobile-first UI.
- **Digital Asset Delivery:** Secure digital downloads with tokenized temporary links and download quota tracking.
- **Cart & Checkout:** Multi-item cart, coupon system, and Razorpay payment gateway integration (supports test mock mode).
- **Customer Dashboard:** User library with purchased courses, notes, and digital files, order history, and profile management.
- **Admin Control Panel:**
  - Comprehensive KPI analytics & sales overview
  - Product & category management (rich descriptions, pricing, digital assets)
  - Order management and payment verification
  - Coupon management (flat/percentage discounts)
  - User role management (`user`, `admin`, `super_admin`)
  - Banner management & broadcast notifications
  - Audit logging system

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Database & ORM:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Styling:** [TailwindCSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Payments:** Razorpay API / Test Mode
- **Auth:** Custom secure cookie session auth with SHA-256 / PBKDF2 hashing

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/atulkumar951-pixel/digimart.git
cd digimart
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# Razorpay (Optional - omit or leave blank for mock checkout mode)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

### 4. Push Database Schema
```bash
npx drizzle-kit push
```

### 5. Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment (Vercel + PostgreSQL)

### 1. Database (Render / Neon / Supabase)
1. Create a PostgreSQL database on [Render](https://render.com), [Neon](https://neon.tech), or [Supabase](https://supabase.com).
2. Copy your connection string (ensure `?sslmode=require` is appended if required by the cloud host).
3. Run `npx drizzle-kit push` locally to initialize tables.

### 2. Frontend Deployment (Vercel)
1. Push your repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the `digimart` repository.
4. In the **Environment Variables** section, configure:
   - `DATABASE_URL` = Your production PostgreSQL connection string
   - `RAZORPAY_KEY_ID` = (Optional) Your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET` = (Optional) Your Razorpay Secret
5. Click **Deploy**.

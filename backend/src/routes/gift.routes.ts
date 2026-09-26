import { Router } from "express";
import * as giftCatalog from "../controllers/giftCatalog.controller";
import * as giftCart from "../controllers/giftCart.controller";
import * as giftCheckout from "../controllers/giftCheckout.controller";
import * as giftOrders from "../controllers/giftOrder.controller";
import { requireAuth } from "../middleware/auth";
import { requireGiftMode } from "../middleware/modeGuard";

const router = Router();

// Every customer gift-code route enforces GIFT_CODES mode (PRD §4, §35)
router.use(requireGiftMode);

// ------------------------------------------------------------------
// Catalogue & Discovery (public)
// ------------------------------------------------------------------
router.get("/categories", giftCatalog.getGiftCategories);
router.get("/brands", giftCatalog.getGiftBrands);
router.get("/brands/:brandName", giftCatalog.getBrandDetail);
router.get("/banners", giftCatalog.getGiftBanners);
router.get("/products", giftCatalog.getGiftProducts);
router.get("/products/:slug", giftCatalog.getGiftProduct);

// ------------------------------------------------------------------
// Cart (authenticated)
// ------------------------------------------------------------------
router.get("/cart", requireAuth, giftCart.getGiftCart);
router.post("/cart", requireAuth, giftCart.addGiftCartItem);
router.patch("/cart/:giftProductId", requireAuth, giftCart.updateGiftCartItem);
router.delete("/cart/:giftProductId", requireAuth, giftCart.removeGiftCartItem);
router.delete("/cart", requireAuth, giftCart.clearGiftCart);

// ------------------------------------------------------------------
// Checkout & Payment
// ------------------------------------------------------------------
router.post("/checkout", requireAuth, giftCheckout.createCheckout);
router.post("/checkout/verify", requireAuth, giftCheckout.verifyPayment);
router.post("/checkout/webhook", giftCheckout.handleRazorpayWebhook);

// ------------------------------------------------------------------
// Customer Orders & Gift Vault
// ------------------------------------------------------------------
router.get("/orders", requireAuth, giftOrders.getUserOrders);
router.get("/orders/:orderNumber", requireAuth, giftOrders.getOrderDetail);
router.get("/my-codes", requireAuth, giftOrders.getMyGiftCodes);
router.get("/stats", requireAuth, giftOrders.getUserStats);

export default router;

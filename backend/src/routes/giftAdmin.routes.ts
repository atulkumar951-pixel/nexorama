import { Router } from "express";
import * as giftAdmin from "../controllers/giftAdmin.controller";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All admin gift routes require an authenticated admin
router.use(requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "SUPPORT"));

// ------------------------------------------------------------------
// Dashboard & Analytics
// ------------------------------------------------------------------
router.get("/dashboard", giftAdmin.getDashboard);
router.get("/reports", giftAdmin.getReports);

// ------------------------------------------------------------------
// Categories
// ------------------------------------------------------------------
router.get("/categories", giftAdmin.listCategories);
router.post("/categories", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.createCategory);
router.patch("/categories/:id", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.updateCategory);
router.delete("/categories/:id", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.deleteCategory);

// ------------------------------------------------------------------
// Products
// ------------------------------------------------------------------
router.get("/products", giftAdmin.listProducts);
router.get("/products/:id", giftAdmin.getProduct);
router.post("/products", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.createProduct);
router.patch("/products/:id", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.updateProduct);
router.patch("/products/:id/status", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.setProductStatus);
router.delete("/products/:id", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.deleteProduct);

// ------------------------------------------------------------------
// Inventory & Imports
// ------------------------------------------------------------------
router.get("/inventory", giftAdmin.listInventory);
router.get("/inventory/stock/:id", giftAdmin.getProductStock);
router.post("/inventory/preview-csv", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.previewCsvImport);
router.post("/inventory/preview-batch", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.previewBatchImport);
router.post("/inventory/commit", requireAdmin("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"), giftAdmin.commitImport);
router.delete("/inventory/:codeId", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.cancelCode);

// ------------------------------------------------------------------
// Deliveries & Fulfillment
// ------------------------------------------------------------------
router.get("/deliveries/queue", giftAdmin.getDeliveryQueue);
router.get("/deliveries/orders/:orderId", giftAdmin.getDeliveryDetail);
router.post("/deliveries/:deliveryId/reveal", giftAdmin.revealDeliveryCode);
router.post("/deliveries/mark-sent", giftAdmin.markDeliveriesSent);
router.post("/deliveries/:deliveryId/assign", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.assignCodeManually);
router.post("/deliveries/:deliveryId/replace", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.replaceCode);
router.post("/deliveries/orders/:orderId/refund", requireAdmin("SUPER_ADMIN"), giftAdmin.refundOrderOverride);

// ------------------------------------------------------------------
// Mode & Global Settings
// ------------------------------------------------------------------
router.get("/settings/mode", giftAdmin.getMarketplaceModeConfig);
router.post("/settings/mode", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.setMarketplaceMode);
router.patch("/settings/gift", requireAdmin("SUPER_ADMIN", "ADMIN"), giftAdmin.updateGiftSettings);
router.put("/settings/raw-roles", requireAdmin("SUPER_ADMIN"), giftAdmin.setRawCodeRoles);

export default router;

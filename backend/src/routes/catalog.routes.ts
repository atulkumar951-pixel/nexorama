import { Router } from "express";
import * as catalog from "../controllers/catalog.controller";

// Public marketplace endpoints (PRD §95)
const router = Router();

router.get("/categories", catalog.getCategories);
router.get("/categories/:slug", catalog.getCategory);
router.get("/products", catalog.getProducts);
router.get("/products/:slug", catalog.getProduct);
router.get("/search", catalog.searchProducts);
router.get("/homepage", catalog.getHomepage);
router.get("/banners", catalog.getBanners);

export default router;

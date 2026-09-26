import type { NextFunction, Request, Response } from "express";
import * as giftAdmin from "../services/giftAdmin.service";
import * as giftDelivery from "../services/giftDelivery.service";
import * as giftInventory from "../services/giftInventory.service";
import * as settingsService from "../services/settings.service";
import { Errors } from "../utils/errors";

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ------------------------------------------------------------------
// Dashboard & Reports
// ------------------------------------------------------------------

export async function getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await giftAdmin.getGiftDashboard();
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { preset, from, to } = req.query as Record<string, string | undefined>;
    const reports = await giftAdmin.getGiftReports({
      preset: preset as any,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Categories
// ------------------------------------------------------------------

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await giftAdmin.listGiftCategoriesAdmin();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await giftAdmin.createGiftCategory(req.body);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await giftAdmin.updateGiftCategory(req.params.id, req.body);
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await giftAdmin.deleteGiftCategory(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Products
// ------------------------------------------------------------------

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await giftAdmin.listGiftProductsAdmin({
      page: parseNum(q.page),
      limit: parseNum(q.limit),
      search: q.search?.trim(),
      categoryId: q.categoryId,
      status: q.status,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await giftAdmin.getGiftProductAdmin(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await giftAdmin.createGiftProduct({
      ...req.body,
      denomination: Number(req.body.denomination),
      sellingPrice: Number(req.body.sellingPrice),
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = { ...req.body };
    if (body.denomination !== undefined) body.denomination = Number(body.denomination);
    if (body.sellingPrice !== undefined) body.sellingPrice = Number(body.sellingPrice);
    const product = await giftAdmin.updateGiftProduct(req.params.id, body);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function setProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body ?? {};
    if (!status) throw Errors.badRequest("status is required");
    const product = await giftAdmin.setGiftProductStatus(req.params.id, status);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await giftAdmin.deleteGiftProduct(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Inventory & Imports
// ------------------------------------------------------------------

export async function listInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await giftInventory.listInventory({
      giftProductId: q.giftProductId,
      status: q.status,
      page: parseNum(q.page),
      limit: parseNum(q.limit),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stock = await giftInventory.getStockForProduct(req.params.id);
    res.json({ stock });
  } catch (err) {
    next(err);
  }
}

export async function previewCsvImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { giftProductId, csvText } = req.body ?? {};
    if (!giftProductId || typeof csvText !== "string") {
      throw Errors.badRequest("giftProductId and csvText are required");
    }
    const rows = giftInventory.parseCsvRows(csvText);
    const preview = await giftInventory.previewImport(giftProductId, rows);
    res.json(preview);
  } catch (err) {
    next(err);
  }
}

export async function previewBatchImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { giftProductId, lines, expiryDate, batchLabel } = req.body ?? {};
    if (!giftProductId || typeof lines !== "string") {
      throw Errors.badRequest("giftProductId and lines are required");
    }
    const rows = giftInventory.parseBatchLines(lines, {
      expiry: expiryDate ? new Date(expiryDate) : undefined,
      batch: batchLabel,
    });
    const preview = await giftInventory.previewImport(giftProductId, rows);
    res.json(preview);
  } catch (err) {
    next(err);
  }
}

export async function commitImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { giftProductId, rows } = req.body ?? {};
    if (!giftProductId || !Array.isArray(rows)) {
      throw Errors.badRequest("giftProductId and rows are required");
    }
    const parsed = rows.map((r: any) => ({
      code: String(r.code || ""),
      expiry: r.expiry ? new Date(r.expiry) : null,
      notes: r.notes ?? null,
      batch: r.batch ?? null,
    }));
    const result = await giftInventory.commitImport(giftProductId, parsed, req.admin!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body ?? {};
    const result = await giftInventory.cancelCode(req.params.codeId, reason, req.admin!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}


// ------------------------------------------------------------------
// Deliveries & Fulfillment
// ------------------------------------------------------------------

export async function getDeliveryQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await giftDelivery.listPendingDeliveries({
      status: q.status as any,
      overdueOnly: q.overdueOnly === "true",
      search: q.search?.trim(),
      page: parseNum(q.page),
      limit: parseNum(q.limit),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await giftDelivery.getDeliveryDetail(req.params.orderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function revealDeliveryCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = {
      id: req.admin!.id,
      email: req.admin!.email,
      role: req.admin!.role,
    };
    const { reason } = req.body ?? {};
    const result = await giftDelivery.revealDeliveryCode(req.params.deliveryId, actor, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markDeliveriesSent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = {
      id: req.admin!.id,
      email: req.admin!.email,
      role: req.admin!.role,
    };
    const { deliveryIds, adminNote } = req.body ?? {};
    const result = await giftDelivery.markDeliveriesSent({ deliveryIds, adminNote }, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function assignCodeManually(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = {
      id: req.admin!.id,
      email: req.admin!.email,
      role: req.admin!.role,
    };
    const { giftCodeId } = req.body ?? {};
    if (!giftCodeId) throw Errors.badRequest("giftCodeId is required");
    const result = await giftDelivery.assignCodeManually(req.params.deliveryId, giftCodeId, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function replaceCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = {
      id: req.admin!.id,
      email: req.admin!.email,
      role: req.admin!.role,
    };
    const { reason, overrideCodeId } = req.body ?? {};
    const result = await giftDelivery.replaceCode(req.params.deliveryId, reason, actor, overrideCodeId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refundOrderOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = {
      id: req.admin!.id,
      email: req.admin!.email,
      role: req.admin!.role,
    };
    const { reason } = req.body ?? {};
    const result = await giftDelivery.superAdminRefundOverride(req.params.orderId, reason, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Mode & Gift Settings
// ------------------------------------------------------------------

export async function getMarketplaceModeConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mode = await settingsService.getMarketplaceMode();
    const settings = await settingsService.getGiftSettings();
    const rawRoles = await settingsService.getRawCodeAccessRoles();
    res.json({ mode, settings, rawCodeAccessRoles: rawRoles });
  } catch (err) {
    next(err);
  }
}

export async function setMarketplaceMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mode } = req.body ?? {};
    if (!mode) throw Errors.badRequest("mode is required");
    const updated = await settingsService.setMarketplaceMode(mode, req.admin!.id);
    res.json({ mode: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateGiftSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.updateGiftSettings(req.body ?? {}, req.admin!.id);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function setRawCodeRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roles } = req.body ?? {};
    if (!Array.isArray(roles)) throw Errors.badRequest("roles must be an array of AdminRole names");
    const updated = await settingsService.setRawCodeAccessRoles(roles, req.admin!.id);
    res.json({ rawCodeAccessRoles: updated });
  } catch (err) {
    next(err);
  }
}


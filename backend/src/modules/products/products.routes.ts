import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const productsRouter = Router();

// GET all products (with category join)
productsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const where = activeOnly
      ? "WHERE p.is_active = 1 AND (p.name LIKE ? OR p.generic_name LIKE ?)"
      : "WHERE p.name LIKE ? OR p.generic_name LIKE ?";
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.generic_name, p.manufacturer, p.unit, p.pack_size,
              p.batch_number, p.expiry_date, p.unit_price, p.gst_rate, 
              p.reorder_level, p.is_active, p.category_id,
              mc.name AS category_name
       FROM products p
       LEFT JOIN medicine_categories mc ON p.category_id = mc.id
       ${where}
       ORDER BY p.name ASC`,
      [search, search]
    );
    res.json(rows);
  })
);

// POST new product
productsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const {
      name, generic_name, manufacturer, unit, pack_size,
      batch_number, expiry_date, unit_price, gst_rate,
      reorder_level, category_id,
    } = req.body;
    if (!name || unit_price == null) throw new HttpError(400, "Name and Price are required");

    const [result] = await pool.query<any>(
      `INSERT INTO products 
        (name, generic_name, manufacturer, unit, pack_size,
         batch_number, expiry_date, unit_price, gst_rate,
         reorder_level, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        generic_name || null,
        manufacturer || null,
        unit || null,
        pack_size || null,
        batch_number || null,
        expiry_date || null,
        unit_price,
        gst_rate || 0,
        reorder_level || 10,
        category_id || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  })
);

// PUT update product
productsRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name, generic_name, manufacturer, unit, pack_size,
      batch_number, expiry_date, unit_price, gst_rate,
      reorder_level, category_id,
    } = req.body;
    if (!name || unit_price == null) throw new HttpError(400, "Name and Price are required");

    await pool.query(
      `UPDATE products SET 
        name = ?, generic_name = ?, manufacturer = ?, unit = ?, pack_size = ?,
        batch_number = ?, expiry_date = ?, unit_price = ?, gst_rate = ?,
        reorder_level = ?, category_id = ?
       WHERE id = ?`,
      [
        name.trim(),
        generic_name || null,
        manufacturer || null,
        unit || null,
        pack_size || null,
        batch_number || null,
        expiry_date || null,
        unit_price,
        gst_rate || 0,
        reorder_level || 10,
        category_id || null,
        id,
      ]
    );
    res.json({ success: true });
  })
);

// PATCH activate/deactivate product
productsRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE products SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE product
productsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [bills] = await pool.query<any[]>(
      "SELECT COUNT(*) AS count FROM bill_items WHERE source_product_id = ?", [id]
    );
    if (Number(bills[0].count) > 0) {
      throw new HttpError(400, "Cannot delete: This product is used in bills. Deactivate instead.");
    }
    // New:
await pool.query("UPDATE products SET deleted_at = NOW() WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
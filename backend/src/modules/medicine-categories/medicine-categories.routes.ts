import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const medicineCategoriesRouter = Router();

// GET all categories (with search + active filter)
medicineCategoriesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const activeOnly = req.query.active === "true";
    const where = activeOnly
      ? "WHERE is_active = 1 AND (name LIKE ? OR code LIKE ?)"
      : "WHERE name LIKE ? OR code LIKE ?";
    const [rows] = await pool.query(
      `SELECT id, code, name, description, is_active, created_at, updated_at
       FROM medicine_categories
       ${where}
       ORDER BY name ASC`,
      [search, search]
    );
    res.json(rows);
  })
);

// POST new category
medicineCategoriesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { code, name, description } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM medicine_categories WHERE code = ? OR name = ?",
      [code.trim(), name.trim()]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Category with this code or name already exists");
    }

    const [result] = await pool.query<any>(
      "INSERT INTO medicine_categories (code, name, description) VALUES (?, ?, ?)",
      [code.trim(), name.trim(), description || null]
    );
    res.status(201).json({ id: result.insertId });
  })
);

// PUT update category
medicineCategoriesRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, description } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM medicine_categories WHERE (code = ? OR name = ?) AND id != ?",
      [code.trim(), name.trim(), id]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Category with this code or name already exists");
    }

    await pool.query(
      "UPDATE medicine_categories SET code = ?, name = ?, description = ? WHERE id = ?",
      [code.trim(), name.trim(), description || null, id]
    );
    res.json({ success: true });
  })
);

// PATCH activate/deactivate
medicineCategoriesRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query(
      "UPDATE medicine_categories SET is_active = ? WHERE id = ?",
      [is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  })
);

// DELETE category
medicineCategoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM medicine_categories WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
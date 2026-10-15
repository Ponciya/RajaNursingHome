import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const ageCategoriesRouter = Router();

// GET all
ageCategoriesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const activeOnly = req.query.active === "true";
    const where = activeOnly
      ? "WHERE is_active = 1 AND name LIKE ?"
      : "WHERE name LIKE ?";
    const [rows] = await pool.query(
      `SELECT id, name, min_age, max_age, description, is_active, created_at, updated_at
       FROM age_categories
       ${where}
       ORDER BY min_age ASC`,
      [search]
    );
    res.json(rows);
  })
);

// POST new
ageCategoriesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, min_age, max_age, description } = req.body;
    if (!name || min_age == null) throw new HttpError(400, "Name and Min Age are required");

    if (max_age != null && Number(max_age) < Number(min_age)) {
      throw new HttpError(400, "Max age cannot be less than min age");
    }

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM age_categories WHERE name = ?",
      [name.trim()]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Age category with this name already exists");
    }

    const [result] = await pool.query<any>(
      `INSERT INTO age_categories (name, min_age, max_age, description)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), Number(min_age), max_age != null ? Number(max_age) : null, description || null]
    );
    res.status(201).json({ id: result.insertId });
  })
);

// PUT update
ageCategoriesRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, min_age, max_age, description } = req.body;
    if (!name || min_age == null) throw new HttpError(400, "Name and Min Age are required");

    if (max_age != null && Number(max_age) < Number(min_age)) {
      throw new HttpError(400, "Max age cannot be less than min age");
    }

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM age_categories WHERE name = ? AND id != ?",
      [name.trim(), id]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Age category with this name already exists");
    }

    await pool.query(
      `UPDATE age_categories SET name = ?, min_age = ?, max_age = ?, description = ?
       WHERE id = ?`,
      [name.trim(), Number(min_age), max_age != null ? Number(max_age) : null, description || null, id]
    );
    res.json({ success: true });
  })
);

// PATCH status
ageCategoriesRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE age_categories SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE
ageCategoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM age_categories WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
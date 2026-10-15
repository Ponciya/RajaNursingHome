import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const racksRouter = Router();

// GET all racks
racksRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const activeOnly = req.query.active === "true";
    const where = activeOnly
      ? "WHERE is_active = 1 AND (name LIKE ? OR code LIKE ?)"
      : "WHERE name LIKE ? OR code LIKE ?";
    const [rows] = await pool.query(
      `SELECT id, code, name, location, description, aisle_shelf, room_number, 
              is_active, created_at, updated_at
       FROM racks
       ${where}
       ORDER BY name ASC`,
      [search, search]
    );
    res.json(rows);
  })
);

// POST new rack
racksRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { code, name, location, description, aisle_shelf, room_number } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM racks WHERE code = ? OR name = ?",
      [code.trim().toUpperCase(), name.trim()]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Rack with this code or name already exists");
    }

    const [result] = await pool.query<any>(
      `INSERT INTO racks (code, name, location, description, aisle_shelf, room_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        location || null,
        description || null,
        aisle_shelf || null,
        room_number || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  })
);

// PUT update rack
racksRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, location, description, aisle_shelf, room_number } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM racks WHERE (code = ? OR name = ?) AND id != ?",
      [code.trim().toUpperCase(), name.trim(), id]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Rack with this code or name already exists");
    }

    await pool.query(
      `UPDATE racks SET code = ?, name = ?, location = ?, description = ?, 
                        aisle_shelf = ?, room_number = ?
       WHERE id = ?`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        location || null,
        description || null,
        aisle_shelf || null,
        room_number || null,
        id,
      ]
    );
    res.json({ success: true });
  })
);

// PATCH status
racksRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE racks SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE
racksRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [used] = await pool.query<any[]>(
      "SELECT COUNT(*) AS count FROM medicine_inventory WHERE rack_id = ?", [id]
    );
    if (Number(used[0].count) > 0) {
      throw new HttpError(400, "Cannot delete: Rack is used in inventory. Deactivate instead.");
    }
    await pool.query("DELETE FROM racks WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
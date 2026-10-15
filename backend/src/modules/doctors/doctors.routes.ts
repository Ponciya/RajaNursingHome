import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const doctorsRouter = Router();

// GET all doctors
// GET all doctors (with optional active filter)
doctorsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const query = activeOnly
      ? "SELECT id, name, qualification, is_active FROM doctors WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC"
      : "SELECT id, name, qualification, is_active FROM doctors WHERE deleted_at IS NULL ORDER BY name ASC";
    const [rows] = await pool.query(query);
    res.json(rows);
  })
);

// POST new doctor (Admin only)
doctorsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, qualification } = req.body;
    if (!name) throw new HttpError(400, "Doctor name is required");

    const [result] = await pool.query(
      "INSERT INTO doctors (name, qualification) VALUES (?, ?)",
      [name, qualification || null]
    );
    res.status(201).json({ id: (result as any).insertId, name, qualification, is_active: 1 });
  })
);

// PATCH activate/deactivate doctor (Admin only)
doctorsRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE doctors SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// PUT: Update doctor details (Admin only)
doctorsRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, qualification } = req.body;
    if (!name) throw new HttpError(400, "Doctor name is required");

    await pool.query(
      "UPDATE doctors SET name = ?, qualification = ? WHERE id = ?",
      [name, qualification || null, id]
    );
    res.json({ success: true });
  })
);
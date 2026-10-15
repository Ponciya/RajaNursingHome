import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const servicesRouter = Router();

servicesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const query = activeOnly
      ? "SELECT id, name, unit_price, is_active FROM services WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC"
      : "SELECT id, name, unit_price, is_active FROM services WHERE deleted_at IS NULL ORDER BY name ASC";
    const [rows] = await pool.query(query);
    res.json(rows);
  })
);

servicesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, unit_price } = req.body;
    if (!name || unit_price == null) throw new HttpError(400, "Name and Price required");
    const [result] = await pool.query(
      "INSERT INTO services (name, unit_price) VALUES (?, ?)",
      [name, unit_price]
    );
    res.status(201).json({ id: (result as any).insertId });
  })
);

servicesRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE services SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE: Delete service (only if no bills reference it)
servicesRouter.delete(
    "/:id",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      
      const [bills] = await pool.query<any[]>(
        "SELECT COUNT(*) AS count FROM bill_items WHERE source_service_id = ?", [id]
      );
      
      if (Number(bills[0].count) > 0) {
        throw new HttpError(400, "Cannot delete: This service is used in bills. Deactivate instead.");
      }
      
      await pool.query("UPDATE services SET deleted_at = NOW() WHERE id = ?", [id]);
      res.json({ success: true });
    })
  );

  // PUT: Update service (Admin only)
servicesRouter.put(
    "/:id",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, unit_price } = req.body;
      if (!name || unit_price == null) throw new HttpError(400, "Name and Price are required");
  
      await pool.query(
        "UPDATE services SET name = ?, unit_price = ? WHERE id = ?",
        [name, unit_price, id]
      );
      res.json({ success: true });
    })
  );
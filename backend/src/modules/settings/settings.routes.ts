import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const settingsRouter = Router();

// GET hospital settings
settingsRouter.get(
  "/hospital",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM hospital_settings WHERE id = 1"
    );
    res.json(rows[0] || {});
  })
);

// PUT hospital settings (Admin only)
settingsRouter.put(
  "/hospital",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { hospital_name, address_line1, address_line2, landline, phone, gstin, drug_licence_no } = req.body;
    await pool.query(
      `UPDATE hospital_settings SET 
         hospital_name = ?, address_line1 = ?, address_line2 = ?,
         landline = ?, phone = ?, gstin = ?, drug_licence_no = ?
       WHERE id = 1`,
      [hospital_name, address_line1, address_line2, landline, phone, gstin || null, drug_licence_no || null]
    );
    res.json({ success: true });
  })
);
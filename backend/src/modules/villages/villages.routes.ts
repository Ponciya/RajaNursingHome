import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import multer from "multer";
import { parse } from "csv-parse/sync";

export const villagesRouter = Router();

// Configure multer (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST: Import villages from CSV file
villagesRouter.post(
  "/import",
  requireAuth,
  requireRole("ADMIN"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded");

    let records: any[];
    try {
      records = parse(req.file.buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new HttpError(400, "Invalid CSV file: " + err.message);
    }

    if (records.length === 0) throw new HttpError(400, "CSV file is empty");

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of records) {
      const code = String(row.code || row.Code || row.CODE || "").trim().toUpperCase();
      const name = String(row.name || row.Name || row.NAME || "").trim();
      const district = String(row.district || row.District || "").trim() || null;
      const pincode = String(row.pincode || row.Pincode || "").trim() || null;

      if (!code || !name) {
        errors.push(`Row skipped: code or name missing`);
        skipped++;
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO villages (code, name, district, pincode)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = name`,
          [code, name, district, pincode]
        );
        inserted++;
      } catch (err: any) {
        errors.push(`${name}: ${err.message}`);
        skipped++;
      }
    }

    res.json({
      success: true,
      inserted,
      skipped,
      total: records.length,
      errors: errors.slice(0, 10),
    });
  })
);

villagesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const activeOnly = req.query.active === "true";
    const where = activeOnly
      ? "WHERE is_active = 1 AND (name LIKE ? OR code LIKE ?)"
      : "WHERE name LIKE ? OR code LIKE ?";
    const [rows] = await pool.query(
      `SELECT id, code, name, taluk, district, state, pincode, is_active, created_at, updated_at
       FROM villages
       ${where}
       ORDER BY name ASC`,
      [search, search]
    );
    res.json(rows);
  })
);

villagesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { code, name, taluk, district, state, pincode } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM villages WHERE code = ? OR name = ?",
      [code.trim(), name.trim()]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Village with this code or name already exists");
    }

    const [result] = await pool.query<any>(
      `INSERT INTO villages (code, name, taluk, district, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name.trim(), taluk || null, district || null, state || null, pincode || null]
    );
    res.status(201).json({ id: result.insertId });
  })
);

villagesRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, taluk, district, state, pincode } = req.body;
    if (!code || !name) throw new HttpError(400, "Code and Name are required");

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM villages WHERE (code = ? OR name = ?) AND id != ?",
      [code.trim(), name.trim(), id]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Village with this code or name already exists");
    }

    await pool.query(
      `UPDATE villages SET code = ?, name = ?, taluk = ?, district = ?, state = ?, pincode = ?
       WHERE id = ?`,
      [code.trim().toUpperCase(), name.trim(), taluk || null, district || null, state || null, pincode || null, id]
    );
    res.json({ success: true });
  })
);

villagesRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE villages SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

villagesRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [used] = await pool.query<any[]>(
      "SELECT COUNT(*) AS count FROM patients WHERE village_id = ?", [id]
    );
    if (Number(used[0].count) > 0) {
      throw new HttpError(400, "Cannot delete: Village is used by patients. Deactivate instead.");
    }
    await pool.query("DELETE FROM villages WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
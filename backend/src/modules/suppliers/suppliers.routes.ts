import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const suppliersRouter = Router();

// GET all suppliers (exclude deleted)
suppliersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const [rows] = await pool.query(
      `SELECT s.id, s.code, s.name, s.contact_person, s.phone, s.email,
              s.city, s.gstin, s.is_active,
              (SELECT COUNT(*) FROM supplier_medicines sm WHERE sm.supplier_id = s.id) AS medicine_count
       FROM suppliers s
       WHERE s.deleted_at IS NULL
         AND (s.name LIKE ? OR s.code LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ?)
       ORDER BY s.name ASC`,
      [search, search, search, search]
    );
    res.json(rows);
  })
);

// GET single supplier with medicines
suppliersRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [supRows] = await pool.query<any[]>(
      "SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL", [id]
    );
    if (supRows.length === 0) throw new HttpError(404, "Supplier not found");

    const [medRows] = await pool.query(
      `SELECT sm.id, sm.medicine_id, sm.purchase_rate, sm.notes,
              p.name AS medicine_name, p.unit
       FROM supplier_medicines sm
       JOIN products p ON sm.medicine_id = p.id
       WHERE sm.supplier_id = ?
       ORDER BY p.name ASC`,
      [id]
    );

    res.json({ supplier: supRows[0], medicines: medRows });
  })
);

// POST create supplier with medicines
suppliersRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { supplier, medicines } = req.body;
    if (!supplier || !supplier.code || !supplier.name) {
      throw new HttpError(400, "Code and Name are required");
    }
    if (supplier.phone && !/^\d{10}$/.test(supplier.phone.trim())) {
      throw new HttpError(400, "Phone must be 10 digits");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<any[]>(
        "SELECT id FROM suppliers WHERE code = ? AND deleted_at IS NULL",
        [supplier.code.trim().toUpperCase()]
      );
      if (existing.length > 0) throw new HttpError(400, "Supplier code already exists");

      const [result] = await connection.query<any>(
        `INSERT INTO suppliers 
          (code, name, contact_person, phone, email,
           address_line1, address_line2, city, district, state, pincode,
           gstin, drug_licence_no, min_order_value, payment_terms,
           bank_name, account_no, ifsc_code, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier.code.trim().toUpperCase(), supplier.name.trim(),
          supplier.contact_person || null, supplier.phone ? supplier.phone.trim() : null,
          supplier.email || null,
          supplier.address_line1 || null, supplier.address_line2 || null,
          supplier.city || null, supplier.district || null,
          supplier.state || null, supplier.pincode || null,
          supplier.gstin || null, supplier.drug_licence_no || null,
          supplier.min_order_value || null, supplier.payment_terms || null,
          supplier.bank_name || null, supplier.account_no || null,
          supplier.ifsc_code || null, supplier.notes || null,
        ]
      );
      const supplierId = result.insertId;

      if (Array.isArray(medicines) && medicines.length > 0) {
        for (const m of medicines) {
          if (!m.medicine_id) continue;
          await connection.query(
            `INSERT INTO supplier_medicines (supplier_id, medicine_id, purchase_rate, notes)
             VALUES (?, ?, ?, ?)`,
            [supplierId, m.medicine_id, m.purchase_rate || null, m.notes || null]
          );
        }
      }

      await connection.commit();
      res.status(201).json({ id: supplierId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

// PUT update supplier
suppliersRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { supplier, medicines } = req.body;
    if (!supplier || !supplier.code || !supplier.name) {
      throw new HttpError(400, "Code and Name are required");
    }
    if (supplier.phone && !/^\d{10}$/.test(supplier.phone.trim())) {
      throw new HttpError(400, "Phone must be 10 digits");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<any[]>(
        "SELECT id FROM suppliers WHERE code = ? AND id != ? AND deleted_at IS NULL",
        [supplier.code.trim().toUpperCase(), id]
      );
      if (existing.length > 0) throw new HttpError(400, "Supplier code already exists");

      await connection.query(
        `UPDATE suppliers SET 
           code = ?, name = ?, contact_person = ?, phone = ?, email = ?,
           address_line1 = ?, address_line2 = ?, city = ?, district = ?, state = ?, pincode = ?,
           gstin = ?, drug_licence_no = ?, min_order_value = ?, payment_terms = ?,
           bank_name = ?, account_no = ?, ifsc_code = ?, notes = ?
         WHERE id = ?`,
        [
          supplier.code.trim().toUpperCase(), supplier.name.trim(),
          supplier.contact_person || null, supplier.phone ? supplier.phone.trim() : null,
          supplier.email || null,
          supplier.address_line1 || null, supplier.address_line2 || null,
          supplier.city || null, supplier.district || null,
          supplier.state || null, supplier.pincode || null,
          supplier.gstin || null, supplier.drug_licence_no || null,
          supplier.min_order_value || null, supplier.payment_terms || null,
          supplier.bank_name || null, supplier.account_no || null,
          supplier.ifsc_code || null, supplier.notes || null,
          id,
        ]
      );

      await connection.query("DELETE FROM supplier_medicines WHERE supplier_id = ?", [id]);
      if (Array.isArray(medicines) && medicines.length > 0) {
        for (const m of medicines) {
          if (!m.medicine_id) continue;
          await connection.query(
            `INSERT INTO supplier_medicines (supplier_id, medicine_id, purchase_rate, notes)
             VALUES (?, ?, ?, ?)`,
            [id, m.medicine_id, m.purchase_rate || null, m.notes || null]
          );
        }
      }

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

// PATCH status
suppliersRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE suppliers SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE - SOFT DELETE
suppliersRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("UPDATE suppliers SET deleted_at = NOW() WHERE id = ?", [id]);
    res.json({ success: true });
  })
);

// GET rate comparison for medicine
suppliersRouter.get(
  "/medicine/:medicineId/rates",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { medicineId } = req.params;
    const [rows] = await pool.query(
      `SELECT sm.id, s.id AS supplier_id, s.name AS supplier_name, s.code AS supplier_code,
              s.phone AS supplier_phone, sm.purchase_rate, sm.notes
       FROM supplier_medicines sm
       JOIN suppliers s ON sm.supplier_id = s.id
       WHERE sm.medicine_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL
       ORDER BY sm.purchase_rate ASC`,
      [medicineId]
    );
    res.json(rows);
  })
);
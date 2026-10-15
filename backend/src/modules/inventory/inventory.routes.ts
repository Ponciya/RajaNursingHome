import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const inventoryRouter = Router();

// GET all inventory (with supplier + rack joins)
inventoryRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const [rows] = await pool.query(
      `SELECT inv.id, inv.medicine_id, inv.batch_number, 
              DATE_FORMAT(inv.expiry_date, '%Y-%m-%d') AS expiry_date,
              inv.quantity, inv.purchase_rate, inv.mrp, inv.selling_price,
              inv.rack_location, inv.rack_id, inv.supplier_id, inv.is_active,
              p.name AS medicine_name, p.unit, p.category_id,
              mc.name AS category_name,
              r.name AS rack_name,
              s.name AS supplier_name
       FROM medicine_inventory inv
       JOIN products p ON inv.medicine_id = p.id
       LEFT JOIN medicine_categories mc ON p.category_id = mc.id
       LEFT JOIN racks r ON inv.rack_id = r.id
       LEFT JOIN suppliers s ON inv.supplier_id = s.id
       WHERE p.name LIKE ? OR inv.batch_number LIKE ? OR inv.rack_location LIKE ?
       ORDER BY p.name ASC, inv.expiry_date ASC`,
      [search, search, search]
    );
    res.json(rows);
  })
);

// POST Stock In
inventoryRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { 
      medicine_id, batch_number, expiry_date, quantity, 
      purchase_rate, mrp, selling_price, rack_id, supplier_id 
    } = req.body;

    if (!medicine_id || !batch_number || !expiry_date || quantity == null) {
      throw new HttpError(400, "Medicine, Batch, Expiry and Quantity are required");
    }
    if (Number(quantity) < 0) {
      throw new HttpError(400, "Quantity cannot be negative");
    }

    let rackLocation: string | null = null;
    if (rack_id) {
      const [rackRows] = await pool.query<any[]>(
        "SELECT name FROM racks WHERE id = ?", [rack_id]
      );
      if (rackRows.length > 0) rackLocation = rackRows[0].name;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<any[]>(
        "SELECT id, quantity FROM medicine_inventory WHERE medicine_id = ? AND batch_number = ?",
        [medicine_id, batch_number.trim()]
      );

      let inventoryId: number;
      if (existing.length > 0) {
        inventoryId = existing[0].id;
        await connection.query(
          `UPDATE medicine_inventory 
           SET quantity = quantity + ?, expiry_date = ?, 
               purchase_rate = COALESCE(?, purchase_rate), 
               mrp = COALESCE(?, mrp),
               selling_price = COALESCE(?, selling_price),
               rack_id = COALESCE(?, rack_id),
               rack_location = COALESCE(?, rack_location),
               supplier_id = COALESCE(?, supplier_id)
           WHERE id = ?`,
          [
            Number(quantity), expiry_date, 
            purchase_rate || null, mrp || null, selling_price || null,
            rack_id || null, rackLocation,
            supplier_id || null, inventoryId
          ]
        );
      } else {
        const [result] = await connection.query<any>(
          `INSERT INTO medicine_inventory 
            (medicine_id, batch_number, expiry_date, quantity, purchase_rate, mrp, 
             selling_price, rack_id, rack_location, supplier_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            medicine_id, batch_number.trim(), expiry_date, Number(quantity),
            purchase_rate || null, mrp || null, selling_price || null,
            rack_id || null, rackLocation, supplier_id || null
          ]
        );
        inventoryId = result.insertId;
      }

      await connection.query(
        `INSERT INTO inventory_transactions 
          (inventory_id, transaction_type, quantity, notes)
         VALUES (?, 'STOCK_IN', ?, ?)`,
        [inventoryId, Number(quantity), `Stock In: ${quantity} units`]
      );

      await connection.commit();
      res.status(201).json({ id: inventoryId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

// PUT update
inventoryRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      quantity, purchase_rate, mrp, selling_price, expiry_date, 
      rack_id, supplier_id 
    } = req.body;

    if (quantity == null || Number(quantity) < 0) {
      throw new HttpError(400, "Quantity must be 0 or more");
    }

    const [existing] = await pool.query<any[]>(
      "SELECT quantity FROM medicine_inventory WHERE id = ?", [id]
    );
    if (existing.length === 0) throw new HttpError(404, "Inventory not found");

    const diff = Number(quantity) - Number(existing[0].quantity);

    let rackLocation: string | null = null;
    if (rack_id) {
      const [rackRows] = await pool.query<any[]>(
        "SELECT name FROM racks WHERE id = ?", [rack_id]
      );
      if (rackRows.length > 0) rackLocation = rackRows[0].name;
    }

    await pool.query(
      `UPDATE medicine_inventory 
       SET quantity = ?, purchase_rate = COALESCE(?, purchase_rate), 
           mrp = COALESCE(?, mrp), selling_price = COALESCE(?, selling_price),
           expiry_date = COALESCE(?, expiry_date),
           rack_id = ?, rack_location = ?, supplier_id = ?
       WHERE id = ?`,
      [
        Number(quantity), purchase_rate || null, mrp || null, 
        selling_price || null, expiry_date || null,
        rack_id || null, rackLocation, supplier_id || null, id
      ]
    );

    if (diff !== 0) {
      await pool.query(
        `INSERT INTO inventory_transactions 
          (inventory_id, transaction_type, quantity, notes)
         VALUES (?, 'ADJUSTMENT', ?, ?)`,
        [id, diff, `Adjustment: ${diff > 0 ? '+' : ''}${diff} units`]
      );
    }

    res.json({ success: true });
  })
);

// PATCH status
inventoryRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE medicine_inventory SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE
inventoryRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM inventory_transactions WHERE inventory_id = ?", [id]);
    await pool.query("DELETE FROM medicine_inventory WHERE id = ?", [id]);
    res.json({ success: true });
  })
);

// GET available batches for a specific medicine (for bill creation)
inventoryRouter.get(
  "/medicine/:medicineId/batches",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { medicineId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, batch_number, 
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
              quantity, rack_location, mrp, selling_price, purchase_rate
       FROM medicine_inventory
       WHERE medicine_id = ? AND is_active = 1 AND quantity > 0
       ORDER BY expiry_date ASC`,
      [medicineId]
    );
    res.json(rows);
  })
);
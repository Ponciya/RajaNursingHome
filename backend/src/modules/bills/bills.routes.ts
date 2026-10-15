import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const billsRouter = Router();

// 1. POST: Create a new bill
billsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patient_id, doctor_id, billing_type_id, items } = req.body;

    if (!patient_id || !doctor_id || !billing_type_id || !items || items.length === 0) {
      throw new HttpError(400, "Missing required billing details");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Generate Bill Number (RN-PH-000001)
      const [typeRows] = await connection.query<any[]>(
        "SELECT bill_prefix FROM billing_types WHERE id = ?", [billing_type_id]
      );
      const prefix = typeRows[0]?.bill_prefix || "RN-PH";

      const [seqRows] = await connection.query<any[]>(
        "SELECT next_number FROM bill_number_sequences WHERE billing_type_id = ? FOR UPDATE", [billing_type_id]
      );
      const nextNum = seqRows[0]?.next_number || 1;
      const billNo = `${prefix}-${String(nextNum).padStart(6, "0")}`;

      // Calculate Totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += (item.quantity * item.unit_price);
      }
      const grandTotal = subtotal;

      // Insert Bill
      const [billResult] = await connection.query<any>(
        `INSERT INTO bills (bill_number, billing_type_id, patient_id, doctor_id, bill_date, bill_time, status, subtotal, grand_total, created_by)
         VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), 'COMPLETED', ?, ?, ?)`,
        [billNo, billing_type_id, patient_id, doctor_id, subtotal, grandTotal, req.user!.id]
      );
      const billId = billResult.insertId;

      // Insert Bill Items (Snapshot)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await connection.query(
          `INSERT INTO bill_items (bill_id, line_no, item_kind, source_product_id, source_service_id, description, batch_number, expiry_date, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            billId,
            i + 1,
            item.item_kind,                  // <-- Frontend la irundhu varum
            item.product_id || null,
            item.service_id || null,
            item.description,
            item.batch_number || null,
            item.expiry_date || null,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price,
          ]
        );
      }

      // Update Sequence
      await connection.query(
        "UPDATE bill_number_sequences SET next_number = next_number + 1 WHERE billing_type_id = ?", [billing_type_id]
      );

      // Reduce inventory for PRODUCT items
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (item.item_kind === "PRODUCT" && item.product_id && item.batch_number) {
    const [invRows] = await connection.query<any[]>(
      `SELECT id, quantity FROM medicine_inventory 
       WHERE medicine_id = ? AND batch_number = ? AND is_active = 1
       LIMIT 1`,
      [item.product_id, item.batch_number]
    );

    if (invRows.length > 0) {
      const invId = invRows[0].id;
      const currentQty = Number(invRows[0].quantity);
      const newQty = Math.max(0, currentQty - Number(item.quantity));

      await connection.query(
        "UPDATE medicine_inventory SET quantity = ? WHERE id = ?",
        [newQty, invId]
      );

      await connection.query(
        `INSERT INTO inventory_transactions 
          (inventory_id, transaction_type, quantity, notes, reference_id)
         VALUES (?, 'BILL_SALE', ?, ?, ?)`,
        [invId, -Number(item.quantity), `Bill: ${billNo}`, billId]
      );
    }
  }
}

      await connection.commit();
      res.status(201).json({ id: billId, bill_no: billNo });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

// 2. GET: Billing Types (Ithu thaan mukkiyam, ithu /:id ku MELA irukkanum)
billsRouter.get(
  "/types",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, code, name, bill_prefix FROM billing_types WHERE is_active = 1 ORDER BY name ASC"
    );
    res.json(rows);
  })
);
// GET: Get all bills (for History page)// GET: Get all bills (for History page)
  billsRouter.get(
    "/",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const [rows] = await pool.query(
        `SELECT b.id, b.bill_number, 
                DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date, 
                b.bill_time, 
                b.grand_total, b.status,
                p.name AS patient_name, p.patient_code, 
                d.name AS doctor_name, 
                bt.name AS billing_type_name
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         LEFT JOIN doctors d ON b.doctor_id = d.id
         JOIN billing_types bt ON b.billing_type_id = bt.id
         ORDER BY b.id DESC`
      );
      res.json(rows);
    })
  );

// 3. GET: Get a single bill by ID (Ithu kadeisiya irukkanum)
// 3. GET: Get a single bill by ID (Ithu kadeisiya irukkanum)
billsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const [billRows] = await pool.query<any[]>(
      `SELECT b.*, 
              DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date,
              p.name AS patient_name, 
              p.patient_code, 
              p.age AS patient_age, 
              p.gender AS patient_gender,
              d.name AS doctor_name, 
              bt.name AS billing_type_name
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       LEFT JOIN doctors d ON b.doctor_id = d.id
       JOIN billing_types bt ON b.billing_type_id = bt.id
       WHERE b.id = ?`, [id]
    );

    if (billRows.length === 0) throw new HttpError(404, "Bill not found");

    const [itemRows] = await pool.query<any[]>(
      "SELECT * FROM bill_items WHERE bill_id = ? ORDER BY line_no", [id]
    );

    res.json({ bill: billRows[0], items: itemRows });
  })
);
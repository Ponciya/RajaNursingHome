import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const patientsRouter = Router();

patientsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const [rows] = await pool.query(
      `SELECT p.id, p.patient_code, p.name, p.age, p.gender, p.phone, p.address,
              p.patient_type, p.guardian_name, p.guardian_relation,
              d.name AS doctor_name,
              v.name AS village_name,
              ac.name AS age_category
       FROM patients p
       LEFT JOIN doctors d ON p.default_doctor_id = d.id
       LEFT JOIN villages v ON p.village_id = v.id
       LEFT JOIN age_categories ac ON p.age >= ac.min_age 
              AND (ac.max_age IS NULL OR p.age <= ac.max_age)
              AND ac.is_active = 1
      WHERE p.deleted_at IS NULL 
       AND (p.name LIKE ? OR p.patient_code LIKE ? OR p.phone LIKE ?)
       ORDER BY p.created_at DESC LIMIT 100`,
      [search, search, search]
    );
    res.json(rows);
  })
);

patientsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      name, age, gender, phone, address, doctor_id,
      guardian_name, guardian_relation, village_id,
    } = req.body;
    if (!name || !gender) throw new HttpError(400, "Name and Gender are required");

    if (phone && !/^\d{10}$/.test(phone.trim())) {
      throw new HttpError(400, "Phone number must be exactly 10 digits");
    }

     // ─── INTHA CODE-A ADD PANNUNGA ───
      if (phone) {
          const [existing] = await pool.query<any[]>(
            "SELECT id, name FROM patients WHERE phone = ? LIMIT 1",
            [phone.trim()]
           );
      if (existing.length > 0) {
          throw new HttpError(400, `Phone number already registered for patient "${existing[0].name}"`);
         }
      }
      // ─── END ───

    const [seqRows] = await pool.query("SELECT next_number FROM patient_number_sequences WHERE id = 1 FOR UPDATE");
    const nextNum = (seqRows as any)[0].next_number;
    const patientCode = `RN-P${String(nextNum).padStart(3, "0")}`;

    const [result] = await pool.query<any>(
      `INSERT INTO patients 
        (patient_code, name, age, gender, phone, address, default_doctor_id,
         guardian_name, guardian_relation, village_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientCode, name.trim(), age || null, gender,
        phone ? phone.trim() : null, address || null, doctor_id || null,
        guardian_name || null, guardian_relation || null, village_id || null,
      ]
    );

    await pool.query("UPDATE patient_number_sequences SET next_number = next_number + 1 WHERE id = 1");
    res.status(201).json({ id: (result as any).insertId, patient_code: patientCode, name });
  })
);

patientsRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name, age, gender, phone, address, doctor_id,
      guardian_name, guardian_relation, village_id,
    } = req.body;
    if (!name || !gender) throw new HttpError(400, "Name and Gender are required");

    if (phone && !/^\d{10}$/.test(phone.trim())) {
      throw new HttpError(400, "Phone number must be exactly 10 digits");
    }

    // ─── INTHA CODE-A ADD PANNUNGA ───
if (phone) {
  const [existing] = await pool.query<any[]>(
    "SELECT id, name FROM patients WHERE phone = ? AND id != ? LIMIT 1",
    [phone.trim(), id]
  );
  if (existing.length > 0) {
    throw new HttpError(400, `Phone number already registered for patient "${existing[0].name}"`);
  }
}
// ─── END ─── 

    await pool.query(
      `UPDATE patients SET 
        name = ?, age = ?, gender = ?, phone = ?, address = ?, default_doctor_id = ?,
        guardian_name = ?, guardian_relation = ?, village_id = ?
       WHERE id = ?`,
      [
        name.trim(), age || null, gender,
        phone ? phone.trim() : null, address || null, doctor_id || null,
        guardian_name || null, guardian_relation || null, village_id || null,
        id,
      ]
    );
    res.json({ success: true });
  })
);

patientsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [bills] = await pool.query<any[]>(
      "SELECT COUNT(*) AS count FROM bills WHERE patient_id = ?", [id]
    );
    if (Number(bills[0].count) > 0) {
      throw new HttpError(400, "Cannot delete: This patient has completed bills. Deactivate instead.");
    }
    await pool.query("UPDATE patients SET deleted_at = NOW() WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
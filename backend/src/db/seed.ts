import path from "node:path";
import { pathToFileURL } from "node:url";
import bcrypt from "bcrypt";
import type { RowDataPacket } from "mysql2";
import { createDatabaseConnection } from "../config/db.js";
import "../config/env.js";

const DEFAULT_SEED_PASSWORD = "ChangeMe@123";

const billingTypes = [
  { code: "OP", name: "OP Billing", prefix: "RN-OP", itemSource: "MIXED", printLayout: "SERVICE" },
  { code: "IP", name: "IP Billing", prefix: "RN-IP", itemSource: "MIXED", printLayout: "SERVICE" },
  { code: "MAT", name: "Maternity Billing", prefix: "RN-MAT", itemSource: "MIXED", printLayout: "SERVICE" },
  { code: "DEL", name: "Delivery Billing", prefix: "RN-DEL", itemSource: "MIXED", printLayout: "SERVICE" },
  { code: "FP", name: "Family Planning / Post-delivery", prefix: "RN-FP", itemSource: "MIXED", printLayout: "SERVICE" },
  { code: "PH", name: "Pharmacy / Medicine Billing", prefix: "RN-PH", itemSource: "PRODUCT", printLayout: "PHARMACY" },
  { code: "LAB", name: "Laboratory Billing", prefix: "RN-LAB", itemSource: "SERVICE", printLayout: "SERVICE" },
  { code: "ROOM", name: "Room Charges", prefix: "RN-ROOM", itemSource: "SERVICE", printLayout: "SERVICE" },
  { code: "CONS", name: "Doctor Consultation", prefix: "RN-CONS", itemSource: "SERVICE", printLayout: "SERVICE" },
  { code: "PROC", name: "Procedures", prefix: "RN-PROC", itemSource: "SERVICE", printLayout: "SERVICE" },
  { code: "OTH", name: "Other Hospital Services", prefix: "RN-OTH", itemSource: "MIXED", printLayout: "SERVICE" },
] as const;

export async function runSeed(): Promise<void> {
  const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await createDatabaseConnection();

  try {
    await connection.query(
      `INSERT IGNORE INTO users (username, full_name, password_hash, role, is_active)
       VALUES (?, ?, ?, 'ADMIN', 1), (?, ?, ?, 'BILLING_STAFF', 1)`,
      ["admin", "Administrator", passwordHash, "billing", "Billing Staff", passwordHash],
    );

    await connection.query(
      `INSERT IGNORE INTO doctors (name, qualification, is_active)
       VALUES ('Dr. Nisha', NULL, 1), ('Dr. Ravi', NULL, 1)`,
    );

    for (const type of billingTypes) {
      await connection.query(
        `INSERT IGNORE INTO billing_types (code, name, bill_prefix, item_source, print_layout, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [type.code, type.name, type.prefix, type.itemSource, type.printLayout],
      );
    }

    const [typeRows] = await connection.query<RowDataPacket[]>("SELECT id FROM billing_types");
    for (const row of typeRows) {
      await connection.query(
        "INSERT IGNORE INTO bill_number_sequences (billing_type_id, next_number) VALUES (?, 1)",
        [row.id],
      );
    }

    await connection.query(
      "INSERT IGNORE INTO patient_number_sequences (id, next_number) VALUES (1, 1)",
    );

    await connection.query(
      `INSERT IGNORE INTO hospital_settings
        (id, hospital_name, address_line1, address_line2, landline, phone, gstin, drug_licence_no)
       VALUES
        (1, 'Raja Nursing Home', '10/196A, Surandai Road', 'Pavoorchatram - 627808', '04633 251783', '9489702674', NULL, NULL)`,
    );

    await connection.query(
      `INSERT IGNORE INTO gst_settings
        (id, gst_enabled, default_cgst_share, default_sgst_share, igst_mode)
       VALUES (1, 0, 50.00, 50.00, 0)`,
    );

    await connection.query(
      `INSERT IGNORE INTO print_settings (id, paper_size, show_gstin, footer_text)
       VALUES (1, 'A4', 1, 'Thank you / Visit Again')`,
    );

    const [userCount] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM users");
    const [doctorCount] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM doctors");
    const [typeCount] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM billing_types");

    console.log("Seed complete.");
    console.log(`Users: ${userCount[0].count} | Doctors: ${doctorCount[0].count} | Billing types: ${typeCount[0].count}`);
    console.log("Default local logins (change after Phase 3):");
    console.log("  admin / ChangeMe@123");
    console.log("  billing / ChangeMe@123");
    console.log("GSTIN and Drug Licence are empty until entered in Admin Settings.");
  } finally {
    await connection.end();
  }
}

const isDirectRun = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href,
);

if (isDirectRun) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error("Seed failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

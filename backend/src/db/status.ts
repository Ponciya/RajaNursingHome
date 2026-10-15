import { createDatabaseConnection } from "../config/db.js";
import "../config/env.js";

const tables = [
  "users",
  "doctors",
  "patients",
  "billing_types",
  "bill_number_sequences",
  "patient_number_sequences",
  "products",
  "services",
  "hospital_settings",
  "gst_settings",
  "print_settings",
  "bills",
  "bill_items",
  "payments",
];

async function printStatus(): Promise<void> {
  const connection = await createDatabaseConnection();
  try {
    for (const table of tables) {
      const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      const count = Array.isArray(rows) ? (rows[0] as { count: number }).count : 0;
      console.log(`${table.padEnd(28)} ${count}`);
    }

    const [hospital] = await connection.query(
      "SELECT hospital_name, gstin, drug_licence_no FROM hospital_settings WHERE id = 1",
    );
    console.log("Hospital settings:", hospital);
  } finally {
    await connection.end();
  }
}

printStatus()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Status failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });

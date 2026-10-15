import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { RowDataPacket } from "mysql2";
import { env } from "../config/env.js";
import { createDatabaseConnection, createServerConnection } from "../config/db.js";
import { splitSqlStatements } from "./sql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

export async function ensureDatabase(): Promise<void> {
  const connection = await createServerConnection();
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Database ready: ${env.db.database}`);
  } finally {
    await connection.end();
  }
}

export async function runMigrations(): Promise<void> {
  await ensureDatabase();
  const connection = await createDatabaseConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const [appliedRows] = await connection.query<RowDataPacket[]>(
      "SELECT filename FROM schema_migrations",
    );
    const applied = new Set(appliedRows.map((row) => String(row.filename)));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skip (already applied): ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      const statements = splitSqlStatements(sql);

      console.log(`Applying ${file} (${statements.length} statements)`);
      for (const statement of statements) {
        await connection.query(statement);
      }

      await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      console.log(`Applied: ${file}`);
    }
  } finally {
    await connection.end();
  }
}

const isDirectRun = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href,
);

if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.log("Migrations complete.");
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Migration failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

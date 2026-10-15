import { runMigrations } from "./migrate.js";
import { runSeed } from "./seed.js";

async function setup(): Promise<void> {
  await runMigrations();
  await runSeed();
}

setup()
  .then(() => {
    console.log("Database setup finished.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Database setup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const jwtSecret = process.env.JWT_SECRET?.trim();

if (!jwtSecret || jwtSecret === "change-this-to-a-long-random-string") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a strong random value in production");
  }
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: jwtSecret || "dev-only-rnh-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  cookieName: process.env.COOKIE_NAME || "rnh_session",
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "raja_nursing_home",
  },
};

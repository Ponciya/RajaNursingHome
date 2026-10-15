import type { CookieOptions, Request, Response } from "express";
import bcrypt from "bcrypt";
import type { RowDataPacket } from "mysql2";
import { Router } from "express";
// CHANGE: ../ to ../../
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { requireAuth, requireRole, signAuthToken } from "../../middleware/auth.js";
import type { AuthUser, UserRole } from "../../types/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
};

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
}

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password) {
      throw new HttpError(400, "Username and password are required");
    }

    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, username, full_name, password_hash, role, is_active
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    const row = rows[0];
    if (!row) {
      throw new HttpError(401, "Invalid username or password");
    }

    const passwordOk = await bcrypt.compare(password, row.password_hash);
    if (!passwordOk) {
      throw new HttpError(401, "Invalid username or password");
    }

    if (!row.is_active) {
      throw new HttpError(403, "This account is inactive");
    }

    const user: AuthUser = {
      id: Number(row.id),
      username: row.username,
      fullName: row.full_name,
      role: row.role,
    };

    const token = signAuthToken(user);
    res.cookie(env.cookieName, token, cookieOptions());
    res.json({ user: toPublicUser(user) });
  }),
);

authRouter.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(env.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: toPublicUser(req.user!) });
  }),
);

authRouter.get(
  "/staff-ping",
  requireAuth,
  (_req: Request, res: Response) => {
    res.json({ ok: true, scope: "authenticated" });
  },
);

authRouter.get(
  "/admin-ping",
  requireAuth,
  requireRole("ADMIN"),
  (_req: Request, res: Response) => {
    res.json({ ok: true, scope: "admin" });
  },
);

authRouter.put(
  "/change-credentials",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword) throw new HttpError(400, "Current password is required");
    if (!username && !newPassword) throw new HttpError(400, "Provide new username or password");

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, username, password_hash FROM users WHERE id = ?",
      [userId]
    );
    if (!rows[0]) throw new HttpError(404, "User not found");

    const passwordOk = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!passwordOk) throw new HttpError(401, "Current password is incorrect");

    if (username && username !== rows[0].username) {
      const [existing] = await pool.query<any[]>(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, userId]
      );
      if (existing.length > 0) throw new HttpError(400, "Username already taken");
    }

    const finalUsername = username || rows[0].username;
    const finalHash = newPassword ? await bcrypt.hash(newPassword, 10) : rows[0].password_hash;

    await pool.query(
      "UPDATE users SET username = ?, password_hash = ? WHERE id = ?",
      [finalUsername, finalHash, userId]
    );

    res.json({ success: true, username: finalUsername });
  })
);
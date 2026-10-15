import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../config/db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";

export const usersRouter = Router();

// GET all users (Admin only)
usersRouter.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, role, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  })
);

// POST new user (Admin only)
usersRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { username, full_name, password, role } = req.body;

    if (!username || !full_name || !password) {
      throw new HttpError(400, "Username, Full Name and Password are required");
    }
    if (password.length < 6) {
      throw new HttpError(400, "Password must be at least 6 characters");
    }
    if (!["ADMIN", "BILLING_STAFF"].includes(role)) {
      throw new HttpError(400, "Invalid role");
    }

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM users WHERE username = ?",
      [username.trim()]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Username already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query<any>(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
      [username.trim(), passwordHash, full_name.trim(), role]
    );

    res.status(201).json({ id: result.insertId });
  })
);

// PUT update user (Admin only)
usersRouter.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, full_name, password, role } = req.body;

    if (!username || !full_name) {
      throw new HttpError(400, "Username and Full Name are required");
    }
    if (!["ADMIN", "BILLING_STAFF"].includes(role)) {
      throw new HttpError(400, "Invalid role");
    }

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [username.trim(), id]
    );
    if (existing.length > 0) {
      throw new HttpError(400, "Username already exists");
    }

    if (password && password.length > 0) {
      if (password.length < 6) {
        throw new HttpError(400, "Password must be at least 6 characters");
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET username = ?, full_name = ?, role = ?, password_hash = ?
         WHERE id = ?`,
        [username.trim(), full_name.trim(), role, passwordHash, id]
      );
    } else {
      await pool.query(
        `UPDATE users SET username = ?, full_name = ?, role = ?
         WHERE id = ?`,
        [username.trim(), full_name.trim(), role, id]
      );
    }

    res.json({ success: true });
  })
);

// PATCH status
usersRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    // Prevent self-deactivation
    if (Number(id) === req.user!.id) {
      throw new HttpError(400, "You cannot deactivate your own account");
    }

    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  })
);

// DELETE user (Admin only)
usersRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (Number(id) === req.user!.id) {
      throw new HttpError(400, "You cannot delete your own account");
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  })
);
import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser, UserRole } from "../types/auth.js";
import { HttpError } from "../utils/httpError.js";

type TokenPayload = {
  sub: string;
  username: string;
  fullName: string;
  role: UserRole;
};

function readToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[env.cookieName];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = {
      id: Number(payload.sub),
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role,
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have permission to access this resource"));
      return;
    }
    next();
  };
}

export function signAuthToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: String(user.id),
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

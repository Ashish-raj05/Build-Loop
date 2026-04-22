import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env["SESSION_SECRET"];
if (!SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const TOKEN_NAME = "loop_token";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthPayload = { userId: string };

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET as string, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET as string) as AuthPayload;
    if (decoded && typeof decoded.userId === "string") return decoded;
    return null;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: ONE_WEEK_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(TOKEN_NAME, { path: "/" });
}

export function readAuthCookie(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[TOKEN_NAME] ?? null;
}

export type AuthedRequest = Request & { userId: string };

export function getUserId(req: Request): string {
  return (req as AuthedRequest).userId;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readAuthCookie(req);
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  (req as AuthedRequest).userId = payload.userId;
  next();
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

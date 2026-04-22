import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  hashPassword,
  verifyPassword,
  requireAuth,
  getUserId,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { fullName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) {
    res
      .status(409)
      .json({ message: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ fullName, email: normalizedEmail, passwordHash })
    .returning();

  if (!user) {
    res.status(500).json({ message: "Failed to create account" });
    return;
  }

  const token = signToken({ userId: user.id });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, fullName: user.fullName, email: user.email } });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ message: "Incorrect email or password" });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user) {
    res.status(401).json({ message: "Incorrect email or password" });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Incorrect email or password" });
    return;
  }

  const token = signToken({ userId: user.id });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, fullName: user.fullName, email: user.email } });
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const [user] = await db
    .select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  res.json(user);
});

export default router;

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const now = Date.now();

  const record = attempts.get(ip);
  if (record && record.count >= MAX_ATTEMPTS && now < record.until) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .limit(1);

  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!valid) {
    const current = attempts.get(ip) ?? { count: 0, until: 0 };
    const count = current.count + 1;
    attempts.set(ip, { count, until: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0 });
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, user.id);
  return res;
}

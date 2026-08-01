import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";

// Simple in-memory lockout (resets on cold start — good enough for a personal app)
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const now = Date.now();

  const record = attempts.get(ip);
  if (record && record.count >= MAX_ATTEMPTS && now < record.until) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password || !checkPassword(password)) {
    const current = attempts.get(ip) ?? { count: 0, until: 0 };
    const count = current.count + 1;
    attempts.set(ip, { count, until: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0 });
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res);
  return res;
}

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "tl_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ── HMAC helpers ──────────────────────────────────────────────────────────────

async function hmacSign(payload: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(sig).toString("hex");
}

async function hmacVerify(payload: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ── Token: payload = "auth:<userId>:<timestamp>" ─────────────────────────────

export async function createSessionToken(userId: number): Promise<string> {
  const payload = `auth:${userId}:${Date.now()}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<number | null> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const valid = await hmacVerify(payload, sig);
  if (!valid) return null;
  // Extract userId from "auth:<userId>:<ts>"
  const parts = payload.split(":");
  if (parts.length < 3) return null;
  const userId = parseInt(parts[1]);
  return isNaN(userId) ? null : userId;
}

// ── Server-side session check — returns userId or null ───────────────────────

export async function getSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ── Middleware helper ─────────────────────────────────────────────────────────

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const userId = await verifySessionToken(token);
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));
  return null;
}

// ── Set/clear cookie ──────────────────────────────────────────────────────────

export async function setSessionCookie(res: NextResponse, userId: number): Promise<void> {
  const token = await createSessionToken(userId);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

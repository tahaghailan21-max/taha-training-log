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
  // Constant-time comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ── Cookie token ──────────────────────────────────────────────────────────────

export async function createSessionToken(): Promise<string> {
  const payload = `auth:${Date.now()}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  return hmacVerify(payload, sig);
}

// ── Password check ────────────────────────────────────────────────────────────

export function checkPassword(input: string): boolean {
  const expected = process.env.LOG_PASSWORD;
  if (!expected) throw new Error("LOG_PASSWORD is not set");
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ── Server-side session check ─────────────────────────────────────────────────

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

// ── Middleware helper ─────────────────────────────────────────────────────────

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const valid = await verifySessionToken(token);
  if (!valid) return NextResponse.redirect(new URL("/login", req.url));
  return null;
}

// ── Set/clear cookie (used in login/logout API routes) ───────────────────────

export async function setSessionCookie(res: NextResponse): Promise<void> {
  const token = await createSessionToken();
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedback, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const ADMIN_USER_ID = 1;

export async function GET() {
  const userId = await getSession();
  if (!userId || userId !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: feedback.id,
      message: feedback.message,
      created_at: feedback.created_at,
      username: users.username,
    })
    .from(feedback)
    .innerJoin(users, eq(users.id, feedback.user_id))
    .orderBy(desc(feedback.created_at));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json() as { message?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  await db.insert(feedback).values({ user_id: userId, message: message.trim() });
  return NextResponse.json({ ok: true }, { status: 201 });
}

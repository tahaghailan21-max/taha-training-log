import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSecsIncrements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(userSecsIncrements)
    .where(eq(userSecsIncrements.user_id, userId))
    .orderBy(userSecsIncrements.value);

  return NextResponse.json(rows.map(r => ({ id: r.id, value: parseFloat(String(r.value)) })));
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { value } = await req.json() as { value: number };
  if (typeof value !== "number" || value <= 0 || value > 3600) {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  // Prevent duplicates
  const existing = await db
    .select()
    .from(userSecsIncrements)
    .where(and(eq(userSecsIncrements.user_id, userId), eq(userSecsIncrements.value, String(value))))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ id: existing[0].id, value }, { status: 200 });
  }

  const [inserted] = await db
    .insert(userSecsIncrements)
    .values({ user_id: userId, value: String(value) })
    .returning();

  return NextResponse.json({ id: inserted.id, value }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: number };

  await db
    .delete(userSecsIncrements)
    .where(and(eq(userSecsIncrements.id, id), eq(userSecsIncrements.user_id, userId)));

  return NextResponse.json({ ok: true });
}

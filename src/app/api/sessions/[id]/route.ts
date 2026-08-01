import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, sessionExercises, sets, exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exRows = await db
    .select()
    .from(sessionExercises)
    .where(eq(sessionExercises.session_id, sessionId))
    .orderBy(sessionExercises.position);

  const result = await Promise.all(
    exRows.map(async (se) => {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, se.exercise_id)).limit(1);
      const setRows = await db
        .select()
        .from(sets)
        .where(eq(sets.session_exercise_id, se.id))
        .orderBy(sets.position);
      return { ...se, exercise, sets: setRows };
    })
  );

  return NextResponse.json({ ...session, exercises: result });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(sessions).where(eq(sessions.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}

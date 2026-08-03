import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, sessionExercises, sets, exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

async function ownsSession(userId: number, sessionId: number): Promise<boolean> {
  const [s] = await db.select({ user_id: sessions.user_id }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return s?.user_id === userId;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!(await ownsSession(userId, sessionId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!(await ownsSession(userId, sessionId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { performed_on, title, notes, bodyweight_kg, is_rest, exercises: exList } = body;

  await db
    .update(sessions)
    .set({ performed_on, title: title ?? null, notes: notes ?? null, bodyweight_kg: bodyweight_kg ?? null, is_rest: is_rest ?? false, updated_at: new Date() })
    .where(eq(sessions.id, sessionId));

  await db.delete(sessionExercises).where(eq(sessionExercises.session_id, sessionId));

  if (exList && Array.isArray(exList)) {
    for (const ex of exList) {
      const [insertedSE] = await db
        .insert(sessionExercises)
        .values({ client_id: ex.client_id, session_id: sessionId, exercise_id: ex.exercise_id, position: ex.position, notes: ex.notes ?? null })
        .returning({ id: sessionExercises.id });

      if (ex.sets && Array.isArray(ex.sets)) {
        for (const s of ex.sets) {
          await db.insert(sets).values({
            client_id: s.client_id,
            session_exercise_id: insertedSE.id,
            position: s.position,
            reps: s.reps ?? null,
            set_count: s.set_count ?? null,
            duration_sec: s.duration_sec ?? null,
            note: s.note ?? null,
            progression: s.progression ?? null,
            band: s.band ?? null,
          });
        }
      }
    }
  }

  return NextResponse.json({ id: sessionId });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!(await ownsSession(userId, sessionId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(sessions).where(eq(sessions.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}

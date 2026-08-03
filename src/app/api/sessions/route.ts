import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, sessionExercises, sets, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  // Check if this user can view all sessions
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const canViewAll = user?.can_view_all ?? false;

  const rows = canViewAll
    ? await db.select().from(sessions).orderBy(desc(sessions.performed_on)).limit(limit)
    : await db.select().from(sessions).where(eq(sessions.user_id, userId)).orderBy(desc(sessions.performed_on)).limit(limit);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { client_id, performed_on, title, notes, bodyweight_kg, is_rest, exercises: exList } = body;

  // Upsert session
  const existing = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.client_id, client_id))
    .limit(1);

  let sessionId: number;

  if (existing.length > 0) {
    sessionId = existing[0].id;
    await db
      .update(sessions)
      .set({ performed_on, title, notes, bodyweight_kg: bodyweight_kg ?? null, is_rest: is_rest ?? false, updated_at: new Date() })
      .where(eq(sessions.id, sessionId));
  } else {
    const [inserted] = await db
      .insert(sessions)
      .values({ client_id, user_id: userId, performed_on, title, notes, bodyweight_kg: bodyweight_kg ?? null, is_rest: is_rest ?? false })
      .returning({ id: sessions.id });
    sessionId = inserted.id;
  }

  if (exList && Array.isArray(exList)) {
    for (const ex of exList) {
      const existingSE = await db
        .select({ id: sessionExercises.id })
        .from(sessionExercises)
        .where(eq(sessionExercises.client_id, ex.client_id))
        .limit(1);

      let seId: number;
      if (existingSE.length > 0) {
        seId = existingSE[0].id;
      } else {
        const [insertedSE] = await db
          .insert(sessionExercises)
          .values({
            client_id: ex.client_id,
            session_id: sessionId,
            exercise_id: ex.exercise_id,
            position: ex.position,
            notes: ex.notes ?? null,
          })
          .returning({ id: sessionExercises.id });
        seId = insertedSE.id;
      }

      if (ex.sets && Array.isArray(ex.sets)) {
        for (const s of ex.sets) {
          const existingSet = await db
            .select({ id: sets.id })
            .from(sets)
            .where(eq(sets.client_id, s.client_id))
            .limit(1);

          if (existingSet.length === 0) {
            await db.insert(sets).values({
              client_id: s.client_id,
              session_exercise_id: seId,
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
  }

  return NextResponse.json({ id: sessionId }, { status: 201 });
}

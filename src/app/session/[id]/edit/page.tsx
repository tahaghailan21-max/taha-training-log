import { db } from "@/db";
import { sessions, sessionExercises, exercises, sets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import SessionForm from "@/components/SessionForm";
import type { ExerciseEntry, SetEntry } from "@/components/SessionForm";

export const revalidate = 0;

function uuid() { return crypto.randomUUID(); }

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await getSession();
  if (!authed) redirect("/login");

  const { id } = await params;
  const sessionId = parseInt(id);

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) notFound();

  const exRows = await db
    .select()
    .from(sessionExercises)
    .where(eq(sessionExercises.session_id, sessionId))
    .orderBy(sessionExercises.position);

  const initialExercises: ExerciseEntry[] = await Promise.all(
    exRows.map(async (se) => {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, se.exercise_id)).limit(1);
      const setRows = await db
        .select()
        .from(sets)
        .where(eq(sets.session_exercise_id, se.id))
        .orderBy(sets.position);

      const mappedSets: SetEntry[] = setRows.map((s, si) => ({
        client_id: uuid(),
        position: si,
        reps: s.reps != null ? String(s.reps) : "0",
        duration_sec: s.duration_sec != null ? String(s.duration_sec) : "0",
        set_count: s.set_count != null ? String(s.set_count) : "1",
        note: s.note ?? "",
      }));

      return {
        client_id: uuid(),
        exercise_id: se.exercise_id,
        exercise_name: exercise?.name ?? "Unknown",
        position: se.position,
        notes: se.notes ?? "",
        sets: mappedSets.length > 0 ? mappedSets : [{ client_id: uuid(), position: 0, reps: "0", duration_sec: "0", set_count: "1", note: "" }],
      };
    })
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)" }}>
      <SessionForm
        editId={sessionId}
        initialDate={session.performed_on}
        initialTitle={session.title ?? ""}
        initialNotes={session.notes ?? ""}
        initialBodyweight={session.bodyweight_kg != null ? String(session.bodyweight_kg) : ""}
        initialExercises={initialExercises}
      />
    </div>
  );
}

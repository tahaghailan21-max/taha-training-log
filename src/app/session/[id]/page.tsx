import { db } from "@/db";
import { sessions, sessionExercises, exercises, sets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { formatDate, describeSet } from "@/lib/format";
import DeleteButton from "./DeleteButton";

export const revalidate = 0;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
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

  const exercisesWithSets = await Promise.all(
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

  return (
    <>
      <Nav />
      <div className="container" style={{ paddingTop: "1.5rem" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>
            {session.title ?? (session.is_rest ? "Rest" : "Session")}
          </h1>
          <div className="muted">{formatDate(session.performed_on)}</div>
          {session.bodyweight_kg && (
            <div className="muted" style={{ marginTop: "0.25rem" }}>Weight: {session.bodyweight_kg} kg</div>
          )}
          {session.notes && (
            <p style={{ marginTop: "0.75rem", fontStyle: "italic", color: "var(--muted)" }}>{session.notes}</p>
          )}
        </div>

        {exercisesWithSets.map((ex) => (
          <div key={ex.id} className="exercise-block card">
            <h3>{ex.exercise?.name ?? "Unknown"}</h3>
            {ex.notes && <p className="muted" style={{ marginBottom: "0.5rem" }}>{ex.notes}</p>}
            {ex.sets.map((s, i) => (
              <div key={s.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <span className="muted" style={{ minWidth: "1.5rem" }}>{i + 1}.</span>
                <div>
                  <span>{describeSet(s)}</span>
                  {s.note && <span className="muted" style={{ marginLeft: "0.5rem" }}>— {s.note}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: "1.5rem" }}>
          <DeleteButton sessionId={sessionId} />
        </div>
      </div>
    </>
  );
}

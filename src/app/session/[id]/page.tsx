import { db } from "@/db";
import { sessions, sessionExercises, exercises, sets, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import DeleteButton from "./DeleteButton";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen } from "@fortawesome/free-solid-svg-icons";

export const revalidate = 0;

function describeSetLine(s: {
  set_count: number | null;
  reps: number | null;
  duration_sec: string | null;
}): string {
  const count = s.set_count && s.set_count > 1 ? `${s.set_count} sets` : null;
  const reps = s.reps ? `${s.reps} reps` : null;
  const secs = s.duration_sec ? `${s.duration_sec}s` : null;

  if (count && reps) return `${count} of ${reps}`;
  if (count && secs) return `${count} of ${secs}`;
  if (count) return count;
  if (reps) return `${reps}`;
  if (secs) return secs;
  return "—";
}

function totalLine(setRows: { set_count: number | null; reps: number | null; duration_sec: string | null }[]): string {
  let totalSets = 0;
  let totalReps = 0;
  let totalSecs = 0;

  for (const s of setRows) {
    const cnt = s.set_count ?? 1;
    totalSets += cnt;
    if (s.reps) totalReps += s.reps * cnt;
    if (s.duration_sec) totalSecs += parseFloat(s.duration_sec) * cnt;
  }

  const parts: string[] = [];
  if (totalSets > 0) parts.push(`${totalSets} set${totalSets !== 1 ? "s" : ""}`);
  if (totalReps > 0) parts.push(`${totalReps} reps`);
  if (totalSecs > 0) parts.push(`${totalSecs}s`);
  return parts.join(", ");
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) redirect("/login");

  const { id } = await params;
  const sessionId = parseInt(id);

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) notFound();

  // Check access: owner always allowed; can_view_all users allowed too
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (session.user_id !== userId && !user?.can_view_all) notFound();

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

  const sessionTitle = session.title ?? (session.is_rest ? "Rest" : "Session");
  const weightLabel = session.bodyweight_kg ? `${session.bodyweight_kg} kg` : "Unknown";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)" }}>
      {/* Header nav */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)",
        background: "var(--bg)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ color: "var(--lime)", fontWeight: 700, fontSize: "1.1rem", textDecoration: "none" }}>
          TRAINING LOGS
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/archive">
            <button type="button" style={{ borderRadius: 20, padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}>Archive</button>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.25rem 1rem 4rem" }}>
        {/* Session card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "1.25rem 1.25rem 1.25rem 1.5rem",
          borderLeft: "4px solid var(--lime)",
          marginBottom: "1rem",
        }}>
          {/* Title */}
          <h1 style={{
            color: "var(--lime)",
            fontWeight: 800,
            fontSize: "1.15rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "0.35rem",
          }}>
            {sessionTitle}
          </h1>

          {/* Date — weight */}
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: session.notes ? "0.75rem" : 0 }}>
            {formatDate(session.performed_on)}{" "}
            <span style={{ color: "var(--muted)" }}>— weight = {weightLabel}</span>
          </div>

          {/* Session notes */}
          {session.notes && (
            <p style={{ marginTop: "0.5rem", fontStyle: "italic", color: "var(--muted)", fontSize: "0.9rem" }}>
              {session.notes}
            </p>
          )}
        </div>

        {/* Exercises */}
        {exercisesWithSets.map((ex) => (
          <div key={ex.id} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1rem 1.25rem",
            marginBottom: "0.75rem",
          }}>
            {/* Exercise name */}
            <h3 style={{
              color: "var(--lime)",
              fontWeight: 700,
              fontSize: "1rem",
              marginBottom: "0.6rem",
            }}>
              {ex.exercise?.name ?? "Unknown"}
            </h3>

            {/* Sets */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ex.sets.map((s) => (
                <li key={s.id} style={{ marginBottom: s.note ? "0.55rem" : "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      display: "inline-block", width: 6, height: 6,
                      borderRadius: "50%", background: "var(--muted)",
                      flexShrink: 0, marginTop: 2,
                    }} />
                    <span style={{ fontSize: "0.95rem" }}>{describeSetLine(s)}</span>
                  </div>
                  {/* Set note — indented with left border */}
                  {s.note && (
                    <div style={{
                      marginLeft: "1.1rem",
                      paddingLeft: "0.6rem",
                      borderLeft: "2px solid var(--border)",
                      fontStyle: "italic",
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      marginTop: "0.2rem",
                    }}>
                      {s.note}
                    </div>
                  )}
                </li>
              ))}

              {/* Total line */}
              {ex.sets.length > 0 && (
                <li style={{ marginTop: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      display: "inline-block", width: 6, height: 6,
                      borderRadius: "50%", background: "var(--lime)",
                      flexShrink: 0, marginTop: 2,
                    }} />
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--lime)" }}>
                      Total: {totalLine(ex.sets)}
                    </span>
                  </div>
                </li>
              )}

              {/* Exercise notes — italic grey bullet at bottom */}
              {ex.notes && (
                <li style={{ marginTop: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      display: "inline-block", width: 6, height: 6,
                      borderRadius: "50%", background: "var(--muted)",
                      flexShrink: 0, marginTop: 2,
                    }} />
                    <span style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.85rem" }}>
                      {ex.notes}
                    </span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button type="button" style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ width: 13, height: 13 }} />
              Back
            </button>
          </Link>
          <Link href={`/session/${sessionId}/edit`} style={{ textDecoration: "none" }}>
            <button type="button" style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem", color: "var(--lime)", borderColor: "var(--lime)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FontAwesomeIcon icon={faPen} style={{ width: 13, height: 13 }} />
              Edit
            </button>
          </Link>
          <DeleteButton sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}

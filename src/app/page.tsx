import { db } from "@/db";
import { sessions, sessionExercises, exercises, sets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { ThemeToggle } from "@/components/ThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

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
  if (reps) return reps;
  if (secs) return secs;
  return "—";
}

function totalLine(rows: { set_count: number | null; reps: number | null; duration_sec: string | null }[]): string {
  let totalSets = 0, totalReps = 0, totalSecs = 0;
  for (const s of rows) {
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

export default async function HomePage() {
  const authed = await getSession();
  if (!authed) redirect("/login");

  const recentSessions = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.performed_on))
    .limit(20);

  // Fetch full exercise+set data for each session
  const sessionData = await Promise.all(
    recentSessions.map(async (s) => {
      const exRows = await db
        .select()
        .from(sessionExercises)
        .where(eq(sessionExercises.session_id, s.id))
        .orderBy(sessionExercises.position);

      const exercisesWithSets = await Promise.all(
        exRows.map(async (se) => {
          const [exercise] = await db
            .select()
            .from(exercises)
            .where(eq(exercises.id, se.exercise_id))
            .limit(1);
          const setRows = await db
            .select()
            .from(sets)
            .where(eq(sets.session_exercise_id, se.id))
            .orderBy(sets.position);
          return { ...se, exercise, sets: setRows };
        })
      );

      return { ...s, exercisesWithSets };
    })
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)",
        background: "var(--bg)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.04em" }}>
          TRAINING LOGS
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link href="/archive">
            <button type="button" style={{ borderRadius: 20, padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}>Archive</button>
          </Link>
          <Link href="/new">
            <button type="button" className="primary" style={{ borderRadius: 20, padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}>
              + Log
            </button>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem 1rem 4rem" }}>
        {sessionData.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2rem", textAlign: "center" }}>
            No sessions yet. Log your first one!
          </p>
        )}

        {sessionData.map((s) => {
          const title = s.title ?? (s.is_rest ? "Rest" : "Session");
          const weightLabel = s.bodyweight_kg ? `${s.bodyweight_kg} kg` : "Unknown";

          return (
            <div key={s.id} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "4px solid var(--lime)",
              borderRadius: 8,
              padding: "1rem 1.25rem",
              marginBottom: "0.75rem",
            }}>
              {/* Title + Edit button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                <div style={{
                  color: "var(--lime)", fontWeight: 800, fontSize: "1rem",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {title}
                </div>
                <Link href={`/session/${s.id}/edit`} style={{ textDecoration: "none", flexShrink: 0, marginLeft: "0.75rem" }}>
                  <button type="button" style={{
                    borderRadius: 20, padding: "0.2rem 0.75rem", fontSize: "0.75rem",
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
                  }}>
                    <FontAwesomeIcon icon={faPen} style={{ width: 11, height: 11 }} />
                    Edit
                  </button>
                </Link>
              </div>

              {/* Date — weight */}
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                {formatDate(s.performed_on)} — weight = {weightLabel}
              </div>

              {/* Session notes */}
              {s.notes && (
                <p style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  {s.notes}
                </p>
              )}

              {/* Rest day */}
              {s.is_rest && s.exercisesWithSets.length === 0 && (
                <p style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.85rem" }}>Rest day</p>
              )}

              {/* Exercises inline */}
              {s.exercisesWithSets.map((ex) => (
                <div key={ex.id} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ color: "var(--lime)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>
                    {ex.exercise?.name ?? "Unknown"}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {ex.sets.map((set) => (
                      <li key={set.id} style={{ marginBottom: set.note ? "0.45rem" : "0.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            display: "inline-block", width: 5, height: 5,
                            borderRadius: "50%", background: "var(--muted)", flexShrink: 0,
                          }} />
                          <span style={{ fontSize: "0.88rem" }}>{describeSetLine(set)}</span>
                        </div>
                        {set.note && (
                          <div style={{
                            marginLeft: "1rem", paddingLeft: "0.5rem",
                            borderLeft: "2px solid var(--border)",
                            fontStyle: "italic", color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.15rem",
                          }}>
                            {set.note}
                          </div>
                        )}
                      </li>
                    ))}
                    {/* Total */}
                    {ex.sets.length > 0 && (
                      <li style={{ marginTop: "0.3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            display: "inline-block", width: 5, height: 5,
                            borderRadius: "50%", background: "var(--lime)", flexShrink: 0,
                          }} />
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--lime)" }}>
                            Total: {totalLine(ex.sets)}
                          </span>
                        </div>
                      </li>
                    )}
                    {/* Exercise notes */}
                    {ex.notes && (
                      <li style={{ marginTop: "0.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            display: "inline-block", width: 5, height: 5,
                            borderRadius: "50%", background: "var(--muted)", flexShrink: 0,
                          }} />
                          <span style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.8rem" }}>
                            {ex.notes}
                          </span>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

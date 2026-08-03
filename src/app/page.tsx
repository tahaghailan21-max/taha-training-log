import { db } from "@/db";
import { sessions, sessionExercises, exercises } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export const revalidate = 0;

export default async function HomePage() {
  const authed = await getSession();
  if (!authed) redirect("/login");

  const recentSessions = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.performed_on))
    .limit(20);

  const sessionIds = recentSessions.map((s) => s.id);

  const exerciseMap: Record<number, string[]> = {};
  for (const id of sessionIds) {
    const rows = await db
      .select({ name: exercises.name })
      .from(sessionExercises)
      .innerJoin(exercises, eq(exercises.id, sessionExercises.exercise_id))
      .where(eq(sessionExercises.session_id, id))
      .orderBy(sessionExercises.position);
    exerciseMap[id] = rows.map((r) => r.name);
  }

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
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem 1rem 4rem" }}>
        {recentSessions.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2rem", textAlign: "center" }}>
            No sessions yet. Log your first one!
          </p>
        )}

        {recentSessions.map((s) => {
          const title = s.title ?? (s.is_rest ? "Rest" : "Session");
          const weightLabel = s.bodyweight_kg ? `${s.bodyweight_kg} kg` : "Unknown";
          return (
            <Link key={s.id} href={`/session/${s.id}`} style={{ display: "block", textDecoration: "none" }}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: "4px solid var(--lime)",
                borderRadius: 8,
                padding: "1rem 1.25rem",
                marginBottom: "0.75rem",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}>
                {/* Title ALL CAPS */}
                <div style={{
                  color: "var(--lime)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}>
                  {title}
                </div>

                {/* Date — weight = X */}
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {formatDate(s.performed_on)}{" "}
                  <span>— weight = {weightLabel}</span>
                </div>

                {/* Exercise names as lime-colored list */}
                {exerciseMap[s.id]?.length > 0 && (
                  <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                    {exerciseMap[s.id].map((name) => (
                      <span key={name} style={{ fontSize: "0.85rem", color: "var(--lime)", fontWeight: 600 }}>
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {s.is_rest && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                    Rest day
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

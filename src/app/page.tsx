import { db } from "@/db";
import { sessions, sessionExercises, exercises } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
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

  // Fetch exercise names for each session
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
    <>
      <Nav />
      <div className="container" style={{ paddingTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "1.2rem" }}>Recent Sessions</h1>
          <Link href="/new">
            <button className="primary">+ New Session</button>
          </Link>
        </div>

        {recentSessions.length === 0 && (
          <p className="muted">No sessions yet. Log your first one!</p>
        )}

        {recentSessions.map((s) => (
          <Link key={s.id} href={`/session/${s.id}`} style={{ display: "block", textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    {s.title ?? (s.is_rest ? "Rest" : "Session")}
                  </div>
                  <div className="muted">{formatDate(s.performed_on)}</div>
                </div>
                {s.bodyweight_kg && (
                  <span className="tag">{s.bodyweight_kg} kg</span>
                )}
              </div>
              {exerciseMap[s.id]?.length > 0 && (
                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {exerciseMap[s.id].map((name) => (
                    <span key={name} className="tag">{name}</span>
                  ))}
                </div>
              )}
              {s.notes && (
                <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>{s.notes}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

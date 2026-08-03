"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, loadDraft, clearDraft, addToOutbox } from "@/lib/idb";

type SetEntry = {
  client_id: string;
  position: number;
  reps: string;
  duration_sec: string;
  set_count: string;
  note: string;
};

type ExerciseEntry = {
  client_id: string;
  exercise_id: number;
  exercise_name: string;
  position: number;
  notes: string;
  sets: SetEntry[];
};

type ExerciseOption = { id: number; name: string };

function uuid() { return crypto.randomUUID(); }

function emptySet(position: number): SetEntry {
  return { client_id: uuid(), position, reps: "0", duration_sec: "0", set_count: "1", note: "" };
}

/* ── Stepper ── */
function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const num = parseFloat(value) || 0;
  return (
    <div style={{
      flex: 1,
      background: "var(--surface2)",
      borderRadius: 6,
      padding: "0.45rem 0.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.25rem",
    }}>
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, num - 1)))}
        style={{
          background: "transparent", border: "none", color: "var(--text)",
          fontSize: "1.1rem", padding: "0 0.4rem", cursor: "pointer", lineHeight: 1,
        }}
      >−</button>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(String(num + 1))}
        style={{
          background: "transparent", border: "none", color: "var(--lime)",
          fontSize: "1.1rem", padding: "0 0.4rem", cursor: "pointer", lineHeight: 1,
        }}
      >+</button>
    </div>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyweight, setBodyweight] = useState("");
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseOption[]>([]);
  const [aliases, setAliases] = useState<Record<string, number>>({});
  const [newMovement, setNewMovement] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [runningTimer, setRunningTimer] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/exercises").then(r => r.json()).then(({ exercises, aliases: raw }) => {
      setAllExercises(exercises);
      const m: Record<string, number> = {};
      for (const a of raw) m[a.alias.toLowerCase()] = a.exercise_id;
      setAliases(m);
    });
  }, []);

  useEffect(() => {
    loadDraft().then(d => {
      if (!d) return;
      const draft = d as { date?: string; title?: string; notes?: string; bodyweight?: string; exercises?: ExerciseEntry[] };
      if (draft.date) setDate(draft.date);
      if (draft.title) setTitle(draft.title);
      if (draft.notes) setNotes(draft.notes);
      if (draft.bodyweight) setBodyweight(draft.bodyweight);
      if (draft.exercises) setExerciseList(draft.exercises);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => saveDraft({ date, title, notes, bodyweight, exercises: exerciseList }), 500);
    return () => clearTimeout(t);
  }, [date, title, notes, bodyweight, exerciseList]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  function toggleTimer(key: string) {
    if (runningTimer === key) {
      // stop
      if (timerRef.current) clearInterval(timerRef.current);
      setRunningTimer(null);
    } else {
      // start new
      if (timerRef.current) clearInterval(timerRef.current);
      setTimers(prev => ({ ...prev, [key]: 0 }));
      setRunningTimer(key);
      timerRef.current = setInterval(() => {
        setTimers(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
      }, 1000);
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function addExercise(id?: number, name?: string) {
    let resolvedId = id;
    let resolvedName = name;

    if (!resolvedId) {
      const input = newMovement.trim();
      if (!input) return;
      const lower = input.toLowerCase();
      if (aliases[lower]) {
        resolvedId = aliases[lower];
        resolvedName = allExercises.find(e => e.id === aliases[lower])?.name ?? input;
      } else {
        const exact = allExercises.find(e => e.name.toLowerCase() === lower);
        if (exact) { resolvedId = exact.id; resolvedName = exact.name; }
        else {
          alert(`"${input}" not found. Check spelling or pick from the dropdown.`);
          return;
        }
      }
    }

    setExerciseList(prev => [...prev, {
      client_id: uuid(),
      exercise_id: resolvedId!,
      exercise_name: resolvedName!,
      position: prev.length,
      notes: "",
      sets: [emptySet(0)],
    }]);
    setNewMovement("");
    setSelectedExerciseId("");
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  function addFromDropdown(val: string) {
    if (!val) return;
    const ex = allExercises.find(e => String(e.id) === val);
    if (ex) addExercise(ex.id, ex.name);
  }

  function copySession() { alert("Copy session coming soon"); }
  function markRestDay() { setTitle("Rest"); setExerciseList([]); }

  function updateExerciseNotes(idx: number, val: string) {
    setExerciseList(prev => prev.map((e, i) => i === idx ? { ...e, notes: val } : e));
  }

  function removeExercise(idx: number) {
    setExerciseList(prev => prev.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setExerciseList(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, sets: [...e.sets, emptySet(e.sets.length)] } : e
    ));
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExerciseList(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) } : e
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      client_id: uuid(),
      performed_on: date,
      title: title || null,
      notes: notes || null,
      bodyweight_kg: bodyweight ? parseFloat(bodyweight) : null,
      is_rest: title === "Rest" && exerciseList.length === 0,
      exercises: exerciseList.map((ex, ei) => ({
        client_id: ex.client_id,
        exercise_id: ex.exercise_id,
        position: ei,
        notes: ex.notes || null,
        sets: ex.sets.map((s, si) => ({
          client_id: s.client_id,
          position: si,
          reps: s.reps ? parseInt(s.reps) : null,
          duration_sec: s.duration_sec ? parseFloat(s.duration_sec) : null,
          set_count: s.set_count ? parseInt(s.set_count) : null,
          note: s.note || null,
        })),
      })),
    };

    if (!online) {
      await addToOutbox(payload);
      await clearDraft();
      setSaving(false);
      alert("Saved offline. Will sync when back online.");
      router.replace("/");
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Server error");
      await clearDraft();
      router.replace("/");
    } catch {
      await addToOutbox(payload);
      await clearDraft();
      alert("Saved offline. Will sync when back online.");
      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.85rem 1rem",
      }}>
        <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "0.04em" }}>
          TRAINING LOGS
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href="/archive" style={{ textDecoration: "none" }}>
            <button type="button" style={{ borderRadius: 20, padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}>
              Archive
            </button>
          </a>
          {/* Dark mode toggle placeholder — matches screenshot */}
          <button type="button" style={{
            borderRadius: "50%", width: 34, height: 34, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem",
          }}>
            🌙
          </button>
        </div>
      </div>

      {!online && (
        <div style={{ background: "#333", color: "var(--muted)", fontSize: "0.75rem", padding: "0.3rem 1rem" }}>
          ● Offline — will sync later
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: "0 auto", padding: "0 1rem 5rem" }}>

        {/* ── Date / Bodyweight / Session / Buttons ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1rem", marginBottom: "0.75rem",
        }}>
          {/* Date + Bodyweight side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
                DATE
              </label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)} required
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
                BODYWEIGHT (KG)
              </label>
              <input
                type="number" step="0.1" placeholder="—" value={bodyweight}
                onChange={e => setBodyweight(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Session name */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
              SESSION
            </label>
            <input
              type="text" placeholder="e.g. Handstands, Planch, & Bridge"
              value={title} onChange={e => setTitle(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* Copy / Rest buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button" onClick={copySession}
              style={{
                borderRadius: 20, padding: "0.35rem 1.1rem", fontSize: "0.85rem",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--lime)", cursor: "pointer",
              }}
            >
              ↻ Copy a session (5)
            </button>
            <button
              type="button" onClick={markRestDay}
              style={{
                borderRadius: 20, padding: "0.35rem 1.1rem", fontSize: "0.85rem",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text)", cursor: "pointer",
              }}
            >
              Mark rest day
            </button>
          </div>
        </div>

        {/* ── Exercise cards ── */}
        {exerciseList.map((ex, exIdx) => (
          <div key={ex.client_id} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "1rem", marginBottom: "0.75rem",
          }}>
            {/* Exercise header: name + X */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ color: "var(--lime)", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                {ex.exercise_name}
              </h3>
              <button
                type="button" onClick={() => removeExercise(exIdx)}
                style={{
                  background: "transparent", border: "1px solid var(--border)",
                  borderRadius: 4, color: "var(--muted)", padding: "0.1rem 0.5rem",
                  cursor: "pointer", fontSize: "0.85rem", lineHeight: 1.4,
                }}
              >✕</button>
            </div>

            {ex.sets.map((s, setIdx) => {
              const timerKey = `${ex.client_id}-${setIdx}`;
              const timerVal = timers[timerKey] ?? 0;
              const isRunning = runningTimer === timerKey;
              return (
                <div key={s.client_id} style={{ marginBottom: "0.85rem" }}>
                  {/* Set number */}
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                    {setIdx + 1}
                  </div>

                  {/* Row 1: REPS + SECS */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <Stepper label="REPS" value={s.reps} onChange={v => updateSet(exIdx, setIdx, "reps", v)} />
                    <Stepper label="SECS" value={s.duration_sec} onChange={v => updateSet(exIdx, setIdx, "duration_sec", v)} />
                  </div>

                  {/* Row 2: SETS + Time it */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <Stepper label="SETS" value={s.set_count} onChange={v => updateSet(exIdx, setIdx, "set_count", v)} />
                    <button
                      type="button"
                      onClick={() => toggleTimer(timerKey)}
                      style={{
                        flex: 1,
                        background: "var(--surface2)",
                        border: isRunning ? "1px solid var(--lime)" : "1px solid var(--border)",
                        borderRadius: 6,
                        color: "var(--lime)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                        padding: "0.45rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ fontSize: "0.9rem" }}>⏱</span>
                      {isRunning
                        ? `${String(Math.floor(timerVal / 60)).padStart(2, "0")}:${String(timerVal % 60).padStart(2, "0")}`
                        : "Time it"}
                    </button>
                  </div>

                  {/* Note field */}
                  <input
                    type="text" placeholder="note" value={s.note}
                    onChange={e => updateSet(exIdx, setIdx, "note", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              );
            })}

            {/* + Set button */}
            <button
              type="button" onClick={() => addSet(exIdx)}
              style={{
                borderRadius: 20, padding: "0.3rem 1rem", fontSize: "0.85rem",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text)", cursor: "pointer", marginBottom: "0.85rem",
              }}
            >
              + Set
            </button>

            {/* NOTES / FORM */}
            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
                NOTES / FORM
              </label>
              <input
                type="text" placeholder="e.g. 55 cm between the hands"
                value={ex.notes} onChange={e => updateExerciseNotes(exIdx, e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        ))}

        {/* ── Add a movement ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1rem", marginBottom: "0.75rem",
        }}>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>
            ADD A MOVEMENT
          </label>
          <select
            value={selectedExerciseId}
            onChange={e => addFromDropdown(e.target.value)}
            style={{ width: "100%", marginBottom: "0.85rem", appearance: "auto" }}
          >
            <option value="">Pick from your {allExercises.length} movements...</option>
            {allExercises.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>

          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>
            ...OR TYPE A NEW ONE
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text" placeholder="e.g. Dragon Flag"
              value={newMovement} onChange={e => setNewMovement(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExercise())}
              style={{ flex: 1 }}
            />
            <button
              type="button" onClick={() => addExercise()}
              style={{
                borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem",
                background: "var(--lime-dim)", color: "#fff", border: "none",
                cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap",
              }}
            >
              + Add
            </button>
          </div>
        </div>

        {/* ── Session notes ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1rem", marginBottom: "0.75rem",
        }}>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
            SESSION NOTES
          </label>
          <textarea
            rows={2} placeholder="How did it go?"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        {/* ── Save session ── */}
        <button
          type="submit" disabled={saving}
          style={{
            width: "100%",
            background: saving ? "var(--lime-dim)" : "var(--lime)",
            color: "#000",
            fontWeight: 800,
            fontSize: "1rem",
            border: "none",
            borderRadius: 8,
            padding: "0.95rem",
            cursor: saving ? "not-allowed" : "pointer",
            letterSpacing: "0.03em",
          }}
        >
          {saving ? "Saving..." : "Save session"}
        </button>

      </form>
    </div>
  );
}

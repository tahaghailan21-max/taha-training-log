"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { saveDraft, loadDraft, clearDraft, addToOutbox } from "@/lib/idb";

type SetEntry = {
  client_id: string;
  position: number;
  reps: string;
  duration_sec: string;
  set_count: string;
  note: string;
  progression: string;
  band: string;
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

function uuid() {
  return crypto.randomUUID();
}

function emptySet(position: number): SetEntry {
  return { client_id: uuid(), position, reps: "", duration_sec: "", set_count: "", note: "", progression: "", band: "" };
}

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const num = parseFloat(value) || 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <label className="muted" style={{ fontSize: "0.75rem" }}>{label}</label>
      <div className="stepper">
        <button type="button" onClick={() => onChange(String(Math.max(0, num - 1)))}>−</button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 56, textAlign: "center" }}
        />
        <button type="button" onClick={() => onChange(String(num + 1))}>+</button>
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseOption[]>([]);
  const [aliases, setAliases] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load exercises
  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(({ exercises, aliases: rawAliases }) => {
        setAllExercises(exercises);
        const aliasMap: Record<string, number> = {};
        for (const a of rawAliases) aliasMap[a.alias.toLowerCase()] = a.exercise_id;
        setAliases(aliasMap);
      });
  }, []);

  // Load draft
  useEffect(() => {
    loadDraft().then((d) => {
      if (!d) return;
      const draft = d as { date: string; title: string; notes: string; exercises: ExerciseEntry[] };
      if (draft.date) setDate(draft.date);
      if (draft.title) setTitle(draft.title);
      if (draft.notes) setNotes(draft.notes);
      if (draft.exercises) setExerciseList(draft.exercises);
    });
  }, []);

  // Autosave draft
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft({ date, title, notes, exercises: exerciseList });
    }, 500);
    return () => clearTimeout(t);
  }, [date, title, notes, exerciseList]);

  // Online status
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Hold timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  function resolveExercise(input: string): ExerciseOption | null {
    const lower = input.toLowerCase().trim();
    // Exact alias match
    if (aliases[lower]) {
      const ex = allExercises.find((e) => e.id === aliases[lower]);
      if (ex) return ex;
    }
    // Exact name match
    const exact = allExercises.find((e) => e.name.toLowerCase() === lower);
    if (exact) return exact;
    // Partial match
    const partial = allExercises.find((e) => e.name.toLowerCase().includes(lower));
    return partial ?? null;
  }

  function addExercise() {
    if (!query.trim()) return;
    const resolved = resolveExercise(query);
    if (!resolved) { alert(`Exercise "${query}" not found. Check spelling.`); return; }
    setExerciseList((prev) => [
      ...prev,
      {
        client_id: uuid(),
        exercise_id: resolved.id,
        exercise_name: resolved.name,
        position: prev.length,
        notes: "",
        sets: [emptySet(0)],
      },
    ]);
    setQuery("");
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  }

  function updateExercise(idx: number, field: keyof ExerciseEntry, value: unknown) {
    setExerciseList((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function addSet(exIdx: number) {
    setExerciseList((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, emptySet(e.sets.length)] } : e
      )
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExerciseList((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) }
          : e
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExerciseList((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) } : e
      )
    );
  }

  function removeExercise(idx: number) {
    setExerciseList((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      client_id: uuid(),
      performed_on: date,
      title: title || null,
      notes: notes || null,
      is_rest: false,
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
          progression: s.progression || null,
          band: s.band || null,
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

  const filtered = query
    ? allExercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <>
      <Nav />
      <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "4rem" }}>
        {!online && <div className="offline-badge" style={{ marginBottom: "1rem" }}>● Offline — will sync later</div>}

        <h1 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>New Session</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Date + Title */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Title</label>
              <input type="text" placeholder="e.g. Frontlever & Victorian" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          {/* Session notes */}
          <div>
            <label className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Session notes</label>
            <textarea rows={2} placeholder="How did it go?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Hold timer */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>
              ⏱ {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
            </span>
            <button type="button" className={timerRunning ? "danger" : "primary"} onClick={() => setTimerRunning((r) => !r)}>
              {timerRunning ? "Stop" : "Start"}
            </button>
            <button type="button" onClick={() => { setTimer(0); setTimerRunning(false); }}>Reset</button>
          </div>

          {/* Exercises */}
          {exerciseList.map((ex, exIdx) => (
            <div key={ex.client_id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 className="lime" style={{ margin: 0 }}>{ex.exercise_name}</h3>
                <button type="button" onClick={() => removeExercise(exIdx)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>✕</button>
              </div>

              <input
                type="text"
                placeholder="Exercise notes / progression"
                value={ex.notes}
                onChange={(e) => updateExercise(exIdx, "notes", e.target.value)}
                style={{ marginBottom: "0.75rem" }}
              />

              {ex.sets.map((s, setIdx) => (
                <div key={s.client_id} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem", marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>Set {setIdx + 1}</span>
                    <button type="button" onClick={() => removeSet(exIdx, setIdx)} style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem" }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <Stepper label="Reps" value={s.reps} onChange={(v) => updateSet(exIdx, setIdx, "reps", v)} />
                    <Stepper label="Seconds" value={s.duration_sec} onChange={(v) => updateSet(exIdx, setIdx, "duration_sec", v)} />
                    <Stepper label="Sets" value={s.set_count} onChange={(v) => updateSet(exIdx, setIdx, "set_count", v)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <input type="text" placeholder="Note" value={s.note} onChange={(e) => updateSet(exIdx, setIdx, "note", e.target.value)} />
                    <input type="text" placeholder="Progression" value={s.progression} onChange={(e) => updateSet(exIdx, setIdx, "progression", e.target.value)} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => addSet(exIdx)} style={{ marginTop: "0.25rem", width: "100%" }}>
                + Add set
              </button>
            </div>
          ))}

          {/* Add exercise */}
          <div className="card">
            <label className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.4rem" }}>Add exercise</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  list="exercise-list"
                  type="text"
                  placeholder="Type exercise name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExercise())}
                />
                <datalist id="exercise-list">
                  {allExercises.map((e) => <option key={e.id} value={e.name} />)}
                </datalist>
              </div>
              <button type="button" className="primary" onClick={addExercise}>Add</button>
            </div>
          </div>

          <button type="submit" className="primary" disabled={saving || exerciseList.length === 0}>
            {saving ? <span className="spinner" /> : "Save session"}
          </button>
        </form>
      </div>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraft, clearDraft, addToOutbox, saveExerciseCache, loadExerciseCache, loadRecentSessions, addPendingExercise } from "@/lib/idb";
import { formatDate } from "@/lib/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import InlineDrumScroll from "@/components/InlineDrumScroll";
import SecsIncrementPicker from "@/components/SecsIncrementPicker";
import HeaderMenu from "@/components/HeaderMenu";
import { faXmark, faRotateLeft, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ── Types ── */
export type SetEntry = {
  client_id: string;
  position: number;
  reps: string;
  duration_sec: string;
  set_count: string;
  note: string;
};

export type ExerciseEntry = {
  client_id: string;
  exercise_id: number;
  exercise_name: string;
  position: number;
  notes: string;
  sets: SetEntry[];
  isNew?: boolean;
};

type ExerciseOption = { id: number; name: string };

type CopySession = {
  id: number;
  performed_on: string;
  title: string | null;
  exercises: { exercise_name: string; sets: { reps: number | null; duration_sec: string | null; set_count: number | null; note: string | null }[]; notes: string | null }[];
};

export type SessionFormProps = {
  /** null = new session */
  editId?: number | null;
  initialDate?: string;
  initialTitle?: string;
  initialNotes?: string;
  initialBodyweight?: string;
  initialExercises?: ExerciseEntry[];
};

function uuid() { return crypto.randomUUID(); }

export function emptySet(position: number): SetEntry {
  return { client_id: uuid(), position, reps: "0", duration_sec: "0", set_count: "1", note: "" };
}

/* ── Stepper ── */
function Stepper({ label, value, onChange, step = 1 }: { label: string; value: string; onChange: (v: string) => void; step?: number }) {
  const num = parseFloat(value) || 0;
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);
  return (
    <div style={{
      background: "var(--surface2)", borderRadius: 6, padding: "0.45rem 0.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem",
      minWidth: 110,
    }}>
      <button type="button" onClick={() => onChange(fmt(Math.max(0, num - step)))}
        style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: "1.1rem", padding: "0 0.4rem", cursor: "pointer", lineHeight: 1 }}>
        −
      </button>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{value}</div>
        {label && <div style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>}
      </div>
      <button type="button" onClick={() => onChange(fmt(num + step))}
        style={{ background: "transparent", border: "none", color: "var(--lime)", fontSize: "1.1rem", padding: "0 0.4rem", cursor: "pointer", lineHeight: 1 }}>
        +
      </button>
    </div>
  );
}

/* ── Copy Session Modal ── */
function CopyModal({
  sessions,
  onCopy,
  onClose,
  fromCache,
}: {
  sessions: CopySession[];
  onCopy: (s: CopySession) => void;
  onClose: () => void;
  fromCache?: boolean;
}) {
  return (
    <div className="copy-modal-overlay" onClick={onClose}>
      <div className="copy-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--lime)" }}>Copy a session</h2>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "1.2rem", color: "var(--muted)", cursor: "pointer", padding: "0 0.25rem" }}>
            ✕
          </button>
        </div>
        {fromCache && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>
            ● Showing cached sessions — you&apos;re offline
          </p>
        )}
        {sessions.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No recent sessions found.</p>
        )}
        {sessions.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onCopy(s)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.5rem",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--lime)", marginBottom: "0.2rem", textTransform: "uppercase", fontSize: "0.9rem" }}>
              {s.title ?? "Session"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
              {formatDate(s.performed_on)}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>
              {s.exercises.map(e => e.exercise_name).join(", ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Sortable set row with exposed handle ── */
function SortableSetRowWithHandle({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <span
      {...listeners}
      {...attributes}
      style={{ cursor: "grab", color: "var(--muted)", touchAction: "none", display: "inline-flex", alignItems: "center" }}
      aria-label="Drag to reorder"
    >
      <FontAwesomeIcon icon={faGripVertical} style={{ width: 12, height: 12 }} />
    </span>
  );
  return (
    <div
      ref={setNodeRef}
      style={{
        marginBottom: "0.85rem",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {children(handle)}
    </div>
  );
}

/* ── Offline saved screen ── */
function OfflineSavedScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    function handleOnline() { onBack(); }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onBack]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)", padding: "2rem", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📥</div>
      <h2 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.75rem" }}>Saved offline</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: 320 }}>
        Your session is queued and will sync automatically as soon as you&apos;re back online.
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{ borderRadius: 8, padding: "0.75rem 2rem", fontSize: "1rem", fontWeight: 700, background: "var(--lime)", color: "#000", border: "none", cursor: "pointer", letterSpacing: "0.03em" }}
      >
        Back to logs
      </button>
    </div>
  );
}

/* ── Main SessionForm ── */
export default function SessionForm({
  editId = null,
  initialDate,
  initialTitle = "",
  initialNotes = "",
  initialBodyweight = "",
  initialExercises = [],
}: SessionFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [bodyweight, setBodyweight] = useState(initialBodyweight);
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>(initialExercises);
  const [allExercises, setAllExercises] = useState<ExerciseOption[]>([]);
  const [aliases, setAliases] = useState<Record<string, number>>({});
  const [newMovement, setNewMovement] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [online, setOnline] = useState(true);
  const [secsSteps, setSecsSteps] = useState<Record<string, number>>({});
  const [secsIncrements, setSecsIncrements] = useState<number[]>([0.5, 1, 5]);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copySessions, setCopySessions] = useState<CopySession[]>([]);
  const [copyFromCache, setCopyFromCache] = useState(false);

  const isEdit = editId != null;

  // dnd-kit sensors — pointer for mouse, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  useEffect(() => {
    fetch("/api/exercises")
      .then(r => r.json())
      .then(({ exercises, aliases: raw }) => {
        setAllExercises(exercises);
        const m: Record<string, number> = {};
        for (const a of raw) m[a.alias.toLowerCase()] = a.exercise_id;
        setAliases(m);
        // Persist to cache for offline use
        saveExerciseCache(exercises, raw).catch(() => {});
      })
      .catch(() => {
        // Offline — load from IndexedDB cache
        loadExerciseCache().then(cached => {
          if (!cached) return;
          setAllExercises(cached.exercises);
          const m: Record<string, number> = {};
          for (const a of cached.aliases) m[a.alias.toLowerCase()] = a.exercise_id;
          setAliases(m);
        }).catch(() => {});
      });
  }, []);

  // Only load/save draft for new sessions
  useEffect(() => {
    if (isEdit) return;
    import("@/lib/idb").then(({ loadDraft }) =>
      loadDraft().then(d => {
        if (!d) return;
        const draft = d as { date?: string; title?: string; notes?: string; bodyweight?: string; exercises?: ExerciseEntry[] };
        if (draft.date) setDate(draft.date);
        if (draft.title) setTitle(draft.title);
        if (draft.notes) setNotes(draft.notes);
        if (draft.bodyweight) setBodyweight(draft.bodyweight);
        if (draft.exercises) setExerciseList(draft.exercises);
      })
    );
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(() => saveDraft({ date, title, notes, bodyweight, exercises: exerciseList }), 500);
    return () => clearTimeout(t);
  }, [date, title, notes, bodyweight, exerciseList, isEdit]);

  useEffect(() => {
    setOnline(navigator.onLine);

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    fetch("/api/secs-increments")
      .then(r => r.json())
      .then((rows: { id: number; value: number }[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const BUILT_IN = [0.5, 1, 5];
        const builtInSet = new Set(BUILT_IN);
        const merged = [
          ...BUILT_IN,
          ...rows.map(r => r.value).filter(v => !builtInSet.has(v)),
        ].sort((a, b) => a - b);
        setSecsIncrements(merged);
      })
      .catch(() => {}); // offline — keep defaults
  }, []);
  async function openCopy() {
    let sessions: { id: number; performed_on: string; title: string | null; exercises: { exercise_name: string; notes: string | null; sets: { reps: number | null; duration_sec: string | null; set_count: number | null; note: string | null }[] }[] }[] = [];
    let fromCache = false;

    try {
      const res = await fetch("/api/sessions?limit=7");
      if (!res.ok) throw new Error("not ok");
      const rows = await res.json();
      const withEx = await Promise.all(
        rows.slice(0, 7).map(async (s: { id: number; performed_on: string; title: string | null }) => {
          const r = await fetch(`/api/sessions/${s.id}`);
          const data = await r.json();
          return {
            id: s.id,
            performed_on: s.performed_on,
            title: s.title,
            exercises: (data.exercises ?? []).map((ex: {
              exercise: { name: string };
              notes: string | null;
              sets: { reps: number | null; duration_sec: string | null; set_count: number | null; note: string | null }[];
            }) => ({
              exercise_name: ex.exercise?.name ?? "Unknown",
              notes: ex.notes,
              sets: ex.sets,
            })),
          };
        })
      );
      sessions = withEx;
    } catch {
      // Offline — use cached sessions
      sessions = await loadRecentSessions();
      fromCache = sessions.length > 0;
    }

    const filtered = sessions.filter(s => s.id !== editId);
    setCopySessions(filtered);
    setCopyFromCache(fromCache);
    setShowCopy(true);
  }

  function applyCopy(s: CopySession) {
    setTitle(s.title ?? "");
    setExerciseList(s.exercises.map((ex, ei) => ({
      client_id: uuid(),
      exercise_id: 0, // will be resolved below via name match
      exercise_name: ex.exercise_name,
      position: ei,
      notes: ex.notes ?? "",
      sets: ex.sets.length > 0
        ? ex.sets.map((set, si) => ({
            client_id: uuid(),
            position: si,
            reps: String(set.reps ?? 0),
            duration_sec: String(set.duration_sec ?? 0),
            set_count: String(set.set_count ?? 1),
            note: set.note ?? "",
          }))
        : [emptySet(0)],
    })));
    // Resolve exercise IDs by name
    setAllExercises(prev => {
      setExerciseList(list => list.map(ex => {
        const match = prev.find(a => a.name === ex.exercise_name);
        return match ? { ...ex, exercise_id: match.id } : ex;
      }));
      return prev;
    });
    setShowCopy(false);
  }

  /* ── Exercise management ── */
  async function addExercise(id?: number, name?: string) {
    let resolvedId = id;
    let resolvedName = name;
    let isNew = false;

    if (!resolvedId) {
      const input = newMovement.trim();
      if (!input) return;
      const lower = input.toLowerCase();

      // Check alias map first
      if (aliases[lower]) {
        resolvedId = aliases[lower];
        resolvedName = allExercises.find(e => e.id === aliases[lower])?.name ?? input;
      } else {
        // Check exact name match in loaded list
        const exact = allExercises.find(e => e.name.toLowerCase() === lower);
        if (exact) {
          resolvedId = exact.id;
          resolvedName = exact.name;
        } else {
          // Create it — online: POST to DB; offline: queue to pending store
          if (online) {
            const res = await fetch("/api/exercises", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: input }),
            });
            if (!res.ok) { alert("Failed to create movement."); return; }
            const created = await res.json() as { id: number; name: string };
            resolvedId = created.id;
            resolvedName = created.name;
          } else {
            // Offline: assign a temporary negative id so it's unique locally
            const tempId = -(Date.now());
            const slug = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            await addPendingExercise({ slug, name: input });
            resolvedId = tempId;
            resolvedName = input;
          }
          isNew = true;
          // Add to local list so it appears in dropdown for the rest of the session
          setAllExercises(prev =>
            prev.find(e => e.name.toLowerCase() === input.toLowerCase())
              ? prev
              : [...prev, { id: resolvedId!, name: resolvedName! }].sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      }
    }

    setExerciseList(prev => [...prev, {
      client_id: uuid(), exercise_id: resolvedId!, exercise_name: resolvedName!,
      position: prev.length, notes: "", sets: [emptySet(0)],
      isNew,
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

  function markRestDay() { setTitle("Rest"); setExerciseList([]); }
  function updateExerciseNotes(idx: number, val: string) {
    setExerciseList(prev => prev.map((e, i) => i === idx ? { ...e, notes: val } : e));
  }
  function removeExercise(idx: number) { setExerciseList(prev => prev.filter((_, i) => i !== idx)); }
  function addSet(exIdx: number) {
    setExerciseList(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, sets: [...e.sets, emptySet(e.sets.length)] } : e
    ));
  }
  function removeSet(exIdx: number, setIdx: number) {
    setExerciseList(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) } : e
    ));
  }
  function reorderSets(exIdx: number, activeId: string, overId: string) {
    setExerciseList(prev => prev.map((e, i) => {
      if (i !== exIdx) return e;
      const oldIdx = e.sets.findIndex(s => s.client_id === activeId);
      const newIdx = e.sets.findIndex(s => s.client_id === overId);
      if (oldIdx === -1 || newIdx === -1) return e;
      return { ...e, sets: arrayMove(e.sets, oldIdx, newIdx) };
    }));
  }
  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExerciseList(prev => prev.map((e, i) =>
      i === exIdx ? { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) } : e
    ));
  }

  /* ── Submit ── */
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
        client_id: uuid(),
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        position: ei,
        notes: ex.notes || null,
        sets: ex.sets.map((s, si) => ({
          client_id: uuid(),
          position: si,
          reps: s.reps && s.reps !== "0" ? parseInt(s.reps) : null,
          duration_sec: s.duration_sec && s.duration_sec !== "0" ? parseFloat(s.duration_sec) : null,
          set_count: s.set_count ? parseInt(s.set_count) : null,
          note: s.note || null,
        })),
      })),
    };

    if (!online && !isEdit) {
      await addToOutbox(payload);
      await clearDraft();
      setSaving(false);
      setSavedOffline(true);
      return;
    }

    try {
      const url = isEdit ? `/api/sessions/${editId}` : "/api/sessions";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Server error");
      if (!isEdit) await clearDraft();
      router.replace(isEdit ? `/session/${editId}` : "/");
    } catch {
      if (!isEdit) {
        await addToOutbox(payload);
        await clearDraft();
        setSavedOffline(true);
      } else {
        alert("Failed to save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  /* ── Offline saved screen ── */
  if (savedOffline) {
    return (
      <OfflineSavedScreen onBack={() => router.replace("/")} />
    );
  }

  return (
    <>
      {/* Copy modal */}
      {showCopy && (
        <CopyModal sessions={copySessions} onCopy={applyCopy} onClose={() => setShowCopy(false)} fromCache={copyFromCache} />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "0.04em", margin: 0 }}>
              TRAINING LOGS
            </h1>
            <span style={{ color: "var(--muted)", fontSize: "0.62rem", letterSpacing: "0.08em" }}>
              ← BACK TO FEED
            </span>
          </div>
        </Link>
        <HeaderMenu />
      </div>

      {!online && !isEdit && (
        <div style={{ background: "#333", color: "var(--muted)", fontSize: "0.75rem", padding: "0.3rem 1rem" }}>
          ● Offline — will sync later
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: "0 auto", padding: "0 1rem 1rem" }}>

        {/* ── Date / BW / Session / Buttons ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>DATE</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>BODYWEIGHT (KG)</label>
              <input type="number" step="0.1" placeholder="—" value={bodyweight} onChange={e => setBodyweight(e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>SESSION</label>
            <input type="text" placeholder="e.g. Handstands, Planch, & Bridge" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={openCopy}
              style={{ borderRadius: 20, padding: "0.35rem 1.1rem", fontSize: "0.85rem", border: "1px solid var(--border)", background: "transparent", color: "var(--lime)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FontAwesomeIcon icon={faRotateLeft} style={{ width: 13, height: 13 }} />
              Copy a session (7)
            </button>
            <button type="button" onClick={markRestDay}
              style={{ borderRadius: 20, padding: "0.35rem 1.1rem", fontSize: "0.85rem", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>
              Mark rest day
            </button>
          </div>
        </div>

        {/* ── Exercise cards ── */}
        {exerciseList.map((ex, exIdx) => (
          <div key={ex.client_id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ color: "var(--lime)", fontWeight: 700, fontSize: "1rem", margin: 0 }}>{ex.exercise_name}</h3>
                {ex.isNew && (
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
                    background: "var(--lime)", color: "#000",
                    borderRadius: 4, padding: "0.1rem 0.35rem",
                  }}>NEW</span>
                )}
              </div>
              <button type="button" onClick={() => removeExercise(exIdx)}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faXmark} style={{ width: 13, height: 13 }} />
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  reorderSets(exIdx, String(active.id), String(over.id));
                }
              }}
            >
              <SortableContext items={ex.sets.map(s => s.client_id)} strategy={verticalListSortingStrategy}>
                {ex.sets.map((s, setIdx) => {
                  return (
                    <SortableSetRowWithHandle key={s.client_id} id={s.client_id}>
                      {(handle) => (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              {handle}
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>#{setIdx + 1}</span>
                            </div>
                            {ex.sets.length > 1 && (
                              <button type="button" onClick={() => removeSet(exIdx, setIdx)}
                                aria-label="Remove set"
                                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0 0.2rem", fontSize: "0.85rem", lineHeight: 1 }}>
                                ×
                              </button>
                            )}
                          </div>

                          {/* Reps / Secs / Sets — wrapped in a relative container.
                              paddingRight reserves 52px for the step-picker button so all
                              three steppers right-align to the same edge. */}
                          <div style={{ position: "relative", paddingRight: 52 }}>

                            {/* Reps row */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                              <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Reps</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>How many times</div>
                              </div>
                              <Stepper label="" value={s.reps} onChange={v => updateSet(exIdx, setIdx, "reps", v)} />
                            </div>

                            {/* Secs row */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                              <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Secs</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>How long in seconds</div>
                              </div>
                              <Stepper label="" value={s.duration_sec} onChange={v => updateSet(exIdx, setIdx, "duration_sec", v)} step={secsSteps[s.client_id] ?? 1} />
                            </div>

                            {/* Sets row */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                              <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Sets</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Identical sets to log</div>
                              </div>
                              <Stepper label="" value={s.set_count} onChange={v => updateSet(exIdx, setIdx, "set_count", v)} />
                            </div>

                            {/* Step picker tap target — floats in the right gutter, centred on the Secs row */}
                            <button
                              type="button"
                              onClick={() => setPickerOpenFor(s.client_id)}
                              title="Change step size"
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                border: "1px solid var(--lime)",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1,
                                padding: 0,
                              }}
                            >
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--lime)", lineHeight: 1 }}>
                                {(() => { const v = secsSteps[s.client_id] ?? 1; return `${v}s`; })()}
                              </span>
                              <span style={{ fontSize: "0.55rem", color: "var(--muted)", lineHeight: 1 }}>step</span>
                            </button>

                          </div>

                          {/* Secs increment picker sheet */}
                          {pickerOpenFor === s.client_id && (
                            <SecsIncrementPicker
                              selected={secsSteps[s.client_id] ?? 1}
                              increments={secsIncrements}
                              onIncrementAdded={v => setSecsIncrements(prev =>
                                prev.includes(v) ? prev : [...prev, v].sort((a, b) => a - b)
                              )}
                              onIncrementDeleted={v => setSecsIncrements(prev => prev.filter(x => x !== v))}
                              onSelect={v => {
                                setSecsSteps(prev => ({ ...prev, [s.client_id]: v }));
                                setPickerOpenFor(null);
                              }}
                              onClose={() => setPickerOpenFor(null)}
                            />
                          )}

                          {/* Note */}
                          <input type="text" placeholder="Note for this set..." value={s.note} onChange={e => updateSet(exIdx, setIdx, "note", e.target.value)} style={{ width: "100%" }} />
                        </>
                      )}
                    </SortableSetRowWithHandle>
                  );
                })}
              </SortableContext>
            </DndContext>

            <button type="button" onClick={() => addSet(exIdx)}
              style={{ borderRadius: 20, padding: "0.3rem 1rem", fontSize: "0.85rem", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", marginBottom: "0.85rem" }}>
              + Set
            </button>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>NOTES / FORM</label>
              <input type="text" placeholder="e.g. 55 cm between the hands" value={ex.notes} onChange={e => updateExerciseNotes(exIdx, e.target.value)} />
            </div>
          </div>
        ))}

        {/* ── Add a movement ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>ADD A MOVEMENT</label>
          <select value={selectedExerciseId} onChange={e => addFromDropdown(e.target.value)} style={{ width: "100%", marginBottom: "0.85rem" }}>
            <option value="">Pick from your movements...</option>
            {allExercises.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>...OR TYPE A NEW ONE</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input type="text" placeholder="e.g. Dragon Flag" value={newMovement} onChange={e => setNewMovement(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExercise())} style={{ flex: 1 }} />
            <button type="button" onClick={() => addExercise()}
              style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem", background: "var(--lime-dim)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              + Add
            </button>
          </div>
        </div>

        {/* ── Session notes ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>SESSION NOTES</label>
          <textarea rows={2} placeholder="How did it go?" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%" }} />
        </div>

        {/* ── Save ── */}
        <div style={{
          position: "sticky", bottom: 0,
          padding: "0.75rem 0",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          marginLeft: "-1rem", marginRight: "-1rem",
          paddingLeft: "1rem", paddingRight: "1rem",
        }}>
          <button type="submit" disabled={saving}
            style={{
              width: "100%", background: saving ? "var(--lime-dim)" : "var(--lime)",
              color: "#000", fontWeight: 800, fontSize: "1rem", border: "none",
              borderRadius: 8, padding: "0.95rem", cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.03em",
            }}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Save session"}
          </button>
        </div>

      </form>
    </>
  );
}

const DB_NAME = "training-log";
const DB_VERSION = 2; // bumped to add new stores
const DRAFT_STORE = "draft";
const OUTBOX_STORE = "outbox";
const EXERCISES_STORE = "cachedExercises";
const SESSIONS_STORE = "recentSessions";
const PENDING_EX_STORE = "pendingExercises";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: "client_id" });
      if (!db.objectStoreNames.contains(EXERCISES_STORE)) db.createObjectStore(EXERCISES_STORE);
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) db.createObjectStore(SESSIONS_STORE);
      if (!db.objectStoreNames.contains(PENDING_EX_STORE)) db.createObjectStore(PENDING_EX_STORE, { keyPath: "slug" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── Draft ────────────────────────────────────────────────────────────────── */

export async function saveDraft(data: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).put(data, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDraft(): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const req = tx.objectStore(DRAFT_STORE).get("current");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).delete("current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Outbox ───────────────────────────────────────────────────────────────── */

export async function addToOutbox(payload: unknown & { client_id: string }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    tx.objectStore(OUTBOX_STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOutbox(): Promise<Array<{ client_id: string } & Record<string, unknown>>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const req = tx.objectStore(OUTBOX_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromOutbox(client_id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    tx.objectStore(OUTBOX_STORE).delete(client_id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Cached exercises ─────────────────────────────────────────────────────── */

export type CachedExercise = { id: number; name: string };
export type CachedAlias = { alias: string; exercise_id: number };

export async function saveExerciseCache(
  exercises: CachedExercise[],
  aliases: CachedAlias[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXERCISES_STORE, "readwrite");
    const store = tx.objectStore(EXERCISES_STORE);
    store.put(exercises, "exercises");
    store.put(aliases, "aliases");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadExerciseCache(): Promise<{ exercises: CachedExercise[]; aliases: CachedAlias[] } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXERCISES_STORE, "readonly");
    const store = tx.objectStore(EXERCISES_STORE);
    const exReq = store.get("exercises");
    const alReq = store.get("aliases");
    tx.oncomplete = () => {
      if (!exReq.result) { resolve(null); return; }
      resolve({ exercises: exReq.result, aliases: alReq.result ?? [] });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Recent sessions (for offline copy) ──────────────────────────────────── */

export type CachedSession = {
  id: number;
  performed_on: string;
  title: string | null;
  exercises: {
    exercise_name: string;
    notes: string | null;
    sets: { reps: number | null; duration_sec: string | null; set_count: number | null; note: string | null }[];
  }[];
};

export async function saveRecentSessions(sessions: CachedSession[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    tx.objectStore(SESSIONS_STORE).put(sessions, "recent");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRecentSessions(): Promise<CachedSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const req = tx.objectStore(SESSIONS_STORE).get("recent");
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

/* ── Pending exercises (created while offline) ────────────────────────────── */

export type PendingExercise = { slug: string; name: string };

export async function addPendingExercise(ex: PendingExercise): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_EX_STORE, "readwrite");
    tx.objectStore(PENDING_EX_STORE).put(ex);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingExercises(): Promise<PendingExercise[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_EX_STORE, "readonly");
    const req = tx.objectStore(PENDING_EX_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingExercises(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_EX_STORE, "readwrite");
    tx.objectStore(PENDING_EX_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

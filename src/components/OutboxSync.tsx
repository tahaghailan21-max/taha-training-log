"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getOutbox,
  removeFromOutbox,
  getPendingExercises,
  clearPendingExercises,
} from "@/lib/idb";

async function flushOutbox(onSynced: () => void) {
  // 1. Flush pending exercises, building a name → real ID map for temp ID resolution
  const nameToRealId: Record<string, number> = {};
  try {
    const pending = await getPendingExercises();
    for (const ex of pending) {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ex.name }),
      });
      if (res.ok) {
        const created = await res.json() as { id: number; name: string };
        nameToRealId[ex.name.toLowerCase()] = created.id;
      }
    }
    if (pending.length > 0) await clearPendingExercises();
  } catch {
    // Still offline — bail, will retry on next online event
    return;
  }

  // 2. Flush queued sessions, resolving any temp (negative) exercise IDs first
  let anySynced = false;
  try {
    const outbox = await getOutbox();
    for (const payload of outbox) {
      // Patch temp exercise IDs using the name → real ID map
      const exercises = (payload.exercises ?? []) as Array<{
        exercise_id: number;
        exercise_name?: string;
        [key: string]: unknown;
      }>;
      const patched = exercises.map(ex => {
        if (ex.exercise_id < 0 && ex.exercise_name) {
          const realId = nameToRealId[ex.exercise_name.toLowerCase()];
          if (realId) return { ...ex, exercise_id: realId };
        }
        return ex;
      });

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, exercises: patched }),
      });
      if (res.ok) {
        await removeFromOutbox(payload.client_id);
        anySynced = true;
      }
    }
  } catch {
    // Will retry next time
  }

  if (anySynced) onSynced();
}

export default function OutboxSync() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    const flush = () => flushOutbox(refresh);

    // Try flushing on mount — catches re-opens after being offline
    if (navigator.onLine) flush();

    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);

  return null;
}

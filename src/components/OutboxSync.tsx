"use client";
import { useEffect } from "react";
import {
  getOutbox,
  removeFromOutbox,
  getPendingExercises,
  clearPendingExercises,
} from "@/lib/idb";

async function flushOutbox() {
  // 1. Flush pending exercises first (sessions may reference them by name)
  try {
    const pending = await getPendingExercises();
    for (const ex of pending) {
      await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ex.name }),
      });
    }
    if (pending.length > 0) await clearPendingExercises();
  } catch {
    // Still offline — bail out, will retry on next online event
    return;
  }

  // 2. Flush queued sessions
  try {
    const outbox = await getOutbox();
    for (const payload of outbox) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await removeFromOutbox(payload.client_id);
    }
  } catch {
    // Will retry next time
  }
}

export default function OutboxSync() {
  useEffect(() => {
    // Try flushing on mount in case we came back online while the app was closed
    if (navigator.onLine) flushOutbox();

    window.addEventListener("online", flushOutbox);
    return () => window.removeEventListener("online", flushOutbox);
  }, []);

  return null;
}

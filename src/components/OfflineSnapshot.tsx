"use client";
import { useEffect } from "react";
import { saveExerciseCache, saveRecentSessions, type CachedSession } from "@/lib/idb";

export default function OfflineSnapshot() {
  useEffect(() => {
    // Snapshot exercises
    fetch("/api/exercises")
      .then(r => r.json())
      .then(({ exercises, aliases }) => saveExerciseCache(exercises, aliases))
      .catch(() => {});

    // Snapshot last 7 sessions with full exercise+set data
    fetch("/api/sessions?limit=7")
      .then(r => r.json())
      .then(async (rows: { id: number; performed_on: string; title: string | null }[]) => {
        const withEx: CachedSession[] = await Promise.all(
          rows.slice(0, 7).map(async s => {
            try {
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
            } catch {
              return { id: s.id, performed_on: s.performed_on, title: s.title, exercises: [] };
            }
          })
        );
        return saveRecentSessions(withEx);
      })
      .catch(() => {});
  }, []);

  return null; // renders nothing
}

import type { Set } from "@/db/schema";

export function describeSet(s: Set): string {
  const parts: string[] = [];
  if (s.set_count && s.set_count > 1) parts.push(`${s.set_count} sets`);
  if (s.reps) parts.push(`${s.reps} reps`);
  if (s.duration_sec) parts.push(`${s.duration_sec}s`);
  if (s.weight_kg) parts.push(`${s.weight_kg}kg`);
  if (s.band) parts.push(`${s.band} band`);
  if (s.progression) parts.push(s.progression);
  return parts.join(" · ") || "—";
}

export function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

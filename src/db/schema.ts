import {
  pgTable,
  bigserial,
  text,
  boolean,
  integer,
  numeric,
  date,
  uuid,
  timestamp,
  pgView,
  bigint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── exercises ────────────────────────────────────────────────────────────────
export const exercises = pgTable("exercises", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  metric: text("metric"),
  default_unit: text("default_unit"),
  is_archived: boolean("is_archived").notNull().default(false),
});

// ── exercise_aliases ──────────────────────────────────────────────────────────
export const exerciseAliases = pgTable("exercise_aliases", {
  alias: text("alias").primaryKey(),
  exercise_id: bigint("exercise_id", { mode: "number" })
    .notNull()
    .references(() => exercises.id),
});

// ── sessions ──────────────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  client_id: uuid("client_id").notNull().unique(),
  performed_on: date("performed_on").notNull(),
  title: text("title"),
  bodyweight_kg: numeric("bodyweight_kg"),
  is_rest: boolean("is_rest").notNull().default(false),
  focus: text("focus"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── session_exercises ─────────────────────────────────────────────────────────
export const sessionExercises = pgTable("session_exercises", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  client_id: uuid("client_id").notNull().unique(),
  session_id: bigint("session_id", { mode: "number" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  exercise_id: bigint("exercise_id", { mode: "number" })
    .notNull()
    .references(() => exercises.id),
  position: integer("position").notNull(),
  notes: text("notes"),
});

// ── sets ──────────────────────────────────────────────────────────────────────
export const sets = pgTable("sets", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  client_id: uuid("client_id").notNull().unique(),
  session_exercise_id: bigint("session_exercise_id", { mode: "number" })
    .notNull()
    .references(() => sessionExercises.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  reps: integer("reps"),
  set_count: integer("set_count"),
  duration_sec: numeric("duration_sec"),
  weight_kg: numeric("weight_kg"),
  is_added_weight: boolean("is_added_weight"),
  band: text("band"),
  distance_cm: numeric("distance_cm"),
  attempts: integer("attempts"),
  successful: integer("successful"),
  progression: text("progression"),
  quality: text("quality"),
  rest_sec: integer("rest_sec"),
  note: text("note"),
});

// ── bodyweight ────────────────────────────────────────────────────────────────
export const bodyweight = pgTable("bodyweight", {
  measured_on: date("measured_on").primaryKey(),
  kg: numeric("kg").notNull(),
});

// ── v_exercise_totals (view) ──────────────────────────────────────────────────
export const vExerciseTotals = pgView("v_exercise_totals").as((qb) =>
  qb
    .select({
      session_exercise_id: sessionExercises.id,
      session_id: sessions.id,
      exercise_name: exercises.name,
      performed_on: sessions.performed_on,
      total_sets: sql<number>`count(${sets.id})`.as("total_sets"),
      total_reps: sql<number>`coalesce(sum(${sets.reps}), 0)`.as("total_reps"),
      total_seconds: sql<number>`coalesce(sum(${sets.duration_sec}), 0)`.as("total_seconds"),
      top_weight_kg: sql<number>`max(${sets.weight_kg})`.as("top_weight_kg"),
      best_hold_sec: sql<number>`max(${sets.duration_sec})`.as("best_hold_sec"),
      set_rows: sql<number>`count(${sets.id})`.as("set_rows"),
    })
    .from(sessionExercises)
    .innerJoin(sessions, sql`${sessions.id} = ${sessionExercises.session_id}`)
    .innerJoin(exercises, sql`${exercises.id} = ${sessionExercises.exercise_id}`)
    .leftJoin(sets, sql`${sets.session_exercise_id} = ${sessionExercises.id}`)
    .groupBy(sessionExercises.id, sessions.id, exercises.name, sessions.performed_on)
);

// ── types ─────────────────────────────────────────────────────────────────────
export type Exercise = typeof exercises.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type Set = typeof sets.$inferSelect;
export type Bodyweight = typeof bodyweight.$inferSelect;

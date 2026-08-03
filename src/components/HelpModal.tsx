"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faCircleQuestion, faCalendarDay,
  faDumbbell, faLayerGroup, faStickyNote,
  faFloppyDisk, faPen, faMoon,
} from "@fortawesome/free-solid-svg-icons";

/* ── Mini example block ── */
function Example({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: "0.6rem",
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderLeft: "3px solid var(--lime)",
      borderRadius: 6,
      padding: "0.6rem 0.75rem",
      fontSize: "0.82rem",
      color: "var(--text)",
      lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

function Bullet({ color = "var(--muted)" }: { color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, marginRight: "0.45rem", verticalAlign: "middle", flexShrink: 0,
    }} />
  );
}

function ExLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}> ← {children}</span>;
}

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to use"
        style={{
          borderRadius: "50%", width: 36, height: 36, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)", background: "var(--surface)",
          cursor: "pointer", color: "var(--muted)", flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faCircleQuestion} style={{ width: 16, height: 16 }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            zIndex: 200, overflowY: "auto",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--bg)", minHeight: "100%",
              maxWidth: 640, margin: "0 auto",
              padding: "1.25rem 1rem 4rem",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
                HOW TO USE
              </h1>
              <button type="button" onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}>
                <FontAwesomeIcon icon={faXmark} style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* ── 1. Session header ── */}
            <Section icon={faCalendarDay} title="Session header">
              <Item label="Date" desc="The date you trained. Defaults to today." />
              <Item label="Bodyweight (kg)" desc="Your bodyweight that day. Optional — useful for tracking how strength changes relative to weight." />
              <Item label="Session name" desc='A short label for the whole session. Shows as the big title on your feed.' >
                <Example>e.g. <strong>Handstands, Planch &amp; Bridge</strong></Example>
              </Item>
              <Item label="↻ Copy a session" desc="Opens your last 7 sessions. Tap one to load all its exercises and sets into today's form — great for repeating a training block without re-entering everything." />
              <Item label="Mark rest day" desc="Clears exercises and sets the name to 'Rest'. Logs the day so your history stays complete." />
            </Section>

            {/* ── 2. Exercises ── */}
            <Section icon={faDumbbell} title="Adding exercises">
              <Item label="Dropdown — Pick from your movements" desc="Tap the dropdown to pick from your full list. Selecting one adds it as a card immediately." />
              <Item label="Type a new one" desc="Type the name and press + Add or hit Enter. Must match a movement name or alias in your list." />
              <Item label="✕ button on a card" desc="Removes that exercise and all its sets from this session." />
            </Section>

            {/* ── 3. Sets ── */}
            <Section icon={faLayerGroup} title="Sets — REPS, SECS, SETS explained">
              <Item label="REPS — repetition count" desc="How many reps you did in one set.">
                <Example>
                  You did <strong>5 pull-ups</strong>.<br />
                  → Set REPS to <strong>5</strong>, leave SECS at 0.
                </Example>
              </Item>
              <Item label="SECS — duration in seconds" desc="For timed holds or exercises measured in time instead of reps.">
                <Example>
                  You held a <strong>planche for 8 seconds</strong>.<br />
                  → Set SECS to <strong>8</strong>, leave REPS at 0.
                </Example>
              </Item>
              <Item label="SETS — how many identical sets" desc="Use this when you did multiple sets with the exact same reps/duration. Instead of adding 3 separate rows, set SETS to 3 and it saves as one compact row.">
                <Example>
                  You did <strong>3 sets of 5 pull-ups</strong>, all the same.<br />
                  → REPS <strong>5</strong> · SETS <strong>3</strong> · one row.<br />
                  <br />
                  But if set 1 was 5 reps, set 2 was 4, set 3 was 3:<br />
                  → Use <strong>+ Set</strong> to add a separate row for each.
                </Example>
              </Item>
              <Item label="+ Set" desc="Adds a new row for the next set. Use it when sets were different from each other — different reps, different duration, or a different note.">
                <Example>
                  Planche session:<br />
                  Row 1 — SECS <strong>10</strong> · note: "tuck, clean"<br />
                  Row 2 — SECS <strong>8</strong> · SETS <strong>2</strong> · note: "adv tuck, shaky"<br />
                  Row 3 — SECS <strong>6</strong> · SETS <strong>3</strong> · note: "adv tuck, tough"
                </Example>
              </Item>
              <Item label="⏱ Time it" desc="Starts a per-set stopwatch. Tap again to stop. Useful during rest or for timing a hold live. Does not auto-fill SECS — you still enter the value manually." />
            </Section>

            {/* ── 4. Notes ── */}
            <Section icon={faStickyNote} title="The three note fields">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                There are three separate note fields, each attached to a different level. Here's how they differ:
              </p>

              <Item
                label="① Set note — under each individual set"
                desc="Describes what happened on that specific set. Appears indented below the set line on the feed."
              >
                <Example>
                  <div style={{ marginBottom: "0.3rem" }}>Planche — Set 2:</div>
                  <div><Bullet />2 sets of 8s</div>
                  <div style={{ paddingLeft: "1rem", borderLeft: "2px solid var(--border)", marginLeft: "0.55rem", fontStyle: "italic", color: "var(--muted)" }}>
                    Adv tuck, shaky<ExLabel>this is the set note</ExLabel>
                  </div>
                </Example>
              </Item>

              <Item
                label="② NOTES / FORM — per exercise (bottom of exercise card)"
                desc="A technical note that applies to every set of this exercise. Use it for cues, position details, or how you set up. Shown as an italic bullet at the bottom of the exercise block."
              >
                <Example>
                  <div style={{ color: "var(--lime)", fontWeight: 700, marginBottom: "0.3rem" }}>Handstands</div>
                  <div><Bullet />5 sets</div>
                  <div><Bullet color="var(--lime)" /><strong>Total: 5 sets</strong></div>
                  <div style={{ marginTop: "0.25rem" }}><Bullet /><em style={{ color: "var(--muted)" }}>55 cm between the hands, fingertips forward<ExLabel>NOTES / FORM</ExLabel></em></div>
                </Example>
              </Item>

              <Item
                label="③ SESSION NOTES — at the bottom of the whole form"
                desc="A note about the entire session — how you felt, energy, injuries, context. Shown in italic under the session title on the feed."
              >
                <Example>
                  <div style={{ color: "var(--lime)", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.2rem" }}>Handstands, Planch &amp; Bridge</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.3rem" }}>Sat, 2 Aug 2026 — weight = 74 kg</div>
                  <div style={{ fontStyle: "italic", color: "var(--muted)" }}>
                    Shoulder felt tight, took it easy on volume<ExLabel>SESSION NOTES</ExLabel>
                  </div>
                </Example>
              </Item>
            </Section>

            {/* ── 5. Saving ── */}
            <Section icon={faFloppyDisk} title="Saving">
              <Item label="Save session / Save changes" desc="Saves everything to the database. The button sticks to the bottom of your screen so you never have to scroll to find it." />
              <Item label="Auto-draft (new sessions only)" desc="The form silently saves to your browser every half second. If you close the tab or app mid-session, everything is restored when you come back to the form." />
              <Item label="Offline mode" desc="No connection? Tap save anyway — it queues locally and syncs automatically once you're back online." />
            </Section>

            {/* ── 6. Editing & deleting ── */}
            <Section icon={faPen} title="Editing & deleting">
              <Item label="Edit button" desc="Available on each feed card and on the session detail page. Opens the full form pre-filled with all the session's data." />
              <Item label="Swipe left (mobile)" desc="Swipe any feed card to the left to reveal Edit and Delete buttons inline — no need to open the session first." />
              <Item label="Delete" desc="Permanently removes the session, all exercises, and all sets. You'll be asked to confirm before anything is deleted." />
            </Section>

            {/* ── 7. Other ── */}
            <Section icon={faMoon} title="Other">
              <Item label="Dark / light mode (🌙 / ☀️)" desc="Tap the moon or sun icon in the top-right corner. Your choice is remembered across visits." />
            </Section>

            <button type="button" onClick={() => setOpen(false)}
              style={{
                width: "100%", background: "var(--lime)", color: "#000",
                fontWeight: 800, fontSize: "1rem", border: "none",
                borderRadius: 8, padding: "0.9rem", cursor: "pointer",
              }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Layout helpers ── */
function Section({ icon, title, children }: { icon: typeof faCircleQuestion; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        marginBottom: "0.75rem", paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--border)",
      }}>
        <FontAwesomeIcon icon={icon} style={{ width: 15, height: 15, color: "var(--lime)", flexShrink: 0 }} />
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.03em" }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </div>
  );
}

function Item({ label, desc, children }: { label: string; desc: string; children?: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "0.75rem 1rem",
    }}>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--lime)", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>{desc}</div>
      {children}
    </div>
  );
}

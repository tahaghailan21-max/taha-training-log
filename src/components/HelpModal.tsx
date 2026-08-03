"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faCircleQuestion, faCalendarDay, faWeightScale,
  faDumbbell, faLayerGroup, faRepeat, faClock, faHashtag,
  faStickyNote, faClipboardList, faFloppyDisk, faCopy,
  faMoon, faPen, faTrash, faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

type Section = {
  icon: typeof faCircleQuestion;
  title: string;
  color?: string;
  items: { label: string; desc: string }[];
};

const SECTIONS: Section[] = [
  {
    icon: faCalendarDay,
    title: "Session header",
    items: [
      { label: "Date", desc: "The date you performed this session. Defaults to today." },
      { label: "Bodyweight (kg)", desc: "Your body weight that day. Optional — useful for tracking progress over time." },
      { label: "Session name", desc: 'A name for the whole session, e.g. "Handstands, Planch & Bridge". Shows as the title on the feed.' },
      { label: "↻ Copy a session", desc: "Opens your last 7 sessions. Tap one to copy all its exercises and sets into today's form — great for repeated training blocks." },
      { label: "Mark rest day", desc: "Sets the session name to 'Rest' and clears all exercises. Logs the day so your streak stays intact." },
    ],
  },
  {
    icon: faDumbbell,
    title: "Exercises",
    items: [
      { label: "Add a movement (dropdown)", desc: "Pick from your full list of 102 saved movements. Selecting one adds it as a new exercise card instantly." },
      { label: "...Or type a new one", desc: "Type a movement name and press + Add or hit Enter. Must match a name or alias in your list exactly." },
      { label: "✕ Remove exercise", desc: "Removes that exercise and all its sets from the session." },
    ],
  },
  {
    icon: faLayerGroup,
    title: "Sets — what each field means",
    items: [
      { label: "REPS", desc: "Number of repetitions for one set. E.g. 5 reps of a pull-up." },
      { label: "SECS", desc: "Duration in seconds for a timed set. E.g. 10s for a planche hold. Use this instead of REPS for holds." },
      { label: "SETS", desc: 'How many identical sets you did. Setting SETS to 3 with 5 REPS means "3 sets of 5 reps" — it saves as a single row rather than 3 separate rows.' },
      { label: "⏱ Time it", desc: "Starts a stopwatch. Tap again to stop. The timer is per-set so you can time your rest or hold without affecting other sets." },
      { label: "+ Set", desc: "Adds another set row to this exercise. Use this when each set had different reps, duration, or a different note." },
    ],
  },
  {
    icon: faStickyNote,
    title: "The three note fields",
    color: "#c6f135",
    items: [
      {
        label: "Set note (small field under each set)",
        desc: 'A note specific to that individual set. E.g. "shaky" or "clean rep" or "adv tuck". Shows indented under the set on the feed.',
      },
      {
        label: "NOTES / FORM (per exercise)",
        desc: 'A technical note about how you performed the whole exercise. E.g. "55 cm between the hands" or "protraction cue worked well". Appears as an italic bullet at the bottom of the exercise block on the feed.',
      },
      {
        label: "SESSION NOTES (bottom of form)",
        desc: 'A note about the whole session — how you felt, what went well, fatigue level, etc. E.g. "Getting strength back". Shown in italic under the session title on the feed.',
      },
    ],
  },
  {
    icon: faFloppyDisk,
    title: "Saving",
    items: [
      { label: "Save session / Save changes", desc: "Saves to the database. The button is always visible at the bottom of the screen — no need to scroll down to find it." },
      { label: "Auto-draft", desc: "While you fill in a new session, the form auto-saves to your browser every 0.5 seconds. If you close the tab by accident, your work is restored next time you open /new." },
      { label: "Offline", desc: "If you lose connection, saving queues the session locally and syncs it when you're back online." },
    ],
  },
  {
    icon: faPen,
    title: "Editing & deleting",
    items: [
      { label: "Edit button (feed or session page)", desc: "Opens the full edit form pre-filled with the session's data. Works exactly like the new session form." },
      { label: "Swipe left (mobile)", desc: "On the feed, swipe a card left to reveal Edit and Delete buttons without having to open the session." },
      { label: "Delete", desc: "Permanently deletes the session and all its exercises and sets. Asks for confirmation first." },
    ],
  },
  {
    icon: faMoon,
    title: "Other",
    items: [
      { label: "🌙 / ☀️ Dark / light mode", desc: "Toggle between dark and light theme. Your preference is saved and restored on every visit." },
      { label: "Archive", desc: "Your old static HTML training log, kept for reference." },
    ],
  },
];

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
              <button
                type="button" onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}
              >
                <FontAwesomeIcon icon={faXmark} style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Sections */}
            {SECTIONS.map((section) => (
              <div key={section.title} style={{ marginBottom: "1.75rem" }}>
                {/* Section heading */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <FontAwesomeIcon icon={section.icon} style={{ width: 15, height: 15, color: "var(--lime)", flexShrink: 0 }} />
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.03em" }}>
                    {section.title}
                  </h2>
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {section.items.map((item) => (
                    <div key={item.label} style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "0.75rem 1rem",
                    }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--lime)", marginBottom: "0.3rem" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button" onClick={() => setOpen(false)}
              style={{
                width: "100%", background: "var(--lime)", color: "#000",
                fontWeight: 800, fontSize: "1rem", border: "none",
                borderRadius: 8, padding: "0.9rem", cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

type Status = "open" | "done" | "ignored" | "later";

type FeedbackRow = {
  id: number;
  message: string;
  status: string;
  created_at: string;
  username: string;
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  open:    { label: "Open",      color: "#fff",     bg: "#444"    },
  done:    { label: "✓ Done",    color: "#000",     bg: "var(--lime)" },
  ignored: { label: "✕ Ignored", color: "var(--muted)", bg: "transparent" },
  later:   { label: "⏸ Later",   color: "#f0a500",  bg: "rgba(240,165,0,0.12)" },
};

const ALL_STATUSES: Status[] = ["open", "done", "later", "ignored"];

interface Props {
  open: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedbackListModal({ open, onClose }: Props) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/feedback")
      .then(r => r.json())
      .then((data: FeedbackRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function setStatus(id: number, status: Status) {
    setUpdating(id);
    await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setUpdating(null);
  }

  if (!open) return null;

  const visible = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const counts = Object.fromEntries(
    ALL_STATUSES.map(s => [s, rows.filter(r => r.status === s).length])
  ) as Record<Status, number>;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, overflowY: "auto" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg)", minHeight: "100%", maxWidth: 640, margin: "0 auto", padding: "1.25rem 1rem 4rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.04em" }}>
            USER FEEDBACKS <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 400 }}>({rows.length})</span>
          </h1>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}>
            <FontAwesomeIcon icon={faXmark} style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {(["all", ...ALL_STATUSES] as const).map(s => {
            const active = filter === s;
            const count = s === "all" ? rows.length : counts[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                style={{
                  borderRadius: 20, padding: "0.25rem 0.75rem", fontSize: "0.78rem",
                  border: "1px solid var(--border)",
                  background: active ? "var(--lime)" : "transparent",
                  color: active ? "#000" : "var(--muted)",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s].label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {loading && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "3rem" }}>Loading...</p>
        )}

        {!loading && visible.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "3rem" }}>
            No feedback here.
          </p>
        )}

        {!loading && visible.map(row => {
          const status = (row.status as Status) ?? "open";
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
          return (
            <div key={row.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "0.65rem",
              opacity: status === "ignored" ? 0.55 : 1,
              transition: "opacity 0.2s",
            }}>
              {/* Row header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--lime)", letterSpacing: "0.04em" }}>
                  {row.username}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{timeAgo(row.created_at)}</span>
              </div>

              {/* Message */}
              <p style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.6, margin: "0 0 0.75rem", whiteSpace: "pre-wrap" }}>
                {row.message}
              </p>

              {/* Status buttons */}
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {ALL_STATUSES.map(s => {
                  const c = STATUS_CONFIG[s];
                  const isActive = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={updating === row.id}
                      onClick={() => setStatus(row.id, s)}
                      style={{
                        borderRadius: 20, padding: "0.2rem 0.65rem", fontSize: "0.72rem",
                        border: `1px solid ${isActive ? c.bg : "var(--border)"}`,
                        background: isActive ? c.bg : "transparent",
                        color: isActive ? c.color : "var(--muted)",
                        fontWeight: isActive ? 700 : 400,
                        cursor: updating === row.id ? "not-allowed" : "pointer",
                        opacity: updating === row.id ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button type="button" onClick={onClose}
          style={{
            width: "100%", marginTop: "1rem",
            background: "var(--lime)", color: "#000",
            fontWeight: 800, fontSize: "1rem", border: "none",
            borderRadius: 8, padding: "0.85rem", cursor: "pointer",
          }}>
          Close
        </button>
      </div>
    </div>
  );
}

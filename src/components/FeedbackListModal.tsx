"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useT } from "@/components/LanguageProvider";

type FeedbackRow = {
  id: number;
  message: string;
  created_at: string;
  username: string;
};

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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function FeedbackListModal({ open, onClose }: Props) {
  const { t } = useT();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/feedback")
      .then(r => r.json())
      .then((data: FeedbackRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 300, overflowY: "auto",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.04em" }}>
            USER FEEDBACKS
          </h1>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}>
            <FontAwesomeIcon icon={faXmark} style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {loading && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "3rem" }}>Loading...</p>
        )}

        {!loading && rows.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "3rem" }}>
            No feedback yet.
          </p>
        )}

        {!loading && rows.map(row => (
          <div key={row.id} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.85rem 1rem",
            marginBottom: "0.65rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--lime)", letterSpacing: "0.04em" }}>
                {row.username}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {timeAgo(row.created_at)}
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {row.message}
            </p>
          </div>
        ))}

        <button type="button" onClick={onClose}
          style={{
            width: "100%", marginTop: "1rem",
            background: "var(--lime)", color: "#000",
            fontWeight: 800, fontSize: "1rem", border: "none",
            borderRadius: 8, padding: "0.85rem", cursor: "pointer",
          }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

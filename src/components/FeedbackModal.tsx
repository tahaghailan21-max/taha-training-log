"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useT } from "@/components/LanguageProvider";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const { t } = useT();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      setDone(true);
      setMessage("");
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1800);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "16px 16px 0 0",
          padding: "1.25rem 1.25rem 2.5rem",
          width: "100%",
          maxWidth: 640,
          boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1.25rem" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--lime)", letterSpacing: "0.1em" }}>
            {t.feedbackTitle}
          </h2>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}>
            <FontAwesomeIcon icon={faXmark} style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "2rem 0", fontSize: "1.1rem", color: "var(--lime)", fontWeight: 700 }}>
            {t.feedbackThanks}
          </div>
        ) : (
          <>
            <textarea
              rows={5}
              placeholder={t.feedbackPh}
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ width: "100%", resize: "none", marginBottom: "0.85rem" }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim()}
              style={{
                width: "100%",
                background: sending || !message.trim() ? "var(--lime-dim)" : "var(--lime)",
                color: "#000", fontWeight: 800, fontSize: "1rem",
                border: "none", borderRadius: 8, padding: "0.85rem",
                cursor: sending || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sending ? t.sending : t.sendFeedback}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

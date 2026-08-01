"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ sessionId }: { sessionId: number }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.replace("/");
  }

  if (!confirm) {
    return (
      <button className="danger" onClick={() => setConfirm(true)}>
        🗑 Delete session
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <span className="muted">Are you sure?</span>
      <button className="danger" onClick={handleDelete} disabled={loading}>
        {loading ? <span className="spinner" /> : "Yes, delete"}
      </button>
      <button onClick={() => setConfirm(false)}>Cancel</button>
    </div>
  );
}

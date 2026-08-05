"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useT } from "@/components/LanguageProvider";

export default function DeleteButton({ sessionId }: { sessionId: number }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useT();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.replace("/");
  }

  if (!confirm) {
    return (
      <button className="danger" onClick={() => setConfirm(true)}
        style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <FontAwesomeIcon icon={faTrash} style={{ width: 13, height: 13 }} />
        {t.deleteBtn}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t.areYouSure}</span>
      <button className="danger" onClick={handleDelete} disabled={loading}
        style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem" }}>
        {loading ? <span className="spinner" /> : t.yesDelete}
      </button>
      <button onClick={() => setConfirm(false)}
        style={{ borderRadius: 20, padding: "0.4rem 1.1rem", fontSize: "0.85rem" }}>
        {t.cancel}
      </button>
    </div>
  );
}

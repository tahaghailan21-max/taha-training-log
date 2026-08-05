"use client";
import { useEffect, useRef, useState } from "react";

type IncrementItem = { id: number | null; value: number };

const BUILT_IN: IncrementItem[] = [
  { id: null, value: 0.5 },
  { id: null, value: 1 },
  { id: null, value: 5 },
];

interface Props {
  selected: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}

export default function SecsIncrementPicker({ selected, onSelect, onClose }: Props) {
  const [custom, setCustom] = useState<IncrementItem[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user's custom increments
  useEffect(() => {
    fetch("/api/secs-increments")
      .then(r => r.json())
      .then((rows: { id: number; value: number }[]) => setCustom(rows))
      .catch(() => {});
  }, []);

  // All options: built-ins first, then custom (sorted), deduped by value
  const builtInValues = new Set(BUILT_IN.map(b => b.value));
  const allOptions: IncrementItem[] = [
    ...BUILT_IN,
    ...custom.filter(c => !builtInValues.has(c.value)).sort((a, b) => a.value - b.value),
  ];

  async function handleAdd() {
    const val = parseFloat(input);
    if (!val || val <= 0) return;
    setAdding(true);
    try {
      const res = await fetch("/api/secs-increments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: val }),
      });
      const row = await res.json() as { id: number; value: number };
      setCustom(prev =>
        prev.find(c => c.id === row.id) ? prev : [...prev, { id: row.id, value: row.value }]
      );
      setInput("");
      onSelect(row.value);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(item: IncrementItem) {
    if (!item.id) return;
    await fetch("/api/secs-increments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    setCustom(prev => prev.filter(c => c.id !== item.id));
    if (selected === item.value) onSelect(1);
  }

  function fmt(n: number) {
    return Number.isInteger(n) ? `${n}s` : `${n}s`;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
          background: "var(--surface)", borderRadius: "16px 16px 0 0",
          padding: "1rem 1.25rem 2rem",
          maxHeight: "70vh", display: "flex", flexDirection: "column",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1rem" }} />

        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          SECS INCREMENT
        </h3>

        {/* Scrollable options */}
        <div style={{ overflowY: "auto", flex: 1, marginBottom: "1rem" }}>
          {allOptions.map(item => {
            const isSelected = selected === item.value;
            const isCustom = item.id !== null;
            return (
              <div
                key={`${item.id ?? "bi"}-${item.value}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.75rem 1rem", marginBottom: "0.4rem",
                  borderRadius: 10, cursor: "pointer",
                  background: isSelected ? "var(--lime)" : "var(--surface2)",
                  border: isSelected ? "none" : "1px solid var(--border)",
                }}
                onClick={() => { onSelect(item.value); onClose(); }}
              >
                <span style={{ fontWeight: 700, fontSize: "1rem", color: isSelected ? "#000" : "var(--text)" }}>
                  {fmt(item.value)}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {!isCustom && (
                    <span style={{ fontSize: "0.65rem", color: isSelected ? "#000" : "var(--muted)", letterSpacing: "0.06em" }}>
                      DEFAULT
                    </span>
                  )}
                  {isCustom && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(item); }}
                      style={{
                        background: "transparent", border: "none",
                        color: isSelected ? "#000" : "var(--muted)",
                        fontSize: "1rem", cursor: "pointer", padding: "0 0.25rem", lineHeight: 1,
                      }}
                      aria-label={`Remove ${item.value}s increment`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem" }}>
          <label style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: "0.45rem" }}>
            ADD CUSTOM INCREMENT (seconds)
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              ref={inputRef}
              type="number"
              step="0.5"
              min="0.5"
              placeholder="e.g. 2.5"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !input}
              style={{
                borderRadius: 8, padding: "0.5rem 1.1rem", fontSize: "0.9rem",
                fontWeight: 700, background: "var(--lime)", color: "#000",
                border: "none", cursor: adding || !input ? "not-allowed" : "pointer",
                opacity: adding || !input ? 0.5 : 1,
              }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

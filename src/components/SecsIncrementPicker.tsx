"use client";
import { useEffect, useRef, useState } from "react";

const ITEM_H = 52;

type IncrementItem = { id: number | null; value: number };

const BUILT_IN_VALUES = new Set([0.5, 1, 5]);

interface Props {
  selected: number;
  /** All available increments (built-ins + custom), sorted ascending */
  increments: number[];
  onSelect: (value: number) => void;
  onClose: () => void;
  /** Called after a new increment is successfully saved to the DB */
  onIncrementAdded?: (value: number) => void;
  /** Called after an increment is deleted from the DB */
  onIncrementDeleted?: (value: number) => void;
}

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}s` : `${n}s`;
}

function DrumRoll({
  items,
  selectedValue,
  onSelect,
}: {
  items: IncrementItem[];
  selectedValue: number;
  onSelect: (v: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIdx, setActiveIdx] = useState(() => {
    const i = items.findIndex(x => x.value === selectedValue);
    return i === -1 ? 0 : i;
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = activeIdx * ITEM_H;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const idx = items.findIndex(x => x.value === selectedValue);
    if (idx === -1) return;
    setActiveIdx(idx);
    const el = scrollRef.current;
    if (el) el.scrollTop = idx * ITEM_H;
  }, [items, selectedValue]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const rawIdx = el.scrollTop / ITEM_H;
      const idx = Math.round(rawIdx);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      setActiveIdx(clamped);
      onSelect(items[clamped].value);
    }, 80);
  }

  return (
    <div style={{
      position: "relative",
      height: ITEM_H * 5,
      overflow: "hidden",
      borderRadius: 12,
      background: "var(--surface2)",
    }}>
      <div style={{
        position: "absolute", left: 12, right: 12, top: ITEM_H * 2, height: ITEM_H,
        borderRadius: 8, border: "2px solid var(--lime)",
        pointerEvents: "none", zIndex: 2,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H * 2,
        background: "linear-gradient(to bottom, var(--surface2) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 3,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: ITEM_H * 2,
        background: "linear-gradient(to top, var(--surface2) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 3,
      }} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: "absolute", inset: 0,
          overflowY: "scroll", scrollbarWidth: "none",
          paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2,
        }}
      >
        <style>{`.drum-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div className="drum-scroll">
          {items.map((item, i) => {
            const dist = Math.abs(i - activeIdx);
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.18;
            const scale = dist === 0 ? 1.08 : dist === 1 ? 0.9 : 0.78;
            return (
              <div
                key={`${item.id ?? "b"}-${item.value}`}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                  setActiveIdx(i);
                  onSelect(item.value);
                }}
                style={{
                  height: ITEM_H,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", userSelect: "none",
                  fontSize: dist === 0 ? "1.2rem" : "1rem",
                  fontWeight: dist === 0 ? 800 : 500,
                  color: dist === 0 ? "var(--lime)" : "var(--text)",
                  opacity,
                  transform: `scale(${scale})`,
                  transition: "opacity 0.12s, transform 0.12s, color 0.12s",
                }}
              >
                {fmt(item.value)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SecsIncrementPicker({
  selected,
  increments,
  onSelect,
  onClose,
  onIncrementAdded,
  onIncrementDeleted,
}: Props) {
  // Map values back to {id, value} — we fetch ids only for custom ones so we can delete them
  const [customIds, setCustomIds] = useState<Record<number, number>>({});
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [localSelected, setLocalSelected] = useState(selected);

  // Fetch ids for the custom increments so we can delete them
  useEffect(() => {
    fetch("/api/secs-increments")
      .then(r => r.json())
      .then((rows: { id: number; value: number }[]) => {
        const map: Record<number, number> = {};
        for (const row of rows) map[row.value] = row.id;
        setCustomIds(map);
      })
      .catch(() => {});
  }, []);

  const allItems: IncrementItem[] = increments.map(v => ({
    id: customIds[v] ?? null,
    value: v,
  }));

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
      setCustomIds(prev => ({ ...prev, [row.value]: row.id }));
      setInput("");
      setLocalSelected(row.value);
      onIncrementAdded?.(row.value);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(value: number) {
    const id = customIds[value];
    if (!id) return;
    await fetch("/api/secs-increments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCustomIds(prev => { const n = { ...prev }; delete n[value]; return n; });
    if (localSelected === value) setLocalSelected(1);
    onIncrementDeleted?.(value);
  }

  const customValues = increments.filter(v => !BUILT_IN_VALUES.has(v));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100 }} />

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
        background: "var(--surface)", borderRadius: "16px 16px 0 0",
        padding: "1rem 1.25rem 2rem",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1rem" }} />

        <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: "0.85rem", textAlign: "center" }}>
          SECS INCREMENT
        </h3>

        <DrumRoll items={allItems} selectedValue={localSelected} onSelect={setLocalSelected} />

        {/* Custom value chips with delete */}
        {customValues.length > 0 && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {customValues.map(v => (
              <div key={v} style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "0.2rem 0.6rem 0.2rem 0.75rem",
                fontSize: "0.8rem", color: "var(--muted)",
              }}>
                {fmt(v)}
                <button type="button" onClick={() => handleDelete(v)}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.95rem" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.85rem", paddingTop: "0.85rem", display: "flex", gap: "0.5rem" }}>
          <input
            type="number" step="0.5" min="0.5"
            placeholder="Custom (e.g. 2.5)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={handleAdd} disabled={adding || !input}
            style={{
              borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 700,
              background: "var(--lime)", color: "#000", border: "none",
              cursor: adding || !input ? "not-allowed" : "pointer",
              opacity: adding || !input ? 0.5 : 1, whiteSpace: "nowrap",
            }}>
            + Add
          </button>
        </div>

        {/* Confirm */}
        <button type="button" onClick={() => { onSelect(localSelected); onClose(); }}
          style={{
            width: "100%", marginTop: "0.85rem",
            background: "var(--lime)", color: "#000",
            fontWeight: 800, fontSize: "1rem", border: "none",
            borderRadius: 8, padding: "0.85rem", cursor: "pointer",
          }}>
          Use {fmt(localSelected)}
        </button>
      </div>
    </>
  );
}

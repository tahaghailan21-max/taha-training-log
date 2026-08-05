"use client";
import { useEffect, useRef, useState } from "react";

const ITEM_H = 48; // height of each row in px
const VISIBLE = 5;  // rows visible at once (centre row = selected)

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

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}s` : `${n}s`;
}

/* ── Drum-roll column ── */
function DrumRoll({
  items,
  selectedValue,
  onSelect,
}: {
  items: IncrementItem[];
  selectedValue: number;
  onSelect: (v: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIdx = items.findIndex(i => i.value === selectedValue);
  const startIdx = selectedIdx === -1 ? 0 : selectedIdx;

  // Scroll to selected on mount / when selection changes
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const idx = items.findIndex(i => i.value === selectedValue);
    if (idx === -1) return;
    el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  }, [selectedValue, items]);

  // Snap on scroll end
  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    clearTimeout((el as HTMLDivElement & { _snapTimer?: ReturnType<typeof setTimeout> })._snapTimer);
    (el as HTMLDivElement & { _snapTimer?: ReturnType<typeof setTimeout> })._snapTimer = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onSelect(items[clamped].value);
    }, 120);
  }

  const padCount = Math.floor(VISIBLE / 2); // 2 padding items top/bottom

  return (
    <div style={{ position: "relative", height: ITEM_H * VISIBLE, overflow: "hidden" }}>
      {/* Selection highlight band */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: ITEM_H * padCount, height: ITEM_H,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Top fade */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: ITEM_H * padCount,
        background: "linear-gradient(to bottom, var(--surface), transparent)",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Bottom fade */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: ITEM_H * padCount,
        background: "linear-gradient(to top, var(--surface), transparent)",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Scrollable list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingTop: ITEM_H * padCount,
          paddingBottom: ITEM_H * padCount,
        }}
      >
        {/* Hide scrollbar in WebKit */}
        <style>{`.drum-roll::-webkit-scrollbar{display:none}`}</style>
        {items.map((item, i) => {
          const isSelected = item.value === selectedValue;
          const dist = Math.abs(i - startIdx);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.25;
          const scale = dist === 0 ? 1 : 0.88;
          return (
            <div
              key={`${item.id ?? "bi"}-${item.value}`}
              onClick={() => {
                listRef.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                onSelect(item.value);
              }}
              style={{
                height: ITEM_H,
                display: "flex", alignItems: "center", justifyContent: "center",
                scrollSnapAlign: "start",
                cursor: "pointer",
                fontWeight: isSelected ? 800 : 600,
                fontSize: isSelected ? "1.15rem" : "1rem",
                color: isSelected ? "var(--lime)" : "var(--text)",
                opacity,
                transform: `scale(${scale})`,
                transition: "transform 0.15s, opacity 0.15s",
                userSelect: "none",
              }}
            >
              {fmt(item.value)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main picker ── */
export default function SecsIncrementPicker({ selected, onSelect, onClose }: Props) {
  const [custom, setCustom] = useState<IncrementItem[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [localSelected, setLocalSelected] = useState(selected);

  // Load user's custom increments
  useEffect(() => {
    fetch("/api/secs-increments")
      .then(r => r.json())
      .then((rows: { id: number; value: number }[]) => setCustom(rows))
      .catch(() => {});
  }, []);

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
      setLocalSelected(row.value);
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
    if (localSelected === item.value) setLocalSelected(1);
  }

  function confirm() {
    onSelect(localSelected);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100 }} />

      {/* Sheet */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
        background: "var(--surface)", borderRadius: "16px 16px 0 0",
        padding: "1rem 1.25rem 2rem",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1rem" }} />

        <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: "0.75rem", textAlign: "center" }}>
          SECS INCREMENT
        </h3>

        {/* Drum roll */}
        <DrumRoll items={allOptions} selectedValue={localSelected} onSelect={setLocalSelected} />

        {/* Custom items management */}
        {custom.filter(c => !builtInValues.has(c.value)).length > 0 && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {custom.filter(c => !builtInValues.has(c.value)).map(item => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "0.2rem 0.6rem 0.2rem 0.75rem",
                fontSize: "0.8rem", color: "var(--muted)",
              }}>
                {fmt(item.value)}
                <button type="button" onClick={() => handleDelete(item)}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.9rem" }}
                  aria-label={`Remove ${item.value}s`}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.85rem", paddingTop: "0.85rem", display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            step="0.5"
            min="0.5"
            placeholder="Custom (e.g. 2.5)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={handleAdd} disabled={adding || !input}
            style={{
              borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.85rem",
              fontWeight: 700, background: "var(--lime)", color: "#000",
              border: "none", cursor: adding || !input ? "not-allowed" : "pointer",
              opacity: adding || !input ? 0.5 : 1, whiteSpace: "nowrap",
            }}>
            + Add
          </button>
        </div>

        {/* Confirm */}
        <button type="button" onClick={confirm} style={{
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

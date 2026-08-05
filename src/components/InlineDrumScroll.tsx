"use client";
import { useEffect, useRef, useCallback } from "react";

const ITEM_H = 28;
const VISIBLE = 3;
const COPIES = 20; // how many times we repeat the list for infinite feel

interface Props {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
}

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}s` : `${n}s`;
}

export default function InlineDrumScroll({ items, selected, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isJumping = useRef(false);

  // Total repeated list
  const repeated = Array.from({ length: COPIES }, () => items).flat();
  const total = repeated.length;
  const midOffset = Math.floor(COPIES / 2) * items.length; // index of the "middle" copy start

  // Get the scroll position for a given index in the repeated list
  const scrollTopFor = (idx: number) => idx * ITEM_H;

  // Find the index in the middle copy for a given value
  const idxInMid = useCallback((val: number) => {
    const base = items.findIndex(x => x === val);
    return base === -1 ? midOffset : midOffset + base;
  }, [items, midOffset]);

  // On mount: jump to the selected value in the middle copy (no animation)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollTopFor(idxInMid(selected));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selected changes externally, sync scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isJumping.current) return;
    const target = scrollTopFor(idxInMid(selected));
    // Only scroll if meaningfully out of sync
    const currentIdx = Math.round(el.scrollTop / ITEM_H);
    if (repeated[currentIdx] !== selected) {
      el.scrollTop = target;
    }
  }, [selected, idxInMid, repeated]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || isJumping.current) return;

    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(rawIdx, total - 1));
      const val = repeated[clamped];

      // Snap to grid
      isJumping.current = true;
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });

      // If we've scrolled too far from the middle, silently jump to the equivalent middle position
      const equiv = idxInMid(val);
      setTimeout(() => {
        if (el) el.scrollTop = equiv * ITEM_H;
        isJumping.current = false;
      }, 300);

      onSelect(val);
    }, 80);
  }

  // Determine the "active" value from current scroll (for visual highlighting)
  // We derive it live from DOM in render — not needed, we use `selected` prop

  return (
    <div style={{
      position: "relative",
      height: ITEM_H * VISIBLE,
      width: 44,
      overflow: "hidden",
      borderRadius: 6,
      background: "transparent",
      border: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      {/* Centre highlight — border only, no fill */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        top: ITEM_H,
        height: ITEM_H,
        background: "transparent",
        border: "1px solid var(--lime)",
        borderRadius: 4,
        pointerEvents: "none",
        zIndex: 2,
      }} />

      {/* Top fade */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: ITEM_H,
        background: "linear-gradient(to bottom, var(--bg), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />

      {/* Bottom fade */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: ITEM_H,
        background: "linear-gradient(to top, var(--bg), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: "absolute", inset: 0,
          overflowY: "scroll",
          scrollbarWidth: "none",
          paddingTop: ITEM_H,    // so first item of the middle copy can centre
          paddingBottom: ITEM_H,
        }}
      >
        <style>{`.inline-drum::-webkit-scrollbar{display:none}`}</style>
        <div className="inline-drum">
          {repeated.map((val, i) => {
            const isSelected = val === selected;
            const opacity = isSelected ? 1 : 0.35;
            return (
              <div
                key={i}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                  onSelect(val);
                }}
                style={{
                  height: ITEM_H,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  fontSize: isSelected ? "0.72rem" : "0.65rem",
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? "var(--lime)" : "var(--muted)",
                  opacity,
                  userSelect: "none",
                  transition: "opacity 0.1s",
                }}
              >
                {fmt(val)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

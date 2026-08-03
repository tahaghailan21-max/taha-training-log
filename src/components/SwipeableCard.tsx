"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen } from "@fortawesome/free-solid-svg-icons";

const THRESHOLD = 60;   // px to trigger reveal
const MAX_SLIDE = 130;  // max px the card slides left

type Props = {
  sessionId: number;
  children: React.ReactNode;
};

export default function SwipeableCard({ sessionId, children }: Props) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    isHorizontal.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine axis on first significant move
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizontal.current) return;

    // Prevent page scroll when swiping horizontally
    e.preventDefault();

    const base = isOpen ? -MAX_SLIDE : 0;
    const raw = base + dx;
    // Only allow leftward swipe (negative offset), clamp
    const clamped = Math.max(-MAX_SLIDE, Math.min(0, raw));
    setOffset(clamped);
  }

  function onTouchEnd() {
    isDragging.current = false;
    if (!isHorizontal.current) return;

    if (isOpen) {
      // If swiped right enough, close; otherwise keep open
      setIsOpen(offset > -MAX_SLIDE + THRESHOLD);
      setOffset(offset > -MAX_SLIDE + THRESHOLD ? 0 : -MAX_SLIDE);
    } else {
      // If swiped left enough, open
      const shouldOpen = offset < -THRESHOLD;
      setIsOpen(shouldOpen);
      setOffset(shouldOpen ? -MAX_SLIDE : 0);
    }
  }

  function close() {
    setIsOpen(false);
    setOffset(0);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.refresh();
  }

  function handleEdit() {
    router.push(`/session/${sessionId}/edit`);
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, marginBottom: "0.75rem" }}>
      {/* Action buttons revealed behind card */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        display: "flex", alignItems: "stretch", width: MAX_SLIDE,
      }}>
        <button
          type="button"
          onClick={handleEdit}
          style={{
            flex: 1, border: "none", background: "#2a4a8a", color: "#fff",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "0.25rem",
            fontSize: "0.7rem", fontWeight: 600,
          }}
        >
          <FontAwesomeIcon icon={faPen} style={{ width: 16, height: 16 }} />
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1, border: "none", background: "#c0392b", color: "#fff",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "0.25rem",
            fontSize: "0.7rem", fontWeight: 600,
            borderRadius: "0 8px 8px 0",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          <FontAwesomeIcon icon={faTrash} style={{ width: 16, height: 16 }} />
          {deleting ? "..." : "Delete"}
        </button>
      </div>

      {/* Card — slides left on swipe */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={isOpen ? close : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.2s ease",
          willChange: "transform",
          cursor: isOpen ? "pointer" : "default",
          borderRadius: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

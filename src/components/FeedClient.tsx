"use client";
import { useT } from "@/components/LanguageProvider";
import Link from "next/link";

// Translatable strings shown on the feed that come from the client (empty state, labels)
export function FeedEmptyState() {
  const { t } = useT();
  return (
    <div style={{ textAlign: "center", marginTop: "4rem", padding: "0 1rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏋️</div>
      <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.2rem", marginBottom: "0.5rem" }}>
        {t.noSessions}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.75rem", lineHeight: 1.6 }}>
        {t.noSessionsSub.split("\n").map((line, i) => (
          <span key={i}>{line}{i === 0 && <br />}</span>
        ))}
      </p>
      <Link href="/new" style={{ textDecoration: "none" }}>
        <button type="button" className="primary" style={{
          borderRadius: 8, padding: "0.75rem 2rem", fontSize: "1rem",
          fontWeight: 700, letterSpacing: "0.03em",
        }}>
          {t.logFirst}
        </button>
      </Link>
    </div>
  );
}

export function FeedHeader() {
  const { t } = useT();
  return (
    <Link href="/" style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.04em" }}>
          {t.appTitle}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.62rem", letterSpacing: "0.08em" }}>
          {t.yourFeed}
        </span>
      </div>
    </Link>
  );
}

export function WeightLabel({ value }: { value: string | null }) {
  const { t } = useT();
  const label = value ? `${value} kg` : t.unknown;
  return <>{t.weightLabel} = {label}</>;
}

export function RestDayLabel() {
  const { t } = useT();
  return <p style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.85rem" }}>{t.restDay}</p>;
}

export function EditLabel() {
  const { t } = useT();
  return <>{t.edit}</>;
}

export function TotalLabel({ line }: { line: string }) {
  const { t } = useT();
  return <>{t.totalLabel} {line}</>;
}

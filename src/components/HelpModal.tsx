"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faCircleQuestion, faCalendarDay,
  faDumbbell, faLayerGroup, faStickyNote,
  faFloppyDisk, faPen, faMoon,
} from "@fortawesome/free-solid-svg-icons";
import { useT } from "@/components/LanguageProvider";

/* ── Mini example block ── */
function Example({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: "0.6rem",
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderLeft: "3px solid var(--lime)",
      borderRadius: 6,
      padding: "0.6rem 0.75rem",
      fontSize: "0.82rem",
      color: "var(--text)",
      lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

function Bullet({ color = "var(--muted)" }: { color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, marginRight: "0.45rem", verticalAlign: "middle", flexShrink: 0,
    }} />
  );
}

function ExLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}> ← {children}</span>;
}

/* ── Shared modal content ── */
function HelpContent({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <>
      {/* ── 1. Session header ── */}
      <Section icon={faCalendarDay} title={t.h_s1_title}>
        <Item label={t.h_s1_date_l} desc={t.h_s1_date_d} />
        <Item label={t.h_s1_bw_l} desc={t.h_s1_bw_d} />
        <Item label={t.h_s1_name_l} desc={t.h_s1_name_d}>
          <Example>e.g. <strong>Handstands, Planch &amp; Bridge</strong></Example>
        </Item>
        <Item label={t.h_s1_copy_l} desc={t.h_s1_copy_d} />
        <Item label={t.h_s1_rest_l} desc={t.h_s1_rest_d} />
      </Section>

      {/* ── 2. Exercises ── */}
      <Section icon={faDumbbell} title={t.h_s2_title}>
        <Item label={t.h_s2_drop_l} desc={t.h_s2_drop_d} />
        <Item label={t.h_s2_type_l} desc={t.h_s2_type_d} />
        <Item label={t.h_s2_x_l} desc={t.h_s2_x_d} />
      </Section>

      {/* ── 3. Sets ── */}
      <Section icon={faLayerGroup} title={t.h_s3_title}>
        <Item label={t.h_s3_reps_l} desc={t.h_s3_reps_d}>
          <Example>{t.h_s3_reps_ex.split("\n").map((line, i) => <span key={i}>{line}{i < t.h_s3_reps_ex.split("\n").length - 1 && <br />}</span>)}</Example>
        </Item>
        <Item label={t.h_s3_secs_l} desc={t.h_s3_secs_d}>
          <Example>{t.h_s3_secs_ex.split("\n").map((line, i) => <span key={i}>{line}{i < t.h_s3_secs_ex.split("\n").length - 1 && <br />}</span>)}</Example>
        </Item>
        <Item label={t.h_s3_sets_l} desc={t.h_s3_sets_d}>
          <Example>{t.h_s3_sets_ex.split("\n").map((line, i) => <span key={i}>{line}{i < t.h_s3_sets_ex.split("\n").length - 1 && <br />}</span>)}</Example>
        </Item>
        <Item label={t.h_s3_addset_l} desc={t.h_s3_addset_d}>
          <Example>{t.h_s3_addset_ex.split("\n").map((line, i) => <span key={i}>{line}{i < t.h_s3_addset_ex.split("\n").length - 1 && <br />}</span>)}</Example>
        </Item>
        <Item label={t.h_s3_timer_l} desc={t.h_s3_timer_d} />
      </Section>

      {/* ── 4. Notes ── */}
      <Section icon={faStickyNote} title={t.h_s4_title}>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          {t.h_s4_intro}
        </p>
        <Item label={t.h_s4_setnote_l} desc={t.h_s4_setnote_d}>
          <Example>
            <div style={{ marginBottom: "0.3rem" }}>Planche — Set 2:</div>
            <div><Bullet />2 sets of 8s</div>
            <div style={{ paddingLeft: "1rem", borderLeft: "2px solid var(--border)", marginLeft: "0.55rem", fontStyle: "italic", color: "var(--muted)" }}>
              Adv tuck, shaky<ExLabel>{t.h_s4_setnote_ex_label}</ExLabel>
            </div>
          </Example>
        </Item>
        <Item label={t.h_s4_exnote_l} desc={t.h_s4_exnote_d}>
          <Example>
            <div style={{ color: "var(--lime)", fontWeight: 700, marginBottom: "0.3rem" }}>Handstands</div>
            <div><Bullet />5 sets</div>
            <div><Bullet color="var(--lime)" /><strong>Total: 5 sets</strong></div>
            <div style={{ marginTop: "0.25rem" }}><Bullet /><em style={{ color: "var(--muted)" }}>55 cm between the hands<ExLabel>{t.h_s4_exnote_ex_label}</ExLabel></em></div>
          </Example>
        </Item>
        <Item label={t.h_s4_sesnote_l} desc={t.h_s4_sesnote_d}>
          <Example>
            <div style={{ color: "var(--lime)", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.2rem" }}>Handstands, Planch &amp; Bridge</div>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.3rem" }}>Sat, 2 Aug 2026 — weight = 74 kg</div>
            <div style={{ fontStyle: "italic", color: "var(--muted)" }}>
              Shoulder felt tight<ExLabel>{t.h_s4_sesnote_ex_label}</ExLabel>
            </div>
          </Example>
        </Item>
      </Section>

      {/* ── 5. Saving ── */}
      <Section icon={faFloppyDisk} title={t.h_s5_title}>
        <Item label={t.h_s5_save_l} desc={t.h_s5_save_d} />
        <Item label={t.h_s5_draft_l} desc={t.h_s5_draft_d} />
        <Item label={t.h_s5_offline_l} desc={t.h_s5_offline_d} />
      </Section>

      {/* ── 6. Editing & deleting ── */}
      <Section icon={faPen} title={t.h_s6_title}>
        <Item label={t.h_s6_edit_l} desc={t.h_s6_edit_d} />
        <Item label={t.h_s6_swipe_l} desc={t.h_s6_swipe_d} />
        <Item label={t.h_s6_delete_l} desc={t.h_s6_delete_d} />
      </Section>

      {/* ── 7. Other ── */}
      <Section icon={faMoon} title={t.h_s7_title}>
        <Item label={t.h_s7_theme_l} desc={t.h_s7_theme_d} />
      </Section>

      <button type="button" onClick={onClose}
        style={{
          width: "100%", background: "var(--lime)", color: "#000",
          fontWeight: 800, fontSize: "1rem", border: "none",
          borderRadius: 8, padding: "0.9rem", cursor: "pointer",
        }}>
        {t.gotIt}
      </button>
    </>
  );
}

/* ── Standalone controlled modal ── */
export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "var(--lime)", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
            {t.howToUseTitle}
          </h1>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.25rem" }}>
            <FontAwesomeIcon icon={faXmark} style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <HelpContent onClose={onClose} />
      </div>
    </div>
  );
}

/* ── Self-contained button + modal (for standalone use) ── */
export function HelpButton({ open: controlledOpen, onOpenChange }: { open?: boolean; onOpenChange?: (v: boolean) => void } = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { t } = useT();
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.howToUse}
        style={{
          borderRadius: "50%", width: 36, height: 36, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)", background: "var(--surface)",
          cursor: "pointer", color: "var(--muted)", flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faCircleQuestion} style={{ width: 16, height: 16 }} />
      </button>
      <HelpModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ── Layout helpers ── */
function Section({ icon, title, children }: { icon: typeof faCircleQuestion; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        marginBottom: "0.75rem", paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--border)",
      }}>
        <FontAwesomeIcon icon={icon} style={{ width: 15, height: 15, color: "var(--lime)", flexShrink: 0 }} />
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.03em" }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </div>
  );
}

function Item({ label, desc, children }: { label: string; desc: string; children?: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "0.75rem 1rem",
    }}>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--lime)", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>{desc}</div>
      {children}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars, faXmark, faMoon, faSun,
  faRightFromBracket, faDownload, faArrowUpFromBracket,
  faCircleQuestion, faComment, faInbox,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/components/ThemeProvider";
import { useT } from "@/components/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";
import { HelpModal } from "@/components/HelpModal";
import FeedbackModal from "@/components/FeedbackModal";
import FeedbackListModal from "@/components/FeedbackListModal";

const ADMIN_USER_ID = 1;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackListOpen, setFeedbackListOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useT();
  const router = useRouter();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(ios);
    if (standalone) setInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Fetch current user id to know if taha is logged in
  useEffect(() => {
    fetch("/api/feedback")
      .then(r => {
        // If 200 → we're the admin; if 403 → not admin
        setCurrentUserId(r.ok ? ADMIN_USER_ID : 0);
      })
      .catch(() => setCurrentUserId(0));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (helpOpen || feedbackOpen || feedbackListOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, helpOpen, feedbackOpen, feedbackListOpen]);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function handleInstall() {
    setOpen(false);
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(prev => !prev);
    }
  }

  const showInstall = !installed && (!!deferredPrompt || isIOS);
  const isAdmin = currentUserId === ADMIN_USER_ID;

  return (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <FeedbackListModal open={feedbackListOpen} onClose={() => setFeedbackListOpen(false)} />

      <div ref={menuRef} style={{ position: "relative" }}>
        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          style={{
            borderRadius: "50%", width: 36, height: 36, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)", background: open ? "var(--surface2)" : "var(--surface)",
            cursor: "pointer", color: "var(--text)", flexShrink: 0,
          }}
        >
          <FontAwesomeIcon icon={open ? faXmark : faBars} style={{ width: 16, height: 16 }} />
        </button>

        {/* Dropdown — insetInlineEnd instead of right so RTL works correctly */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)",
            insetInlineEnd: 0,          // anchors to trailing edge in both LTR & RTL
            insetInlineStart: "auto",   // prevent browser from also setting start
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, minWidth: 240, zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)", overflow: "hidden",
          }}>
            {/* Theme toggle */}
            <MenuItem
              icon={<FontAwesomeIcon icon={theme === "dark" ? faMoon : faSun} style={{ width: 15, height: 15 }} />}
              label={theme === "dark" ? t.darkMode : t.lightMode}
              sublabel={t.tapToSwitch}
              onClick={() => toggle()}
            />
            <Divider />

            {/* Language picker */}
            <div style={{ padding: "0.6rem 1rem" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                {t.language.toUpperCase()}
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    title={l.label}
                    style={{
                      width: 30, height: 30, borderRadius: "50%", padding: 0,
                      border: lang === l.code ? "2px solid var(--lime)" : "2px solid transparent",
                      background: "transparent", cursor: "pointer",
                      overflow: "hidden", flexShrink: 0,
                      outline: "none",
                      boxShadow: lang === l.code ? "0 0 0 1px var(--lime)" : "none",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    <Image src={l.flag} alt={l.label} width={30} height={30} style={{ display: "block", borderRadius: "50%" }} />
                  </button>
                ))}
              </div>
            </div>
            <Divider />

            {/* How to use */}
            <MenuItem
              icon={<FontAwesomeIcon icon={faCircleQuestion} style={{ width: 15, height: 15 }} />}
              label={t.howToUse}
              sublabel={t.guideAndTips}
              onClick={() => setHelpOpen(true)}
            />

            {/* Send feedback */}
            <MenuItem
              icon={<FontAwesomeIcon icon={faComment} style={{ width: 15, height: 15 }} />}
              label={t.feedback}
              sublabel={t.feedbackSub}
              onClick={() => { setOpen(false); setFeedbackOpen(true); }}
            />

            {/* Admin: view all feedbacks — only visible to taha */}
            {isAdmin && (
              <MenuItem
                icon={<FontAwesomeIcon icon={faInbox} style={{ width: 15, height: 15 }} />}
                label="User feedbacks"
                sublabel="See what everyone sent"
                onClick={() => { setOpen(false); setFeedbackListOpen(true); }}
              />
            )}

            {showInstall && (
              <>
                <Divider />
                <MenuItem
                  icon={<FontAwesomeIcon icon={isIOS ? faArrowUpFromBracket : faDownload} style={{ width: 15, height: 15 }} />}
                  label={t.installApp}
                  sublabel={isIOS ? t.addToHome : t.installPWA}
                  onClick={handleInstall}
                />
              </>
            )}
            <Divider />
            <MenuItem
              icon={<FontAwesomeIcon icon={faRightFromBracket} style={{ width: 15, height: 15 }} />}
              label={t.logOut}
              sublabel={t.signOut}
              onClick={handleLogout}
              danger
            />
          </div>
        )}

        {/* iOS tip */}
        {showIOSTip && (
          <>
            <div onClick={() => setShowIOSTip(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
            <div style={{
              position: "absolute", top: "calc(100% + 8px)",
              insetInlineEnd: 0, insetInlineStart: "auto",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "0.85rem 1rem",
              width: 230, zIndex: 200,
              fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}>
              <div style={{ position: "absolute", top: -7, insetInlineEnd: 12, width: 12, height: 12, background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", borderRight: "none", transform: "rotate(45deg)" }} />
              <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>{t.addToHome}</p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Tap <FontAwesomeIcon icon={faArrowUpFromBracket} style={{ width: 12, height: 12, margin: "0 2px" }} /> <strong>Share</strong> at the bottom of Safari, then <strong>&quot;{t.addToHome}&quot;</strong>.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function MenuItem({ icon, label, sublabel, onClick, danger = false }: {
  icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        width: "100%", padding: "0.75rem 1rem",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: danger ? "var(--danger)" : "var(--muted)", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: danger ? "var(--danger)" : "var(--text)" }}>{label}</div>
        {sublabel && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.1rem" }}>{sublabel}</div>}
      </div>
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "0 0.75rem" }} />;
}

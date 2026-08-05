"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars, faXmark, faMoon, faSun,
  faRightFromBracket, faDownload, faArrowUpFromBracket,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/components/ThemeProvider";
import { HelpButton } from "@/components/HelpModal";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();
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

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

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

  return (
    <>
      {/* Invisible HelpButton — controlled open state */}
      <div style={{ display: "none" }}>
        <HelpButton open={helpOpen} onOpenChange={setHelpOpen} />
      </div>

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

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12, minWidth: 230, zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}>
            <MenuItem
              icon={<FontAwesomeIcon icon={theme === "dark" ? faMoon : faSun} style={{ width: 15, height: 15 }} />}
              label={theme === "dark" ? "Dark mode" : "Light mode"}
              sublabel="Tap to switch"
              onClick={() => { toggle(); setOpen(false); }}
            />
            <Divider />
            <MenuItem
              icon={<FontAwesomeIcon icon={faCircleQuestion} style={{ width: 15, height: 15 }} />}
              label="How to use"
              sublabel="Guide & tips"
              onClick={() => { setOpen(false); setHelpOpen(true); }}
            />
            {showInstall && (
              <>
                <Divider />
                <MenuItem
                  icon={<FontAwesomeIcon icon={isIOS ? faArrowUpFromBracket : faDownload} style={{ width: 15, height: 15 }} />}
                  label="Install app"
                  sublabel={isIOS ? "Add to Home Screen" : "Install as PWA"}
                  onClick={handleInstall}
                />
              </>
            )}
            <Divider />
            <MenuItem
              icon={<FontAwesomeIcon icon={faRightFromBracket} style={{ width: 15, height: 15 }} />}
              label="Log out"
              sublabel="Sign out of your account"
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
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "0.85rem 1rem",
              width: 230, zIndex: 200,
              fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}>
              <div style={{ position: "absolute", top: -7, right: 12, width: 12, height: 12, background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", borderRight: "none", transform: "rotate(45deg)" }} />
              <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>Add to Home Screen</p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Tap <FontAwesomeIcon icon={faArrowUpFromBracket} style={{ width: 12, height: 12, margin: "0 2px" }} /> <strong>Share</strong> at the bottom of Safari, then <strong>"Add to Home Screen"</strong>.
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

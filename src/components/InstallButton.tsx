"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faArrowUpFromBracket } from "@fortawesome/free-solid-svg-icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia("(display-mode: standalone)").matches;

    setIsIOS(ios);
    if (standalone) setInstalled(true); // already installed — hide button

    // Android/Chrome: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Hide when installed via the browser's own flow
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Don't show if already installed or if Android hasn't fired the prompt yet
  // (and it's not iOS either)
  if (installed) return null;
  if (!deferredPrompt && !isIOS) return null;

  async function handleClick() {
    if (deferredPrompt) {
      // Android: trigger native install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else {
      // iOS: show instruction tooltip
      setShowIOSTip(prev => !prev);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install app"
        style={{
          borderRadius: "50%", width: 36, height: 36, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)", background: "var(--surface)",
          cursor: "pointer", color: "var(--muted)", flexShrink: 0,
        }}
      >
        <FontAwesomeIcon
          icon={isIOS ? faArrowUpFromBracket : faDownload}
          style={{ width: 15, height: 15 }}
        />
      </button>

      {/* iOS instruction tooltip */}
      {showIOSTip && (
        <>
          {/* Backdrop to close */}
          <div
            onClick={() => setShowIOSTip(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "0.85rem 1rem",
            width: 220, zIndex: 100,
            fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}>
            {/* Pointer arrow */}
            <div style={{
              position: "absolute", top: -7, right: 12,
              width: 12, height: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderBottom: "none", borderRight: "none",
              transform: "rotate(45deg)",
            }} />
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>Add to Home Screen</p>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Tap <FontAwesomeIcon icon={faArrowUpFromBracket} style={{ width: 12, height: 12, margin: "0 2px" }} /> <strong>Share</strong> at the bottom of Safari, then <strong>"Add to Home Screen"</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  // Show overlay on route change start, hide once new page has painted
  useEffect(() => {
    // When pathname/searchParams change, the new page has already rendered —
    // hide the overlay if it was showing
    setVisible(false);
  }, [pathname, searchParams]);

  // Intercept all link clicks and show overlay immediately
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Only internal same-origin navigations
      if (href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto")) return;
      // Skip anchor-only links
      if (href.startsWith("#")) return;
      // Skip if same path (e.g. clicking the current page's logo)
      if (href === pathname) return;
      setVisible(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "all",
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "3px solid rgba(198,241,53,0.25)",
        borderTopColor: "var(--lime)",
        animation: "spin 0.65s linear infinite",
      }} />
    </div>
  );
}

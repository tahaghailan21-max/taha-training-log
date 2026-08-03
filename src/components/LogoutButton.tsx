"use client";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      style={{
        borderRadius: "50%", width: 36, height: 36, padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border)", background: "var(--surface)",
        cursor: "pointer", color: "var(--muted)", flexShrink: 0,
      }}
    >
      <FontAwesomeIcon icon={faRightFromBracket} style={{ width: 15, height: 15 }} />
    </button>
  );
}

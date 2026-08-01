"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Nav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <nav>
      <Link href="/" className="logo">Training Log</Link>
      <div className="nav-links">
        <Link href="/new">+ Log</Link>
        <Link href="/archive">Archive</Link>
        <button onClick={logout} style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

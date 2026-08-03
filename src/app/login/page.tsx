"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Wrong username or password");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h1 className="lime" style={{ marginBottom: "1.25rem", fontSize: "1.4rem" }}>Training Log</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? <span className="spinner" /> : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

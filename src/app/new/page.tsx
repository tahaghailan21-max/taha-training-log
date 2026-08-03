import SessionForm from "@/components/SessionForm";

export default function NewSessionPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)" }}>
      <SessionForm />
    </div>
  );
}

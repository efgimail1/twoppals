import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Email atau password salah");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-surface-1)" }}>
      <form onSubmit={handleSubmit} style={{ width: 340, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "2rem 1.75rem" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Masuk ke akun</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>Kelola semua bisnis dalam satu tempat.</div>

        <label style={{ fontSize: 12.5, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 14 }} required />

        <label style={{ fontSize: 12.5, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Kata sandi</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 8 }} required />

        {error && <div style={{ fontSize: 12.5, color: "var(--color-danger)", margin: "6px 0" }}>{error}</div>}

        <button type="submit" className="primary" disabled={loading} style={{ width: "100%", marginTop: 12 }}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
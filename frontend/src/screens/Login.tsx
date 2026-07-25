import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setBusy(true);
    setError("");
    const result = await login(email.trim(), password);
    setBusy(false);
    if (result.ok) router.push("/dashboard");
    else setError(result.message?.trim() || "Could not sign you in. Try again.");
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link href="/" className="font-heading font-bold text-2xl text-primary-foreground">
            The Local Baba<span className="text-primary">.</span>
          </Link>
        </div>
        <div className="bg-card rounded-card p-8 shadow-card animate-fade-in-up">
          <h1 className="font-heading font-bold text-2xl text-center mb-6">Member login</h1>
          {error && <p className="text-danger text-sm text-center mb-4 p-2 bg-danger/10 rounded-lg">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 pl-3 pr-10 rounded-lg border border-border bg-card focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-[52px] rounded-lg bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Login"}
            </button>
          </form>
          <div className="text-center mt-4 space-y-2">
            <Link href="/apply" className="text-sm text-primary hover:underline block">
              Not a member yet? Register free →
            </Link>
            <a
              href="https://wa.me/923001234567?text=I%20forgot%20my%20password"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground block"
            >
              Forgot password? WhatsApp us →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { adminLogin, isAdmin, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (isAdmin) router.replace("/admin/dashboard");
  }, [authReady, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminLogin(email, password);
      if (!res.ok) {
        toast.error(res.message ?? "Login failed");
        return;
      }
      router.push("/admin/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-card rounded-card p-8 shadow-card animate-fade-in-up">
        <p className="text-xs text-danger font-medium text-center mb-4">Admin access only</p>
        <h1 className="font-heading font-bold text-2xl text-center mb-6">Admin Login</h1>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4" autoComplete="off">
          <input
            name="admin-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Admin email"
            type="email"
            autoComplete="off"
            className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
          />
          <div className="relative">
            <input
              name="admin-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              className="w-full h-11 pl-3 pr-10 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-dark text-primary-foreground font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Login"}
          </button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
          Uses Supabase Auth. Create a user with this email in the Supabase dashboard, run the SQL migration (replace{" "}
          <span className="font-mono">YOUR_ADMIN_EMAIL</span>), then sign in.
        </p>
      </div>
    </div>
  );
}

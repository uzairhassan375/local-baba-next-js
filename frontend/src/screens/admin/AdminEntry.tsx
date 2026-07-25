import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminEntryPage() {
  const router = useRouter();
  const { authReady } = useAuth();

  useEffect(() => {
    if (!authReady) return;
    void (async () => {
      const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
      const { data } = await createClient().auth.getSession();
      const email = data.session?.user?.email;
      if (email && expected && email.toLowerCase() === expected.toLowerCase()) {
        router.replace("/admin/dashboard");
        return;
      }
      router.replace("/admin/login");
    })();
  }, [authReady, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark text-primary-foreground text-sm">
      {authReady ? "Redirecting…" : "Loading…"}
    </div>
  );
}

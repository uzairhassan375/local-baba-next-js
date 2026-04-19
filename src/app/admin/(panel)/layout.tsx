"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [authReady, isAdmin, router]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark text-primary-foreground text-sm">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}

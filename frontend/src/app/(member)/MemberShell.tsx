"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MemberNavbar } from "@/components/layout/MemberNavbar";
import { MemberLayout } from "@/components/layout/MemberLayout";

export function MemberShell({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !isLoggedIn) {
      router.replace("/login");
    }
  }, [authReady, isLoggedIn, router]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Redirecting…
      </div>
    );
  }

  return (
    <>
      <MemberNavbar />
      <MemberLayout>{children}</MemberLayout>
    </>
  );
}

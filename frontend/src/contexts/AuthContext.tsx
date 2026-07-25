import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/data/mockData";
import {
  applicationToMember,
  fetchMyMembershipApplicationForUser,
  tryInsertMembershipFromSignupMetadata,
} from "@/lib/supabase/applicationsApi";
import { memberSignInErrorMessage } from "@/lib/authMessages";
import { isCorruptAuthSessionError } from "@/lib/supabase/authErrors";
import { checkSubscriptionStatus } from "@/lib/api/subscriptionApi";

type SubscriptionStatus = "pending" | "active" | "rejected" | "expired" | "none";

interface AuthState {
  authReady: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  member: Member | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  /** Re-load member/admin state from the current Supabase session (e.g. after registration completes). */
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAdmin: () => Promise<void>;
  /** Fetched once per member session and shared everywhere, so pages don't each re-fetch and flash a "locked" state on load. */
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected) return false;
  return email.toLowerCase() === expected.toLowerCase();
}

function applyAdminFromSession(session: Session | null, setIsAdmin: (v: boolean) => void) {
  setIsAdmin(isAdminEmail(session?.user?.email));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const applySession = useCallback(async (session: Session | null) => {
    applyAdminFromSession(session, setIsAdmin);
    if (!session?.user) {
      setIsLoggedIn(false);
      setMember(null);
      return;
    }

    if (isAdminEmail(session.user.email)) {
      setIsLoggedIn(false);
      setMember(null);
      return;
    }

    try {
      let app = await fetchMyMembershipApplicationForUser(session.user.id);
      if (!app) {
        await tryInsertMembershipFromSignupMetadata(session);
        app = await fetchMyMembershipApplicationForUser(session.user.id);
      }
      if (!app) {
        setIsLoggedIn(false);
        setMember(null);
        return;
      }
      if (app.status !== "approved") {
        await createClient().auth.signOut();
        setIsLoggedIn(false);
        setMember(null);
        setIsAdmin(false);
        return;
      }
      setMember(applicationToMember(app));
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
      setMember(null);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error && isCorruptAuthSessionError(error)) {
      await supabase.auth.signOut();
      await applySession(null);
      return;
    }
    await applySession(data.session);
  }, [applySession]);

  const refreshSubscription = useCallback(async () => {
    if (!member?.email) {
      setIsSubscribed(false);
      setSubscriptionStatus("none");
      setSubscriptionLoading(false);
      return;
    }
    setSubscriptionLoading(true);
    const sub = await checkSubscriptionStatus(member.email);
    setIsSubscribed(sub.isSubscribed);
    setSubscriptionStatus(sub.status);
    setSubscriptionLoading(false);
  }, [member?.email]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error && isCorruptAuthSessionError(error)) {
        await supabase.auth.signOut();
        await applySession(null);
      } else {
        await applySession(data.session);
      }
      if (!cancelled) setAuthReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
      if (expected && email.trim().toLowerCase() === expected.toLowerCase()) {
        return { ok: false, message: "Use the admin login page for this account." };
      }
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        return {
          ok: false,
          message: memberSignInErrorMessage(error, "Could not sign you in. Try again."),
        };
      }
      if (!data.session) {
        return {
          ok: false,
          message:
            "Please confirm your email using the link we sent you when you registered, then try signing in again.",
        };
      }

      await applySession(data.session);

      let app;
      try {
        app = await fetchMyMembershipApplicationForUser(data.session.user.id);
      } catch (e) {
        await supabase.auth.signOut();
        await applySession(null);
        const msg = e instanceof Error ? e.message : "Could not load your member profile.";
        return { ok: false, message: msg || "Could not verify your account. Try again." };
      }

      if (!app || app.status !== "approved") {
        await supabase.auth.signOut();
        await applySession(null);
        if (!app) {
          return {
            ok: false,
            message:
              "We could not find your member profile for this account. Try registering again with the same email, or use a different email if that address is already taken.",
          };
        }
        return { ok: false, message: "Your membership is not active. Contact support if you need help." };
      }

      return { ok: true };
    },
    [applySession],
  );

  const adminLogin = useCallback(
    async (email: string, password: string) => {
      const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
      if (!expected) {
        return { ok: false, message: "NEXT_PUBLIC_ADMIN_EMAIL is not set in the environment." };
      }
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { ok: false, message: error?.message ?? "Invalid email or password." };
      }
      if (data.user.email?.toLowerCase() !== expected.toLowerCase()) {
        await supabase.auth.signOut();
        return { ok: false, message: "This account is not authorized as admin." };
      }
      await applySession(data.session);
      return { ok: true };
    },
    [applySession],
  );

  const logoutAdmin = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsLoggedIn(false);
    setMember(null);
  }, []);

  const logout = useCallback(async () => {
    await createClient().auth.signOut();
    setIsLoggedIn(false);
    setMember(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authReady,
        isLoggedIn,
        isAdmin,
        member,
        login,
        adminLogin,
        refreshAuth,
        logout,
        logoutAdmin,
        isSubscribed,
        subscriptionStatus,
        subscriptionLoading,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

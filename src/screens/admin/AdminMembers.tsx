import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { fetchMembershipApplications } from "@/lib/supabase/applicationsApi";

function formatJoined(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function AdminMembersPage() {
  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ["membership-applications"],
    queryFn: fetchMembershipApplications,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message || "Failed to load members");
  }, [error]);

  const approved = apps.filter(a => a.status === "approved");

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Members who completed registration (auto-approved). Order totals will appear here when orders are connected to members.
            </p>
          </div>
          <Link href="/admin/applications" className="text-sm font-medium text-primary hover:underline shrink-0">
            Review applications →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading members…</p>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">WhatsApp</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">City</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Business</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {approved.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No members yet. New sellers appear here after they{" "}
                      <Link href="/apply" className="text-primary underline">
                        register
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  approved.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell max-w-[220px] truncate">
                        {m.email || "—"}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground hidden md:table-cell">+92{m.whatsapp}</td>
                      <td className="p-3">{m.city}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {m.businessName}
                      </td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{formatJoined(m.appliedAt)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-pill text-xs bg-success/10 text-success">active</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

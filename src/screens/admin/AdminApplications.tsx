import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import type { Application } from "@/data/mockData";
import {
  fetchMembershipApplications,
  updateApplicationStatus,
} from "@/lib/supabase/applicationsApi";

const tabs = ["Pending", "Approved", "Rejected"] as const;

export default function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);

  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ["membership-applications"],
    queryFn: fetchMembershipApplications,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message || "Failed to load applications");
  }, [error]);

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      updateApplicationStatus(id, status),
    onSuccess: () => {
      toast.success("Application updated");
      void queryClient.invalidateQueries({ queryKey: ["membership-applications"] });
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = apps
    .filter(a => a.status === activeTab.toLowerCase())
    .filter(
      a =>
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.whatsapp.includes(search) ||
        a.city.toLowerCase().includes(search.toLowerCase()) ||
        (a.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
    );

  const counts = {
    Pending: apps.filter(a => a.status === "pending").length,
    Approved: apps.filter(a => a.status === "approved").length,
    Rejected: apps.filter(a => a.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        <h1 className="font-heading font-bold text-2xl">Membership Applications</h1>
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`h-9 px-4 rounded-pill text-sm font-medium ${
                activeTab === t ? "bg-primary text-primary-foreground" : "border border-border"
              }`}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, WhatsApp, city..."
          className="w-full max-w-md h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">WhatsApp</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">City</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Sells on</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Volume</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No applications in this tab. New registrations from{" "}
                      <span className="font-mono text-foreground">/apply</span> appear here after you run the Supabase
                      migration.
                    </td>
                  </tr>
                ) : (
                  filtered.map(a => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                        {a.email || "—"}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground hidden md:table-cell">+92{a.whatsapp}</td>
                      <td className="p-3">{a.city}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{a.sellsWhere.join(", ")}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{a.monthlyVolume}</td>
                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          {a.status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={mutation.isPending}
                                onClick={() => mutation.mutate({ id: a.id, status: "approved" })}
                                className="h-7 px-3 rounded bg-success text-primary-foreground text-xs disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={mutation.isPending}
                                onClick={() => mutation.mutate({ id: a.id, status: "rejected" })}
                                className="h-7 px-3 rounded bg-danger text-primary-foreground text-xs disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelected(a)}
                            className="h-7 px-3 rounded border border-border text-xs hover:bg-muted"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {selected &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-[2px]"
                aria-hidden
                onClick={() => setSelected(null)}
              />
              <div className="fixed inset-0 z-[110] flex justify-end pointer-events-none">
                <div
                  className="pointer-events-auto h-full w-full max-w-md bg-card shadow-2xl flex flex-col border-l border-border"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="app-detail-title"
                >
                  <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                    <h2 id="app-detail-title" className="font-heading font-bold text-xl">
                      {selected.name}
                    </h2>
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-muted text-sm"
                      onClick={() => setSelected(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3 text-sm">
                    <p>
                      <strong>Email:</strong> {selected.email || "—"}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> +92{selected.whatsapp}
                    </p>
                    <p>
                      <strong>City:</strong> {selected.city}
                    </p>
                    <p>
                      <strong>Business:</strong> {selected.businessName}
                    </p>
                    <p>
                      <strong>Sells:</strong> {selected.sellsWhat.join(", ")}
                    </p>
                    <p>
                      <strong>Channels:</strong> {selected.sellsWhere.join(", ")}
                    </p>
                    <p>
                      <strong>Volume:</strong> {selected.monthlyVolume}
                    </p>
                    <p>
                      <strong>Source:</strong> {selected.heardFrom || "—"}
                    </p>
                    <p>
                      <strong>Applied:</strong> {new Date(selected.appliedAt).toLocaleString()}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span className="capitalize">{selected.status}</span>
                    </p>
                  </div>
                  {selected.status === "pending" && (
                    <div className="p-6 border-t border-border flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ id: selected.id, status: "approved" })}
                        className="flex-1 h-10 rounded-lg bg-success text-primary-foreground font-semibold disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ id: selected.id, status: "rejected" })}
                        className="flex-1 h-10 rounded-lg bg-danger text-primary-foreground font-semibold disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>,
            document.body,
          )}
      </div>
    </AdminLayout>
  );
}

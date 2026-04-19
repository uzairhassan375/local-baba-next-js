import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { cities } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Blast, BlastPayload, BlastStatus } from "@/lib/supabase/blastsApi";
import {
  fetchAdminBlasts,
  insertBlast,
  updateBlast,
  deleteBlast,
} from "@/lib/supabase/blastsApi";

const CITY_OPTIONS = cities.filter(c => c !== "Other");
const STATUS_TABS = ["all", "draft", "published", "archived"] as const;

type BlastForm = {
  title: string;
  body: string;
  targetCities: string[];
  status: BlastStatus;
  sortOrder: string;
};

function emptyForm(): BlastForm {
  return {
    title: "",
    body: "",
    targetCities: [],
    status: "draft",
    sortOrder: "0",
  };
}

function blastToForm(b: Blast): BlastForm {
  return {
    title: b.title,
    body: b.body,
    targetCities: [...b.targetCities],
    status: b.status,
    sortOrder: String(b.sortOrder ?? 0),
  };
}

function formToPayload(f: BlastForm): BlastPayload {
  return {
    title: f.title.trim(),
    body: f.body.trim(),
    target_cities: f.targetCities,
    status: f.status,
    sort_order: Number(f.sortOrder) || 0,
  };
}

function statusBadge(status: BlastStatus) {
  const map: Record<BlastStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-success/15 text-success",
    archived: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-pill text-xs font-medium capitalize ${map[status]}`}>{status}</span>
  );
}

export default function AdminBlastsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlastForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Blast | null>(null);

  const { data: blasts = [], isLoading, error } = useQuery({
    queryKey: ["admin-blasts"],
    queryFn: fetchAdminBlasts,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message || "Failed to load blasts");
  }, [error]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-blasts"] });
    void queryClient.invalidateQueries({ queryKey: ["blasts-published"] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (b: Blast) => {
    setEditingId(b.id);
    setForm(blastToForm(b));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (vars: { id: string | null; form: BlastForm }) => {
      const payload = formToPayload(vars.form);
      if (!payload.body) throw new Error("Message body is required.");
      if (vars.id) return updateBlast(vars.id, payload);
      return insertBlast(payload);
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.id ? "Blast updated" : "Blast created");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlast(id),
    onSuccess: () => {
      toast.success("Blast deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, blast, status }: { id: string; blast: Blast; status: BlastStatus }) =>
      updateBlast(id, {
        title: blast.title,
        body: blast.body,
        target_cities: blast.targetCities,
        status,
        sort_order: blast.sortOrder,
      }),
    onSuccess: (_, v) => {
      const msg =
        v.status === "published"
          ? "Published to members"
          : v.status === "draft"
            ? "Moved to draft"
            : "Archived";
      toast.success(msg);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCity = (c: string) => {
    setForm(f => ({
      ...f,
      targetCities: f.targetCities.includes(c) ? f.targetCities.filter(x => x !== c) : [...f.targetCities, c],
    }));
  };

  const filtered =
    tab === "all" ? blasts : blasts.filter(b => b.status === tab);

  const handleSaveDialog = () => {
    if (!form.body.trim()) {
      toast.error("Message body is required");
      return;
    }
    saveMutation.mutate({ id: editingId, form });
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" />
              Announcements (Blasts)
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Create and publish messages for your members. They appear on the member dashboard. Leave cities empty to
              target everyone; otherwise only members in those cities see the blast.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus size={18} /> New blast
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 px-4 rounded-pill text-sm font-medium capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"
              }`}
            >
              {t} {t === "all" ? `(${blasts.length})` : `(${blasts.filter(b => b.status === t).length})`}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-card border border-border overflow-x-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading blasts…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No blasts in this view. Create one or run the Supabase migration for <code className="text-xs">blasts</code>.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Preview</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Cities</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Updated</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium max-w-[180px] truncate">{b.title || "(no title)"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell max-w-[240px] truncate">
                      {b.body.replace(/\s+/g, " ").slice(0, 80)}
                      {b.body.length > 80 ? "…" : ""}
                    </td>
                    <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs">
                      {b.targetCities.length === 0 ? "All cities" : b.targetCities.join(", ")}
                    </td>
                    <td className="p-3">{statusBadge(b.status)}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(b.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {b.status === "draft" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={setStatusMutation.isPending}
                              onClick={() => setStatusMutation.mutate({ id: b.id, blast: b, status: "published" })}
                            >
                              Publish
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={setStatusMutation.isPending}
                              onClick={() => setStatusMutation.mutate({ id: b.id, blast: b, status: "archived" })}
                            >
                              Archive
                            </Button>
                          </>
                        )}
                        {b.status === "published" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={setStatusMutation.isPending}
                              onClick={() => setStatusMutation.mutate({ id: b.id, blast: b, status: "draft" })}
                            >
                              Unpublish
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={setStatusMutation.isPending}
                              onClick={() => setStatusMutation.mutate({ id: b.id, blast: b, status: "archived" })}
                            >
                              Archive
                            </Button>
                          </>
                        )}
                        {b.status === "archived" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={setStatusMutation.isPending}
                            onClick={() => setStatusMutation.mutate({ id: b.id, blast: b, status: "draft" })}
                          >
                            Restore draft
                          </Button>
                        )}
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => openEdit(b)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive"
                          onClick={() => setDeleteTarget(b)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit blast" : "New blast"}</DialogTitle>
              <DialogDescription>
                Published blasts appear on member dashboards (filtered by city when cities are selected).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>Title (optional)</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Thursday drop is live"
                />
              </div>
              <div className="grid gap-2">
                <Label>Message *</Label>
                <Textarea
                  rows={6}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value.slice(0, 2000) }))}
                  placeholder="Full message shown to members…"
                />
                <p className="text-xs text-muted-foreground">{form.body.length} / 2000</p>
              </div>
              <div className="grid gap-2">
                <Label>Audience — cities (empty = all members)</Label>
                <div className="flex flex-wrap gap-2">
                  {CITY_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCity(c)}
                      className={`h-8 px-3 rounded-pill text-xs border ${
                        form.targetCities.includes(c)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as BlastStatus }))}
                  >
                    <option value="draft">Draft (not on member dashboard)</option>
                    <option value="published">Published (visible to members)</option>
                    <option value="archived">Archived (hidden from members)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Sort priority</Label>
                  <Input
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    inputMode="numeric"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-muted-foreground">Higher shows first when multiple are published.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveDialog} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editingId ? "Save changes" : "Create blast"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this blast?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes “{deleteTarget?.title || deleteTarget?.body.slice(0, 40)}…”. Members will no longer
                see it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

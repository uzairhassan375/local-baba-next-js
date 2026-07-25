import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutTemplate, Search, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProductMedia } from "@/components/ProductMedia";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@/data/mockData";
import {
  fetchAdminProductsFromDb,
  patchProductLanding,
} from "@/lib/supabase/productsApi";

export default function AdminLandingProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "selected">("all");
  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["landing-products"] });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => (statusFilter === "selected" ? p.showOnLanding : true))
      .filter(p =>
        q === ""
          ? true
          : p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (a.showOnLanding !== b.showOnLanding) return a.showOnLanding ? -1 : 1;
        return (b.landingSort ?? 0) - (a.landingSort ?? 0);
      });
  }, [products, search, statusFilter]);

  const selectedCount = products.filter(p => p.showOnLanding).length;
  const activeSelected = products.filter(p => p.showOnLanding && p.status === "active").length;

  const toggleLanding = async (p: Product, next: boolean) => {
    setSavingId(p.id);
    try {
      await patchProductLanding(p.id, next, p.landingSort ?? 0);
      toast.success(next ? `"${p.name}" added to landing` : `"${p.name}" removed from landing`);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const commitSort = async (p: Product) => {
    const raw = sortDrafts[p.id];
    if (raw === undefined) return;
    const next = Number(raw);
    if (!Number.isFinite(next)) {
      toast.error("Sort must be a number");
      return;
    }
    if (next === (p.landingSort ?? 0)) {
      setSortDrafts(prev => {
        const clone = { ...prev };
        delete clone[p.id];
        return clone;
      });
      return;
    }
    setSavingId(p.id);
    try {
      await patchProductLanding(p.id, p.showOnLanding ?? false, next);
      toast.success(`Sort updated for "${p.name}"`);
      setSortDrafts(prev => {
        const clone = { ...prev };
        delete clone[p.id];
        return clone;
      });
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <LayoutTemplate size={18} />
              <span className="section-label">LANDING PAGE</span>
            </div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl">Curate landing products</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Choose which products show in the &ldquo;Trending Drop&rdquo; grid on the public
              landing page. Higher sort values appear first. Only <strong>active</strong> products
              will render publicly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="border border-border bg-card px-4 py-2 text-sm">
              <span className="text-muted-foreground">Selected: </span>
              <span className="font-heading font-bold">{selectedCount}</span>
              <span className="text-muted-foreground"> · Live: </span>
              <span className="font-heading font-bold text-primary">{activeSelected}</span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-mono uppercase tracking-widest hover:border-primary hover:text-primary"
            >
              <ExternalLink size={14} />
              Preview
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, category or SKU"
              className="pl-9"
            />
          </div>
          <div className="inline-flex border border-border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-widest ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              All products
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("selected")}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-widest border-l border-border ${
                statusFilter === "selected"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Selected only
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border bg-card rounded-md overflow-hidden">
          <div className="grid grid-cols-[56px_1fr_120px_120px_120px_100px] items-center gap-3 px-4 py-3 border-b border-border bg-muted/40 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span />
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Sort</span>
            <span className="text-right">On landing</span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No products match your filter.
            </div>
          ) : (
            filtered.map(p => {
              const draftSort = sortDrafts[p.id];
              const sortValue = draftSort !== undefined ? draftSort : String(p.landingSort ?? 0);
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[56px_1fr_120px_120px_120px_100px] items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 ${
                    p.showOnLanding ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                    <ProductMedia
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.showOnLanding && (
                        <Star size={12} className="text-primary fill-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                      {p.sku} ·{" "}
                      <span
                        className={
                          p.status === "active"
                            ? "text-success"
                            : p.status === "sold_out"
                              ? "text-danger"
                              : "text-muted-foreground"
                        }
                      >
                        {p.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{p.category}</div>
                  <div className="text-sm">
                    Rs {p.pricePerPc.toLocaleString()}
                    <span className="text-muted-foreground text-xs">/pc</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={sortValue}
                      onChange={e =>
                        setSortDrafts(prev => ({ ...prev, [p.id]: e.target.value }))
                      }
                      onBlur={() => commitSort(p)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitSort(p);
                        }
                      }}
                      className="h-8 w-20 text-sm"
                      disabled={savingId === p.id}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Checkbox
                      checked={p.showOnLanding ?? false}
                      onCheckedChange={val => {
                        void toggleLanding(p, Boolean(val));
                      }}
                      disabled={savingId === p.id}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Tip: the public landing page shows up to 12 selected products, sorted by highest &ldquo;
          sort&rdquo; value first.
        </p>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";

import { AdminLayout } from "@/components/layout/AdminLayout";
import type { Product } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminProductsFromDb, patchProductPriceAndMoq } from "@/lib/supabase/productsApi";

function parsePricing(priceStr: string, moqStr: string): { ok: true; pricePerPc: number; moq: number } | { ok: false; message: string } {
  const pricePerPc = Number(priceStr.trim());
  const moqNum = Number(moqStr.trim());
  if (!Number.isFinite(pricePerPc) || pricePerPc <= 0) {
    return { ok: false, message: "Enter a valid price greater than zero." };
  }
  if (!Number.isFinite(moqNum) || moqNum < 1 || !Number.isInteger(moqNum)) {
    return { ok: false, message: "MOQ must be a whole number of at least 1." };
  }
  return { ok: true, pricePerPc, moq: moqNum };
}

type Override = { price: string; moq: string };

export default function AdminProductsBulkPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message || "Failed to load products");
  }, [error]);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const setOverride = useCallback((id: string, field: keyof Override, value: string) => {
    setOverrides(prev => {
      const p = productById.get(id);
      if (!p) return prev;
      const base = prev[id] ?? { price: String(p.pricePerPc), moq: String(p.moq) };
      return { ...prev, [id]: { ...base, [field]: value } };
    });
  }, [productById]);

  const resetRow = (id: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const resetAll = () => setOverrides({});

  const getDisplay = (p: Product): Override => {
    const o = overrides[p.id];
    return o ?? { price: String(p.pricePerPc), moq: String(p.moq) };
  };

  const isRowDirty = (p: Product) => {
    const d = getDisplay(p);
    return d.price !== String(p.pricePerPc) || d.moq !== String(p.moq);
  };

  const dirtyCount = useMemo(
    () =>
      products.filter(p => {
        const o = overrides[p.id];
        const priceStr = o?.price ?? String(p.pricePerPc);
        const moqStr = o?.moq ?? String(p.moq);
        return priceStr !== String(p.pricePerPc) || moqStr !== String(p.moq);
      }).length,
    [products, overrides],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [products, search]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["db-catalog-products"] });
    void queryClient.invalidateQueries({ queryKey: ["trending-this-week"] });
  };

  const handleSave = async () => {
    const toSave = products.filter(isRowDirty);
    if (toSave.length === 0) {
      toast.message("No changes to save.");
      return;
    }

    const parsed: { id: string; sku: string; pricePerPc: number; moq: number }[] = [];
    for (const p of toSave) {
      const d = getDisplay(p);
      const r = parsePricing(d.price, d.moq);
      if (!r.ok) {
        toast.error(`${p.sku}: ${r.message}`);
        return;
      }
      parsed.push({ id: p.id, sku: p.sku, pricePerPc: r.pricePerPc, moq: r.moq });
    }

    setSaving(true);
    const results = await Promise.allSettled(
      parsed.map(row => patchProductPriceAndMoq(row.id, row.pricePerPc, row.moq)),
    );
    const fulfilledIds = new Set(
      parsed.filter((_, i) => results[i].status === "fulfilled").map(row => row.id),
    );
    const failed = parsed.filter((_, i) => results[i].status === "rejected");
    setSaving(false);

    if (failed.length === 0) {
      toast.success(`Updated ${parsed.length} product${parsed.length === 1 ? "" : "s"}.`);
      resetAll();
      invalidate();
      return;
    }

    const ok = fulfilledIds.size;
    setOverrides(prev => {
      const next = { ...prev };
      for (const id of fulfilledIds) delete next[id];
      return next;
    });
    invalidate();

    if (ok > 0) {
      toast.warning(`Saved ${ok}; ${failed.length} failed: ${failed.map(f => f.sku).join(", ")}`);
    } else {
      toast.error(`Could not save: ${failed.map(f => f.sku).join(", ")}`);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-1"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to products
            </Link>
            <h1 className="font-heading font-bold text-2xl">Bulk price & MOQ</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Edit <strong className="text-foreground">price per piece</strong> and <strong className="text-foreground">MOQ</strong> for many
              SKUs at once. Only changed rows are saved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={resetAll} disabled={dirtyCount === 0 || saving}>
              <RotateCcw className="h-4 w-4 mr-2" aria-hidden />
              Discard all
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={dirtyCount === 0 || saving}>
              <Save className="h-4 w-4 mr-2" aria-hidden />
              {saving ? "Saving…" : `Save changes${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            placeholder="Search by SKU or product name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-md"
          />
          {dirtyCount > 0 && (
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground w-[22%]">SKU</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground w-[140px]">Price / pc (Rs)</th>
                  <th className="text-left p-3 font-medium text-muted-foreground w-[100px]">MOQ</th>
                  <th className="text-right p-3 font-medium text-muted-foreground w-[100px]"> </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No products match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const d = getDisplay(p);
                    const dirty = isRowDirty(p);
                    return (
                      <tr key={p.id} className={`border-b border-border last:border-0 ${dirty ? "bg-amber-500/[0.06]" : ""}`}>
                        <td className="p-3 font-mono text-xs align-middle whitespace-nowrap">{p.sku}</td>
                        <td className="p-3 align-middle min-w-[180px]">
                          <span className="line-clamp-2">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{p.status}</span>
                        </td>
                        <td className="p-2 align-middle">
                          <Input
                            inputMode="decimal"
                            className="h-9 font-mono text-sm"
                            value={d.price}
                            onChange={e => setOverride(p.id, "price", e.target.value)}
                            aria-label={`Price for ${p.sku}`}
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <Input
                            inputMode="numeric"
                            className="h-9 font-mono text-sm"
                            value={d.moq}
                            onChange={e => setOverride(p.id, "moq", e.target.value)}
                            aria-label={`MOQ for ${p.sku}`}
                          />
                        </td>
                        <td className="p-2 align-middle text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            disabled={!dirty || saving}
                            onClick={() => resetRow(p.id)}
                          >
                            Reset
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

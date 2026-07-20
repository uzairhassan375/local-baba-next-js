import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ImagePlus, ChevronUp, ChevronDown, Star, FileSpreadsheet, LayoutTemplate, Sparkles } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProductMedia } from "@/components/ProductMedia";
import type { Product } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AddProductByAI } from "@/screens/admin/AddProductByAI";
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
import {
  fetchAdminProductsFromDb,
  insertProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  productToPayload,
  slugify,
  patchProductLanding,
} from "@/lib/supabase/productsApi";
import { encodeCsv } from "@/lib/csv/simple";

const PRODUCT_CATEGORIES = ["Fashion", "Electronics", "Home", "Beauty", "Kids"];
const TAG_OPTIONS: Product["tags"][number][] = ["new", "hot", "featured", "low_stock"];

type VariantRow = { type: string; options: string };
type SpecRow = { label: string; value: string };

function emptyForm(): {
  name: string;
  slug: string;
  sku: string;
  category: string;
  pricePerPc: string;
  marketRate: string;
  moq: string;
  stock: string;
  status: Product["status"];
  tags: Product["tags"];
  description: string;
  sellerTipsText: string;
  showInTrending: boolean;
  trendingSort: string;
  showOnLanding: boolean;
  landingSort: string;
  catalogType: "standard" | "china";
  variants: VariantRow[];
  specs: SpecRow[];
  imageUrls: string[];
} {
  return {
    name: "",
    slug: "",
    sku: "",
    category: "Electronics",
    pricePerPc: "",
    marketRate: "",
    moq: "30",
    stock: "",
    status: "active",
    tags: ["hot"],
    description: "",
    sellerTipsText: "",
    showInTrending: true,
    trendingSort: "0",
    showOnLanding: false,
    landingSort: "0",
    catalogType: "standard",
    variants: [{ type: "Option", options: "" }],
    specs: [{ label: "", value: "" }],
    imageUrls: [],
  };
}

function productToForm(p: Product) {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    category: p.category,
    pricePerPc: String(p.pricePerPc),
    marketRate: String(p.marketRate),
    moq: String(p.moq),
    stock: String(p.stock),
    status: p.status,
    tags: [...p.tags],
    description: p.description,
    sellerTipsText: p.sellerTips.join("\n"),
    showInTrending: p.showInTrending ?? false,
    trendingSort: String(p.trendingSort ?? 0),
    showOnLanding: p.showOnLanding ?? false,
    landingSort: String(p.landingSort ?? 0),
    catalogType: p.catalogType ?? "standard",
    variants:
      p.variants.length > 0
        ? p.variants.map(v => ({ type: v.type, options: v.options.join(", ") }))
        : [{ type: "Option", options: "" }],
    specs: p.specs.length > 0 ? p.specs.map(s => ({ label: s.label, value: s.value })) : [{ label: "", value: "" }],
    imageUrls: [...p.images],
  };
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  /** Index in `pendingFiles` whose upload will become the cover (first image) on save; `null` = append order only. */
  const [pendingCoverIndex, setPendingCoverIndex] = useState<number | null>(null);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const pendingPreviewUrls = useMemo(() => pendingFiles.map(f => URL.createObjectURL(f)), [pendingFiles]);
  useEffect(() => {
    return () => {
      pendingPreviewUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [pendingPreviewUrls]);

  const { data: prods = [], isLoading, error } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message || "Failed to load products");
  }, [error]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["db-catalog-products"] });
    void queryClient.invalidateQueries({ queryKey: ["trending-this-week"] });
    void queryClient.invalidateQueries({ queryKey: ["landing-products"] });
  };

  const toggleLanding = async (p: Product) => {
    const next = !p.showOnLanding;
    try {
      await patchProductLanding(p.id, next, p.landingSort ?? 0);
      toast.success(next ? "Added to landing page" : "Removed from landing page");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const csvStockPriceMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/bulk-update-stock-price", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = (await res.json()) as {
        updated?: number;
        notFound?: string[];
        totalInFile?: number;
        parseWarnings?: string[];
        updateErrors?: string[];
        error?: string;
        details?: string[];
      };
      if (!res.ok) {
        const msg =
          typeof body.error === "string"
            ? body.error
            : typeof body.details?.[0] === "string"
              ? body.details[0]
              : "CSV import failed";
        throw new Error(msg);
      }
      return body;
    },
    onSuccess: body => {
      const n = body.updated ?? 0;
      const missing = body.notFound?.length ?? 0;
      toast.success(`Updated ${n} product${n !== 1 ? "s" : ""} stock & price.`);
      if (missing > 0) {
        toast.message(`${missing} SKU${missing !== 1 ? "s were" : " was"} not found in Supabase`, {
          description: (body.notFound ?? []).slice(0, 8).join(", ") + (missing > 8 ? "…" : ""),
        });
      }
      const warns = [...(body.parseWarnings ?? []), ...(body.updateErrors ?? [])];
      if (warns.length) {
        toast.message("CSV notes", {
          description: warns.slice(0, 5).join(" · ") + (warns.length > 5 ? "…" : ""),
        });
      }
      setCsvFile(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "CSV import failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPendingFiles([]);
    setPendingCoverIndex(null);
    setImageUrlDraft("");
    setPanelOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm(productToForm(p));
    setPendingFiles([]);
    setPendingCoverIndex(null);
    setImageUrlDraft("");
    setPanelOpen(true);
  };

  const dismissProductPanel = useCallback(() => {
    setPendingFiles([]);
    setPendingCoverIndex(null);
    setPanelOpen(false);
  }, []);

  const setSavedImageAsCover = (index: number) => {
    if (index === 0) return;
    setPendingCoverIndex(null);
    setForm(f => {
      const url = f.imageUrls[index];
      if (!url) return f;
      return { ...f, imageUrls: [url, ...f.imageUrls.filter((_, i) => i !== index)] };
    });
  };

  const togglePendingAsCover = (index: number) => {
    setPendingCoverIndex(prev => (prev === index ? null : index));
  };

  const removeSavedImageAt = (index: number) => {
    setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) }));
  };

  const moveSavedImage = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    setForm(f => {
      if (next < 0 || next >= f.imageUrls.length) return f;
      const arr = [...f.imageUrls];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return { ...f, imageUrls: arr };
    });
  };

  const removePendingFileAt = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingCoverIndex(pc => {
      if (pc === null) return null;
      if (pc === index) return null;
      if (pc > index) return pc - 1;
      return pc;
    });
  };

  const addImageUrlFromDraft = () => {
    const u = imageUrlDraft.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      toast.error("Image URL must start with http:// or https://");
      return;
    }
    setForm(f => ({ ...f, imageUrls: [...f.imageUrls, u] }));
    setImageUrlDraft("");
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    const pricePerPc = Number(form.pricePerPc);
    const marketRate = Number(form.marketRate);
    const moq = Number(form.moq);
    const stock = Number(form.stock);
    if (!Number.isFinite(pricePerPc) || pricePerPc <= 0) {
      toast.error("Valid price per piece is required");
      return;
    }
    if (!Number.isFinite(marketRate) || marketRate <= 0) {
      toast.error("Valid market rate is required");
      return;
    }
    if (!Number.isFinite(moq) || moq < 1) {
      toast.error("MOQ must be at least 1");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Stock must be zero or more");
      return;
    }

    const slug = (form.slug.trim() || slugify(name)).toLowerCase();
    const variants = form.variants
      .filter(v => v.type.trim() && v.options.trim())
      .map(v => ({
        type: v.type.trim(),
        options: v.options.split(",").map(s => s.trim()).filter(Boolean),
      }));
    const specs = form.specs
      .filter(s => s.label.trim() || s.value.trim())
      .map(s => ({ label: s.label.trim(), value: s.value.trim() }));
    const sellerTips = form.sellerTipsText
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      let imageUrls = [...form.imageUrls];
      if (pendingFiles.length) {
        const uploaded = await uploadProductImages(pendingFiles);
        if (
          pendingCoverIndex !== null &&
          pendingCoverIndex >= 0 &&
          pendingCoverIndex < uploaded.length
        ) {
          const coverUrl = uploaded[pendingCoverIndex];
          const rest = uploaded.filter((_, i) => i !== pendingCoverIndex);
          imageUrls = [coverUrl, ...imageUrls, ...rest];
        } else {
          imageUrls = [...imageUrls, ...uploaded];
        }
      }
      if (imageUrls.length === 0) {
        toast.error("Add at least one image or video (URL or file upload)");
        setSaving(false);
        return;
      }

      const productShape = {
        slug,
        sku: form.sku.trim(),
        name: name.trim(),
        category: form.category,
        pricePerPc,
        marketRate,
        moq,
        stock,
        status: form.status,
        tags: form.tags,
        variants,
        images: imageUrls,
        description: form.description.trim(),
        specs,
        sellerTips,
        showInTrending: form.showInTrending,
        trendingSort: Number(form.trendingSort) || 0,
        showOnLanding: form.showOnLanding,
        landingSort: Number(form.landingSort) || 0,
        catalogType: form.catalogType,
      };

      const payload = productToPayload(productShape);

      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success("Product updated");
      } else {
        await insertProduct(payload);
        toast.success("Product created");
      }
      dismissProductPanel();
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage catalogue, “Trending this week”, and landing page picks. File uploads go to Bunny.net; only URLs are
              saved in Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-2">
              <Sparkles size={18} /> Add Product by AI
            </Button>
            <Button onClick={openAdd} className="gap-2">
              <Plus size={18} /> Add product
            </Button>
          </div>
        </div>

        <AddProductByAI open={aiOpen} onOpenChange={setAiOpen} onSaved={invalidate} />

        <div className="rounded-card border border-border bg-card p-4 md:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 space-y-1">
              <h2 className="font-heading font-semibold text-sm">Daily stock & price (CSV)</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use <strong className="text-foreground font-medium">Download catalogue CSV</strong> to export every
                product’s real SKU, stock, and price from the database, edit offline, then upload here again.
                Or build your own CSV: header row required with{" "}
                <code className="text-[11px] bg-muted px-1 rounded">sku</code>,{" "}
                <code className="text-[11px] bg-muted px-1 rounded">quantity</code> (or <code className="text-[11px] bg-muted px-1 rounded">stock</code>,{" "}
                <code className="text-[11px] bg-muted px-1 rounded">qty</code>), and{" "}
                <code className="text-[11px] bg-muted px-1 rounded">price</code> (or{" "}
                <code className="text-[11px] bg-muted px-1 rounded">price_per_pc</code>). Existing products are updated
                only; unknown SKUs are reported and skipped.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-xs max-w-full file:mr-2 file:text-xs file:border-0 file:bg-muted file:rounded file:px-2 file:py-1"
              onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                csvStockPriceMutation.isPending || isLoading || prods.length === 0
              }
              title={prods.length === 0 && !isLoading ? "No products in the catalogue yet." : undefined}
              onClick={() => {
                if (prods.length === 0) {
                  toast.error("No products to export yet.");
                  return;
                }
                const headers = [["sku", "quantity", "price"]];
                const sorted = [...prods].sort((a, b) => a.sku.localeCompare(b.sku));
                const dataRows = sorted.map(p => {
                  const stockRounded = Math.max(0, Math.round(Number(p.stock)));
                  const priceNum = Number(p.pricePerPc);
                  const priceStr = Number.isFinite(priceNum)
                    ? String(Math.round(priceNum * 100) / 100)
                    : "";
                  return [p.sku, String(stockRounded), priceStr];
                });
                const BOM = "\uFEFF";
                const csv = BOM + encodeCsv([...headers, ...dataRows]);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const day = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `stock-price-catalogue-${day}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported ${sorted.length} product${sorted.length !== 1 ? "s" : ""}.`);
              }}
            >
              Download catalogue CSV
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!csvFile || csvStockPriceMutation.isPending}
              onClick={() => csvFile && csvStockPriceMutation.mutate(csvFile)}
              className="gap-2"
            >
              {csvStockPriceMutation.isPending ? "Applying…" : "Apply CSV updates"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Trending</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Landing</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No products in Supabase yet. Add one or run the SQL migration in the Supabase dashboard.
                    </td>
                  </tr>
                ) : (
                  prods.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ProductMedia
                            src={p.images[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                      <td className="p-3 font-mono whitespace-nowrap">Rs {p.pricePerPc}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">
                        {p.showInTrending ? "Yes" : "No"}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <button
                          type="button"
                          onClick={() => void toggleLanding(p)}
                          title={p.showOnLanding ? "Remove from landing page" : "Show on landing page"}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-pill text-xs font-medium transition-colors ${
                            p.showOnLanding
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <LayoutTemplate size={12} />
                          {p.showOnLanding ? "On page" : "Add"}
                        </button>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-pill text-xs ${
                            p.status === "active"
                              ? "bg-success/10 text-success"
                              : p.status === "sold_out"
                                ? "bg-danger/10 text-danger"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(p)}>
                          <Pencil size={14} className="mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => setDeleteTarget(p)}>
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {panelOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-[2px]"
                aria-hidden
                onClick={() => !saving && dismissProductPanel()}
              />
              <div className="fixed inset-0 z-[110] flex justify-end pointer-events-none">
                <div
                  className="pointer-events-auto h-full w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-card shadow-2xl flex flex-col border-l border-border"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-product-panel-title"
                >
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <h2 id="admin-product-panel-title" className="font-heading font-bold text-xl">
                  {editingId ? "Edit product" : "New product"}
                </h2>
                <button type="button" className="p-2 rounded-lg hover:bg-muted" onClick={() => !saving && dismissProductPanel()} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
                </div>
                <div className="grid gap-2">
                  <Label>Slug (optional — generated from name if empty)</Label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
                </div>
                <div className="grid gap-2">
                  <Label>SKU (unique product code — leave blank to auto-generate)</Label>
                  <Input
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="e.g. TLB-ELC-10042"
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Price / pc (Rs)</Label>
                    <Input value={form.pricePerPc} onChange={e => setForm(f => ({ ...f, pricePerPc: e.target.value }))} inputMode="decimal" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Market rate (Rs)</Label>
                    <Input value={form.marketRate} onChange={e => setForm(f => ({ ...f, marketRate: e.target.value }))} inputMode="decimal" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>MOQ</Label>
                    <Input value={form.moq} onChange={e => setForm(f => ({ ...f, moq: e.target.value }))} inputMode="numeric" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stock</Label>
                    <Input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} inputMode="numeric" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Catalog</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.catalogType}
                    onChange={e => setForm(f => ({ ...f, catalogType: e.target.value as "standard" | "china" }))}
                  >
                    <option value="standard">Local catalog</option>
                    <option value="china">China catalog</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as Product["status"] }))}
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="sold_out">sold_out</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trend"
                      checked={form.showInTrending}
                      onCheckedChange={v => setForm(f => ({ ...f, showInTrending: v === true }))}
                    />
                    <Label htmlFor="trend" className="font-normal cursor-pointer">
                      Show in “Trending this week”
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Trending sort</Label>
                    <Input
                      className="w-20 h-9"
                      value={form.trendingSort}
                      onChange={e => setForm(f => ({ ...f, trendingSort: e.target.value }))}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="landing"
                      checked={form.showOnLanding}
                      onCheckedChange={v => setForm(f => ({ ...f, showOnLanding: v === true }))}
                    />
                    <Label htmlFor="landing" className="font-normal cursor-pointer">
                      Show on public landing page
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Landing sort</Label>
                    <Input
                      className="w-20 h-9"
                      value={form.landingSort}
                      onChange={e => setForm(f => ({ ...f, landingSort: e.target.value }))}
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground w-full">
                    Higher sort = shown first. Only active products appear on the homepage.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-4">
                    {TAG_OPTIONS.map(t => (
                      <label key={t} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                        <Checkbox
                          checked={form.tags.includes(t)}
                          onCheckedChange={checked => {
                            setForm(f => {
                              const on = checked === true;
                              const has = f.tags.includes(t);
                              if (on && !has) return { ...f, tags: [...f.tags, t] };
                              if (!on && has) return { ...f, tags: f.tags.filter(x => x !== t) };
                              return f;
                            });
                          }}
                        />
                        {t.replace("_", " ")}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Full product description"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Seller tips (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={form.sellerTipsText}
                    onChange={e => setForm(f => ({ ...f, sellerTipsText: e.target.value }))}
                    placeholder={"Tip one\nTip two"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Variants</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { type: "", options: "" }] }))}
                    >
                      Add variant
                    </Button>
                  </div>
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Type e.g. Color"
                        value={v.type}
                        onChange={e => {
                          const next = [...form.variants];
                          next[i] = { ...next[i], type: e.target.value };
                          setForm(f => ({ ...f, variants: next }));
                        }}
                      />
                      <Input
                        placeholder="Options, comma separated"
                        value={v.options}
                        onChange={e => {
                          const next = [...form.variants];
                          next[i] = { ...next[i], options: e.target.value };
                          setForm(f => ({ ...f, variants: next }));
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Specifications</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm(f => ({ ...f, specs: [...f.specs, { label: "", value: "" }] }))}
                    >
                      Add spec
                    </Button>
                  </div>
                  {form.specs.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Label"
                        value={s.label}
                        onChange={e => {
                          const next = [...form.specs];
                          next[i] = { ...next[i], label: e.target.value };
                          setForm(f => ({ ...f, specs: next }));
                        }}
                      />
                      <Input
                        placeholder="Value"
                        value={s.value}
                        onChange={e => {
                          const next = [...form.specs];
                          next[i] = { ...next[i], value: e.target.value };
                          setForm(f => ({ ...f, specs: next }));
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      <ImagePlus size={16} /> Product images & videos
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      The <strong className="text-foreground">cover</strong> image is the main catalogue photo. Use{" "}
                      <strong className="text-foreground">Set cover</strong> on any thumbnail, or reorder with the arrows.
                      New files upload when you save — you can mark a new upload as the next cover before saving.
                    </p>
                    {pendingCoverIndex !== null && pendingFiles.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-md px-2 py-1.5">
                        The highlighted new file will become the cover when you save.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {form.imageUrls.map((url, i) => (
                      <div
                        key={`saved-${i}-${url.slice(0, 48)}`}
                        className="relative w-[88px] h-[88px] rounded-lg border border-border bg-muted overflow-hidden shrink-0"
                      >
                        <ProductMedia src={url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary text-primary-foreground z-[1]">
                            Cover
                          </span>
                        )}
                        {i !== 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 z-[2] shadow-sm"
                            title="Set as catalogue cover"
                            onClick={() => setSavedImageAsCover(i)}
                          >
                            <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-400/80" />
                          </Button>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 bg-black/70 py-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7"
                            disabled={i === 0}
                            title="Move up"
                            onClick={() => moveSavedImage(i, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7"
                            disabled={i === form.imageUrls.length - 1}
                            title="Move down"
                            onClick={() => moveSavedImage(i, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            title="Remove image"
                            onClick={() => removeSavedImageAt(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingFiles.map((file, i) => (
                      <div
                        key={`pending-${i}-${file.name}-${file.size}`}
                        className="relative w-[88px] h-[88px] rounded-lg border border-dashed border-primary/50 bg-muted overflow-hidden shrink-0"
                      >
                        {file.type.startsWith("video/") ? (
                          <video
                            src={pendingPreviewUrls[i]}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover opacity-90"
                            aria-hidden
                          />
                        ) : (
                          <img
                            src={pendingPreviewUrls[i]}
                            alt=""
                            className="w-full h-full object-cover opacity-90"
                          />
                        )}
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-medium bg-primary/90 text-primary-foreground z-[1]">
                          {pendingCoverIndex === i ? "Cover" : "New"}
                        </span>
                        <div className="absolute top-1 right-1 flex gap-0.5 z-[2]">
                          <Button
                            type="button"
                            size="icon"
                            variant={pendingCoverIndex === i ? "default" : "secondary"}
                            className="h-6 w-6 shadow-sm"
                            title={
                              pendingCoverIndex === i
                                ? "Clear: this file will not be forced as cover on save"
                                : "Use this new file as the catalogue cover when you save"
                            }
                            onClick={() => togglePendingAsCover(i)}
                          >
                            <Star className={`h-3.5 w-3.5 ${pendingCoverIndex === i ? "fill-primary-foreground" : ""}`} />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6 shadow-sm"
                            title="Remove from upload queue"
                            onClick={() => removePendingFileAt(i)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="grid gap-1.5 flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Add media by URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={imageUrlDraft}
                          onChange={e => setImageUrlDraft(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addImageUrlFromDraft();
                            }
                          }}
                        />
                        <Button type="button" variant="secondary" onClick={addImageUrlFromDraft}>
                          Add
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-1.5 shrink-0 min-w-[200px]">
                      <Label className="text-xs text-muted-foreground">Upload files</Label>
                      <label
                        htmlFor="admin-product-image-upload"
                        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 px-4 py-3 cursor-pointer transition-colors hover:bg-primary/15 hover:border-primary/70 active:scale-[0.99]"
                      >
                        <ImagePlus className="h-5 w-5 text-primary" aria-hidden />
                        <span className="text-sm font-semibold text-primary">Choose files</span>
                        <span className="text-[11px] text-muted-foreground text-center leading-tight">
                          Images or videos (multiple allowed)
                        </span>
                        <input
                          id="admin-product-image-upload"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="sr-only"
                          onChange={e => {
                            const list = Array.from(e.target.files || []);
                            if (list.length) setPendingFiles(p => [...p, ...list]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <details className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                      Bulk paste media URLs (one per line)
                    </summary>
                    <Textarea
                      className="mt-2"
                      rows={4}
                      value={form.imageUrls.join("\n")}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          imageUrls: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder={"https://...\nhttps://..."}
                    />
                  </details>
                </div>
              </div>
              <div className="p-6 border-t border-border flex gap-3 shrink-0 bg-card">
                <Button className="flex-1" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving…" : "Save product"}
                </Button>
                <Button variant="outline" type="button" disabled={saving} onClick={() => dismissProductPanel()}>
                  Cancel
                </Button>
              </div>
                </div>
              </div>
            </>,
            document.body,
          )}

        <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete product?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes “{deleteTarget?.name}” from the database. This cannot be undone.
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

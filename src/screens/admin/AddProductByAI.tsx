"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { insertProduct, productToPayload, slugify } from "@/lib/supabase/productsApi";
import type { Product } from "@/data/mockData";
import { cn } from "@/lib/utils";

const PRODUCT_CATEGORIES = ["Fashion", "Electronics", "Home", "Beauty", "Kids"];
const TAG_OPTIONS: Product["tags"][number][] = ["new", "hot", "featured", "low_stock"];

type Step = "upload" | "loading" | "review";

type GenerateResponse = {
  originalImageUrl?: string;
  generatedImageUrls?: string[];
  imageErrors?: number;
  listingError?: string | null;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  key_features?: string[];
  suggested_attributes?: Record<string, string>;
  error?: string;
};

type ImageSlot = {
  id: string;
  url: string;
  /** Included when saving the product */
  keep: boolean;
  /** Marked to replace via Gemini regenerate */
  replace: boolean;
  isOriginal?: boolean;
};

type ReviewState = {
  images: ImageSlot[];
  title: string;
  description: string;
  category: string;
  marketingTags: string[];
  keyFeatures: string[];
  specs: { label: string; value: string }[];
  productTags: Product["tags"];
  pricePerPc: string;
  marketRate: string;
  stock: string;
  moq: string;
};

const emptyReview = (): ReviewState => ({
  images: [],
  title: "",
  description: "",
  category: "Electronics",
  marketingTags: [],
  keyFeatures: [],
  specs: [],
  productTags: ["new"],
  pricePerPc: "",
  marketRate: "",
  stock: "",
  moq: "30",
});

function mapCategory(raw: string | undefined): string {
  if (!raw?.trim()) return "Electronics";
  const exact = PRODUCT_CATEGORIES.find(c => c.toLowerCase() === raw.trim().toLowerCase());
  if (exact) return exact;
  const partial = PRODUCT_CATEGORIES.find(c => raw.toLowerCase().includes(c.toLowerCase()));
  return partial ?? raw.trim();
}

function ChipEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some(x => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {values.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
          >
            {tag}
            <button
              type="button"
              className="opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(values.filter(t => t !== tag))}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function AddProductByAI({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Uploading image...");
  const [review, setReview] = useState<ReviewState>(emptyReview);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [genNote, setGenNote] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewUrl(null);
    setOriginalImageUrl(null);
    setLoadingMessage("Uploading image...");
    setReview(emptyReview());
    setSaving(false);
    setRegenerating(false);
    setGenNote(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (step !== "loading") return;
    const messages = ["Uploading image...", "Generating images with Gemini...", "Writing description with Gemini..."];
    let i = 0;
    setLoadingMessage(messages[0]);
    const id = window.setInterval(() => {
      i = Math.min(i + 1, messages.length - 1);
      setLoadingMessage(messages[i]);
    }, 4500);
    return () => window.clearInterval(id);
  }, [step]);

  const canGenerate = Boolean(file) && step === "upload";
  const keptCount = review.images.filter(img => img.keep).length;
  const replaceCount = review.images.filter(img => img.replace).length;

  const onPickFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10MB or smaller");
      return;
    }
    setFile(next);
  };

  const runGenerate = async () => {
    if (!file) return;
    setStep("loading");
    setGenNote(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/admin/generate-listing", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as GenerateResponse;
      if (!res.ok) {
        throw new Error(body.error || "Generation failed");
      }

      const slots: ImageSlot[] = [];
      if (body.originalImageUrl) {
        setOriginalImageUrl(body.originalImageUrl);
        slots.push({
          id: crypto.randomUUID(),
          url: body.originalImageUrl,
          keep: true,
          replace: false,
          isOriginal: true,
        });
      }
      for (const url of body.generatedImageUrls ?? []) {
        slots.push({
          id: crypto.randomUUID(),
          url,
          keep: true,
          replace: false,
        });
      }
      if (!slots.length) {
        throw new Error("No images were returned");
      }

      const notes: string[] = [];
      if (body.imageErrors) notes.push(`${body.imageErrors} generated image(s) failed`);
      if (body.listingError) notes.push("Listing copy failed — fill fields manually");
      setGenNote(notes.length ? notes.join(". ") : null);

      const specs = Object.entries(body.suggested_attributes ?? {}).map(([label, value]) => ({
        label,
        value: String(value),
      }));

      setReview({
        images: slots,
        title: body.title?.trim() || "",
        description: body.description?.trim() || "",
        category: mapCategory(body.category),
        marketingTags: body.tags ?? [],
        keyFeatures: body.key_features ?? [],
        specs,
        productTags: ["new"],
        pricePerPc: "",
        marketRate: "",
        stock: "",
        moq: "30",
      });
      setStep("review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
      setStep("upload");
    }
  };

  const discardUnselected = () => {
    setReview(r => ({
      ...r,
      images: r.images.filter(img => img.keep).map(img => ({ ...img, replace: false })),
    }));
  };

  const regenerateMarked = async () => {
    const marked = review.images.filter(img => img.replace);
    if (!marked.length) {
      toast.error("Mark images to regenerate (refresh icon), or unselect ones you don’t want and mark those");
      return;
    }
    if (!file && !originalImageUrl) {
      toast.error("Missing original reference image");
      return;
    }

    setRegenerating(true);
    try {
      const form = new FormData();
      form.append("count", String(marked.length));
      if (file) form.append("image", file);
      else if (originalImageUrl) form.append("referenceUrl", originalImageUrl);

      const res = await fetch("/api/admin/regenerate-images", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        urls?: string[];
        imageErrors?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "Regeneration failed");

      const newUrls = body.urls ?? [];
      if (!newUrls.length) throw new Error("No new images returned");

      let cursor = 0;
      setReview(r => ({
        ...r,
        images: r.images.map(img => {
          if (!img.replace) return img;
          const nextUrl = newUrls[cursor++];
          if (!nextUrl) return { ...img, replace: false };
          return {
            ...img,
            id: crypto.randomUUID(),
            url: nextUrl,
            keep: true,
            replace: false,
            isOriginal: false,
          };
        }),
      }));

      if (body.imageErrors) {
        toast.message(`Regenerated with ${body.imageErrors} failure(s)`);
      } else {
        toast.success(`Replaced ${Math.min(marked.length, newUrls.length)} image(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const set = new Set(PRODUCT_CATEGORIES);
    if (review.category && !set.has(review.category)) {
      return [review.category, ...PRODUCT_CATEGORIES];
    }
    return PRODUCT_CATEGORIES;
  }, [review.category]);

  const save = async (status: "draft" | "active") => {
    const name = review.title.trim();
    if (!name) {
      toast.error("Title is required");
      return;
    }
    const keptImages = review.images.filter(img => img.keep).map(img => img.url);
    if (!keptImages.length) {
      toast.error("Select at least one image to keep");
      return;
    }
    const pricePerPc = Number(review.pricePerPc);
    const marketRateRaw = review.marketRate.trim();
    const marketRate = marketRateRaw ? Number(marketRateRaw) : pricePerPc;
    const stock = Number(review.stock);
    const moq = Number(review.moq);
    if (!Number.isFinite(pricePerPc) || pricePerPc <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (!Number.isFinite(marketRate) || marketRate <= 0) {
      toast.error("Enter a valid market rate (or leave blank to match price)");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Enter a valid quantity / stock");
      return;
    }
    if (!Number.isFinite(moq) || moq < 1) {
      toast.error("MOQ must be at least 1");
      return;
    }

    const sellerTips = [
      ...review.keyFeatures.map(s => s.trim()).filter(Boolean),
      ...review.marketingTags.map(s => s.trim()).filter(Boolean),
    ];
    const specs = review.specs
      .filter(s => s.label.trim() || s.value.trim())
      .map(s => ({ label: s.label.trim(), value: s.value.trim() }));

    setSaving(true);
    try {
      const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
      const payload = productToPayload({
        slug,
        name,
        category: review.category || "Electronics",
        pricePerPc,
        marketRate,
        moq,
        stock,
        status,
        tags: review.productTags,
        variants: [],
        images: keptImages,
        description: review.description.trim(),
        specs,
        sellerTips,
        showInTrending: false,
        trendingSort: 0,
        showOnLanding: false,
        landingSort: 0,
        catalogType: "standard",
      });
      await insertProduct(payload);
      toast.success(status === "draft" ? "Saved as draft" : "Product published");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add product by AI
          </DialogTitle>
          <DialogDescription>
            Upload one product photo. Gemini generates extra angles and the listing copy — pick which images to keep,
            regenerate any you don’t like, then set price &amp; quantity.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center hover:bg-muted/50 transition"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Selected product" className="mx-auto max-h-56 rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium text-foreground">Drop or click to upload one image</span>
                  <span className="text-xs">PNG, JPG, or WebP · max 10MB</span>
                </div>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => onPickFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground truncate">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!canGenerate} onClick={() => void runGenerate()} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">{loadingMessage}</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Gemini generates 7 product angles in parallel and writes the title/description.
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            {genNote && (
              <p className="text-xs rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">
                {genNote}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Images — click to keep/discard · refresh to mark for regenerate</Label>
                <p className="text-xs text-muted-foreground">
                  Keeping {keptCount} · Marked {replaceCount}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {review.images.map((img, index) => (
                  <div
                    key={img.id}
                    className={cn(
                      "relative rounded-lg border overflow-hidden bg-muted/30 aspect-square transition",
                      img.keep ? "border-primary ring-2 ring-primary/30" : "border-border opacity-45",
                      img.replace && "ring-2 ring-amber-400 border-amber-400",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Product ${index + 1}`}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() =>
                        setReview(r => ({
                          ...r,
                          images: r.images.map(x =>
                            x.id === img.id ? { ...x, keep: !x.keep, replace: x.keep ? x.replace : false } : x,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute top-1.5 left-1.5 rounded-full p-1 text-white",
                        img.keep ? "bg-primary" : "bg-black/50",
                      )}
                      aria-label={img.keep ? "Selected to keep" : "Discarded"}
                      onClick={() =>
                        setReview(r => ({
                          ...r,
                          images: r.images.map(x =>
                            x.id === img.id ? { ...x, keep: !x.keep, replace: !x.keep ? false : x.replace } : x,
                          ),
                        }))
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "absolute top-1.5 right-1.5 rounded-full p-1 text-white",
                        img.replace ? "bg-amber-500" : "bg-black/60",
                      )}
                      aria-label="Mark to regenerate"
                      title="Mark to regenerate"
                      onClick={() =>
                        setReview(r => ({
                          ...r,
                          images: r.images.map(x => (x.id === img.id ? { ...x, replace: !x.replace } : x)),
                        }))
                      }
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    {img.isOriginal && (
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                        Original
                      </span>
                    )}
                    {img.keep && index === review.images.findIndex(i => i.keep) && (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={regenerating || keptCount === review.images.length}
                  onClick={discardUnselected}
                >
                  Discard unselected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={regenerating || replaceCount === 0}
                  onClick={() => void regenerateMarked()}
                >
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate marked ({replaceCount})
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ai-title">Title</Label>
                <Input
                  id="ai-title"
                  value={review.title}
                  onChange={e => setReview(r => ({ ...r, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ai-desc">Description</Label>
                <Textarea
                  id="ai-desc"
                  rows={5}
                  value={review.description}
                  onChange={e => setReview(r => ({ ...r, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-category">Category</Label>
                <select
                  id="ai-category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={review.category}
                  onChange={e => setReview(r => ({ ...r, category: e.target.value }))}
                >
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Catalogue badges</Label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {TAG_OPTIONS.map(tag => (
                    <label key={tag} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={review.productTags.includes(tag)}
                        onChange={e =>
                          setReview(r => ({
                            ...r,
                            productTags: e.target.checked
                              ? [...r.productTags, tag]
                              : r.productTags.filter(t => t !== tag),
                          }))
                        }
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <ChipEditor
              label="Tags"
              values={review.marketingTags}
              onChange={marketingTags => setReview(r => ({ ...r, marketingTags }))}
              placeholder="Add tag and press Enter"
            />
            <ChipEditor
              label="Key features"
              values={review.keyFeatures}
              onChange={keyFeatures => setReview(r => ({ ...r, keyFeatures }))}
              placeholder="Add feature and press Enter"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ai-price">Price (Rs) *</Label>
                <Input
                  id="ai-price"
                  inputMode="decimal"
                  value={review.pricePerPc}
                  onChange={e => setReview(r => ({ ...r, pricePerPc: e.target.value }))}
                  placeholder="Required"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-market">Market rate (Rs)</Label>
                <Input
                  id="ai-market"
                  inputMode="decimal"
                  value={review.marketRate}
                  onChange={e => setReview(r => ({ ...r, marketRate: e.target.value }))}
                  placeholder="Defaults to price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-stock">Quantity / stock *</Label>
                <Input
                  id="ai-stock"
                  inputMode="numeric"
                  value={review.stock}
                  onChange={e => setReview(r => ({ ...r, stock: e.target.value }))}
                  placeholder="Required"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={saving || regenerating} onClick={() => setStep("upload")}>
                Start over
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || regenerating}
                onClick={() => void save("draft")}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
              </Button>
              <Button type="button" disabled={saving || regenerating} onClick={() => void save("active")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

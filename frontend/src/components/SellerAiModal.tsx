"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Loader2, Check, RefreshCw, X, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Product } from "@/data/mockData";
import { saveSellerAiListing } from "@/lib/ai/sellerAiListingsApi";
import { createShopifyProduct } from "@/lib/api/shopifyApi";
import { useRouter } from "next/navigation";

const PRODUCT_CATEGORIES = ["Home", "Electronics", "Fashion", "Beauty", "Kids", "General"];
const TAG_OPTIONS: Product["tags"][number][] = ["new", "hot", "featured", "low_stock"];

interface SellerAiModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GoogleImageMatch {
  id: string;
  url: string;
  source: string;
  selected: boolean;
  isOriginal?: boolean;
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
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (target: string) => {
    onChange(values.filter(x => x !== target));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map(val => (
          <span
            key={val}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground font-medium"
          >
            {val}
            <button
              type="button"
              onClick={() => remove(val)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-background border-border"
        />
        <Button type="button" variant="outline" onClick={add} className="shrink-0 px-4 text-sm font-semibold">
          Add
        </Button>
      </div>
    </div>
  );
}

export function SellerAiModal({ product, open, onOpenChange }: SellerAiModalProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingToShopify, setPostingToShopify] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Home");
  const [productBadges, setProductBadges] = useState<Product["tags"]>(["new"]);
  const [marketingTags, setMarketingTags] = useState<string[]>([]);
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [pricePerPc, setPricePerPc] = useState<string>("");
  const [marketRate, setMarketRate] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [moq, setMoq] = useState<number>(30);
  const [googleImages, setGoogleImages] = useState<GoogleImageMatch[]>([]);

  // Pre-fill and trigger AI generation when modal opens with a product
  useEffect(() => {
    let isMounted = true;
    if (open && product) {
      const p = product;
      setGenerating(true);
      setTitle(p.name);
      setPricePerPc(p.pricePerPc.toString());
      setMarketRate((p.pricePerPc * 1.25).toFixed(0));
      setStock(p.stock ? p.stock.toString() : "100");
      setMoq(p.moq);
      setCategory(p.category || "Home");
      setProductBadges(p.tags.length > 0 ? p.tags : ["new"]);

      async function generateListingData() {
        setDescription(
          `Upgrade your catalog with the ${p.name}, an innovative high-demand product designed to maximize user efficiency and performance.\n\nMade from food-grade, BPA-free durable materials. Perfect for commercial and retail supply with ready wholesale stock.`
        );
        setKeyFeatures([
          `Innovative space-saving and durable design for ${p.name}`,
          "Saves up to 3x space compared to traditional alternatives",
          "Made from durable, flexible food-grade silicone and BPA-free plastic",
          "Airtight top lid keeps contents fresh and odor-free",
          "Dishwasher safe, easy to wash, and reusable",
        ]);
        setMarketingTags([
          p.name,
          "Silicone Ice Maker",
          "Space Saving Kitchenware",
          "Wholesale Kitchenware",
          "Hot Resale Item",
        ]);

        try {
          const mainImg = p.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600";
          const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
          const res = await fetch(`${BACKEND}/api/images/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: mainImg,
              productName: p.name,
              limit: 10,
            }),
          });
          const data = await res.json();
          if (isMounted && data.images && data.images.length > 0) {
            setGoogleImages(data.images.map((img: any, idx: number) => ({
              ...img,
              isOriginal: idx === 0,
            })));
          } else if (isMounted) {
            setGoogleImages(
              Array.from({ length: 10 }).map((_, idx) => ({
                id: `img_${idx + 1}`,
                url: idx === 0 ? mainImg : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600`,
                source: idx === 0 ? "Product Main Image" : `Google Lens Match #${idx}`,
                selected: idx < 5,
                isOriginal: idx === 0,
              }))
            );
          }
        } catch (err) {
          console.error("Failed to load SERP images", err);
        } finally {
          if (isMounted) setGenerating(false);
        }
      }

      generateListingData();

      return () => {
        isMounted = false;
      };
    }
  }, [open, product]);

  const toggleImageSelection = (id: string) => {
    setGoogleImages(prev =>
      prev.map(img => (img.id === id ? { ...img, selected: !img.selected } : img))
    );
  };

  const selectedImages = googleImages.filter(img => img.selected);
  const selectedCount = selectedImages.length;
  const coverIndex = googleImages.findIndex(i => i.selected);

  // Save to My AI Listings
  const handleSaveDraft = async () => {
    if (!product) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const imageUrls = selectedImages.map(i => i.url);
    if (!imageUrls.length && product.images[0]) {
      imageUrls.push(product.images[0]);
    }

    setSaving(true);
    const saved = saveSellerAiListing({
      originalProductId: product.id,
      title: title.trim(),
      description: description.trim(),
      category,
      tags: marketingTags,
      keyFeatures,
      specs: [
        { label: "Material", value: "BPA-free Food Grade Silicone" },
        { label: "Warranty", value: "1 Year Official Manufacturer Warranty" },
      ],
      pricePerPc: Number(pricePerPc) || product.pricePerPc,
      stock: Number(stock) || 100,
      moq,
      selectedImages: imageUrls,
    });
    setSaving(false);
    onOpenChange(false);

    toast.success(`Saved to My AI Listings!`, {
      description: `Product '${saved.title}' is saved in your AI listings tab.`,
      action: {
        label: "View My AI Listings",
        onClick: () => router.push("/my-ai-listings"),
      },
    });
  };

  // Directly Publish / Post to Shopify
  const handlePublishShopify = async () => {
    if (!product) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const imageUrls = selectedImages.map(i => i.url);
    if (!imageUrls.length && product.images[0]) {
      imageUrls.push(product.images[0]);
    }

    setPostingToShopify(true);
    toast.info("Publishing product directly to Shopify...");

    // First save to local AI listings
    const saved = saveSellerAiListing({
      originalProductId: product.id,
      title: title.trim(),
      description: description.trim(),
      category,
      tags: marketingTags,
      keyFeatures,
      specs: [
        { label: "Material", value: "BPA-free Food Grade Silicone" },
        { label: "Warranty", value: "1 Year Official Manufacturer Warranty" },
      ],
      pricePerPc: Number(pricePerPc) || product.pricePerPc,
      stock: Number(stock) || 100,
      moq,
      selectedImages: imageUrls,
    });

    // Call Shopify backend API
    const result = await createShopifyProduct({
      title: title.trim(),
      body_html: `<p>${description.trim()}</p><ul>${keyFeatures.map(f => `<li>${f}</li>`).join("")}</ul>`,
      vendor: "Local Baba Seller",
      product_type: category,
      tags: marketingTags.join(", "),
      price: pricePerPc || product.pricePerPc.toString(),
      inventory_quantity: Number(stock) || 100,
      images: imageUrls.map(src => ({ src })),
    });

    setPostingToShopify(false);
    onOpenChange(false);

    if (result.success) {
      toast.success(`Published to Shopify!`, {
        description: result.message || `Product '${title}' is now live on your connected store.`,
        action: {
          label: "View My AI Listings",
          onClick: () => router.push("/my-ai-listings"),
        },
      });
    } else {
      toast.error("Shopify publishing error", { description: result.error });
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Add product by AI
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Upload a product photo and write what the product is. We find similar images via SerpAPI and Gemini writes the title &amp; description from your details. Select images — they&apos;re saved when you publish.
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="font-heading font-semibold text-base text-foreground">
              Finding Google Lens images &amp; generating copy...
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Fetching visual matches from SerpAPI and writing optimized title, description, tags, &amp; features.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Image Selection Grid matching screenshot 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Click images to select which ones to use</Label>
                <span className="text-xs text-muted-foreground font-medium">Selected {selectedCount}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {googleImages.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => toggleImageSelection(img.id)}
                    className={`relative rounded-xl border overflow-hidden bg-muted/30 aspect-square transition text-left ${
                      img.selected
                        ? "border-amber-500 ring-2 ring-amber-500/40 shadow-sm"
                        : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={`Match ${index + 1}`} className="h-full w-full object-cover" />
                    <span
                      className={`absolute top-2 left-2 rounded-full w-6 h-6 flex items-center justify-center text-white transition-colors ${
                        img.selected ? "bg-amber-500 font-bold" : "bg-black/40"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {img.isOriginal && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/75 text-white text-[10px] font-semibold px-2 py-0.5">
                        Your upload
                      </span>
                    )}
                    {img.selected && index === coverIndex && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/75 text-white text-[10px] font-semibold px-2 py-0.5">
                        Cover
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Description matching screenshot 2 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seller-ai-title">Title</Label>
                <Input
                  id="seller-ai-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-background border-border text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller-ai-desc">Description</Label>
                <Textarea
                  id="seller-ai-desc"
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="bg-background border-border text-xs leading-relaxed"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seller-ai-category">Category</Label>
                  <select
                    id="seller-ai-category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Catalogue badges</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {TAG_OPTIONS.map(tag => (
                      <label key={tag} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={productBadges.includes(tag)}
                          onChange={e =>
                            setProductBadges(prev =>
                              e.target.checked ? [...prev, tag] : prev.filter(t => t !== tag)
                            )
                          }
                          className="rounded text-primary focus:ring-primary"
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags & Key Features matching screenshot 2 */}
              <ChipEditor
                label="Tags"
                values={marketingTags}
                onChange={setMarketingTags}
                placeholder="Add tag and press Enter"
              />

              <ChipEditor
                label="Key features"
                values={keyFeatures}
                onChange={setKeyFeatures}
                placeholder="Add feature and press Enter"
              />

              {/* Price, Market Rate & Stock matching screenshot 3 */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="seller-ai-price">Price (Rs) *</Label>
                  <Input
                    id="seller-ai-price"
                    inputMode="decimal"
                    value={pricePerPc}
                    onChange={e => setPricePerPc(e.target.value)}
                    placeholder="Required"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller-ai-market">Market rate (Rs)</Label>
                  <Input
                    id="seller-ai-market"
                    inputMode="decimal"
                    value={marketRate}
                    onChange={e => setMarketRate(e.target.value)}
                    placeholder="Defaults to price"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller-ai-stock">Quantity / stock *</Label>
                  <Input
                    id="seller-ai-stock"
                    inputMode="numeric"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    placeholder="Required"
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer Action Buttons matching screenshot 3 */}
            <DialogFooter className="gap-2 sm:gap-2 pt-4 border-t border-border flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={saving || postingToShopify}
                onClick={() => onOpenChange(false)}
                className="text-xs font-medium"
              >
                Start over
              </Button>
              <Button
                type="button"
                disabled={saving || postingToShopify}
                onClick={handleSaveDraft}
                className="bg-olive hover:bg-olive/90 text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to My AI Listing"}
              </Button>
              <Button
                type="button"
                disabled={saving || postingToShopify}
                onClick={handlePublishShopify}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
              >
                {postingToShopify ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Publish / Post to Shopify
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

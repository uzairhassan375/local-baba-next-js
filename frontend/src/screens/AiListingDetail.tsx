"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Send, Trash2, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getSellerAiListings,
  deleteSellerAiListing,
  updateSellerAiListing,
  SavedAiListing,
} from "@/lib/ai/sellerAiListingsApi";
import { createShopifyProduct } from "@/lib/api/shopifyApi";

export default function AiListingDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const router = useRouter();
  const [listings, setListings] = useState<SavedAiListing[]>([]);
  const [posting, setPosting] = useState(false);
  const [mainImage, setMainImage] = useState(0);

  useEffect(() => {
    setListings(getSellerAiListings());
  }, []);

  const item = useMemo(() => listings.find(l => l.id === id), [listings, id]);

  const handleDelete = () => {
    if (!item) return;
    if (confirm("Are you sure you want to remove this saved AI listing?")) {
      deleteSellerAiListing(item.id);
      toast.info("AI listing removed.");
      router.push("/my-ai-listings");
    }
  };

  const handlePostToShopify = async () => {
    if (!item) return;
    setPosting(true);
    toast.info(`Publishing '${item.title}' to Shopify store...`);

    const result = await createShopifyProduct({
      title: item.title,
      body_html: `<p>${item.description}</p><ul>${item.keyFeatures.map(f => `<li>${f}</li>`).join("")}</ul>`,
      vendor: "Local Baba Seller",
      product_type: item.category,
      tags: item.tags.join(", "),
      price: item.pricePerPc.toString(),
      inventory_quantity: item.stock,
      images: item.selectedImages.map(src => ({ src })),
    });

    setPosting(false);

    if (result.success) {
      updateSellerAiListing(item.id, {
        postedToShopify: true,
        shopifyProductId: result.product?.id?.toString() || "live",
        shopifyPostedAt: new Date().toISOString(),
      });
      setListings(getSellerAiListings());
      toast.success(`Published to Shopify!`, {
        description: result.message || `Product '${item.title}' is now live on your connected store.`,
      });
    } else {
      toast.error("Failed to post to Shopify", { description: result.error });
    }
  };

  if (listings.length > 0 && !item) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">AI listing not found</p>
        <Link href="/my-ai-listings" className="text-primary text-sm font-semibold hover:underline">
          Back to My AI Listings
        </Link>
      </div>
    );
  }
  if (!item) {
    return <div className="p-8 text-center text-muted-foreground">Loading listing…</div>;
  }

  const images = item.selectedImages.length > 0
    ? item.selectedImages
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"];

  return (
    <div className="p-4 md:p-8 animate-fade-in-up max-w-5xl mx-auto">
      <Link href="/my-ai-listings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-4">
        <ChevronLeft size={14} /> Back to My AI Listings
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-muted rounded-card overflow-hidden">
            <img src={images[mainImage]} alt={item.title} className="w-full h-full object-cover" />
            {item.postedToShopify && (
              <span className="absolute top-3 left-3 px-3 py-1 rounded-pill bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md">
                <CheckCircle2 size={12} /> POSTED TO SHOPIFY
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${mainImage === i ? "border-primary" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              <Sparkles size={12} /> AI Generated Listing
            </span>
            <h1 className="font-heading font-bold text-2xl md:text-[28px] leading-tight mt-3">{item.title}</h1>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.category}</span>
            <p className="text-muted-foreground text-[15px] mt-3 leading-relaxed">{item.description}</p>
          </div>

          <div className="bg-card border-l-[3px] border-primary rounded-card p-5 border border-border">
            <p className="font-heading font-bold text-[32px] text-primary">
              Rs {item.pricePerPc.toLocaleString()} <span className="text-sm font-body text-muted-foreground">/ pc</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">Minimum order: {item.moq} pcs</p>
            <p className="text-sm text-muted-foreground">Stock: {item.stock} pcs</p>
          </div>

          {item.keyFeatures.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-2">Key features</h3>
              <ul className="space-y-1.5">
                {item.keyFeatures.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.specs.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-2">Specifications</h3>
              <div className="space-y-1.5">
                {item.specs.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-border pb-1.5">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePostToShopify}
              disabled={posting}
              className={`flex-1 h-12 rounded-lg font-heading font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                item.postedToShopify
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary hover:bg-accent-hover text-primary-foreground"
              } disabled:opacity-50`}
            >
              {posting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Posting to Shopify...
                </>
              ) : item.postedToShopify ? (
                <>
                  <Send size={16} /> Re-Post to Shopify
                </>
              ) : (
                <>
                  <Send size={16} /> Post to Shopify
                </>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="h-12 px-4 rounded-lg border border-border text-danger hover:bg-danger/10 transition-colors inline-flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Heart, Truck, MessageCircle, Shield, ChevronDown, ChevronUp, Sparkles, Lock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProductCard } from "@/components/ProductCard";
import { ProductMedia } from "@/components/ProductMedia";
import { CartSidebar } from "@/components/CartSidebar";
import { SellerAiModal } from "@/components/SellerAiModal";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { checkSubscriptionStatus } from "@/lib/api/subscriptionApi";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : undefined;
  const { merged, isLoading } = useMergedCatalog();
  const product = useMemo(() => merged.find(p => p.slug === slug), [merged, slug]);
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const wishlisted = isFavorite(product?.id ?? "");
  const { member } = useAuth();
  const [qty, setQty] = useState(30);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [mainImage, setMainImage] = useState(0);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subStatus, setSubStatus] = useState<"pending" | "active" | "rejected" | "expired" | "none">("none");

  useEffect(() => {
    if (!product) return;
    setQty(product.moq);
    setSelectedVariants({});
    setMainImage(0);
  }, [product?.id, product?.slug]);

  if (isLoading && !product) {
    return <div className="p-8 text-center text-muted-foreground">Loading product…</div>;
  }
  if (!product) {
    return <div className="p-8 text-center">Product not found</div>;
  }

  const isSoldOut = product.status === "sold_out";
  const totalPrice = Math.round(product.pricePerPc * qty);
  const savings = Math.round((product.marketRate - product.pricePerPc));
  const savingsPercent = Math.round((savings / product.marketRate) * 100);
  const related = merged.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const waText = encodeURIComponent(`Hi, I'd like to order ${product.name}, qty ${qty} pcs`);

  const handleAdd = () => {
    addItem({
      productId: product.id, name: product.name, pricePerPc: product.pricePerPc,
      qty, image: product.images[0], moq: product.moq,
    });
  };

  const handleAiClick = async () => {
    const email = member?.email || "";
    if (!email) {
      setSubModalOpen(true);
      return;
    }

    const sub = await checkSubscriptionStatus(email);
    setSubStatus(sub.status);

    if (sub.isSubscribed) {
      setAiModalOpen(true);
    } else {
      setSubModalOpen(true);
    }
  };

  const badge = isSoldOut ? { label: "SOLD OUT", cls: "bg-muted-foreground" }
    : product.tags.includes("hot") ? { label: "HOT", cls: "bg-primary" }
    : product.tags.includes("new") ? { label: "NEW", cls: "bg-success" }
    : product.tags.includes("low_stock") ? { label: "LOW STOCK", cls: "bg-danger" }
    : null;

  const accordionSections = [
    { key: "specs", title: "Specifications", content: product.specs.map(s => `${s.label}: ${s.value}`).join("\n") },
    { key: "shipping", title: "Shipping & returns", content: "All orders dispatched within 48 hours. Free tracking via WhatsApp. Returns accepted within 7 days if product is damaged or defective. Contact WhatsApp support for return requests." },
    { key: "faq", title: "FAQ", content: "MOQ: 30 pieces per SKU\nPayment: Bank transfer, EasyPaisa/JazzCash, COD (select cities)\nDelivery: 48-hour dispatch, 2-5 day delivery depending on city\nTracking: Automatic WhatsApp updates" },
  ];

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <p className="text-xs text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-primary">Home</Link> › <Link href="/catalogue" className="hover:text-primary">Catalogue</Link> › {product.category} › {product.name}
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className={`relative aspect-square bg-muted rounded-card overflow-hidden ${isSoldOut ? "grayscale" : ""}`}>
            <ProductMedia
              src={product.images[mainImage]}
              alt={product.name}
              videoControls
              className="w-full h-full object-cover"
            />
            {badge && <span className={`absolute top-3 left-3 px-3 py-1 rounded-pill text-xs font-bold text-primary-foreground ${badge.cls}`}>{badge.label}</span>}
          </div>
          <div className="flex gap-2 mt-3">
            {product.images.slice(0, 4).map((img, i) => (
              <button key={i} onClick={() => setMainImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${mainImage === i ? "border-primary" : "border-transparent"}`}>
                <ProductMedia src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Order panel */}
        <div className="space-y-6">
          <div>
            <h1 className="font-heading font-bold text-2xl md:text-[28px] leading-tight">{product.name}</h1>
            <div className="flex flex-col items-start gap-2 mt-2">
              {product.sku && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10">
                  <span className="text-foreground font-bold text-xs">SKU</span>
                  <span className="font-mono tracking-wide text-foreground/90 text-xs">{product.sku}</span>
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary" /> Direct import · No middlemen
              </span>
            </div>

            {product.description && (
              <div className="bg-primary/5 border border-primary/20 rounded-card p-3 mt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading font-bold text-sm truncate">Product Description</p>
                  <button
                    onClick={() => setDescExpanded(v => !v)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-primary text-primary-foreground text-xs font-bold hover:bg-accent-hover transition-colors"
                  >
                    {descExpanded ? "Close" : "View description"}
                    {descExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                {descExpanded && (
                  <div className="mt-2 pt-2 border-t border-primary/20 animate-fade-in-up">
                    <p className="font-heading font-semibold text-xs mb-1">Full Description</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing block */}
          <div className="bg-card border-l-[3px] border-primary rounded-card p-5 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading font-bold text-[28px] text-primary leading-tight">Rs {product.pricePerPc.toLocaleString()} <span className="text-sm font-body text-muted-foreground">/ pc</span></p>
                <p className="text-sm text-muted-foreground line-through mt-1">Market rate: ~Rs {product.marketRate.toLocaleString()} / pc</p>
                <p className="text-sm text-muted-foreground mt-2">Minimum order: {product.moq} pcs</p>
              </div>
              {!isSoldOut && (
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-success/10 text-success text-xs font-medium whitespace-nowrap">
                    You save Rs {savings} / pc ({savingsPercent}%)
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(qty > 30 ? qty - 1 : Math.max(product.moq, qty - 10))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-sm hover:bg-muted">−</button>
                    <span className="font-mono text-sm w-6 text-center">{qty}</span>
                    <button onClick={() => setQty(qty < 30 ? Math.min(30, qty + 10) : qty + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-sm hover:bg-muted">+</button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total ({qty} pcs)</span>
              <span className="font-heading font-bold text-xl">Rs {totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Variants */}
          {product.variants.map(v => (
            <div key={v.type}>
              <label className="text-sm font-medium block mb-2">{v.type}</label>
              <div className="flex flex-wrap gap-2">
                {v.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVariants(prev => ({ ...prev, [v.type]: opt }))}
                    className={`h-9 px-4 rounded-pill text-sm border transition-colors ${
                      selectedVariants[v.type] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                    }`}
                  >{opt}</button>
                ))}
              </div>
            </div>
          ))}

          {/* Qty + CTA */}
          {!isSoldOut ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={handleAdd} className="flex-1 h-[52px] rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-lg hover:bg-accent-hover transition-all active:scale-[0.97]">
                  Add to cart
                </button>
                <button
                  onClick={handleAiClick}
                  className="h-[52px] px-4 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-[0.97] inline-flex items-center gap-1.5 shrink-0"
                  title="Generate AI Product Listing"
                >
                  <Sparkles size={18} />
                  <Lock size={12} className="text-amber-500" />
                </button>
              </div>
              <button onClick={() => toggleFavorite(product.id)} className="w-full h-11 rounded-lg border border-border flex items-center justify-center gap-2 text-sm hover:bg-muted transition-colors">
                <Heart size={16} className={wishlisted ? "fill-primary text-primary" : ""} /> {wishlisted ? "Saved to favourites" : "Save to favourites"}
              </button>
              <a href={`https://wa.me/923001234567?text=${waText}`} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-muted-foreground hover:text-primary">
                Prefer to order on WhatsApp? →
              </a>
            </div>
          ) : (
            <button className="w-full h-[52px] rounded-lg border border-border text-muted-foreground font-medium">Notify me when back</button>
          )}

          {/* Delivery strip */}
          <div className="grid grid-cols-3 gap-3 py-4 border-y border-border">
            {[
              { icon: Truck, lines: ["48hr", "dispatch"] },
              { icon: MessageCircle, lines: ["Live WA", "tracking"] },
              { icon: Shield, lines: ["Secure", "payment"] },
            ].map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <d.icon size={16} className="text-primary flex-shrink-0" />
                <div>{d.lines.map(l => <p key={l}>{l}</p>)}</div>
              </div>
            ))}
          </div>

          {/* Accordion */}
          {accordionSections.map(s => (
            <div key={s.key} className="border-b border-border">
              <button onClick={() => setOpenAccordion(openAccordion === s.key ? null : s.key)} className="w-full flex items-center justify-between py-3 text-sm font-medium">
                {s.title}
                {openAccordion === s.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === s.key && (
                <div className="pb-3 text-sm text-muted-foreground whitespace-pre-line animate-fade-in-up">{s.content}</div>
              )}
            </div>
          ))}

          {/* Seller tips — dropdown, matching the FAQ accordion above */}
          {product.sellerTips.length > 0 && (
            <div className="border-b border-border">
              <button onClick={() => setOpenAccordion(openAccordion === "tips" ? null : "tips")} className="w-full flex items-center justify-between py-3 text-sm font-medium">
                How sellers are using this
                {openAccordion === "tips" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === "tips" && (
                <ul className="pb-3 space-y-1 animate-fade-in-up">
                  {product.sellerTips.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>{t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h3 className="font-heading font-bold text-lg mb-4">You might also need</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Sticky mobile bar */}
      {!isSoldOut && (
        <div className="md:hidden fixed bottom-14 left-0 right-0 bg-card border-t border-border p-3 flex items-center justify-between z-40">
          <div className="text-sm">
            <span className="font-heading font-bold text-primary">Rs {product.pricePerPc}/pc</span>
            <span className="text-muted-foreground"> · {product.moq} pcs min</span>
          </div>
          <button onClick={handleAdd} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover">
            Add to cart
          </button>
        </div>
      )}

      <CartSidebar />
      <SellerAiModal product={product} open={aiModalOpen} onOpenChange={setAiModalOpen} />
      <SubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        userEmail={member?.email || ""}
        userName={member?.name || ""}
        currentStatus={subStatus}
        onSuccess={() => setAiModalOpen(true)}
      />
    </div>
  );
}

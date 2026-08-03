import { Heart, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/mockData";
import { ProductMedia } from "@/components/ProductMedia";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { SellerAiModal } from "@/components/SellerAiModal";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { checkSubscriptionStatus } from "@/lib/api/subscriptionApi";

interface Props {
  product: Product;
  deliveryPrice?: number | null;
}

export function ProductCard({ product, deliveryPrice }: Props) {
  const [qty, setQty] = useState(product.moq);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subStatus, setSubStatus] = useState<"pending" | "active" | "rejected" | "expired" | "none">("none");
  const { isFavorite, toggleFavorite } = useFavorites();
  const wishlisted = isFavorite(product.id);
  const { addItem } = useCart();
  const { member } = useAuth();
  const isSoldOut = product.status === "sold_out";

  const badge = isSoldOut
    ? { label: "SOLD OUT", className: "bg-muted-foreground text-primary-foreground" }
    : product.tags.includes("new")
    ? { label: "NEW", className: "bg-success text-primary-foreground" }
    : product.tags.includes("hot")
    ? { label: "HOT", className: "bg-primary text-primary-foreground" }
    : product.tags.includes("low_stock")
    ? { label: "LOW STOCK", className: "bg-danger text-primary-foreground" }
    : null;

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      pricePerPc: product.pricePerPc,
      qty,
      image: product.images[0],
      moq: product.moq,
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

  return (
    <div className="bg-card rounded-card border border-border overflow-hidden group hover:border-primary/50 transition-all shadow-card flex flex-col justify-between">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative">
          <ProductMedia
            src={product.images[0]}
            alt={product.name}
            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {badge && (
            <span
              className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded font-heading ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(product.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:text-danger transition-colors"
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} className={wishlisted ? "text-danger" : ""} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {product.category}
          </span>
          <h3 className="font-heading font-semibold text-base line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-lg text-primary">Rs. {product.pricePerPc}</span>
            <span className="text-xs text-muted-foreground">/ pc</span>
            {deliveryPrice != null && (
              <span className="text-xs text-muted-foreground">
                (+Rs. {deliveryPrice.toLocaleString("en-PK")} del)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">MOQ: {product.moq} pcs</p>
        </div>
      </Link>

      <div className="p-4 pt-0 space-y-3">
        {!isSoldOut ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setQty(Math.max(product.moq, qty - 10))}
                className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >-</button>
              <span className="text-xs font-semibold">{qty} pcs</span>
              <button
                onClick={() => setQty(qty < 30 ? Math.min(30, qty + 10) : qty + 1)}
                className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >+</button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors active:scale-[0.97]"
              >
                Add to cart
              </button>
              <button
                onClick={handleAiClick}
                className="px-3 h-10 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all active:scale-[0.97] inline-flex items-center gap-1.5 shrink-0"
                title="Generate AI Product Listing"
              >
                <Sparkles size={14} />
                AI Listing
                <Lock size={12} className="text-amber-500 ml-0.5 shrink-0" />
              </button>
            </div>
          </>
        ) : (
          <button className="w-full h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Notify me when back
          </button>
        )}
      </div>

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

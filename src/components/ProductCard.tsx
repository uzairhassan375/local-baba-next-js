import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/mockData";
import { ProductMedia } from "@/components/ProductMedia";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";

interface Props {
  product: Product;
  deliveryPrice?: number | null;
}

export function ProductCard({ product, deliveryPrice }: Props) {
  const [qty, setQty] = useState(product.moq);
  const { isFavorite, toggleFavorite } = useFavorites();
  const wishlisted = isFavorite(product.id);
  const { addItem } = useCart();
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

  return (
    <div className="bg-card rounded-card border border-border overflow-hidden group transition-shadow hover:shadow-card">
      <Link href={`/product/${product.slug}`} className="block">
        <div className={`relative aspect-square bg-muted overflow-hidden ${isSoldOut ? "grayscale" : ""}`}>
          <ProductMedia
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          {badge && (
            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-pill text-[10px] uppercase font-bold tracking-wide ${badge.className}`}>
              {badge.label}
            </span>
          )}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"
            aria-label={wishlisted ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart size={16} className={wishlisted ? "fill-primary text-primary" : "text-muted-foreground"} />
          </button>
        </div>
      </Link>
      <div className="p-4 space-y-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{product.category}</span>
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground hover:text-primary transition-colors">{product.name}</h3>
        </Link>
        <div className="flex items-baseline justify-between">
          <span className="font-heading font-bold text-lg text-primary">Rs {product.pricePerPc.toLocaleString()}<span className="text-xs font-body text-muted-foreground"> / pc</span></span>
          <span className="text-xs text-muted-foreground">Min. {product.moq} pcs</span>
        </div>
        <p className="text-xs text-muted-foreground">= Rs {(product.pricePerPc * qty).toLocaleString()}</p>
        {deliveryPrice != null && (
          <p className="text-[10px] text-olive font-medium">Delivery: Rs {deliveryPrice.toLocaleString()}</p>
        )}

        {!isSoldOut ? (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(Math.max(product.moq, qty - 10))}
                className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >−</button>
              <span className="font-mono text-sm w-10 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 10)}
                className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >+</button>
            </div>
            <button
              onClick={handleAdd}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors active:scale-[0.97]"
            >
              Add to cart
            </button>
          </>
        ) : (
          <button className="w-full h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Notify me when back
          </button>
        )}
      </div>
    </div>
  );
}

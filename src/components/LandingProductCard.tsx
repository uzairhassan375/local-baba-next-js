import Link from "next/link";
import { ArrowRight, Globe, Package } from "lucide-react";
import type { Product } from "@/data/mockData";
import { ProductMedia } from "@/components/ProductMedia";

interface Props {
  product: Product;
}

export function LandingProductCard({ product }: Props) {
  const savings = Math.round(((product.marketRate - product.pricePerPc) / product.marketRate) * 100);
  const isChina = product.catalogType === "china";

  const badge = product.tags.includes("hot")
    ? { label: "HOT", className: "bg-primary text-primary-foreground" }
    : product.tags.includes("new")
      ? { label: "NEW", className: "bg-success text-primary-foreground" }
      : null;

  return (
    <article className="group bg-card border border-border rounded-card overflow-hidden hover:border-primary hover:shadow-card transition-all duration-300 flex flex-col h-full">
      <div className="relative aspect-[4/5] bg-muted overflow-hidden">
        <ProductMedia
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-pill text-[10px] uppercase font-bold tracking-wide ${badge.className}`}>
            {badge.label}
          </span>
        )}
        <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold backdrop-blur-sm ${
          isChina ? "bg-amber-500/90 text-white" : "bg-dark/70 text-primary-foreground"
        }`}>
          {isChina ? <Globe size={10} /> : <Package size={10} />}
          {isChina ? "China" : "Local"}
        </span>
        {savings > 0 && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-pill bg-success/90 text-primary-foreground text-[10px] font-bold">
            Save {savings}%
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{product.category}</span>
        <h3 className="text-sm font-medium leading-snug line-clamp-2 mt-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-heading font-bold text-lg text-primary">
              Rs {product.pricePerPc.toLocaleString()}
              <span className="text-xs font-body text-muted-foreground font-normal"> /pc</span>
            </p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">MOQ {product.moq}</span>
          </div>
          {product.marketRate > product.pricePerPc && (
            <p className="text-xs text-muted-foreground line-through mt-0.5">
              Market ~Rs {product.marketRate.toLocaleString()}
            </p>
          )}
          <Link
            href="/apply"
            className="mt-3 w-full h-9 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          >
            Register to order
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}

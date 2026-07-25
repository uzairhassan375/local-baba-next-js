import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { fetchLandingProducts } from "@/lib/supabase/productsApi";
import { LandingProductCard } from "@/components/LandingProductCard";

export function FeaturedProductsSection() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["landing-products"],
    queryFn: fetchLandingProducts,
    staleTime: 60_000,
  });

  if (!isLoading && products.length === 0) return null;

  return (
    <section id="products" className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="container relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="section-label mb-3 flex items-center gap-2">
              <ShoppingBag size={14} />
              FEATURED PRODUCTS
            </p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-foreground leading-tight">
              Trending wholesale picks
            </h2>
            <p className="text-muted-foreground text-lg mt-2 max-w-lg">
              Hand-picked by our team. Register free to see full catalogue and place orders.
            </p>
          </div>
          <Link
            href="/apply"
            className="group inline-flex items-center gap-2 h-11 px-6 rounded-pill border border-border text-sm font-semibold hover:border-primary hover:text-primary transition-colors shrink-0 self-start md:self-auto"
          >
            View full catalogue
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-card overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-8 bg-muted rounded w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {products.map(product => (
              <LandingProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Members get access to 100+ more products, China catalog, and live tracking.
          </p>
          <Link
            href="/apply"
            className="group inline-flex items-center gap-2 h-[52px] px-8 rounded-pill bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97] shadow-md shadow-primary/20"
          >
            Join free to order
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

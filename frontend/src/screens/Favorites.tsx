import { useMemo } from "react";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";
import { ProductCard } from "@/components/ProductCard";

export default function FavoritesPage() {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { merged: products, isLoading } = useMergedCatalog();

  const favoriteProducts = useMemo(
    () => products.filter(p => favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-card rounded-card p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Heart size={20} className="fill-red-500 text-red-500" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">My Favourites</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {favoriteProducts.length} {favoriteProducts.length === 1 ? "product" : "products"} saved
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Quickly access your saved items, check live stock, or add them to your cart.
          </p>
        </div>

        {favoriteProducts.length > 0 && (
          <div className="flex items-center gap-3">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              <ShoppingBag size={14} />
              Browse Catalogue
            </Link>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center text-muted-foreground text-sm">
          Loading your saved items…
        </div>
      )}

      {/* Empty State */}
      {!isLoading && favoriteProducts.length === 0 && (
        <div className="bg-card rounded-card border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
            <Heart size={32} className="fill-red-500/20 text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-lg text-foreground">No favourites yet</h3>
            <p className="text-sm text-muted-foreground">
              You haven't saved any products to your favourites. Click the heart icon on any product to save it here!
            </p>
          </div>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors inline-block pt-2.5"
          >
            Explore Catalogue
          </Link>
        </div>
      )}

      {/* Grid of Favorites */}
      {!isLoading && favoriteProducts.length > 0 && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

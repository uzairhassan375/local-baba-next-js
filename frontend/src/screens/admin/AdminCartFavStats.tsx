"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart, Heart, Tag, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProductMedia } from "@/components/ProductMedia";
import { Button } from "@/components/ui/button";
import { fetchAdminProductsFromDb } from "@/lib/supabase/productsApi";
import { fetchAdminCartCounts } from "@/lib/api/cartApi";
import { fetchAdminFavoriteCounts } from "@/lib/api/favoritesApi";
import { fetchAdminActivePromoCounts, disableAdminPromoCode } from "@/lib/api/promoCodesApi";
import { ProductMembersDialog } from "@/screens/admin/ProductMembersDialog";
import type { Product } from "@/data/mockData";

export default function AdminCartFavStats() {
  const queryClient = useQueryClient();
  const [membersDialog, setMembersDialog] = useState<{ product: Product; kind: "cart" | "favorite" } | null>(null);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });
  const { data: cartCounts = {}, isLoading: loadingCart } = useQuery({
    queryKey: ["admin-cart-counts"],
    queryFn: fetchAdminCartCounts,
  });
  const { data: favCounts = {}, isLoading: loadingFav } = useQuery({
    queryKey: ["admin-fav-counts"],
    queryFn: fetchAdminFavoriteCounts,
  });
  const { data: promos = {}, isLoading: loadingPromos } = useQuery({
    queryKey: ["admin-promo-counts"],
    queryFn: fetchAdminActivePromoCounts,
  });

  const isLoading = loadingProducts || loadingCart || loadingFav || loadingPromos;

  const handleDisablePromo = async (promoId: string) => {
    setDisablingId(promoId);
    const result = await disableAdminPromoCode(promoId);
    setDisablingId(null);
    if (result.success) {
      toast.success("Promo code disabled.");
      void queryClient.invalidateQueries({ queryKey: ["admin-promo-counts"] });
    } else {
      toast.error(result.error || "Could not disable promo code.");
    }
  };

  // Most-in-carts-and-favourites first — that's what an admin opening this
  // page actually wants to see, not alphabetical/insertion order.
  const rows = useMemo(
    () =>
      products
        .map(p => ({ product: p, cart: cartCounts[p.id] ?? 0, fav: favCounts[p.id] ?? 0 }))
        .sort((a, b) => b.cart + b.fav - (a.cart + a.fav)),
    [products, cartCounts, favCounts],
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">Cart & Favourite Stats</h1>
          <p className="text-sm text-muted-foreground mt-1">
            See which products members have in their cart or favourites, and message them directly.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">In cart</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Favourited</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Promo</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ product, cart, fav }) => (
                    <tr key={product.id} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ProductMedia src={product.images[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          <span className="font-medium truncate">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{product.category}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-pill text-xs font-medium ${
                            cart > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cart}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-pill text-xs font-medium ${
                            fav > 0 ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {fav}
                        </span>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {promos[product.id] ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-mono font-medium">
                              <Tag size={11} />
                              {promos[product.id].code}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDisablePromo(promos[product.id].id)}
                              disabled={disablingId === promos[product.id].id}
                              title="Disable this promo code"
                              className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => setMembersDialog({ product, kind: "cart" })}
                        >
                          <ShoppingCart size={14} className="mr-1" /> Cart stats
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => setMembersDialog({ product, kind: "favorite" })}
                        >
                          <Heart size={14} className="mr-1" /> Fav stats
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductMembersDialog
        product={membersDialog?.product ?? null}
        kind={membersDialog?.kind ?? "cart"}
        open={!!membersDialog}
        onOpenChange={o => !o && setMembersDialog(null)}
      />
    </AdminLayout>
  );
}

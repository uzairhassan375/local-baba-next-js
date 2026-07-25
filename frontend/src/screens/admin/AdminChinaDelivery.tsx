import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Package } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  fetchChinaDeliveryPrices,
  upsertChinaDeliveryPrice,
  deleteChinaDeliveryPrice,
} from "@/lib/supabase/chinaDeliveryApi";

const PRODUCT_CATEGORIES = ["Fashion", "Electronics", "Home", "Beauty", "Kids"];

export default function AdminChinaDeliveryPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState("");

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["china-delivery-prices"],
    queryFn: fetchChinaDeliveryPrices,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["china-delivery-prices"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const deliveryPrice = Number(price);
      if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) {
        throw new Error("Enter a valid delivery price");
      }
      return upsertChinaDeliveryPrice(category, deliveryPrice);
    },
    onSuccess: () => {
      toast.success("Delivery price saved");
      setPrice("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChinaDeliveryPrice,
    onSuccess: () => {
      toast.success("Removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Package size={24} className="text-primary" />
            China catalog delivery prices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set category-wise delivery rates shown in the China catalog tab. Assign products to the China catalog from the Products page.
          </p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 space-y-4">
          <h2 className="font-heading font-semibold text-sm">Add or update price</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Delivery price (Rs)</Label>
              <Input
                value={price}
                onChange={e => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 1500"
              />
            </div>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Plus size={16} /> Save price
          </Button>
        </div>

        <div className="rounded-card border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Delivery (Rs)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : prices.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No delivery prices set yet.</td></tr>
              ) : (
                prices.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{p.category}</td>
                    <td className="p-3">Rs {p.deliveryPrice.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

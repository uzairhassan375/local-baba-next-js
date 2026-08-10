"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Home, Layers, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProductMedia } from "@/components/ProductMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAdminCategories, upsertCategory, uploadCategoryImage, type Category } from "@/lib/supabase/categoriesApi";
import { fetchAdminProductsFromDb, patchProductCategoryHome } from "@/lib/supabase/productsApi";

// The categories your product form already uses (AdminProducts.tsx) — always
// shown as buttons, no setup needed to browse/filter by them. Any category
// an admin explicitly creates below (with its own name) shows up here too.
const DEFAULT_CATEGORIES = ["Fashion", "Electronics", "Home", "Beauty", "Kids"];

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [creatingUpload, setCreatingUpload] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: categoryRows = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  const categoryByName = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categoryRows) map.set(c.name.trim().toLowerCase(), c);
    return map;
  }, [categoryRows]);

  // Default categories plus any custom ones an admin has created — de-duped
  // by name, defaults first, custom ones in creation order after.
  const allCategoryNames = useMemo(() => {
    const seen = new Set(DEFAULT_CATEGORIES.map(n => n.toLowerCase()));
    const custom = categoryRows.map(c => c.name).filter(n => !seen.has(n.trim().toLowerCase()));
    return [...DEFAULT_CATEGORIES, ...custom];
  }, [categoryRows]);

  const selected = selectedName ? categoryByName.get(selectedName.trim().toLowerCase()) ?? null : null;
  const categoryProducts = useMemo(
    () => (selectedName ? products.filter(p => p.category.trim().toLowerCase() === selectedName.trim().toLowerCase()) : []),
    [products, selectedName],
  );

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedName) return;
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      await upsertCategory(selectedName, { imageUrl: url });
      toast.success("Category image updated.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleToggleActive = async () => {
    if (!selectedName) return;
    try {
      await upsertCategory(selectedName, { isActive: !(selected?.isActive ?? false) });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update category.");
    }
  };

  const handleToggleHome = async (productId: string, next: boolean) => {
    try {
      await patchProductCategoryHome(productId, next);
      toast.success(next ? "Added to home page collection." : "Removed from home page collection.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update product.");
    }
  };

  const openCreate = () => {
    setNewName("");
    setNewImage(null);
    setCreateOpen(true);
  };

  const handleCreateImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreatingUpload(true);
    try {
      setNewImage(await uploadCategoryImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setCreatingUpload(false);
      e.target.value = "";
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }
    if (allCategoryNames.some(n => n.trim().toLowerCase() === name.toLowerCase())) {
      toast.error("A category with this name already exists.");
      return;
    }
    setCreating(true);
    try {
      // New, explicitly-created categories go live immediately — that's
      // the point of creating one, unlike the default categories which
      // stay hidden until an admin turns them on.
      await upsertCategory(name, { imageUrl: newImage, isActive: true });
      toast.success("Category created.");
      setCreateOpen(false);
      setSelectedName(name);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create category.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Layers size={22} className="text-primary" />
              Collections
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a category to see its products, choose which ones show in its home-page collection, and set the
              category's picture for the mobile app.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus size={16} />
            Create category
          </Button>
        </div>

        {/* Category buttons — defaults plus any custom ones you've created */}
        <div className="flex gap-3 flex-wrap">
          {allCategoryNames.map(name => {
            const row = categoryByName.get(name.toLowerCase());
            const isSelected = selectedName === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedName(name)}
                className={`flex items-center gap-2 pl-2 pr-4 py-2 rounded-pill border transition-colors ${
                  isSelected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {row?.imageUrl ? (
                    <ProductMedia src={row.imageUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={14} className="text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{name}</span>
                {row?.isActive && <span className="w-1.5 h-1.5 rounded-full bg-success" title="Visible in app" />}
              </button>
            );
          })}
        </div>

        {selectedName && (
          <>
            {/* Selected category's image + visibility controls */}
            <div className="bg-card rounded-card border border-border p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                {selected?.imageUrl ? (
                  <ProductMedia src={selected.imageUrl} alt={selectedName} className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold">{selectedName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected?.isActive
                    ? "Shown in the mobile app's Shop by Category row."
                    : "Hidden from the mobile app's Shop by Category row until it has a picture and is turned on."}
                </p>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors whitespace-nowrap">
                  {uploading ? "Uploading…" : selected?.imageUrl ? "Replace picture" : "Upload picture"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={e => void handleImagePick(e)} disabled={uploading} />
              </label>
              <button
                type="button"
                onClick={() => void handleToggleActive()}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selected?.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <Home size={14} />
                {selected?.isActive ? "Visible in app" : "Show in app"}
              </button>
            </div>

            {/* Products in the selected category */}
            <div className="bg-card rounded-card border border-border overflow-x-auto">
              <div className="p-4 border-b border-border">
                <h2 className="font-heading font-semibold">{selectedName} products</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toggle "Show on home page" to feature a product in this category's collection row on the mobile app.
                </p>
              </div>
              {loadingProducts || loadingCategories ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : categoryProducts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No products with category "{selectedName}" yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Home page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryProducts.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <ProductMedia src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                            <span className="font-medium truncate">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">Rs {p.pricePerPc}</td>
                        <td className="p-3 text-muted-foreground">{p.status}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleToggleHome(p.id, !p.showInCategoryHome)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-pill text-xs font-medium transition-colors ${
                              p.showInCategoryHome
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            }`}
                          >
                            <Home size={12} />
                            {p.showInCategoryHome ? "On home page" : "Add"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>
              Give it a name and a picture — it goes live in the mobile app's "Shop by Category" row right away.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-name">Name</Label>
              <Input id="new-cat-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Toys" />
            </div>
            <div className="space-y-1.5">
              <Label>Picture</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                  {newImage ? (
                    <ProductMedia src={newImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={20} className="text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
                    {creatingUpload ? "Uploading…" : newImage ? "Replace picture" : "Upload picture"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => void handleCreateImagePick(e)} disabled={creatingUpload} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating || creatingUpload}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

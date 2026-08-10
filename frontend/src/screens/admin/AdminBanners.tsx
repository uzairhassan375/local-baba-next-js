"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProductMedia } from "@/components/ProductMedia";
import {
  fetchAdminBanners,
  insertBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
} from "@/lib/supabase/bannersApi";

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: fetchAdminBanners,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      await insertBanner({ imageUrl: url, sortOrder: banners.length });
      toast.success("Banner added.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add banner.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleToggleActive = async (id: string, next: boolean) => {
    try {
      await updateBanner(id, { isActive: next });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update banner.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBanner(id);
      toast.success("Banner deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete banner.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <ImageIcon size={22} className="text-primary" />
              Home Banners
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Shown only in the mobile app, above the announcements ticker on the home screen — never on the website.
              Recommended size: 1200×600px (2:1), JPG or PNG, under 500KB.
            </p>
          </div>
          <label className="cursor-pointer shrink-0">
            <span className="inline-flex items-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium gap-2 hover:bg-accent-hover transition-colors">
              <Upload size={16} />
              {uploading ? "Uploading…" : "Add banner"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={e => void handleAdd(e)} disabled={uploading} />
          </label>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No banners yet — click "Add banner" to upload one.</p>
        ) : (
          <div className="space-y-3">
            {banners.map(b => (
              <div key={b.id} className="bg-card rounded-card border border-border p-3 flex items-center gap-4">
                <div className="w-32 aspect-[2/1] rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                  <ProductMedia src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Banner</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.isActive ? "Visible in the mobile app" : "Hidden from the mobile app"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(b.id, !b.isActive)}
                  className={`inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    b.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {b.isActive ? "Visible" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(b.id)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

import { createClient } from "@/lib/supabase/client";

export interface Banner {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

type BannerRow = {
  id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

function mapRowToBanner(row: BannerRow): Banner {
  return {
    id: row.id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
  };
}

/** Admin view — every banner, including inactive ones, in display order. */
export async function fetchAdminBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mobile_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as BannerRow[]).map(mapRowToBanner);
}

export async function insertBanner(payload: { imageUrl: string; sortOrder?: number }): Promise<Banner> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mobile_banners")
    .insert({ image_url: payload.imageUrl, sort_order: payload.sortOrder ?? 0 })
    .select("*")
    .single();
  if (error) throw error;
  return mapRowToBanner(data as BannerRow);
}

export async function updateBanner(
  id: string,
  payload: { sortOrder?: number; isActive?: boolean },
): Promise<Banner> {
  const supabase = createClient();
  const updates: Record<string, unknown> = {};
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;
  if (payload.isActive !== undefined) updates.is_active = payload.isActive;

  const { data, error } = await supabase.from("mobile_banners").update(updates).eq("id", id).select("*").single();
  if (error) throw error;
  return mapRowToBanner(data as BannerRow);
}

export async function deleteBanner(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("mobile_banners").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads a single banner image to Bunny CDN via the same upload-media
 * route product/category images use, and returns its public URL. */
export async function uploadBannerImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("files", file);
  form.append("slug", "mobile-banners");

  const res = await fetch("/api/upload-media", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const body = (await res.json().catch(() => ({}))) as { urls?: string[]; error?: string };
  if (!res.ok || !body.urls?.length) {
    throw new Error(body.error || "Image upload failed");
  }
  return body.urls[0];
}

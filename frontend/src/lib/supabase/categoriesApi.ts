import { createClient } from "@/lib/supabase/client";

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

type CategoryRow = {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
  };
}

/** Admin view — every category, including inactive ones, in display order. */
export async function fetchAdminCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(mapRowToCategory);
}

/** Set a category's image/visibility by name — creates the row on first use
 * (e.g. the first time an admin uploads an image for "Kids"), updates it
 * otherwise. Categories aren't separately "created" by admins; the button
 * for each one always exists (driven by the product category list) and
 * this just attaches optional display metadata to it, keyed by that name. */
export async function upsertCategory(
  name: string,
  payload: { imageUrl?: string | null; isActive?: boolean; sortOrder?: number },
): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .upsert(
      {
        name: name.trim(),
        ...(payload.imageUrl !== undefined ? { image_url: payload.imageUrl } : {}),
        ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
        ...(payload.sortOrder !== undefined ? { sort_order: payload.sortOrder } : {}),
      },
      { onConflict: "name" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return mapRowToCategory(data as CategoryRow);
}

/** Uploads a single category cover image to Bunny CDN via the same
 * upload-media route product images use, and returns its public URL. */
export async function uploadCategoryImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("files", file);
  form.append("slug", "categories");

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

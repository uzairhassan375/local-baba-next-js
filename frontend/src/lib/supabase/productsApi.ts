import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/data/mockData";

type ProductRow = {
  id: string;
  sku?: string | null;
  slug: string;
  name: string;
  category: string;
  price_per_pc: number | string;
  market_rate: number | string;
  moq: number;
  stock: number;
  status: Product["status"];
  tags: unknown;
  variants: unknown;
  images: unknown;
  description: string;
  specs: unknown;
  seller_tips: unknown;
  show_in_trending: boolean;
  trending_sort: number;
  catalog_type?: string | null;
  show_on_landing?: boolean;
  landing_sort?: number;
  show_in_category_home?: boolean;
};

function asTags(v: unknown): Product["tags"] {
  const allowed = new Set(["new", "hot", "featured", "low_stock"]);
  if (!Array.isArray(v)) return [];
  return v.filter((t): t is Product["tags"][number] => typeof t === "string" && allowed.has(t as Product["tags"][number]));
}

function asVariants(v: unknown): Product["variants"] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Product["variants"][number] => x && typeof x === "object")
    .map(x => {
      const o = x as Record<string, unknown>;
      const type = typeof o.type === "string" ? o.type : "Option";
      const options = Array.isArray(o.options) ? o.options.filter((s): s is string => typeof s === "string") : [];
      const stock = o.stock && typeof o.stock === "object" ? (o.stock as Record<string, number>) : undefined;
      return { type, options, ...(stock ? { stock } : {}) };
    });
}

function asSpecs(v: unknown): Product["specs"] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Product["specs"][number] => x && typeof x === "object")
    .map(x => {
      const o = x as Record<string, unknown>;
      return {
        label: typeof o.label === "string" ? o.label : "",
        value: typeof o.value === "string" ? o.value : "",
      };
    });
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function fallbackSku(row: ProductRow): string {
  const fromSlug = row.slug
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase()
    .slice(0, 12);
  return `TLB-${fromSlug || "ITEM"}`;
}

export function mapRowToProduct(row: ProductRow): Product {
  const sku = row.sku?.trim() ? row.sku.trim() : fallbackSku(row);
  return {
    id: row.id,
    sku,
    slug: row.slug,
    name: row.name,
    category: row.category,
    pricePerPc: Number(row.price_per_pc),
    marketRate: Number(row.market_rate),
    moq: row.moq,
    stock: row.stock,
    status: row.status,
    tags: asTags(row.tags),
    variants: asVariants(row.variants),
    images: asStringArray(row.images).length ? asStringArray(row.images) : [placeholderImage()],
    description: row.description || "",
    specs: asSpecs(row.specs),
    sellerTips: asStringArray(row.seller_tips),
    showInTrending: row.show_in_trending ?? false,
    trendingSort: row.trending_sort ?? 0,
    catalogType: row.catalog_type === "china" ? "china" : "standard",
    showOnLanding: row.show_on_landing ?? false,
    landingSort: row.landing_sort ?? 0,
    showInCategoryHome: row.show_in_category_home ?? false,
  };
}

function placeholderImage() {
  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop";
}

export async function fetchCatalogProductsFromDb(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("status", ["active", "sold_out"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(mapRowToProduct);
}

export async function fetchAdminProductsFromDb(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(mapRowToProduct);
}

export async function fetchTrendingThisWeek(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("show_in_trending", true)
    .eq("status", "active")
    .order("trending_sort", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data as ProductRow[]).map(mapRowToProduct);
}

/** Active products curated by admin for the public landing page. */
export async function fetchLandingProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("show_on_landing", true)
    .eq("status", "active")
    .order("landing_sort", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data as ProductRow[]).map(mapRowToProduct);
}

export async function fetchProductBySlugFromDb(slug: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .in("status", ["active", "sold_out"])
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRowToProduct(data as ProductRow);
}

export type ProductPayload = {
  sku: string;
  slug: string;
  name: string;
  category: string;
  price_per_pc: number;
  market_rate: number;
  moq: number;
  stock: number;
  status: Product["status"];
  tags: Product["tags"];
  variants: Product["variants"];
  images: string[];
  description: string;
  specs: Product["specs"];
  seller_tips: string[];
  show_in_trending: boolean;
  trending_sort: number;
  catalog_type: "standard" | "china";
  show_on_landing: boolean;
  landing_sort: number;
  show_in_category_home: boolean;
};

export function suggestSkuFromSlug(slug: string): string {
  const part = slug
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase()
    .slice(0, 10);
  const tail = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `TLB-${part || "ITEM"}-${tail}`;
}

export function productToPayload(p: {
  sku?: string;
  slug: string;
  name: string;
  category: string;
  pricePerPc: number;
  marketRate: number;
  moq: number;
  stock: number;
  status: Product["status"];
  tags: Product["tags"];
  variants: Product["variants"];
  images: string[];
  description: string;
  specs: Product["specs"];
  sellerTips: string[];
  showInTrending: boolean;
  trendingSort: number;
  catalogType?: "standard" | "china";
  showOnLanding?: boolean;
  landingSort?: number;
  showInCategoryHome?: boolean;
}): ProductPayload {
  const sku = p.sku?.trim() ? p.sku.trim() : suggestSkuFromSlug(p.slug);
  return {
    sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price_per_pc: p.pricePerPc,
    market_rate: p.marketRate,
    moq: p.moq,
    stock: p.stock,
    status: p.status,
    tags: p.tags,
    variants: p.variants,
    images: p.images,
    description: p.description,
    specs: p.specs,
    seller_tips: p.sellerTips,
    show_in_trending: p.showInTrending,
    trending_sort: p.trendingSort,
    catalog_type: p.catalogType === "china" ? "china" : "standard",
    show_on_landing: p.showOnLanding ?? false,
    landing_sort: p.landingSort ?? 0,
    show_in_category_home: p.showInCategoryHome ?? false,
  };
}

export async function insertProduct(payload: ProductPayload): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").insert(payload).select("*").single();
  if (error) throw error;
  return mapRowToProduct(data as ProductRow);
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return mapRowToProduct(data as ProductRow);
}

/** Partial update used by bulk price/MOQ sheet. */
export async function patchProductPriceAndMoq(id: string, pricePerPc: number, moq: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update({ price_per_pc: pricePerPc, moq }).eq("id", id);
  if (error) throw error;
}

/** Quick toggle from admin product table. */
export async function patchProductLanding(
  id: string,
  showOnLanding: boolean,
  landingSort?: number,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({
      show_on_landing: showOnLanding,
      ...(landingSort !== undefined ? { landing_sort: landingSort } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

/** Quick toggle from the admin Categories page — whether a product appears
 * in its category's curated home-page collection row on the mobile app. */
export async function patchProductCategoryHome(id: string, showInCategoryHome: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ show_in_category_home: showInCategoryHome })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImages(files: File[], slug?: string): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in as admin to upload images.");

  const form = new FormData();
  for (const file of files) form.append("files", file);
  if (slug) form.append("slug", slug);

  const res = await fetch("/api/upload-media", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const body = (await res.json().catch(() => ({}))) as { urls?: string[]; error?: string };
  if (!res.ok) {
    throw new Error(body.error || "Upload failed");
  }
  if (!body.urls?.length) {
    throw new Error("Upload returned no URLs");
  }
  return body.urls;
}

/**
 * Ensures every image URL is hosted on Bunny CDN. Any URL not already on our
 * CDN (e.g. pasted by an admin) gets fetched server-side and re-uploaded to
 * Bunny under `products/`. URLs already on Bunny CDN pass through untouched.
 */
export async function rehostImageUrlsToBunny(urls: string[], slug?: string): Promise<string[]> {
  if (!urls.length) return urls;

  const res = await fetch("/api/admin/import-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ urls, slug, purpose: "products" }),
  });

  const body = (await res.json().catch(() => ({}))) as { urls?: string[]; error?: string };
  if (!res.ok || !body.urls?.length) {
    throw new Error(body.error || "Could not import pasted image URLs to storage.");
  }
  return body.urls;
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `product-${crypto.randomUUID().slice(0, 8)}`;
}

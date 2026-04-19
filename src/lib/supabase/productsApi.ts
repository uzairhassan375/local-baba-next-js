import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/data/mockData";

const BUCKET = "product-images";

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

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImages(files: File[]): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in as admin to upload images.");

  const urls: string[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(pub.publicUrl);
  }
  return urls;
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `product-${crypto.randomUUID().slice(0, 8)}`;
}

import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/data/mockData";

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

function fallbackSku(slug: string): string {
  const fromSlug = slug
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase()
    .slice(0, 12);
  return `TLB-${fromSlug || "ITEM"}`;
}

function placeholderImage() {
  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop";
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type ApiProductRow = {
  id: string;
  sku: string | null;
  slug: string;
  name: string;
  category: string;
  pricePerPc: number;
  marketRate: number;
  moq: number;
  stock: number;
  status: Product["status"];
  tags: unknown;
  variants: unknown;
  images: unknown;
  description: string;
  specs: unknown;
  sellerTips: unknown;
  showInTrending: boolean;
  trendingSort: number;
  catalogType: "standard" | "china";
  showOnLanding: boolean;
  landingSort: number;
  showInCategoryHome: boolean;
};

function mapApiRowToProduct(row: ApiProductRow): Product {
  const sku = row.sku?.trim() ? row.sku.trim() : fallbackSku(row.slug);
  return {
    id: row.id,
    sku,
    slug: row.slug,
    name: row.name,
    category: row.category,
    pricePerPc: Number(row.pricePerPc),
    marketRate: Number(row.marketRate),
    moq: row.moq,
    stock: row.stock,
    status: row.status,
    tags: asTags(row.tags),
    variants: asVariants(row.variants),
    images: asStringArray(row.images).length ? asStringArray(row.images) : [placeholderImage()],
    description: row.description || "",
    specs: asSpecs(row.specs),
    sellerTips: asStringArray(row.sellerTips),
    showInTrending: row.showInTrending ?? false,
    trendingSort: row.trendingSort ?? 0,
    catalogType: row.catalogType === "china" ? "china" : "standard",
    showOnLanding: row.showOnLanding ?? false,
    landingSort: row.landingSort ?? 0,
    showInCategoryHome: row.showInCategoryHome ?? false,
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchProducts(params: Record<string, string>, auth: boolean): Promise<Product[]> {
  const headers = auth ? await authHeaders() : {};
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BACKEND_URL}/api/products${qs ? `?${qs}` : ""}`, { headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; products?: ApiProductRow[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load products.");
  return (body.products || []).map(mapApiRowToProduct);
}

/** Active/sold-out products only — used by public/member catalogue browsing.
 * Deliberately unauthenticated so admins browsing the storefront see the
 * same visible-only set everyone else does. */
export async function fetchCatalogProductsFromDb(): Promise<Product[]> {
  return fetchProducts({}, false);
}

export async function fetchAdminProductsFromDb(): Promise<Product[]> {
  return fetchProducts({}, true);
}

export async function fetchTrendingThisWeek(): Promise<Product[]> {
  return fetchProducts({ trending: "true", limit: "8" }, false);
}

/** Active products curated by admin for the public landing page. */
export async function fetchLandingProducts(): Promise<Product[]> {
  return fetchProducts({ landing: "true", limit: "12" }, false);
}

export async function fetchProductBySlugFromDb(slug: string): Promise<Product | null> {
  const res = await fetch(`${BACKEND_URL}/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; product?: ApiProductRow; error?: string };
  if (!res.ok || !body.success || !body.product) return null;
  return mapApiRowToProduct(body.product);
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

async function writeProduct(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  payload?: Record<string, unknown>,
): Promise<ApiProductRow | null> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/products${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; product?: ApiProductRow; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not save product.");
  return body.product ?? null;
}

export async function insertProduct(payload: ProductPayload): Promise<Product> {
  const row = await writeProduct("POST", "", payload);
  return mapApiRowToProduct(row!);
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  const row = await writeProduct("PATCH", `/${id}`, payload);
  return mapApiRowToProduct(row!);
}

/** Partial update used by bulk price/MOQ sheet. */
export async function patchProductPriceAndMoq(id: string, pricePerPc: number, moq: number): Promise<void> {
  await writeProduct("PATCH", `/${id}`, { price_per_pc: pricePerPc, moq });
}

/** Quick toggle from admin product table. */
export async function patchProductLanding(
  id: string,
  showOnLanding: boolean,
  landingSort?: number,
): Promise<void> {
  await writeProduct("PATCH", `/${id}`, {
    show_on_landing: showOnLanding,
    ...(landingSort !== undefined ? { landing_sort: landingSort } : {}),
  });
}

/** Quick toggle from the admin Categories page — whether a product appears
 * in its category's curated home-page collection row on the mobile app. */
export async function patchProductCategoryHome(id: string, showInCategoryHome: boolean): Promise<void> {
  await writeProduct("PATCH", `/${id}`, { show_in_category_home: showInCategoryHome });
}

export async function deleteProduct(id: string): Promise<void> {
  await writeProduct("DELETE", `/${id}`);
}

export async function uploadProductImages(files: File[], slug?: string): Promise<string[]> {
  const headers = await authHeaders();
  if (!headers.Authorization) throw new Error("You must be signed in as admin to upload images.");

  const form = new FormData();
  for (const file of files) form.append("files", file);
  if (slug) form.append("slug", slug);

  const res = await fetch(`${BACKEND_URL}/api/media/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  const body = (await res.json().catch(() => ({}))) as { success?: boolean; urls?: string[]; error?: string };
  if (!res.ok || !body.success) {
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

  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/media/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ urls, slug, purpose: "products" }),
  });

  const body = (await res.json().catch(() => ({}))) as { success?: boolean; urls?: string[]; error?: string };
  if (!res.ok || !body.success || !body.urls?.length) {
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

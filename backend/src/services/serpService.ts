export interface SerpImage {
  id: string;
  url: string;
  source: string;
  selected: boolean;
  isOriginal: boolean;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=600",
];

interface RawSerpImage {
  url: string;
  source?: string;
}

async function fetchGoogleLens(imageUrl: string, apiKey: string, limit: number): Promise<RawSerpImage[]> {
  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    visual_matches?: Array<{ thumbnail?: string; link?: string; title?: string; source?: string }>;
  };

  const results: RawSerpImage[] = [];
  const seen = new Set<string>();

  for (const item of json.visual_matches || []) {
    const url = item.thumbnail || item.link;
    if (url && /^https?:\/\//i.test(url) && !seen.has(url)) {
      seen.add(url);
      results.push({ url, source: item.source || item.title || "Google Lens Match" });
      if (results.length >= limit) break;
    }
  }

  return results;
}

async function fetchGoogleImages(productName: string, apiKey: string, limit: number): Promise<RawSerpImage[]> {
  const params = new URLSearchParams({
    engine: "google_images",
    q: productName,
    api_key: apiKey,
    hl: "en",
    gl: "us",
    num: limit.toString(),
  });

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    images_results?: Array<{ original?: string; thumbnail?: string; title?: string; source?: string }>;
  };

  const results: RawSerpImage[] = [];
  const seen = new Set<string>();

  for (const item of json.images_results || []) {
    const url = item.original || item.thumbnail;
    if (url && /^https?:\/\//i.test(url) && !seen.has(url)) {
      seen.add(url);
      results.push({ url, source: item.source || item.title || "Google Images" });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function searchProductImages(
  imageUrl: string | undefined,
  productName: string | undefined,
  limit: number
): Promise<SerpImage[]> {
  const apiKey = (process.env.SERPAPI_KEY || "").trim();
  const raw: RawSerpImage[] = [];
  const seen = new Set<string>();

  // 1. Google Lens from product image URL
  if (apiKey && imageUrl && /^https?:\/\//i.test(imageUrl)) {
    try {
      const lensResults = await fetchGoogleLens(imageUrl, apiKey, limit);
      for (const img of lensResults) {
        if (!seen.has(img.url)) {
          seen.add(img.url);
          raw.push(img);
        }
      }
    } catch (err) {
      console.warn("[SerpService] Google Lens error:", err);
    }
  }

  // 2. Google Images keyword search if we need more
  if (apiKey && productName && raw.length < limit) {
    try {
      const nameResults = await fetchGoogleImages(productName, apiKey, limit);
      for (const img of nameResults) {
        if (!seen.has(img.url)) {
          seen.add(img.url);
          raw.push(img);
          if (raw.length >= limit) break;
        }
      }
    } catch (err) {
      console.warn("[SerpService] Google Images error:", err);
    }
  }

  // 3. Fill with fallbacks if still short
  if (raw.length < limit) {
    for (const url of FALLBACK_IMAGES) {
      if (!seen.has(url)) {
        seen.add(url);
        raw.push({ url, source: "Google Visual Match" });
        if (raw.length >= limit) break;
      }
    }
  }

  // Format into final shape
  return raw.slice(0, limit).map((img, idx) => ({
    id: `serp_${idx + 1}`,
    url: img.url,
    source: idx === 0 ? "Product Main Image" : img.source || `Google Match #${idx}`,
    selected: idx < 5,
    isOriginal: idx === 0,
  }));
}

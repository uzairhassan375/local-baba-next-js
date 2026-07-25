/** Find similar product images via SerpAPI Google Lens (visual matches). */

const SERP_TIMEOUT_MS = 45_000;

export type SerpSimilarImage = {
  url: string;
  title?: string;
  source?: string;
};

function pickImageUrl(match: Record<string, unknown>): string | null {
  const full = typeof match.image === "string" ? match.image.trim() : "";
  const thumb = typeof match.thumbnail === "string" ? match.thumbnail.trim() : "";
  const url = full || thumb;
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}

/**
 * Upload original to Bunny first so we have a public URL, then call:
 * engine=google_lens&type=visual_matches&url=...
 * Returns up to `limit` unique image URLs.
 */
export async function findSimilarImagesWithSerpApi(opts: {
  apiKey: string;
  imageUrl: string;
  limit?: number;
}): Promise<SerpSimilarImage[]> {
  const limit = Math.max(1, Math.min(20, opts.limit ?? 10));
  const params = new URLSearchParams({
    engine: "google_lens",
    type: "visual_matches",
    url: opts.imageUrl,
    api_key: opts.apiKey,
    hl: "en",
  });

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    method: "GET",
    signal: AbortSignal.timeout(SERP_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SerpAPI failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    error?: string;
    visual_matches?: Array<Record<string, unknown>>;
    products?: Array<Record<string, unknown>>;
  };

  if (json.error) {
    throw new Error(`SerpAPI error: ${json.error}`);
  }

  const matches = [...(json.visual_matches ?? []), ...(json.products ?? [])];
  const seen = new Set<string>();
  const out: SerpSimilarImage[] = [];

  for (const match of matches) {
    const url = pickImageUrl(match);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      title: typeof match.title === "string" ? match.title : undefined,
      source: typeof match.source === "string" ? match.source : undefined,
    });
    if (out.length >= limit) break;
  }

  return out;
}

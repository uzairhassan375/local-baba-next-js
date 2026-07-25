export const LISTING_TIMEOUT_MS = 45_000;

export type ListingJson = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  key_features: string[];
  suggested_attributes: Record<string, string>;
};

export function emptyListing(): ListingJson {
  return {
    title: "",
    description: "",
    category: "",
    tags: [],
    key_features: [],
    suggested_attributes: {},
  };
}

export function parseListingJson(raw: unknown): ListingJson {
  if (!raw || typeof raw !== "object") return emptyListing();
  const o = raw as Record<string, unknown>;
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
  const key_features = Array.isArray(o.key_features)
    ? o.key_features.filter((t): t is string => typeof t === "string")
    : [];
  let suggested_attributes: Record<string, string> = {};
  if (o.suggested_attributes && typeof o.suggested_attributes === "object" && !Array.isArray(o.suggested_attributes)) {
    suggested_attributes = Object.fromEntries(
      Object.entries(o.suggested_attributes as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string" || typeof v === "number")
        .map(([k, v]) => [k, String(v)]),
    );
  }
  return {
    title: typeof o.title === "string" ? o.title : "",
    description: typeof o.description === "string" ? o.description : "",
    category: typeof o.category === "string" ? o.category : "",
    tags,
    key_features,
    suggested_attributes,
  };
}

export function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object in model response");
  }
}

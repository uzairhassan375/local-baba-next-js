import { uploadBufferToBunny } from "@/lib/bunny/storage";

export const GEMINI_TIMEOUT_MS = 60_000;
export const LISTING_TIMEOUT_MS = 45_000;

export const ANGLE_PROMPTS = [
  "front view on white background",
  "45-degree angle on white background",
  "side view on white background",
  "back view on white background",
  "close-up detail shot on white background",
  "lifestyle shot on neutral background",
  "top-down view on white background",
] as const;

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

function extractJsonObject(text: string): unknown {
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

export async function generateGeminiProductImage(opts: {
  apiKey: string;
  mimeType: string;
  base64: string;
  anglePrompt: string;
}): Promise<{ mimeType: string; bytes: Buffer }> {
  const prompt = [
    "You are generating an additional ecommerce product photo for the exact same product shown in the reference image.",
    "Preserve product identity: shape, colors, materials, branding, logos, and proportions must stay consistent with the reference.",
    "Do not invent a different product. Photorealistic, sharp, commercial product photography.",
    `Shot requirement: ${opts.anglePrompt}.`,
    "Return one image only.",
  ].join(" ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: opts.mimeType,
                  data: opts.base64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini image generation failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const data = inline?.data;
    if (!data) continue;
    const mime =
      inline && "mimeType" in inline && inline.mimeType
        ? inline.mimeType
        : inline && "mime_type" in inline && inline.mime_type
          ? inline.mime_type
          : "image/png";
    return { mimeType: mime, bytes: Buffer.from(data, "base64") };
  }

  throw new Error("Gemini returned no image data");
}

/** Listing copy via Gemini (text model) — no OpenAI. */
export async function generateListingCopyWithGemini(opts: {
  apiKey: string;
  mimeType: string;
  base64: string;
}): Promise<ListingJson> {
  const prompt = [
    "You write ecommerce product listings for LocalBaba.",
    "Analyze the product image and return ONLY valid JSON (no markdown) with keys:",
    'title (string), description (string), category (string; prefer one of Fashion, Electronics, Home, Beauty, Kids when possible),',
    "tags (string array of short marketing tags), key_features (string array),",
    "suggested_attributes (object of visible attributes like color/material/size).",
    "Do not invent a price or quantity.",
  ].join(" ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(LISTING_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: opts.mimeType,
                  data: opts.base64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini listing failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  if (!text.trim()) throw new Error("Gemini returned empty listing content");

  try {
    return parseListingJson(extractJsonObject(text));
  } catch {
    throw new Error("Gemini returned invalid listing JSON");
  }
}

export async function generateAndUploadProductImages(opts: {
  apiKey: string;
  userId: string;
  mimeType: string;
  base64: string;
  count: number;
  folder?: string;
}): Promise<{ urls: string[]; errors: number }> {
  const count = Math.max(1, Math.min(7, opts.count));
  const folder = opts.folder ?? `${opts.userId}/ai-listings/${crypto.randomUUID()}`;
  const prompts = ANGLE_PROMPTS.slice(0, count);

  const results = await Promise.all(
    prompts.map(async (anglePrompt, index) => {
      try {
        const generated = await generateGeminiProductImage({
          apiKey: opts.apiKey,
          mimeType: opts.mimeType,
          base64: opts.base64,
          anglePrompt,
        });
        const outExt = extensionForMime(generated.mimeType);
        const url = await uploadBufferToBunny({
          bytes: generated.bytes,
          contentType: generated.mimeType,
          objectPath: `${folder}/gen-${Date.now()}-${index + 1}.${outExt}`,
        });
        return { ok: true as const, url };
      } catch (e) {
        console.error(`Gemini angle "${anglePrompt}" failed`, e);
        return { ok: false as const };
      }
    }),
  );

  return {
    urls: results.filter(r => r.ok).map(r => r.url),
    errors: results.filter(r => !r.ok).length,
  };
}

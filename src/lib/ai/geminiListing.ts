import {
  emptyListing,
  extensionForMime,
  extractJsonObject,
  LISTING_TIMEOUT_MS,
  parseListingJson,
  type ListingJson,
} from "./listingTypes";

export {
  emptyListing,
  extensionForMime,
  parseListingJson,
  type ListingJson,
} from "./listingTypes";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"] as const;

type GeminiGenerateResponse = {
  error?: { message?: string; status?: string; code?: number };
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function buildListingPrompt(details: string): string {
  return [
    "You write ecommerce product listings for LocalBaba (Pakistan wholesale / B2B catalogue).",
    "The admin provided product details below. Use those as the primary source of truth.",
    "If an image is attached, use it to enrich color, material, style, and visual attributes.",
    "Write a clear commercial title and a polished product description yourself — do not copy the notes verbatim;",
    "expand them into proper listing copy while staying faithful to the facts given.",
    "Return ONLY valid JSON (no markdown) with keys:",
    'title (string — compelling product name), description (string — 2–5 short paragraphs or bullet-friendly prose),',
    "category (string; prefer one of Fashion, Electronics, Home, Beauty, Kids when possible),",
    "tags (string array of short marketing tags), key_features (string array),",
    "suggested_attributes (object of attributes like color/material/size when known).",
    "Do not invent a price or quantity.",
    "",
    "Admin product details:",
    details,
  ].join("\n");
}

function extractText(json: GeminiGenerateResponse): string {
  if (json.error?.message) {
    throw new Error(json.error.message);
  }
  if (json.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the prompt (${json.promptFeedback.blockReason}${
        json.promptFeedback.blockReasonMessage ? `: ${json.promptFeedback.blockReasonMessage}` : ""
      })`,
    );
  }
  const candidate = json.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates");
  }
  if (candidate.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
    throw new Error(`Gemini finished with ${candidate.finishReason}`);
  }
  const text = candidate.content?.parts?.map(p => p.text || "").join("") || "";
  if (!text.trim()) {
    throw new Error(`Gemini returned empty text (finishReason=${candidate.finishReason || "unknown"})`);
  }
  return text;
}

async function callGemini(opts: {
  apiKey: string;
  model: string;
  parts: Array<Record<string, unknown>>;
  useJsonMime: boolean;
}): Promise<ListingJson> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(LISTING_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: "user", parts: opts.parts }],
        generationConfig: opts.useJsonMime ? { responseMimeType: "application/json" } : undefined,
      }),
    },
  );

  const raw = await res.text();
  let json: GeminiGenerateResponse;
  try {
    json = JSON.parse(raw) as GeminiGenerateResponse;
  } catch {
    throw new Error(`Gemini listing failed (${res.status}): ${raw.slice(0, 240)}`);
  }

  if (!res.ok) {
    throw new Error(
      json.error?.message || `Gemini listing failed (${res.status}): ${raw.slice(0, 240)}`,
    );
  }

  try {
    return parseListingJson(extractJsonObject(extractText(json)));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Gemini returned invalid listing JSON");
  }
}

/** Listing copy via Gemini — uses admin-provided product details + image. */
export async function generateListingCopyWithGemini(opts: {
  apiKey: string;
  mimeType: string;
  base64: string;
  productDetails: string;
}): Promise<ListingJson> {
  const details = opts.productDetails.trim();
  if (!details) throw new Error("Product details are required");

  const prompt = buildListingPrompt(details);
  const withImageParts = [
    {
      inlineData: {
        mimeType: opts.mimeType,
        data: opts.base64,
      },
    },
    { text: prompt },
  ];
  const textOnlyParts = [{ text: prompt }];

  const attempts: Array<{ model: string; parts: Array<Record<string, unknown>>; useJsonMime: boolean; label: string }> =
    [];
  for (const model of GEMINI_MODELS) {
    attempts.push({ model, parts: withImageParts, useJsonMime: true, label: `${model}+image+json` });
    attempts.push({ model, parts: withImageParts, useJsonMime: false, label: `${model}+image` });
    attempts.push({ model, parts: textOnlyParts, useJsonMime: true, label: `${model}+text+json` });
  }

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const listing = await callGemini({
        apiKey: opts.apiKey,
        model: attempt.model,
        parts: attempt.parts,
        useJsonMime: attempt.useJsonMime,
      });
      if (!listing.title && !listing.description) {
        throw new Error("Parsed listing was empty");
      }
      return listing;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error(`Gemini listing attempt failed (${attempt.label}):`, msg);
      errors.push(`${attempt.label}: ${msg}`);
    }
  }

  throw new Error(errors[0] || "Gemini listing failed");
}

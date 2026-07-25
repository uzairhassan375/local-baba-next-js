function encodePathForUrl(path: string): string {
  return path
    .split("/")
    .map(s => encodeURIComponent(s))
    .join("/");
}

export function getBunnyConfig() {
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const apiBase = process.env.BUNNY_STORAGE_API_BASE?.replace(/\/$/, "");
  const cdnBase = process.env.BUNNY_STORAGE_CDN_BASE?.replace(/\/$/, "");
  if (!apiKey || !apiBase || !cdnBase) {
    throw new Error("Bunny storage is not configured on the server.");
  }
  return { apiKey, apiBase, cdnBase };
}

/** Upload bytes to Bunny Storage; returns the public CDN URL. */
export async function uploadBufferToBunny(opts: {
  bytes: Buffer | Uint8Array;
  contentType: string;
  objectPath: string;
}): Promise<string> {
  const { apiKey, apiBase, cdnBase } = getBunnyConfig();
  const putUrl = `${apiBase}/${encodePathForUrl(opts.objectPath)}`;
  const body = Uint8Array.from(opts.bytes);

  const upstream = await fetch(putUrl, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": opts.contentType || "application/octet-stream",
    },
    body,
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("Bunny storage upload failed", upstream.status, detail);
    throw new Error(`Bunny upload failed (${upstream.status})`);
  }

  return `${cdnBase}/${encodePathForUrl(opts.objectPath)}`;
}

/** Delete an object from Bunny Storage by its public CDN URL. No-op if the URL isn't ours. */
export async function deleteFromBunnyByUrl(cdnUrl: string): Promise<void> {
  const { apiKey, apiBase, cdnBase } = getBunnyConfig();
  if (!cdnUrl.startsWith(`${cdnBase}/`)) return; // never touch URLs we don't own

  const objectPath = cdnUrl.slice(`${cdnBase}/`.length); // already percent-encoded
  const delUrl = `${apiBase}/${objectPath}`;
  const res = await fetch(delUrl, { method: "DELETE", headers: { AccessKey: apiKey } });
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "");
    console.error("Bunny storage delete failed", res.status, detail);
  }
}

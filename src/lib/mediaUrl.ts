/** Heuristic URL check for CDN paths stored in `products.images`. */
export function isLikelyVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|#|$)/i.test(path);
  } catch {
    return /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|#|$)/i.test(url);
  }
}

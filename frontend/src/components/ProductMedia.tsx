import type { ImgHTMLAttributes } from "react";

import { isLikelyVideoUrl } from "@/lib/mediaUrl";

type ImgProps = ImgHTMLAttributes<HTMLImageElement>;

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Passed to `<img>` only */
  loading?: ImgProps["loading"];
  /** When the URL is a video, show native controls (e.g. main product media). */
  videoControls?: boolean;
};

export function ProductMedia({ src, alt, className, loading, videoControls }: Props) {
  if (isLikelyVideoUrl(src)) {
    return (
      <video
        src={src}
        muted={!videoControls}
        playsInline
        controls={videoControls}
        preload="metadata"
        className={className}
        aria-label={alt}
      />
    );
  }
  return <img src={src} alt={alt} className={className} loading={loading} />;
}

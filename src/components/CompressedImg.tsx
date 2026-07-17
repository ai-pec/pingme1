import { useEffect, useState } from "react";
import { buildCompressedImageUrl } from "@/lib/productCatalog";

/**
 * Serves the compressed products/thumbs/ variant of a Firebase Storage image,
 * falling back to the original URL if the thumbnail doesn't exist yet
 * (e.g. a freshly uploaded product before compress-product-images.cjs re-runs).
 * A second failure is delegated to the caller's onError (emoji fallbacks etc.).
 */
export const useCompressedImage = (
  originalSrc: string | undefined,
  onFinalError?: React.ReactEventHandler<HTMLImageElement>,
) => {
  const compressed = originalSrc ? buildCompressedImageUrl(originalSrc) : "";
  const [failedThumb, setFailedThumb] = useState(false);

  useEffect(() => setFailedThumb(false), [originalSrc]);

  const src = !failedThumb && compressed ? compressed : originalSrc;

  const onError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    if (!failedThumb && compressed && compressed !== originalSrc) {
      setFailedThumb(true);
      return;
    }
    onFinalError?.(e);
  };

  return { src, onError };
};

export const CompressedImg = ({ src, onError, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const state = useCompressedImage(src, onError);
  return <img {...rest} src={state.src} onError={state.onError} />;
};

export default CompressedImg;

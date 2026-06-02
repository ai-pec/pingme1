import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const upsertMeta = (selector: string, attribute: string, value: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;

  if (!element) {
    element = selector.startsWith("link") ? document.createElement("link") : document.createElement("meta");
    document.head.appendChild(element);
  }

  element.setAttribute(attribute, value);
};

export default function Seo({ title, description, canonicalPath, jsonLd }: SeoProps) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", description);

    if (canonicalPath) {
      const canonicalHref = new URL(canonicalPath, window.location.origin).toString();
      let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }

      canonical.href = canonicalHref;
    }
  }, [canonicalPath, description, title]);

  if (!jsonLd) {
    return null;
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
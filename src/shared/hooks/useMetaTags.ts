import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MetaTagsProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.other';
  imageAlt?: string;
  siteName?: string;
  twitterImageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  locale?: string;
  alternateLocales?: string[];
  alternates?: Array<{ hrefLang: string; href: string }>;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_ALTERNATE_LOCALES = ['en_US', 'es_ES', 'fr_FR'];
const DEFAULT_HREFLANG_ALTERNATES = [
  { hrefLang: 'pt-PT', href: 'https://tube.open2.tech/' },
  { hrefLang: 'x-default', href: 'https://tube.open2.tech/' },
];

export const useMetaTags = ({
  title,
  description,
  image = 'https://tube.open2.tech/social-preview-default.png',
  url,
  type = 'website',
  imageAlt = 'Pré-visualização do Tube O2',
  siteName = 'Tube O2',
  twitterImageAlt,
  imageWidth,
  imageHeight,
  imageType,
  locale = 'pt_PT',
  alternateLocales = DEFAULT_ALTERNATE_LOCALES,
  alternates = DEFAULT_HREFLANG_ALTERNATES,
  jsonLd,
}: MetaTagsProps) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    document.title = title;

    const upsertMetaTag = (
      selectorAttr: 'name' | 'property',
      selectorValue: string,
      content: string | null | undefined,
    ) => {
      const nodes = document.querySelectorAll(`meta[${selectorAttr}="${selectorValue}"]`);
      const existing = nodes[0] as HTMLMetaElement | undefined;
      const duplicates = Array.from(nodes).slice(1);

      for (const duplicate of duplicates) {
        duplicate.remove();
      }

      if (content === null || content === undefined || content === '') {
        existing?.remove();
        return;
      }

      const target = existing ?? document.createElement('meta');
      target.setAttribute(selectorAttr, selectorValue);
      target.setAttribute('content', content);

      if (!existing) {
        document.head.appendChild(target);
      }
    };

    // Update meta tags
    upsertMetaTag('name', 'description', description);

    const canonicalUrl = url || window.location.href;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    document.querySelectorAll('link[data-managed-hreflang="true"]').forEach((node) => node.remove());
    for (const alternate of alternates) {
      const alternateLink = document.createElement('link');
      alternateLink.setAttribute('rel', 'alternate');
      alternateLink.setAttribute('hreflang', alternate.hrefLang);
      alternateLink.setAttribute('href', alternate.href);
      alternateLink.setAttribute('data-managed-hreflang', 'true');
      document.head.appendChild(alternateLink);
    }

    // Open Graph tags
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:type', type);
    upsertMetaTag('property', 'og:image', image);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:site_name', siteName);
    upsertMetaTag('property', 'og:image:alt', imageAlt);
    upsertMetaTag('property', 'og:image:width', imageWidth?.toString());
    upsertMetaTag('property', 'og:image:height', imageHeight?.toString());
    upsertMetaTag('property', 'og:image:type', imageType);
    upsertMetaTag('property', 'og:locale', locale);
    document.querySelectorAll('meta[data-managed-og-locale-alternate="true"]').forEach((node) => node.remove());
    for (const alternateLocale of alternateLocales) {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:locale:alternate');
      tag.setAttribute('content', alternateLocale);
      tag.setAttribute('data-managed-og-locale-alternate', 'true');
      document.head.appendChild(tag);
    }

    // Twitter tags
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', image);
    upsertMetaTag('name', 'twitter:image:alt', twitterImageAlt ?? imageAlt);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:url', canonicalUrl);

    const jsonLdScriptId = 'managed-json-ld';
    const existingJsonLd = document.getElementById(jsonLdScriptId);
    if (!jsonLd) {
      existingJsonLd?.remove();
    } else {
      const target = existingJsonLd ?? document.createElement('script');
      target.id = jsonLdScriptId;
      target.setAttribute('type', 'application/ld+json');
      target.textContent = JSON.stringify(jsonLd);
      if (!existingJsonLd) {
        document.head.appendChild(target);
      }
    }
  }, [
    title,
    description,
    image,
    url,
    type,
    imageAlt,
    siteName,
    twitterImageAlt,
    imageWidth,
    imageHeight,
    imageType,
    locale,
    alternateLocales,
    alternates,
    jsonLd,
    location,
  ]);
};

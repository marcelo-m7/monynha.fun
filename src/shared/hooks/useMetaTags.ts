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
}

export const useMetaTags = ({
  title,
  description,
  image = 'https://monynha.fun/placeholder.png',
  url,
  type = 'website',
  imageAlt = 'Pré-visualização do Monynha Fun',
  siteName = 'Monynha Fun',
  twitterImageAlt,
  imageWidth,
  imageHeight,
  imageType,
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

    // Twitter tags
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', image);
    upsertMetaTag('name', 'twitter:image:alt', twitterImageAlt ?? imageAlt);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:url', canonicalUrl);
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
    location,
  ]);
};

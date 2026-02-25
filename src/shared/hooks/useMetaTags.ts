import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MetaTagsProps {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.other';
}

export const useMetaTags = ({
  title,
  description,
  image = 'https://monynha.com/opengraph-image-monynha-fun.png',
  imageAlt = 'Monynha Fun preview image',
  url,
  type = 'website',
}: MetaTagsProps) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', description);

    const canonicalUrl = url || `${window.location.origin}${location.pathname}`;

    const upsertLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    upsertLinkTag('canonical', canonicalUrl);

    // Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOGTag('og:title', title);
    updateOGTag('og:description', description);
    updateOGTag('og:type', type);
    updateOGTag('og:image', image);
    updateOGTag('og:image:alt', imageAlt);
    updateOGTag('og:url', canonicalUrl);

    // Twitter tags
    const updateTwitterTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateTwitterTag('twitter:title', title);
    updateTwitterTag('twitter:description', description);
    updateTwitterTag('twitter:image', image);
    updateTwitterTag('twitter:card', 'summary_large_image');
  }, [title, description, image, imageAlt, url, type, location.pathname]);
};

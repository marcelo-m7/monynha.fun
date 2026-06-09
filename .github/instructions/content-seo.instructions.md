---
description: "Use when editing docs, marketing copy, SEO metadata, structured data, sitemap/robots/manifest files, or brand assets and copy."
name: "Docs Branding SEO Rules"
applyTo: "{README.md,docs/**/*.md,index.html,server/server.ts,public/robots.txt,public/sitemap.xml,public/site.webmanifest,public/brand/o2t/README.md}"
---
# Docs, Branding, and SEO Rules

- Preserve the current brand split in public-facing copy: `Tube O2` is the product, `Open 2 Technology` or `O2T` is the organization. Do not reintroduce legacy `Monynha` branding unless the text is explicitly historical.
- Use `https://tube.open2.tech` for product canonicals, sitemap entries, social metadata, and user-facing URLs. Use `https://open2.tech` only for corporate references.
- Keep shared metadata aligned across [index.html](../../index.html) and [server/server.ts](../../server/server.ts). If title, description, canonical URL, OG/Twitter tags, or structured-data fields change in one place, update the other when the same default or brand rule applies.
- Treat [public/social-preview-default.png](../../public/social-preview-default.png) as the default social share image currently used by metadata. Do not swap preview assets without updating metadata references and verifying the image still fits a `1200x630` share card.
- When editing [public/site.webmanifest](../../public/site.webmanifest), keep the app name, short name, theme colors, and icon set consistent with the current product branding and favicon assets in [public](../../public).
- When editing [public/robots.txt](../../public/robots.txt) or [public/sitemap.xml](../../public/sitemap.xml), keep the host, canonical domain, and crawl policy aligned with the live product routes. Do not add private or authenticated routes.
- Prefer linking to existing brand and design references instead of duplicating guidance. Use [public/brand/o2t/README.md](../../public/brand/o2t/README.md) for brand assets and [docs/visual-elevation.md](../../docs/visual-elevation.md) for visual system context.
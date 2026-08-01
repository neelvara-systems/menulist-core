import {
  MENULIST_SITE_IMAGE,
  MENULIST_SITE_IMAGE_ALT,
} from "@constant/menulist/website";
import type { Metadata } from "next";

const defaultWebsiteImage = {
  url: MENULIST_SITE_IMAGE,
  width: 1200,
  height: 630,
  alt: MENULIST_SITE_IMAGE_ALT,
};

/**
 * Completes route-specific website metadata without replacing its canonical,
 * title, description, or Open Graph article fields.
 *
 * Next.js replaces nested metadata objects at the leaf route. Keeping this
 * completion in one place prevents child pages from silently losing the
 * approved share image or inheriting the homepage Twitter title.
 */
export function completeWebsiteMetadata(metadata: Metadata): Metadata {
  const openGraph = metadata.openGraph;
  const completedOpenGraph = openGraph
    ? {
        siteName: "MenuList",
        locale: "en_US",
        type: "website" as const,
        ...openGraph,
        images: openGraph.images || [defaultWebsiteImage],
      }
    : undefined;

  const twitterTitle = typeof completedOpenGraph?.title === 'string'
    ? completedOpenGraph.title
    : typeof metadata.title === 'string'
      ? metadata.title
      : undefined;
  const twitterDescription = typeof completedOpenGraph?.description === 'string'
    ? completedOpenGraph.description
    : typeof metadata.description === 'string'
      ? metadata.description
      : undefined;

  return {
    ...metadata,
    openGraph: completedOpenGraph,
    twitter: {
      card: "summary_large_image",
      ...(twitterTitle ? { title: twitterTitle } : {}),
      ...(twitterDescription ? { description: twitterDescription } : {}),
      images: [MENULIST_SITE_IMAGE],
    },
  };
}

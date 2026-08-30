import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL;
  const now = new Date();
  // Public storefront pages only — admin and account routes are excluded.
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/menu`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, priority: 0.2 },
    { url: `${base}/refund-policy`, lastModified: now, priority: 0.2 }
  ];
}

import type { MetadataRoute } from "next";

const BASE = "https://gapproof.forblune.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/why", "/who", "/about", "/guide", "/how-it-works", "/technology"].map((path) => ({
    url: `${BASE}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

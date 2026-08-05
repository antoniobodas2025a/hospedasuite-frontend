import type { MetadataRoute } from "next";
import { getRoomSitemapEntriesAction } from "@/app/actions/room-detail";

const BASE_URL = "https://hospedasuite.com";
const PAGE_SIZE = 100;

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const entries = await getRoomSitemapEntriesAction();
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  return Array.from({ length: pages }, (_, index) => ({ id: index }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const resolvedId = Number(await id);
  const entries = await getRoomSitemapEntriesAction();
  const start = resolvedId * PAGE_SIZE;
  const slice = entries.slice(start, start + PAGE_SIZE);

  return slice.map((entry) => ({
    url: `${BASE_URL}/hotel/${entry.slug}/room/${entry.id}`,
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}

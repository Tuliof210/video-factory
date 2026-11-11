import type { StockProvider } from "../config";
import { searchStock as searchPexels } from "./pexels";
import { searchStock as searchPixabay } from "./pixabay";

export const stockCredits: Record<StockProvider, string> = {
  pexels: "Photos and videos provided by Pexels: https://www.pexels.com",
  pixabay: "Photos and videos provided by Pixabay: https://pixabay.com",
};

export function searchStock(
  provider: StockProvider,
  kind: "image" | "video",
  query: string,
  orientation: "landscape" | "portrait",
  limit = 10,
) {
  const search = provider === "pixabay" ? searchPixabay : searchPexels;
  return search(kind, query, orientation, limit);
}

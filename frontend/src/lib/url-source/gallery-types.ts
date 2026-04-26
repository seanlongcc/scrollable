export type GalleryFetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type GalleryResolverOptions = {
  fetch?: GalleryFetchLike;
  now?: () => string;
  maxItems?: number;
  nhentaiApiKey?: string;
};

export type GalleryContext = {
  fetcher: GalleryFetchLike;
  maxItems: number;
  nhentaiApiKey?: string;
};

export type GalleryExtraction = {
  title?: string;
  imageUrls: string[];
};

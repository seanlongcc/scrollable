export function titleFromUrl(value: string) {
  const url = new URL(value);
  const leaf = url.pathname.split("/").filter(Boolean).at(-1);
  return leaf
    ? decodeURIComponent(leaf).replace(/\.[a-z0-9]+$/i, "")
    : url.host;
}

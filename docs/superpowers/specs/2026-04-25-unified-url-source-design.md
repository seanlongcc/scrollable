# Unified URL Source Design

Scrollable will add one generic URL source for user-pasted `http` and `https` links. Local uploads stay separate because browser file access, object URLs, and IndexedDB cache behavior are materially different from web URL fetching.

## Source Model

New saved URL sources use:

```ts
type UrlSourceConfig = {
  kind: "url";
  url: string;
  title?: string;
  resolverHint?: "direct-media" | `provider:${string}` | "metadata" | "iframe";
};
```

The saved config stores only user-authored URL/title/settings plus the resolver hint. It must not store extracted media URLs, thumbnails, HTML, provider JSON, cookies, screenshots, normalized runtime items, or fetched payloads. Legacy saved Reddit configs remain loadable, but new Reddit links are created through the URL source path and use `provider:reddit` as the resolver hint after success. YouTube watch, short, and youtu.be links use `provider:youtube` with a runtime embed URL that is never persisted.

## Resolver Flow

New URL sources run this chain:

1. Direct media: the pasted URL itself is an image, video, or audio URL.
2. Known provider adapter: V1 includes Reddit by reusing the runtime Reddit listing endpoint.
3. Generic metadata: server-side best-effort OpenGraph/basic metadata fetch for title, description, site name, and optional runtime-only preview image.
4. Iframe fallback: static pane that points at the pasted URL.

Saved URL sources with `resolverHint` try the hinted resolver first. If the hint fails, the full chain runs in normal order. The stored hint changes only after a successful resolver returns a different mode.

## Runtime Rendering

Direct media and Reddit provider results render in the existing feed viewer. Generic metadata, iframe, and unsupported states render as static URL panes. Static panes ignore timer advancement and carousel controls. Iframe fallback is lazy-loaded only when its source pane is visible, and hidden-layer iframe panes are unmounted by the existing active-layer visibility flow plus URL pane gating.

The app caps active iframe fallback panes to reduce mobile memory pressure. Desktop allows more active iframes than mobile; blocked panes show an external-open action instead of mounting another iframe. No URL source auto-reloads after initial resolution.

## UI

The add-source dialog keeps local upload controls and replaces the Reddit-specific link entry with URL source entry. The existing subreddit helper controls can still construct Reddit listing URLs for convenience, but opening them creates URL source configs. Editing a URL source lets users change the user-entered URL/title and refetch runtime resolution. Legacy Reddit source editing remains available only for already-saved legacy `kind: "reddit"` sessions.

## Errors

Validation accepts only well-formed `http:` and `https:` URLs. It rejects `file:`, `data:`, `javascript:`, and malformed URLs before fetching. If every resolver fails or an iframe is blocked/capped, the pane shows an unsupported or blocked state with an external-open button.

## Tests

Tests cover URL validation, resolver ordering, resolver hints and fallback, metadata-only workspace persistence, adding a URL source in the UI, reopening a saved URL layout with a stored hint, blocked iframe fallback, and mobile-style multiple-source behavior.

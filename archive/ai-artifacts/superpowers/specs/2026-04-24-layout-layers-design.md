# Layout Layers Design

Scrollable layouts now support up to three stacked layers. Each source belongs to one layer, and all layers render at the same time so a background video or audio source can persist while the user edits another layer.

## Requirements

- Keep one fixed/free layout geometry per workspace.
- Store metadata-only layer data: layer IDs, names, active layer ID, and each source's `layerId`.
- Keep layer display names sequential as `Layer 1`, `Layer 2`, and `Layer 3`; deleting a middle layer renumbers later layers while preserving their source membership.
- Allow users to add and delete layers up to a maximum of three.
- Add new sources to the active layer.
- Use active-layer membership for empty-slot detection, source movement, resizing, duplication, and delete controls.
- Render inactive layers behind/above the active layer without exposing editing chrome.
- Show per-layer source and file counts near the existing layout status text.
- Support local audio file uploads through the same runtime-only local upload path as images and videos.

## Persistence

Third-party media persistence rules are unchanged. Saved layout metadata may contain layer records and source membership only. Local uploaded file bytes may remain in IndexedDB through the existing `cacheSetId` model; object URLs are runtime-only and never serialized.

## Testing

Focused tests cover workspace serialization, layer add/delete UI, per-layer counts, local audio upload, and local object URL media typing.

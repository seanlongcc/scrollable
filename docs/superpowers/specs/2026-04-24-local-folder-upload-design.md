# Local Folder Upload Design

## Context

Scrollable already supports local image/video file uploads as a runtime local source. Local uploads become browser object URLs for the active session and, when local file caching is available, copied file bytes can be stored in IndexedDB for saved local layouts. Saved layout metadata stores only `fileCount` and an optional `cacheSetId`.

## Goal

Add a folder-selection option to the local source picker so a user can select a directory of local image/video files without changing the persistence model.

## Behavior

- The Add source dialog keeps the existing local grouping control: stacked or separate.
- The local source panel offers two upload affordances: image/video files and an image/video folder.
- Folder selection uses browser directory upload attributes on a file input and accepts images and videos recursively from the selected folder when the browser supports it.
- The selected folder files flow through the same `addLocalFiles` handler as manual multi-file selection.
- Non-image/video files remain filtered out by the existing uploadable-file check.
- Stacked mode creates one local source containing all uploadable folder files.
- Separate mode creates one local source per uploadable folder file, using the same fixed/free layout capacity rules as ordinary file uploads.

## Privacy And Persistence

- Do not persist absolute local paths.
- Do not persist `webkitRelativePath`.
- Continue storing only user-selected local file byte copies in IndexedDB plus metadata-only `cacheSetId` references in saved layout metadata.
- Runtime object URLs stay session-local and are revoked through the existing registry.

## Testing

- Add a focused component test that verifies the folder input is rendered with directory-upload attributes.
- Add a focused component test that uploads multiple files through the folder input and verifies they create a local stacked source using the existing local upload path.

# Source Editing And Subreddit Input Design

Scrollable will let users add Reddit sources through a split Reddit input and edit existing source contents after a source is open.

## Add Source

- The add-source dialog keeps the shared `Stacked` / `Separate` source grouping control.
- The Reddit section adds a segmented control with `Subreddit` and `Links`.
- `Subreddit` mode accepts one or more bare subreddit names such as `kpop, pics, aww`.
- `Subreddit` mode has sort and time range selects. Supported sorts are `hot`, `new`, `rising`, `top`, and `controversial`. The default sort is `top`; time range applies to `top` and `controversial`, defaulting to `week`.
- `Links` mode keeps the textarea for one or more direct Reddit post links or sorted subreddit listing URLs.
- The links textarea placeholder documents direct post URLs and sorted subreddit URLs. Bare subreddit examples stay in the subreddit-name input placeholder.

## Edit Source

- Each source pane gets an edit button next to existing source controls.
- Editing a Reddit source opens a dialog with the current URLs, media count, and source mode controls. Users can remove individual URL entries and save, which refetches runtime media for the remaining entries.
- Editing a local source opens a dialog listing current runtime file items. Users can remove individual files and save. If browser file caching is available, the remaining original `File` objects are cached under a new cache set so saved layouts reopen with the edited file set.
- If a local source has no runtime files loaded, the dialog keeps the existing reload path rather than inventing local paths.
- A source cannot be saved with zero entries; users should use the existing remove-source button to remove the whole source.

## Persistence

Saved layouts continue storing metadata only. Reddit saved source configs store user-provided/canonical source URLs, media count, NSFW allowance, and optional opaque `sha256:` hashes for user-hidden Reddit runtime item IDs. Local saved source configs store file count and optional browser cache set ID. Layout serialization must not store raw Reddit item/post IDs, Reddit runtime payloads, Reddit media URLs, local object URLs, thumbnails, or absolute local paths.

## Testing

Tests cover bare and multi-subreddit URL construction, the split Reddit input, Reddit source editing/removal/refetch, local source item removal, local cache update, and metadata-only layout persistence after editing.

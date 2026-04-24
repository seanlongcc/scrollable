# Multi-View Feed Grid Design

## Context

Scrollable's "feed grid" should mean a live multi-view wall, not a list of feed cards. The user wants functionality similar to Reddclips' multi-view concept: multiple Reddit or local sources visible at the same time, each advancing independently, with optional global controls.

The existing app has a single full-screen `FeedViewer` and a setup page that lists open sessions as cards. This spec replaces that product direction with a live multi-view grid as the primary viewer experience.

## Goals

- Show multiple runtime feed sources at once.
- Default to a fixed `2x1` side-by-side layout.
- Support fixed equal-cell layouts from `1x1` through `8x8`.
- Support an optional free-layout mode on an `8x8` canvas where views can span multiple cells.
- Let every view have its own timer.
- Provide one master timer/control bar for all views.
- Let any view maximize into a focus layout similar to the selected "Focus + Satellites" mockup.
- Preserve the data rule: do not persist, rehost, proxy-cache, or store third-party media, media URLs, Reddit payloads, thumbnails, or normalized runtime media items.

## Non-Goals

- No third-party media persistence.
- No media previews in saved/shared collection browsing.
- No requirement to clone Reddclips visually.
- No drag-and-drop persistence of media payloads.
- No advanced collaboration or multi-user live layout editing in this phase.

## Viewer Model

The home page should become a live multi-view workspace:

- A top or compact edge control bar manages layout mode, fixed dimensions, master timer, and global playback actions.
- The main viewport is the live grid.
- Source creation stays available through an add-source panel or modal rather than a permanently dominant setup sidebar.
- Existing Reddit and local-upload source behavior remains runtime-only.
- Reddit is a runtime content source only; account login uses email/password or Google, not Reddit OAuth.

Each open source becomes a `FeedViewSession`:

- `id`
- `title`
- `items`
- `timerSeconds`
- `timerMode`: `own` or `master`
- `timerState`
- `layoutRect` for free mode only
- runtime-only source metadata needed to refetch or display the active session

## Layout Modes

### Fixed Layout

Fixed layout is the default.

- Default dimensions: `2` columns by `1` row.
- User can choose any columns `1-8` and rows `1-8`.
- All cells have equal size.
- Sessions fill cells in order.
- Empty cells show an add-source affordance.
- If sessions exceed visible cells, the app should either increase dimensions when user chooses a larger grid or keep overflow sessions in a tray/list that does not render media until placed.

Fixed mode should be the lowest-friction way to open two feeds side by side.

### Free Layout

Free layout is optional.

- Canvas uses an `8x8` grid.
- A view can occupy any rectangle aligned to the `8x8` grid.
- Minimum view size is `1x1`.
- Layout collisions are prevented before commit.
- Empty cells remain available for adding or placing sources.
- A simple first implementation can use resize controls or numeric row/column/span inputs before adding drag handles.

Free layout is for custom formations, such as one large view plus several smaller feeds, or uneven monitoring walls.

## Maximize Mode

Any view can be maximized from either fixed or free layout.

Maximized mode:

- Selected view becomes the large focused area.
- Other active views remain visible as smaller live satellite views.
- Master controls remain available.
- The focused view keeps its own timer setting unless it is explicitly set to master mode.
- User can restore the previous fixed/free layout without losing timer state or active indexes.
- User can switch focus by selecting a satellite view.

This is the product meaning of "maximize": not a single isolated fullscreen viewer, but a focus layout that keeps the multi-view context alive.

## Timer Behavior

Each view has a timer:

- Default per-view timer can inherit from the global default when the session is created.
- User can override each view's timer seconds.
- Per-view controls include pause/resume, restart, previous, and next.
- Multi-image gallery posts keep horizontal media navigation within that view.

Master controls:

- Master play/pause pauses or resumes all views that are not individually locked/paused.
- Master next advances all views one item.
- Master restart resets elapsed time for all views.
- Master timer seconds can be applied to all views or used only by views set to `master`.
- A view can be set to `own` timer or `master` timer.

The timer state should stay pure and testable. Existing timer helpers can be extended for multiple timers rather than embedding timing rules only in React components.

## Source And Runtime Data Flow

Reddit sources:

1. User configures subreddit, sort, range, limit, skip, timer, and NSFW runtime setting.
2. App fetches Reddit listing data at runtime.
3. App normalizes returned posts into runtime feed items.
4. Runtime items stay in memory only.
5. Opening/saving/sharing configurations stores user-created config only, not Reddit post IDs, media URLs, thumbnails, listing payloads, or normalized runtime media.

Local sources:

1. User selects image/video files.
2. App creates object URLs through the existing local object URL registry.
3. Object URLs remain session-only and are revoked when no longer needed.

Saved/shared collection browsing remains metadata-only until the user opens a runtime feed.

## UI Controls

Grid workspace controls:

- Layout mode segmented control: `Fixed`, `Free`.
- Fixed controls: columns and rows selectors or compact steppers, default `2x1`, max `8x8`.
- Free controls: arrange/edit toggle and selected-view size/position controls.
- Master controls: play/pause, previous, next, restart, timer seconds, apply-to-all.
- Add source button.

View controls:

- Maximize/restore.
- Pause/resume.
- Previous/next.
- Timer seconds.
- Timer mode: own/master.
- Remove view.
- Source title and active item count.

Controls should use icon buttons with tooltips where possible and remain compact so media stays primary.

## Responsive Behavior

The grid should preserve the chosen layout semantics rather than silently changing to a single feed.

- On desktop/tablet, the grid fills the viewport.
- On narrow mobile screens, fixed grids larger than the viewport may use horizontal or two-axis scrolling/zoom controls.
- The default `2x1` should remain side-by-side unless the user switches layout.
- Text overlays inside small cells must clamp and avoid overlapping controls.
- 8x8 layouts should be usable for monitoring, but individual tiny cells may show reduced metadata.

## Architecture

Suggested boundaries:

- `viewer`: multi-view grid, maximize mode, per-view controls.
- `viewer/timer`: pure multi-timer state and master timer actions.
- `viewer/layout`: fixed layout and free 8x8 layout utilities.
- `sources`: source adapters for Reddit and local uploads.
- `normalization`: runtime-only feed item construction.
- `configurations`: persisted feed config and display config validation.

The current `FeedViewer` can be refactored into a reusable single-view pane that works inside fixed cells, free cells, and maximized focus mode.

## Testing

Add focused tests for:

- Fixed layout default is `2x1`.
- Fixed layout accepts rows/columns `1-8` and rejects invalid dimensions.
- Free layout accepts valid 8x8 rectangles and rejects collisions/out-of-bounds rectangles.
- Maximize/restore preserves active item indexes and timer state.
- Master controls advance, pause, resume, and restart all eligible views.
- Per-view timer override remains independent from master timer.
- Saved/shared browsing still renders no third-party media previews.
- Runtime Reddit items and media URLs are not persisted.
- Mobile viewport keeps grid controls reachable and avoids overlay collisions.

## Acceptance Criteria

- Home viewer opens into a live multi-view workspace.
- Default layout is fixed `2x1` side-by-side.
- User can switch fixed grid dimensions up to `8x8`.
- User can switch to free 8x8 layout and assign view rectangles.
- Free-layout views can be selected, visually highlighted, dragged, and resized on the 8x8 canvas.
- Each view has its own timer setting.
- Default master/source timer is 10 seconds.
- Per-view timer controls make the `own` versus `master` distinction explicit.
- Master controls can control all views.
- Master controls stay visually compact and aligned with other toolbar actions.
- Any view can maximize into focus plus live satellite views.
- Focus view uses the full available viewer area rather than collapsing media to the lower half.
- Video media autoplays muted and inline.
- A content-only mode hides chrome, progress, and media controls while keeping a visible recovery affordance.
- The top logo is a clickable `scrollable.app` home link.
- The top logo is visually prominent and uses the brassy theme.
- The add-source panel avoids horizontal overflow.
- Users can save layout/workspace metadata locally without storing runtime media URLs, media IDs, thumbnails, listing payloads, or normalized media items.
- Users can open locally saved layouts from the viewer without login.
- Signed-in users can also sync saved workspace metadata to Supabase user data.
- Browser-like workspace tabs keep runtime items while the page is open, but local/account persistence remains metadata-only.
- Browser-like workspace tabs can be closed from the tab strip.
- Login and sign-up open as an overlay from the viewer.
- Fixed-grid sessions keep their assigned cell when neighboring cells are removed.
- Overflow sessions are not overlapped in a too-small fixed grid; they appear when the grid grows or remain listed as hidden.
- A visible duplication/fill action can clone one runtime source into multiple cells with staggered active indexes.
- Single-item feeds do not show a timer progress bar.
- No third-party media, media URLs, thumbnails, Reddit post IDs, listing payloads, or normalized runtime items are persisted.

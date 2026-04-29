# Workbench Mobile-First Control Map

Static planning artifact. No production app behavior, persistence, schema, or route changes.

## Implementation handoff notes

- App starts on one unsaved blank fixed 2x1 workspace, not Library.
- No separate Feed page. Current layout/workspace is always visible and is the playback zone.
- Mobile bottom bar has three icon-only buttons: Workbench, Library, Account. Use accessible labels, no visible text labels.
- Mobile rail buttons are icon-only, bottom-right overlays. Default rail shows Add Source, Hide UI, Timer, Workbench. Selected-source rail replaces it and must not overlap the selected-source playback pill.
- Mobile selected-source playback pill sits above the bottom nav when no sheet is open and hides whenever a sheet opens.
- Mobile Workbench sheet owns workspace controls only. It uses a Layer 1/2/3 segmented control because all three layers exist by default; there is no add/delete layer flow.
- Mobile grid size is user input with Columns and Rows fields, not a multiple-choice grid picker.
- Mobile Library sheet is for saved/open layouts and templates only. Use a segmented Layouts/Templates control.
- Add Source uses URL, Local, and Reddit segmented source types on mobile and desktop. Reddit has Subreddit/Links modes; default Reddit limit is 10.
- Mobile fixed layouts are editable. Mobile free layouts opened from saved layout/template are view/play only. Desktop/tablet owns free layout editing.
- Desktop/tablet use contextual panels and a left icon rail, not mobile bottom nav. Desktop tabs float centered above the workspace in fixed and free layouts.
- Desktop free layout editing includes the left icon rail, floating tabs, move/resize handles, and numeric position/size controls.
- Satellite mode keeps exit in the top-right and returns to the same selected source. Mobile satellite uses big content on top plus horizontal source row. Desktop satellite uses big content left plus vertical source column right.
- Do not add persistence/schema changes. Do not remove functionality.

## Current control inventory

- Header toolbar: layout mode, fixed grid dimensions, global timer, clone, fill, show info, hide UI, add source.
- Header right cluster: open layouts, save layout, clear layout, account.
- Workspace tabs: select, rename, close, new layout.
- Stage status row: active source/layout summary, current layer controls, layer source/file summaries, hidden source count.
- Fixed cells: empty Add Source box, source selection.
- Free layout cells: template Add Source, template move/resize/remove, source move/resize, source selection.
- Pane overlays: select, title/timer metadata, timer mode, local timer seconds, maximize, edit, remove, gallery previous/next, item metadata, Reddit link, playback back/pause/restart/next.
- Satellite/focus layout: restore grid, focus another source.
- Add Source flow: mobile bottom sheet and desktop contextual panel with URL, local files/folder, Reddit, and grouping.
- Edit Source flow: source edit and hidden Reddit item controls.
- Layout dialogs: saved layouts/templates open/delete/select, save layout/template, clear confirm.
- Account/cache dialogs: login/sign-out, cache status refresh/clear, cache capacity confirmations.

## Mapping

| Current control                               | New location                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Fixed layout mode button                      | Desktop Workbench contextual panel only                                                           |
| Free layout mode button                       | Desktop/tablet Workbench contextual panel only                                                    |
| Fixed columns and rows inputs                 | Mobile Workbench bottom sheet numeric grid size controls; desktop Workbench contextual panel      |
| Global timer seconds                          | Mobile Workbench sheet and default rail timer expansion; desktop Workbench panel                  |
| Global pause                                  | Mobile Workbench sheet and default rail timer expansion; desktop Workbench panel                  |
| Global next                                   | Mobile Workbench sheet and default rail timer expansion; desktop Workbench panel                  |
| Global restart                                | Mobile Workbench sheet and default rail timer expansion; desktop Workbench panel                  |
| Add source header button                      | Mobile default rail plus Workbench sheet fallback into Add Source sheet; desktop Add Source panel |
| Empty fixed Add Source cell                   | Stays inside empty workspace slot and opens Add Source sheet/panel for that slot                  |
| Show source info                              | Mobile Workbench sheet debug action; desktop Workbench panel                                      |
| Hide UI                                       | Mobile default rail plus Workbench sheet; desktop contextual rail/panel                           |
| Show UI reveal button                         | Top-right exit/reveal button, auto-hiding after interaction timeout                               |
| Clear layout                                  | Mobile Workbench sheet with confirmation; desktop Workbench panel with confirmation               |
| Clone selected source                         | Mobile selected-source rail More menu; desktop selected-source contextual panel                   |
| Fill empty spaces                             | Mobile selected-source rail More menu; desktop selected-source contextual panel                   |
| Edit source                                   | Mobile selected-source rail; desktop selected-source contextual panel                             |
| Remove source                                 | Mobile selected-source rail More menu; desktop selected-source contextual panel                   |
| Maximize source                               | Replaced by Open in satellite from selected-source rail/panel                                     |
| Pane select button                            | Replaced by tap/click source to select and tap again to deselect                                  |
| Pane playback back/pause/restart/next         | Mobile selected-source playback pill; desktop tiny centered selected-source overlay               |
| Pane timer mode toggle                        | Mobile selected-source rail local timer edit; desktop selected-source contextual panel            |
| Pane local timer seconds                      | Mobile selected-source local timer sheet/control; desktop selected-source contextual panel        |
| Pane title/timer metadata                     | Hidden by default on mobile; available through Show source info debug mode and desktop panels     |
| Pane item metadata and Reddit link            | Hidden by default on mobile; shown through Show source info/debug or source detail surfaces       |
| Gallery previous/next overlay                 | Keep source swipe/scroll behavior; avoid full overlay action bar in small panes                   |
| URL Display site action                       | Source detail/edit surface or contextual selected-source panel, not pane action bar               |
| URL Open externally action                    | Source detail/edit surface or contextual selected-source panel                                    |
| Layer select                                  | Mobile Workbench sheet segmented Layer 1/2/3 control; desktop Workbench contextual panel          |
| Add layer                                     | Replaced by three default layers in new mockup                                                    |
| Delete layer                                  | Replaced by three default layers in new mockup                                                    |
| Layer source/file summary chips               | Hidden on mobile except Show source info/detail sheet; desktop panel detail                       |
| Hidden fixed source count                     | Hidden on mobile except detail/debug sheet; desktop panel detail                                  |
| Free move/resize handles                      | Desktop/tablet free layout editing only                                                           |
| Free numeric column/row/span controls         | Desktop/tablet free layout editing panel only                                                     |
| Free template Add Source box                  | Desktop/tablet free editing; mobile free layout view/play disables adding                         |
| Free template remove/move/resize              | Desktop/tablet free editing only                                                                  |
| Workspace tab select/swap                     | Mobile Library bottom sheet open-layout switcher; desktop visible tab strip                       |
| Workspace tab rename                          | Library/detail action, not mobile bottom bar                                                      |
| Workspace tab close                           | Mobile Library open-layout management; desktop visible tab strip                                  |
| New layout tab button                         | Mobile Library bottom sheet Create new blank layout; desktop visible tab strip                    |
| Open layouts dialog                           | Mobile Library bottom sheet segmented to Layouts; desktop Library contextual panel                |
| Saved layout select/open/delete               | Library sheet/panel                                                                               |
| Saved template select/open/delete             | Library sheet/panel segmented to Templates                                                        |
| Save layout dialog                            | Mobile Library bottom sheet Save layout action; desktop Library/context panel                     |
| Save template option                          | Library sheet/panel; only for free layout where valid                                             |
| Account dialog open button                    | Mobile Account bottom icon; desktop Account contextual panel/dialog                               |
| Login controls                                | Account bottom sheet or desktop Account panel/dialog                                              |
| Logout control                                | Account bottom sheet or desktop Account panel/dialog                                              |
| Local cache status/refresh/clear              | Account bottom sheet or desktop Account panel/dialog                                              |
| Large local cache confirmation                | Remains modal confirmation over current workspace                                                 |
| Local cache full confirmation                 | Remains modal confirmation over current workspace                                                 |
| Source grouping stacked/separate              | Mobile Add Source sheet; desktop Add Source contextual panel                                      |
| URL source fields/open                        | Mobile Add Source sheet; desktop Add Source contextual panel                                      |
| Local file/folder/drop controls               | Mobile Add Source sheet; desktop Add Source contextual panel                                      |
| Reddit source mode/limit/sort/time/links/open | Mobile Add Source sheet; desktop Add Source contextual panel                                      |
| Edit Reddit URL/limit/hidden items            | Edit Source flow launched from selected-source rail/panel                                         |
| Edit URL fields                               | Edit Source flow launched from selected-source rail/panel                                         |
| Edit local source files/remove preview        | Edit Source flow launched from selected-source rail/panel                                         |
| Satellite restore grid                        | Top-right Exit satellite button                                                                   |
| Satellite focus another source                | Mobile horizontal satellite row; desktop right-side vertical satellite column                     |

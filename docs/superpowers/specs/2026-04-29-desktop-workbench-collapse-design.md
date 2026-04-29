# Desktop Workbench Collapse Design

## Summary

Desktop users can collapse the Workbench panel by clicking the active Workbench button. The full panel minimizes into a slim left rail, and the media stage expands into the freed space. Mobile behavior stays unchanged: the Workbench button continues to open the bottom sheet.

Approved visual direction: slim rail, stable stage. The high-fidelity mockup used a 64px rail, compact icon buttons, the existing dark booth palette, and a widened source grid that remains aligned with the app shell.

## Scene And Register

Register: product UI.

Physical scene: a desktop user is assembling or watching several media sources on a large monitor in a dim private room, with the Workbench needed for quick adjustments but not always worth the 19rem of horizontal space.

The existing dark booth theme remains correct because the media stage is the primary surface and the chrome should recede during viewing.

## Goals

- Let desktop users reclaim horizontal viewing space without fully hiding all UI.
- Keep Library and Account reachable while the Workbench panel is collapsed.
- Preserve the current desktop left-rail mental model.
- Keep the stage stable and predictable, with no floating controls covering media.
- Preserve mobile bottom-sheet behavior.
- Keep state UI-only and metadata-only.

## Non-Goals

- Do not change mobile navigation.
- Do not redesign the Workbench controls themselves.
- Do not persist media, media URLs, thumbnails, provider payloads, Reddit runtime IDs, or normalized runtime items.
- Do not add a new saved-layout field for this unless product later asks to remember panel preference.
- Do not add a modal or separate settings surface for this behavior.

## Behavior

Open desktop state:

- Left chrome keeps current structure: three top buttons plus the full Workbench panel.
- Workbench button is active and exposes `aria-expanded="true"`.
- Stage keeps the current desktop left padding for the full panel.

Collapsed desktop state:

- Clicking Workbench collapses the panel to a slim rail, about 56px to 64px wide.
- Rail keeps Workbench, Library, and Account visible as icon buttons.
- Workbench button remains active and exposes `aria-expanded="false"`.
- Button accessible label/title changes to "Open workbench".
- Stage left padding changes to the rail width, expanding the viewing area.
- Panel content is not reachable by pointer or tab while collapsed.

Restore:

- Clicking Workbench again restores the full panel.
- Button accessible label/title changes to "Collapse workbench".
- Stage returns to the full-panel left padding.

Mobile:

- No functional change.
- Workbench button opens the existing bottom sheet.

## Visual Design

- Rail width: 56px to 64px.
- Desktop full panel width remains near current `19rem`.
- Icon buttons keep current compact raised styling.
- Collapsed rail should feel anchored to the left edge, not like a loose floating overlay.
- Stage border may subtly strengthen when expanded, but no decorative glow is required.
- Motion should be 150ms to 200ms, ease-out-quart or equivalent.
- Respect `prefers-reduced-motion` by removing transition animation.
- No gradient text, glass decoration, side accent stripes, or nested card treatment.

## Accessibility

- Use a real button for the Workbench toggle.
- Use `aria-expanded` and `aria-controls` for the panel.
- Keep visible focus on the Workbench button in both states.
- Ensure the hidden panel content is not in the tab order while collapsed.
- Ensure tooltips or titles remain useful for icon-only rail controls.
- Keep Library and Account labels unchanged for assistive tech.

## Implementation Boundaries

Brooks-Lint risk: change propagation and cognitive overload if the collapse behavior is embedded across unrelated Workbench and Stage layout code.

Recommended boundary:

- `WorkbenchChrome` owns the desktop collapsed state because it owns the Workbench button and panel.
- `FeedWorkbench` receives or owns only the minimal `isDesktopWorkbenchCollapsed` state if `WorkbenchStage` needs it.
- `WorkbenchStage` should receive a single boolean or layout class input and only switch desktop left padding.
- Avoid duplicating mobile and desktop behavior. Keep mobile sheet state separate from desktop collapse state.
- Do not add business logic to large files beyond wiring if a focused helper becomes necessary.

## Testing And Verification

Focused automated test:

- Desktop Workbench button toggles `aria-expanded`.
- Collapsed state removes or hides the panel content from accessible interaction.
- Mobile Workbench button still opens the sheet.

Browser verification:

- Desktop viewport around 1440x900: click Workbench, confirm panel collapses and source grid expands.
- Desktop narrow breakpoint above `md`: confirm rail does not overlap stage.
- Mobile iPhone 15 viewport: confirm bottom-sheet behavior is unchanged.
- Reduced motion check if practical.

## Persistence Decision

Collapsed state resets on reload. Do not persist the preference in this version.

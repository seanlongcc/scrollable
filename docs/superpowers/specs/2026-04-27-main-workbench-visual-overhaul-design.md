# Main Workbench Visual Overhaul Design

## Feature Summary

Redesign the main Scrollable workbench as a production-ready visual shell while preserving existing product behavior and privacy boundaries. The overhaul covers the media stage, mobile floating rail, bottom navigation, desktop contextual panel, empty fixed/free cells, layer status, selected-source chrome, and hidden-UI recovery.

The goal is to make Scrollable feel like a precise media instrument with memorable signal language, not a generic dark dashboard. This first slice excludes source dialogs, library/save dialogs, shared pages, auth surfaces, and deep media loading changes.

## Primary User Action

The user should understand that the media stage is primary, then quickly add sources, switch layers, select a source, and hide or reveal chrome without losing orientation.

## Design Direction

Register: product.

Visual lane: Signal Studio, Layered Signal.

Workbench approach: Stage + Signal Rail.

Emotional target: sharper control with some kinetic status energy. The surface should feel technical, private, direct, and active, with media remaining dominant.

Color strategy:

- Cyan marks primary commands, active source selection, progress, focus, and immediate action.
- Lime marks layout structure, layer identity, template/placement affordances, and non-destructive workspace organization.
- Rose is reserved for destructive, risk, and failure states.
- Near-black deck surfaces continue to dominate the app so runtime media remains the stage.

Theme scene: a user is assembling a temporary media viewing session on a phone in a dim room, moving fast between adding sources and watching full-screen media. Dark remains correct because the interface surrounds media and should not glare.

References:

- Current Scrollable "Pocket Projection Booth" design system.
- Figma-like precision for handles, outlines, and selection state.
- Raycast-like command confidence for compact controls.

## Scope

Fidelity: production-ready.

Breadth: main workbench only.

Interactivity: shipped-quality states for the existing interaction model; no new product flows unless needed to make existing controls accessible.

Time intent: build an implementation-ready brief first, then implement in a bounded pass with mobile and desktop verification.

Included:

- Main stage shell.
- Fixed-grid and free-layout empty states.
- Mobile floating source/action rail.
- Mobile bottom navigation.
- Desktop contextual rail and workbench panel.
- Workspace/layer/status treatment on the workbench.
- Selected source, active layer, hidden UI, source-info, progress, hover, focus, and disabled states.

Excluded:

- Add/edit source dialog redesign.
- Library, save, clear, sign-in, shared config, and shared collection redesign.
- Media persistence changes.
- Deep performance changes such as HLS loading strategy, except avoiding new visual performance debt.

## Layout Strategy

Mobile starts with the media stage. Controls stay thumb-reachable and easy to hide. The right-side rail holds immediate source actions, while the bottom nav holds global destinations. The workbench sheet remains secondary and should not visually compete with the stage.

Desktop keeps a left contextual command deck, but the panel should become visually lighter and more structured. The stage should receive more apparent priority through tighter panel contrast, clearer layer/status grouping, and stronger empty-cell composition. Workspace tabs remain near the top center, but should feel more like session strips than generic browser tabs.

Empty cells should be quiet but unmistakably interactive. Fixed layout slots use low-contrast stage frames with cyan add affordances. Free layout should use lime placement language so layout/editing is visually distinct from source playback.

## Key States

Default empty fixed grid:

- Two stage slots remain visible on mobile and desktop.
- "Add source" is centered, readable, and touchable.
- Stage borders are quiet enough to avoid dashboard-card sameness.

Default empty free layout:

- Shows free-layout structure without implying that mobile users are blocked forever.
- If mobile editing remains limited in implementation, copy should be direct and action-oriented.

Selected source:

- Cyan outline and subtle status treatment.
- Source actions become more discoverable without relying on hover only.
- Active media is never covered by unnecessary chrome.

Active layer:

- Lime is the active layer identity.
- Layer state must not rely on color alone; include shape, outline, label, or contrast changes.

Hidden UI:

- Stage becomes media-only.
- One recovery control remains visible, reachable, and labeled.

Error, destructive, and risk states:

- Rose only appears for remove, clear, failed media, or other risk.
- Destructive controls must be visually distinct from primary command controls.

Reduced motion:

- State changes remain legible with minimal or no animation.

## Interaction Model

Motion is state feedback only. Allowed motion includes rail reveal, selected-source focus, layer switch feedback, progress changes, and sheet/control reveal. Use transform and opacity only, with 150-250ms transitions. Avoid page-load choreography, bounce, elastic easing, animated layout properties, and decorative motion.

Touch targets on mobile should be at least 44px for primary and repeated controls. Desktop controls may remain dense, but focus states must be visible and keyboard-reachable.

Hover-only interactions must have focus and touch equivalents. Source controls that appear on hover should also appear on focus and be reachable after selection on touch devices.

## Content Requirements

Use terse product copy. Keep labels functional and short.

Required labels and copy:

- "Add source" for empty stage slots.
- "Layer 1", "Layer 2", and "Layer 3" or current existing names.
- "Hide UI" and "Show UI" for chrome visibility.
- "Source info" for metadata visibility.
- "Edit free layout on desktop" may remain only if mobile free-layout editing is still out of scope, but the visual overhaul should avoid making this feel like an error state.
- Destructive labels remain explicit: "Remove", "Clear layout", or equivalent.

Dynamic ranges:

- Empty layout: 0 sources, 0 files.
- Typical layout: 1-4 sources.
- Dense layout: up to the existing fixed-grid limits.
- Long workspace names must truncate without shifting controls.

## Accessibility Requirements

Target WCAG 2.2 AA for this slice.

Requirements:

- No horizontal overflow on 393px mobile or 1440px desktop.
- Mobile primary and repeated controls meet 44px touch target guidance.
- Focus-visible state is clear on dark backgrounds.
- Active layer and selected source do not rely on color alone.
- Contrast remains AA for text and controls.
- Reduced motion path is respected.
- Icon-only controls keep accessible names and titles/tooltips where current patterns support them.

## Performance Constraints

Do not add decorative blur, heavy shadows, animated layout properties, or persistent overlays that would burden media playback. Existing media loading behavior should remain unchanged in this design slice unless a visual change creates a regression.

The overhaul should not increase third-party media persistence, rehosting, proxying, thumbnails, raw payload storage, or runtime URL storage. Saved and shared configuration surfaces are out of scope and remain metadata-only.

## Technical Boundaries

Likely files for implementation:

- `frontend/src/components/viewer/workbench/workbench-stage.tsx`
- `frontend/src/components/viewer/workbench/fixed-grid-view.tsx`
- `frontend/src/components/viewer/workbench/free-grid-view.tsx`
- `frontend/src/components/viewer/workbench/workbench-chrome.tsx`
- `frontend/src/components/viewer/workbench/workspace-tabs.tsx`
- `frontend/src/components/viewer/feed-view-pane.tsx`
- `frontend/src/app/globals.css`
- `DESIGN.md` and `DESIGN.json` if tokens or rules change

Brooks-Lint risk: cognitive overload and change propagation. `feed-workbench.tsx` and `workbench-chrome.tsx` are already large. Do not add new business logic there. Prefer focused visual helper components, constants, or token classes near the changed workbench modules.

## Testing And Verification

Before claiming completion:

- Run lint, format check, typecheck, tests relevant to touched workbench files, and build.
- Verify mobile and desktop in browser.
- Include viewport-bounds check for 393px mobile and 1440px desktop.
- Verify keyboard focus order for main controls.
- Verify reduced-motion behavior if motion is added.
- Re-run `impeccable critique` or equivalent design review after implementation.

## Recommended Impeccable References

- `layout` for stage and workbench composition.
- `colorize` for Signal Studio C2 token usage.
- `adapt` for mobile and desktop responsive behavior.
- `harden` for focus, reduced motion, edge states, and accessibility polish.
- `polish` after implementation.

## Open Questions

- Should mobile free-layout editing remain out of scope, or should this visual pass introduce a minimal mobile placement control?
- Should C2 lime identify all layers equally, or only the active layer and template/free-layout affordances?
- Should the final implementation update `DESIGN.md` immediately, or wait until the workbench direction is built and visually verified?

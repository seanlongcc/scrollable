# Agent Testing Reference

Detailed testing decision policy for AI coding agents.

## Testing Decision Policy

Use tests intentionally. Do not add tests just to satisfy a process rule.

## TDD Required

Use test-driven development for changes that affect:

- Business logic.
- Data normalization or parsing.
- Validation.
- Authentication, authorization, RLS, or privacy constraints.
- Persistence behavior.
- API routes or server actions.
- State transitions.
- Timer behavior.
- Feed advancement logic.
- Carousel behavior.
- Error handling.
- Accessibility-relevant interaction.
- Bug fixes where a regression test can reproduce the issue.

For these changes, write or update a failing test first when practical, then implement the smallest change needed to pass.

## Tests Usually Not Required

Do not add new automated tests for purely presentational changes, including:

- Spacing.
- Colors.
- Typography.
- Copy-only edits.
- Icon swaps.
- Static layout adjustments.
- Tailwind/className-only changes.
- Non-interactive visual polish.
- Reordering static UI content.
- Documentation-only changes.

For these changes, implement directly and verify with the cheapest appropriate checks.

## UI-Only Verification

For visual-only or presentational UI changes:

1. Run `npm run typecheck` when TypeScript may be affected.
2. Run `npm run lint` when source files changed.
3. Run `npm run format:check` to verify formatting; use `npm run format` when intentionally fixing formatting.
4. Use browser/mobile viewport verification when the change affects layout, responsiveness, or interaction.
5. When verifying modals, dialogs, overlays, popovers, sheets, menus, or loading blockers, do not treat "a screenshot was captured" as sufficient. Inspect the screenshot and/or browser DOM measurements on desktop and mobile to confirm the surface is actually inside the viewport, not attached to the wrong edge, not clipped, not hidden behind the overlay, and not using a conflicting positioning class such as `relative` overriding `fixed`.
6. During browser/mobile verification, explicitly inspect for unnecessary empty space: stretched grid rows, oversized wrappers, excessive padding/margins, large blank areas below compact controls, and content that should shrink to fit its actual height.
7. Do not create new tests unless behavior changed.

In the completion summary, state one of:

- `No new tests added because this was a presentational-only change.`
- `Updated tests because this changed behavior.`
- `Skipped browser verification because <specific blocker>.`

## Existing Tests

If relevant tests already exist, update them only when the expected behavior changed. Do not rewrite snapshots or assertions for cosmetic-only changes unless the project intentionally uses visual regression testing for that area.

## Snapshot Tests

Avoid broad snapshot tests for UI polish. Prefer focused assertions for behavior, accessibility, and meaningful rendered states.

## Testing Priorities

High-value test areas:

- Feed config validation.
- Reddit post-link and subreddit-listing parsing and normalization.
- Sticky-post filtering and list slicing.
- Runtime media item construction without persistence.
- Multi-image carousel ordering.
- Timer pause/resume/advance behavior.
- Local upload feed behavior.
- Multiple-feed grid layout.
- Collection sharing permissions.
- NSFW collection visibility for signed-out vs signed-in users.
- Supabase RLS policies.
- Mobile viewport layout and touch gestures.

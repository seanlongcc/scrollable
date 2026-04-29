# AGENTS.md

Guidance for AI coding agents working in this repository.

This file is the hard-rules and orientation index. Longer reference material lives in:

- `README.md` - project overview.
- `docs/media-persistence.md` - media persistence policy details.
- `docs/agent/product.md` - product intent plus Reddit/NSFW notes.
- `docs/agent/testing.md` - detailed testing decision policy and test priorities.
- `docs/agent/tools.md` - MCP/tool-server usage map.
- `docs/agent/skills.md` - skill usage map.
- Supabase migrations and committed specs/plans - source of truth for schema and approved work.

## Project State

Current installed stack:

- Next.js 16.2.4 App Router, React 19.2.4, TypeScript 5.x
- Tailwind CSS v4 and shadcn 4.4.0
- Supabase for auth and database through `@supabase/ssr`
- `@supabase/ssr` 0.10.x and `@supabase/supabase-js` 2.104.x
- Supabase CLI 2.95.x
- Vitest 4.x, Playwright 1.59.x, ESLint 9.x
- Runtime arbitrary-site URL extraction uses the bundled `youtube-dl-exec` `yt-dlp` binary in production. Local overrides can use `YTDLP_PATH`, a `yt-dlp` executable on `PATH`, or `python3 -m yt_dlp`.
- Optional server-only `NHENTAI_API_KEY` for runtime nHentai gallery API requests. Store it in local/deployment secrets only, never as `NEXT_PUBLIC_*`.
- Optional server-only `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` for Reddit app-only OAuth API requests in production. Store them in local/deployment secrets only, never as `NEXT_PUBLIC_*`. Without them the app falls back to public Reddit JSON, which may be blocked by some hosting IP ranges.
- Auth providers: email/password and Google. Reddit is a runtime content source only, not a login provider.
- Vercel for deployment through GitHub Actions and the pinned Vercel CLI
- Mobile-first user experience

Current package/runtime defaults:

- Use Node 24 via `nvm use 24`.
- Use npm workspaces and the checked-in root `package-lock.json`.
- The Next.js frontend app lives in `frontend/`; root npm scripts delegate to that workspace.
- The default shell may still expose system Node 18. Always run `nvm use 24` before npm commands; Next.js 16 will not run on Node 18.
- Main scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:watch`, `npm run e2e`.
- Supabase local scripts: `npm run supabase:start`, `npm run supabase:stop`, `npm run supabase:reset`, `npm run supabase:test`.
- `npm test` runs Vitest/jsdom unit tests in `frontend/`. It excludes `frontend/tests/e2e`.
- `npm run e2e` runs Playwright desktop Chrome and iPhone 15 mobile projects and starts the dev server through `nvm use 24`.
- Prettier 3.x is configured. Use `npm run format` to write formatting and `npm run format:check` for verification.
- Keep local app environment files in `frontend/.env.local`; keep `supabase/`, `.beads/`, `.serena/`, and docs at repo root.
- Vercel deployment should use `frontend/` as the project root directory.
- Browser tests require Linux browser dependencies in WSL; if Chromium cannot launch, report the missing shared library and do not claim browser verification passed.
- Supabase local verification requires Docker socket access. If `supabase start` fails with Docker permission errors, report the blocker. Current Supabase local config uses API port `54321`, DB port `54322`, and Postgres major `17`.
- GitHub Actions workflow `.github/workflows/ci-cd.yml` runs format check, ESLint, typecheck, Vitest, Next build, local Supabase DB tests, and Playwright desktop/mobile e2e on pull requests and `main`.
- GitHub Actions deploys Vercel previews for same-repository pull requests and production for pushes to `main`. Required repository secrets are `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
- CI Supabase tests must stay local-only. Do not add `--linked`, `db push`, `SUPABASE_ACCESS_TOKEN`, or remote database URLs to the test workflow unless the production/staging database deployment strategy is explicitly changed.
- Saved free-layout templates use `viewer_templates` in Supabase and `scrollable.workspace-templates.v1` in localStorage.

## Product Intent

Build a reels-like scrollable image/video feed viewer. Full product direction and Reddit/NSFW implementation notes live in `docs/agent/product.md`.

## Data And Privacy Rules

These rules are core product constraints. Keep them visible here because violations are high risk.

- Never persist third-party media from Reddit or any other site.
- Never rehost third-party media.
- Never proxy-cache third-party media as application-owned content.
- Never persist third-party media URLs, thumbnails, cached Reddit JSON responses, raw `yt-dlp` JSON, normalized runtime feed/media items, raw Reddit item/post IDs, or local upload object URLs.
- User-pasted Reddit post permalinks and subreddit listing URLs are allowed as saved configuration data because the user intentionally provides them.
- User-hidden Reddit listing or post media items may be saved only as opaque `sha256:` hashes of runtime Reddit item IDs scoped to the source configuration. Do not store raw item/post IDs, titles, authors, permalinks, media URLs, thumbnails, payloads, or normalized runtime items for hidden Reddit content.
- Never persist absolute local filesystem paths.
- Store only user-created configuration data and operational records needed for the app.
- Fetch third-party media metadata at runtime through approved APIs where possible.
- Do not display images or videos when browsing saved or shared collections. Collections should show configuration metadata only until a runtime feed is opened.
- Treat NSFW metadata carefully. Shared NSFW feed configs and collections are visible only to authenticated users.

Acceptable stored data:

- User identity records from Supabase Auth.
- User profile/preferences needed for the app.
- Feed configurations, including user-pasted Reddit post permalinks and subreddit listing URLs.
- Viewer workspace/session layout metadata in `viewer_sessions`, including tab names, layout mode, grid dimensions, source configuration metadata, timer settings, slots, and free-layout rectangles.
- Collections of feed configurations.
- Tags, NSFW flags, sharing settings, ownership, timestamps, and audit/security metadata.
- Runtime logs or rate-limit records that do not contain third-party media payloads.
- User-selected local image/video/audio file byte copies in browser IndexedDB for saved local layouts, plus metadata-only local `cacheSetId` references in saved layouts.
- `display_options` may store display/config preferences only, not third-party media metadata.
- `viewer_sessions.sessions` must remain metadata-only and must not contain raw Reddit item/post IDs, media URLs, thumbnails, listing payloads, normalized runtime items, or local upload object URLs. Opaque `sha256:` Reddit hidden-item hashes are allowed.
- Layout layers may store layer IDs, layer names, active layer IDs, and per-source layer membership only.
- Free-layout templates may store empty box rectangles, layer IDs, active layer IDs, and timer settings only. They must not store source configs, pasted third-party URLs, local cache set IDs, runtime media URLs, thumbnails, provider payloads, local object URLs, or normalized runtime items.
- URL resolver hints may include `provider:gallery`, `provider:hitomi`, and `provider:yt-dlp`, but extracted gallery image URLs, stream URLs, HLS segment query parameters, thumbnails, cookies, headers, API keys, raw gallery HTML/JSON, and raw `yt-dlp` output remain runtime-only.

## Architecture Direction

Prefer these boundaries when implementation starts:

- `frontend/src/sources`: source adapters for Reddit and local uploads.
- `frontend/src/normalization`: convert source responses into runtime feed items.
- `frontend/src/viewer`: vertical reels feed, timer, keyboard/touch navigation, and horizontal media carousel.
- `frontend/src/viewer/workspaces`: local/Supabase workspace tab, layout layer, and layout serialization. Keep this metadata-only.
- `frontend/src/viewer/templates`: reusable free-layout empty box templates. Keep templates source-empty and metadata-only.
- `frontend/src/local-uploads`: object URL lifecycle and browser IndexedDB Blob cache for user-selected local files. Do not store local paths.
- `frontend/src/configurations`: saved feed configs and validation.
- `frontend/src/collections`: grouping, sharing, tags, NSFW flags, and browse views.
- `frontend/src/auth`: Supabase auth integration and provider setup.
- `frontend/src/data-access`: Supabase queries/mutations and RLS-aware access patterns.
- `frontend/src/ui`: shadcn/ui components, layout primitives, and mobile-first interaction controls.

Keep data fetching, normalization, persistence, and UI rendering separate enough that each can be tested independently.

## Mobile-First Development

Build mobile first. Treat the iPhone 15 Playwright project and narrow browser viewport as primary, then enhance for desktop.

- Start UI/layout work from the smallest supported viewport and touch workflow, not from desktop.
- Prefer single-column, thumb-reachable controls and compact progressive disclosure before adding desktop grids or wide toolbars.
- Use responsive constraints that prevent overflow, clipped dialogs, hidden controls, and text collisions on mobile.
- Keep desktop behavior as an enhancement of the mobile workflow, not a separate implementation.
- When UI, layout, interaction, dialogs, overlays, drag/drop, or fullscreen behavior changes, verify mobile and desktop before completion.
- If mobile verification cannot run, report the exact blocker and do not claim mobile behavior passed.

## Brooks-Lint Development Guardrails

Use these rules to prevent the kind of large-file refactors already needed in the workbench. They are based on Brooks-Lint decay risks: cognitive overload, change propagation, knowledge duplication, accidental complexity, dependency disorder, and domain model distortion.

The 800-line number is not a Brooks-Lint or book rule. It is a local repo guardrail derived from Brooks-Lint's cognitive-overload risk. Brooks-Lint's concrete signals are smaller: mixed-abstraction functions over 20 lines, parameter lists over 4 parameters, boolean expressions with 3 or more combined conditions, nesting deeper than 3, fan-out over 5 imports, and changes that ripple across more than 3 unrelated files.

Before adding behavior:

1. Name the Brooks-Lint risk most likely to grow if the behavior is added inline.
2. Choose the smallest existing module that owns the behavior, or create a focused module before adding feature logic.
3. Keep React components responsible for state ownership, effects, side effects, and UI wiring. Move validation, state transitions, serialization, payload building, placement, timer math, drag math, and runtime orchestration into focused helpers.
4. If a change would add more than 50 lines to a file already over 500 lines, create or extend a helper module in the same branch.
5. If a file is over 800 lines, add no new feature/business logic there unless the change is only wiring existing helpers. Extract first.
6. If a function grows past 20 lines while mixing UI, state transitions, persistence, and runtime work, split it before continuing.
7. If a helper needs more than 4 parameters, prefer a typed input object with domain names.
8. If one change touches more than 3 unrelated modules, stop and write/update the implementation plan so the boundaries are explicit.
9. Avoid speculative abstractions. Extract around current repeated decisions or current complexity, not imagined future providers.
10. Treat large test files like large production files: if a test file is over 800 lines, add new scenarios to a focused sibling test file or colocated helper test unless the scenario is truly broad integration coverage.
11. Before completion, state whether any large file grew, why, and what remains to extract.

Workbench ownership rules:

- `feed-workbench.tsx`: React state ownership, effects, side-effect boundaries, handler wiring, toasts, and composing dialogs/views.
- `*-state.ts`: pure state transitions, validation, and calculations.
- `*-actions.ts`: pure orchestration that returns setter-ready state.
- `runtime-sources.ts`: runtime source fetching/orchestration only; no persistence.
- `local-sources.ts`: local upload filtering, local cache helpers, and object URL helpers.
- `workspace-state.ts`: workspace serialization, localStorage, and sessionStorage state.
- `workspace-actions.ts`: workspace tab/open/close/library orchestration.
- `workspace-save-state.ts`: save validation and Supabase payload builders.
- `free-layout-state.ts` / `free-drag-state.ts`: free-layout rect updates and drag math.
- `timer-actions.ts`: timer state orchestration.

## Development Workflow

Before implementation:

1. Write or update a short product/design spec for new major features.
2. Confirm the data persistence rules above.
3. Create an implementation plan before touching app code.

During implementation:

1. Prefer existing repo patterns over new abstractions.
2. Use TypeScript types for persisted config and runtime media items.
3. Use structured API clients/parsers rather than ad hoc string parsing.
4. Build mobile-first. Do not treat mobile as a final pass after desktop works.
5. Use `docs/agent/tools.md` and `docs/agent/skills.md` for task-specific tool/skill choices.
6. Use `docs/agent/testing.md` for detailed test decisions and verification expectations.

## Testing Summary

Use tests intentionally. Do not add tests just to satisfy a process rule.

- TDD is required for business logic, normalization/parsing, validation, auth/RLS/privacy, persistence, API routes/server actions, state transitions, timers, feed advancement, carousel behavior, error handling, accessibility-relevant interaction, and bug fixes where a regression test can reproduce the issue.
- New automated tests are usually not required for purely presentational or documentation-only changes.
- UI-only changes still need typecheck/lint/format checks where relevant, plus browser/mobile viewport verification when layout, responsiveness, or interaction changed.
- See `docs/agent/testing.md` for detailed rules, completion wording, and high-value test areas.

Test ownership rules:

- Use the narrowest test owner that proves the behavior. Pure helper tests belong next to helper modules as `*.test.ts` or `*.test.tsx`.
- Do not add new tests to `frontend/src/components/viewer/feed-workbench.test.tsx` by default. If a test file is over 800 lines, choose or create a focused sibling test file unless broad integration coverage is required.
- Split workbench integration tests by workflow, for example `feed-workbench-workspaces.test.tsx`, `feed-workbench-layers.test.tsx`, `feed-workbench-local-files.test.tsx`, and `feed-workbench-interactions.test.tsx`.
- Keep shared render/setup helpers in one test utility module. Do not copy setup helpers across split test files.
- Before adding to a large integration test file, state why a narrower helper test or focused workflow test would not catch the regression.

## Git And Completion Workflow

1. Use Conventional Commits for commit messages, for example `feat: add feed timer` or `fix: prevent media persistence`.
2. Do not create branches with the `codex/` prefix. Use descriptive feature branches without that prefix.
3. Before completion, run lint, typecheck, tests, build, and browser verification when applicable. The GitHub Actions CI/CD workflow mirrors these checks and also runs local Supabase DB tests.
4. Ensure the lint pass includes ESLint and run the configured Prettier check.
5. For overlay-style UI changes, include a viewport-bounds check in browser verification.
6. Verify auth and RLS paths for signed-out, signed-in, owner, shared recipient, and NSFW cases when those areas changed.
7. Check `git status --short --branch`.
8. Summarize changed files and any checks that could not be run.

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Run `bd prime` for current workflow context, or install hooks with `bd hooks install` when hook-based workflow injection is wanted.

Quick reference:

- `bd ready` - Find unblocked work.
- `bd create "Title" --type task --priority 2` - Create an issue.
- `bd show <id>` - Show issue details.
- `bd update <id> --claim` - Claim work.
- `bd close <id>` - Complete work.
- `bd dolt push` - Push beads to the configured remote.

## Subagents

Use subagents for code review, testing, and continuous refactoring when those activities are requested or when a substantial implementation is in progress or nearing completion. If the active agent runtime requires explicit permission before spawning subagents, ask for that permission first.

Recommended subagent usage:

- Code review subagent: inspect changed files for bugs, regressions, data persistence violations, auth/RLS gaps, mobile UI regressions, and missing tests.
- Testing subagent: run or design focused verification for unit tests, integration tests, browser flows, and mobile layouts.
- Continuous refactoring subagent: while substantial feature work is underway, keep a parallel pass focused on small, behavior-preserving cleanup such as removing duplication, tightening types, improving names, simplifying component boundaries, and aligning code with existing project patterns.
- AGENTS.md maintenance subagent: review and update this file when project rules, architecture, commands, MCP servers, skills, deployment setup, auth/data constraints, or testing workflow change.
- Keep subagent tasks bounded and non-overlapping.
- Do not ask subagents to modify the same files in parallel unless ownership boundaries are explicit.

Use the AGENTS.md maintenance subagent after substantial setup or workflow changes, including:

- New package scripts, test commands, ESLint/Prettier commands, lint/typecheck/build commands, or dev server commands.
- New MCP servers, tools, plugins, or required skills.
- Changes to Supabase schema, RLS policy strategy, auth providers, or stored data rules.
- Changes to Vercel deployment, environment variables, or runtime architecture.
- New product constraints that future agents must preserve.

## Tools And Skills

- Use MCP/tool servers according to the task. Prefer official or local project sources for current facts. See `docs/agent/tools.md`.
- Use `impeccable` for frontend interface design, redesign, critique, audit, polish, and UI quality work.
- When a skill is available and its trigger matches the task, read its `SKILL.md` and follow it. Use the minimal set of skills that covers the task. See `docs/agent/skills.md`.
- Supabase MCP is configured for project `ppxkvapcmblfkhregiwb`. Use it for schema inspection, migrations, RLS checks, and auth configuration when the current agent session exposes it; otherwise use Supabase CLI, local migrations, and official Supabase documentation.

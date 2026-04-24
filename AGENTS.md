# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project State

This repository now contains the initial Scrollable web app implementation. The immediate source of truth is this file, `README.md`, `docs/media-persistence.md`, Supabase migrations, and future specs/plans committed in the repo.

Current installed stack:

- Next.js 16.2.4 App Router, React 19.2.4, TypeScript 5.x
- Tailwind CSS v4 and shadcn 4.4.0
- Supabase for auth and database through `@supabase/ssr`
- `@supabase/ssr` 0.10.x and `@supabase/supabase-js` 2.104.x
- Supabase CLI 2.95.x
- Vitest 4.x, Playwright 1.59.x, ESLint 9.x
- Auth providers: email/password and Google. Reddit is a runtime content source only, not a login provider.
- Vercel for deployment
- Mobile-first user experience

Current package/runtime defaults:

- Use Node 24 via `nvm use 24`.
- Use npm and the checked-in `package-lock.json`.
- The default shell may still expose system Node 18. Always run `nvm use 24` before npm commands; Next.js 16 will not run on Node 18.
- Main scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:watch`, `npm run e2e`.
- Supabase local scripts: `npm run supabase:start`, `npm run supabase:stop`, `npm run supabase:reset`, `npm run supabase:test`.
- `npm test` runs Vitest/jsdom unit tests. It excludes `tests/e2e`.
- `npm run e2e` runs Playwright desktop Chrome and Pixel 7 mobile projects and starts the dev server through `nvm use 24`.
- Prettier 3.x is configured. Use `npm run format` to write formatting and `npm run format:check` for verification.
- Browser tests require Linux browser dependencies in WSL; if Chromium cannot launch, report the missing shared library and do not claim browser verification passed.
- Supabase local verification requires Docker socket access. If `supabase start` fails with Docker permission errors, report the blocker. Current Supabase local config uses API port `54321`, DB port `54322`, and Postgres major `17`.

## Product Intent

Build a reels-like scrollable image/video feed viewer.

Planned capabilities:

- Accept user-provided Reddit post permalinks and fetch media metadata for those posts at runtime.
- Do not require Reddit API/OAuth keys for runtime Reddit post-link fetching.
- Provide a configurable timer for feed advancement.
- Provide a slice/filter input for excluding items from the initial listing, since sticky posts count in listing limits.
- Support posts with multiple images by presenting those images as a horizontal left-to-right sequence inside the vertical feed.
- Support user-uploaded local image/video files as a general scrollable feed.
- Support multiple feeds displayed in a grid-like view.
- Support saved feed configurations and collections of configurations.
- Support sharing configurations and collections.
- Support collection tags and NSFW marking.
- Require sign-in before viewing NSFW collections.

## Data And Privacy Rules

These rules are core product constraints.

- Never persist third-party media from Reddit or any other site.
- Never rehost third-party media.
- Never proxy-cache third-party media as application-owned content.
- Never persist third-party media URLs, thumbnails, cached Reddit JSON responses, normalized runtime feed/media items, or local upload object URLs.
- User-pasted Reddit post permalinks are allowed as saved configuration data because the user intentionally provides them.
- Never persist absolute local filesystem paths.
- Store only user-created configuration data and operational records needed for the app.
- Fetch third-party media metadata at runtime through approved APIs where possible.
- Do not display images or videos when browsing saved or shared collections. Collections should show configuration metadata only until a runtime feed is opened.
- Treat NSFW metadata carefully. Shared NSFW feed configs and collections are visible only to authenticated users.

Acceptable stored data:

- User identity records from Supabase Auth.
- User profile/preferences needed for the app.
- Feed configurations, including user-pasted Reddit post permalinks.
- Viewer workspace/session layout metadata in `viewer_sessions`, including tab names, layout mode, grid dimensions, source configuration metadata, timer settings, slots, and free-layout rectangles.
- Collections of feed configurations.
- Tags, NSFW flags, sharing settings, ownership, timestamps, and audit/security metadata.
- Runtime logs or rate-limit records that do not contain third-party media payloads.
- User-selected local file byte copies in browser IndexedDB for saved local layouts, plus metadata-only local `cacheSetId` references in saved layouts.
- `display_options` may store display/config preferences only, not third-party media metadata.
- `viewer_sessions.sessions` must remain metadata-only and must not contain Reddit post IDs, media URLs, thumbnails, listing payloads, normalized runtime items, or local upload object URLs.

## Architecture Direction

Prefer these boundaries when implementation starts:

- `sources`: source adapters for Reddit and local uploads.
- `normalization`: convert source responses into runtime feed items.
- `viewer`: vertical reels feed, timer, keyboard/touch navigation, and horizontal media carousel.
- `viewer/workspaces`: local/Supabase workspace tab and layout serialization. Keep this metadata-only.
- `local-uploads`: object URL lifecycle and browser IndexedDB Blob cache for user-selected local files. Do not store local paths.
- `configurations`: saved feed configs and validation.
- `collections`: grouping, sharing, tags, NSFW flags, and browse views.
- `auth`: Supabase auth integration and provider setup.
- `data-access`: Supabase queries/mutations and RLS-aware access patterns.
- `ui`: shadcn/ui components, layout primitives, and mobile-first interaction controls.

Keep data fetching, normalization, persistence, and UI rendering separate enough that each can be tested independently.

## Development Workflow

Before implementation:

1. Write or update a short product/design spec for new major features.
2. Confirm the data persistence rules above.
3. Create an implementation plan before touching app code.

During implementation:

1. Prefer existing repo patterns over new abstractions.
2. Use TypeScript types for persisted config and runtime media items.
3. Use structured API clients/parsers rather than ad hoc string parsing.
4. Keep mobile behavior first-class, not a final pass.
5. Add focused tests around feed normalization, sticky filtering/slicing, timer behavior, carousel behavior, sharing rules, and NSFW access.

## Testing Decision Policy

Use tests intentionally. Do not add tests just to satisfy a process rule.

### TDD Required

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

### Tests Usually Not Required

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

### UI-Only Verification

For visual-only or presentational UI changes:

1. Run `npm run typecheck` when TypeScript may be affected.
2. Run `npm run lint` when source files changed.
3. Run `npm run format:check` to verify formatting; use `npm run format` when intentionally fixing formatting.
4. Use browser/mobile viewport verification when the change affects layout, responsiveness, or interaction.
5. Do not create new tests unless behavior changed.

In the completion summary, state one of:

- `No new tests added because this was a presentational-only change.`
- `Updated tests because this changed behavior.`
- `Skipped browser verification because <specific blocker>.`

### Existing Tests

If relevant tests already exist, update them only when the expected behavior changed. Do not rewrite snapshots or assertions for cosmetic-only changes unless the project intentionally uses visual regression testing for that area.

### Snapshot Tests

Avoid broad snapshot tests for UI polish. Prefer focused assertions for behavior, accessibility, and meaningful rendered states.

Git workflow:

1. Use Conventional Commits for commit messages, for example `feat: add feed timer` or `fix: prevent media persistence`.
2. Do not create branches with the `codex/` prefix. Use descriptive feature branches without that prefix.

Before completion:

1. Run lint, typecheck, tests, and build when available.
2. Ensure the lint pass includes ESLint, and run the configured Prettier check when available, such as `npm run format:check` or `npm run prettier:check`.
3. If ESLint or Prettier check scripts do not exist yet, add them as part of project setup work or clearly note that they could not be run.
4. Run browser verification for UI changes, including mobile viewport checks.
5. Verify auth and RLS paths for signed-out, signed-in, owner, shared recipient, and NSFW cases.
6. Check `git status --short --branch`.
7. Summarize changed files and any checks that could not be run.

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

## MCP And Tool Servers

Use MCP/tool servers according to the task. Prefer official or local project sources for current facts.

| Server or tool family           | Use in this repo                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serena`                        | Project activation, onboarding memories, semantic code navigation, symbol-aware edits, and project guidance. Activate this repo before code work and check onboarding. |
| `tool_search`                   | Discover deferred MCP tools for GitHub, Vercel, shadcn, Playwright/browser, context7, and other available servers. Use this before assuming a server is unavailable.   |
| `github`                        | Use for issues, pull requests, branch metadata, and repository collaboration when GitHub tasks are requested.                                                          |
| `vercel` / `codex_apps__vercel` | Use for Vercel docs, deployments, deployment logs, domains, env vars, and project management when deployment work is requested.                                        |
| `context7`                      | Use for current library documentation when available, especially Next.js, Supabase, shadcn/ui, Tailwind, or testing libraries.                                         |
| `shadcn`                        | Use for shadcn/ui component discovery, installation guidance, and registry/component patterns.                                                                         |
| `playwright` / browser tools    | Use for end-to-end and visual verification of the app, especially feed scrolling, carousel navigation, auth flows, and mobile layouts.                                 |
| Local shell/tools               | Use `rg`, `rg --files`, package scripts, git commands, and project CLIs for ordinary repository work.                                                                  |

No Supabase-specific MCP server is currently assumed. If one becomes available, use it for schema inspection, migrations, RLS checks, and auth configuration. Otherwise use Supabase CLI, local migrations, and official Supabase documentation.

## Skills

When a skill is available and its trigger matches the task, read its `SKILL.md` and follow it. Use the minimal set of skills that covers the task.

Core project/process skills:

| Skill                                        | Use                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `superpowers:using-superpowers`              | Start-of-conversation skill discovery and workflow discipline.                                                |
| `superpowers:brainstorming`                  | Product/design exploration before creative feature work.                                                      |
| `superpowers:writing-plans`                  | Create implementation plans after a design/spec is approved.                                                  |
| `superpowers:executing-plans`                | Execute an existing implementation plan with checkpoints.                                                     |
| `superpowers:test-driven-development`        | Behavior changes and bug fixes where tests should drive the change; skip for purely presentational UI polish. |
| `superpowers:systematic-debugging`           | Bug investigation, test failures, or unexpected behavior.                                                     |
| `superpowers:verification-before-completion` | Final verification before claiming work is done.                                                              |
| `superpowers:requesting-code-review`         | Request a review after substantial implementation.                                                            |
| `superpowers:receiving-code-review`          | Process review feedback before making changes.                                                                |
| `superpowers:finishing-a-development-branch` | Decide how to finish, integrate, or hand off a completed branch.                                              |
| `superpowers:using-git-worktrees`            | Isolate larger feature work in a worktree when appropriate.                                                   |
| `superpowers:dispatching-parallel-agents`    | Coordinate independent parallel agent tasks.                                                                  |
| `superpowers:subagent-driven-development`    | Use subagents to implement independent parts of an approved plan.                                             |
| `superpowers:writing-skills`                 | Create or update skills.                                                                                      |

Frontend, React, and design skills:

| Skill                           | Use                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `frontend-design`               | Build production-grade UI and mobile-first frontend experiences.                    |
| `web-design-guidelines`         | Audit UI accessibility, layout, responsiveness, and design quality.                 |
| `webapp-testing`                | Interact with and test local web apps using Playwright-style workflows.             |
| `browser-use:browser`           | Inspect or operate a local browser target when requested.                           |
| `vercel:agent-browser`          | Browser automation for local targets and web app verification.                      |
| `vercel:agent-browser-verify`   | Visual gut-check after starting a dev server.                                       |
| `vercel:verification`           | End-to-end app flow verification across browser, API, data, and rendering.          |
| `vercel-react-best-practices`   | React and Next.js performance guidance from Vercel Engineering.                     |
| `vercel:react-best-practices`   | TSX review checklist after editing multiple React components.                       |
| `vercel-composition-patterns`   | React composition patterns for flexible components.                                 |
| `vercel-react-view-transitions` | Smooth native-feeling React view transitions.                                       |
| `vercel-react-native-skills`    | React Native/Expo guidance, only if the project direction changes to native mobile. |
| `vercel:shadcn`                 | shadcn/ui CLI, composition, theming, and Tailwind integration.                      |
| `vercel:geist`                  | Geist typography setup for precise Next.js interfaces.                              |

Next.js, Vercel, and platform skills:

| Skill                       | Use                                                                             |
| --------------------------- | ------------------------------------------------------------------------------- |
| `vercel:nextjs`             | Next.js App Router architecture, routing, server components, and data fetching. |
| `vercel:deployments-cicd`   | Vercel deployment, promotion, rollback, logs, and CI/CD.                        |
| `deploy-to-vercel`          | Deploy an app to Vercel when the user asks.                                     |
| `vercel-cli-with-tokens`    | Use Vercel CLI with token-based authentication.                                 |
| `vercel:vercel-cli`         | Vercel CLI workflows.                                                           |
| `vercel:vercel-api`         | Vercel REST API and project/deployment management.                              |
| `vercel:env-vars`           | Vercel environment variables and secrets.                                       |
| `vercel:vercel-functions`   | Serverless/Edge Functions, streaming, and runtime config.                       |
| `vercel:routing-middleware` | Middleware, rewrites, redirects, and request interception.                      |
| `vercel:runtime-cache`      | Runtime cache patterns. Do not use for third-party media persistence.           |
| `vercel:cron-jobs`          | Scheduled tasks if later needed.                                                |
| `vercel:turbopack`          | Next.js bundler configuration and build debugging.                              |
| `vercel:turborepo`          | Monorepo build/caching if the repo becomes a monorepo.                          |
| `vercel:next-forge`         | next-forge guidance only if the project adopts that starter.                    |
| `vercel:vercel-services`    | Multi-service Vercel projects if needed later.                                  |
| `vercel:observability`      | Logs, traces, analytics, and speed insights.                                    |
| `vercel:vercel-firewall`    | WAF, rate limiting, bot filtering, and IP rules.                                |
| `vercel:vercel-flags`       | Feature flags and gradual rollouts.                                             |
| `vercel:vercel-storage`     | Blob, Edge Config, and marketplace storage. Do not store third-party media.     |
| `vercel:vercel-queues`      | Durable event streaming if later needed.                                        |
| `vercel:vercel-sandbox`     | Isolated execution for untrusted code if ever needed.                           |
| `vercel:workflow`           | Durable workflows and long-running tasks.                                       |
| `vercel:marketplace`        | Vercel Marketplace integrations.                                                |
| `vercel:bootstrap`          | Bootstrapping repos that depend on Vercel-linked resources.                     |
| `vercel:investigation-mode` | Orchestrated debugging for stuck or broken Vercel/app issues.                   |

AI, auth, content, and integration skills:

| Skill                              | Use                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `openai-docs`                      | Current official OpenAI API/product docs when OpenAI features are discussed.                      |
| `vercel:ai-sdk`                    | Vercel AI SDK features if AI is introduced.                                                       |
| `vercel:ai-elements`               | AI UI components if AI chat/generation UI is introduced.                                          |
| `vercel:ai-gateway`                | Model routing and provider failover if AI is introduced.                                          |
| `vercel:ai-generation-persistence` | Persistence for AI generations if AI is introduced.                                               |
| `vercel:chat-sdk`                  | Multi-platform chat bots if introduced.                                                           |
| `vercel:json-render`               | Rendering AI chat response parts and tool states.                                                 |
| `vercel:v0-dev`                    | v0 code generation workflows if requested.                                                        |
| `vercel:auth`                      | Clerk, Descope, Auth0 guidance. For this repo, prefer Supabase unless the user changes direction. |
| `vercel:sign-in-with-vercel`       | Vercel OAuth/OIDC sign-in if requested.                                                           |
| `vercel:cms`                       | CMS integrations if content management is added.                                                  |
| `vercel:email`                     | Transactional email patterns, likely Resend, if needed.                                           |
| `vercel:payments`                  | Stripe payments if monetization is added.                                                         |
| `vercel:micro`                     | Lightweight HTTP services if needed outside Next.js.                                              |
| `vercel:ncc`                       | Bundle Node.js modules into a single file if needed.                                              |
| `vercel:satori`                    | Dynamic OG image generation if needed.                                                            |
| `vercel:geistdocs`                 | Docs site template if project docs become a site.                                                 |
| `vercel:vercel-agent`              | Vercel Agent code review/incident investigation if requested.                                     |

Creation, assets, and utility skills:

| Skill             | Use                                                                |
| ----------------- | ------------------------------------------------------------------ |
| `imagegen`        | Generate or edit raster images when AI-created visuals are needed. |
| `plugin-creator`  | Create Codex plugins.                                              |
| `skill-creator`   | Create or update Codex skills.                                     |
| `skill-installer` | Install Codex skills.                                              |
| `brooks-lint`     | Code quality review using classic engineering-book heuristics.     |
| `caveman`         | Ultra-compressed communication mode only when requested.           |

## Reddit And NSFW Notes

When implementing Reddit integration:

- Fetch only user-provided Reddit post links through public post JSON endpoints unless product direction changes.
- Respect Reddit API/public endpoint terms, rate limits, and content restrictions.
- Treat Reddit responses as runtime source data, not application-owned content.
- Avoid saving third-party post/media payloads beyond user-pasted post permalinks.
- Make failure states explicit: invalid post URL, private/deleted/not found post, rate limited, unsupported media, and network error.

## Testing Priorities

High-value test areas:

- Feed config validation.
- Reddit post-link parsing and normalization.
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

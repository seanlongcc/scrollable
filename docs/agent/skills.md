# Agent Skill Reference

When a skill is available and its trigger matches the task, read its `SKILL.md` and follow it. Use the minimal set of skills that covers the task.

Repo-local copies of the skills referenced here live in `skills/`. Prefer those
copies for inspection and developer onboarding when a global Codex skill or
plugin cache is unavailable. See `skills/README.md` for layout and namespace
mapping.

## Core Project/Process Skills

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
| `ponytail`                                   | Always-on minimal/YAGNI solution discipline for this repo.                                                    |

## Frontend, React, And Design Skills

| Skill                           | Use                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `impeccable`                    | Design, critique, polish, audit, and improve frontend interfaces.                   |
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

## Next.js, Vercel, And Platform Skills

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

## Supabase And Database Skills

| Skill                              | Use                                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase`                         | Any Supabase task: Auth, Database, CLI, MCP, migrations, RLS, policies, Data API access, `@supabase/ssr`, or `supabase-js` integration. |
| `supabase-postgres-best-practices` | Supabase/Postgres schema, SQL, indexes, query plans, RLS performance, database security, and migration review.                          |

## AI, Auth, Content, And Integration Skills

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

## Creation, Assets, And Utility Skills

| Skill             | Use                                                                 |
| ----------------- | ------------------------------------------------------------------- |
| `imagegen`        | Generate or edit raster images when AI-created visuals are needed.  |
| `plugin-creator`  | Create Codex plugins.                                               |
| `skill-creator`   | Create or update Codex skills.                                      |
| `skill-installer` | Install Codex skills.                                               |
| `brooks-lint`     | Code quality review using classic engineering-book heuristics.      |
| `caveman`         | Always-on ultra-compressed user-facing communication for this repo. |

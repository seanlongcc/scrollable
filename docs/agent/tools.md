# Agent Tool Reference

Use MCP/tool servers according to the task. Prefer official or local project sources for current facts.

| Server or tool family           | Use in this repo                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serena`                        | Project activation, onboarding memories, semantic code navigation, symbol-aware edits, and project guidance. Activate this repo before code work and check onboarding. |
| `tool_search`                   | Discover deferred MCP tools for GitHub, Vercel, shadcn, Playwright/browser, context7, and other available servers. Use this before assuming a server is unavailable.   |
| `github`                        | Use for issues, pull requests, branch metadata, and repository collaboration when GitHub tasks are requested.                                                          |
| `vercel` / `codex_apps__vercel` | Use for Vercel docs, deployments, deployment logs, domains, env vars, and project management when deployment work is requested.                                        |
| `supabase`                      | Use for Supabase project inspection, schema/table review, migrations, RLS/policy checks, auth configuration, logs/advisors, and Data API debugging when available.     |
| `context7`                      | Use for current library documentation when available, especially Next.js, Supabase, shadcn/ui, Tailwind, or testing libraries.                                         |
| `shadcn`                        | Use for shadcn/ui component discovery, installation guidance, and registry/component patterns.                                                                         |
| `playwright` / browser tools    | Use for end-to-end and visual verification of the app, especially feed scrolling, carousel navigation, auth flows, and mobile layouts.                                 |
| Local shell/tools               | Use `rg`, `rg --files`, package scripts, git commands, and project CLIs for ordinary repository work.                                                                  |

Supabase MCP is configured for project `ppxkvapcmblfkhregiwb` in the Codex global config. If the current agent session does not expose the Supabase MCP tools, use Supabase CLI, local migrations, and official Supabase documentation as the fallback.

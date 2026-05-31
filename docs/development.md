# Development

This page keeps engineering setup, verification, deployment, and runtime configuration separate from the product README.

## Local Setup

Use Node 24 and npm:

```bash
nvm use 24
npm install
npm run dev
```

The frontend app lives in [`../frontend`](../frontend). Root npm scripts delegate into that workspace.

Copy [`../frontend/.env.example`](../frontend/.env.example) to `../frontend/.env.local` for local app secrets.

Vercel should use `frontend/` as the project root directory.

## Verification

Useful checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

Supabase local verification needs Docker Desktop with WSL integration:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
```

## CI/CD

GitHub Actions runs the release gates on pull requests to `main`, pushes to `main`, and manual dispatches:

- formatting, ESLint, TypeScript, Vitest, and Next.js build
- local Supabase database migrations and pgTAP tests in Docker
- Playwright desktop Chrome and iPhone 15 e2e tests

GitHub Releases are created through the separate manual `Release` workflow. Run it from `main` after production deployment, provide a semantic version such as `v0.2.0`, and it will rerun the core gates, refuse duplicate tags/releases, create the tag-backed GitHub Release, and prepend deployment metadata to generated release notes.

The Supabase CI job uses the local Docker database only. It does not use production credentials, `--linked`, `db push`, or a remote database URL.

Vercel Git integration creates preview branch deployments for pull requests from `frontend/`. `frontend/vercel.json` disables automatic deployments from `main` only, so production deployment/promotion remains manual.

## Runtime Configuration

Optional server-only environment variables:

- `NHENTAI_API_KEY` for runtime nHentai gallery API requests.

Keep server-only secrets out of `NEXT_PUBLIC_*` variables.

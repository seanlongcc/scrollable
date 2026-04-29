# Scrollable

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)](https://prettier.io/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

# About

Scrollable is a mobile-first reels-style feed viewer for user-provided URLs and local uploads. It turns pasted sources into runtime image, video, audio, gallery, Reddit, and provider-embed feeds, then lets you arrange them in fixed or free-form layouts.

The app is built around one hard privacy rule: third-party media stays runtime-only. Scrollable can save user-created configuration, workspace layout metadata, and local browser file-cache references, but it does not persist, rehost, or proxy-cache third-party media payloads, thumbnails, extracted URLs, Reddit JSON, provider responses, or raw runtime item IDs.

# Features

- mobile-first multi-feed viewing
- fixed-grid and free-layout workspace modes
- stacked layout layers
- global and per-view timers
- keyboard, wheel, and touch-friendly feed navigation
- local image, video, and audio uploads
- browser IndexedDB cache for user-selected local files
- runtime Reddit post and subreddit listing sources
- runtime URL resolver for direct media, galleries, provider embeds, and optional `yt-dlp`
- reusable empty free-layout templates
- saved local layouts without login
- optional Supabase auth and account-synced layout metadata
- strict metadata-only persistence boundaries for third-party media

# Repository

The frontend lives in [`frontend/`](./frontend). Root npm scripts delegate into that workspace so common commands still run from the repository root.

- [`frontend/src`](./frontend/src) - Next.js app, components, source adapters, runtime normalization, workspace logic, and tests
- [`frontend/tests/e2e`](./frontend/tests/e2e) - Playwright desktop and mobile browser flows
- [`supabase`](./supabase) - local Supabase config, migrations, and database tests
- [`docs`](./docs) - product notes, testing policy, tool guidance, specs, and plans
- [`.beads`](./.beads) - bead issue tracking state
- [`.serena`](./.serena) - Serena project configuration

# Development

Use Node 24 and npm:

```bash
nvm use 24
npm install
npm run dev
```

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

# Runtime configuration

Copy [`frontend/.env.example`](./frontend/.env.example) to `frontend/.env.local` for local app secrets.

Vercel should use `frontend/` as the project root directory.

# Data privacy

Third-party media stays runtime-only. Scrollable stores user-created configuration and metadata-only layouts, not fetched media payloads, thumbnails, extracted URLs, provider JSON, raw Reddit item IDs, or local object URLs. More detail: [`docs/media-persistence.md`](./docs/media-persistence.md).

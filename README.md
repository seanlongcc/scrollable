# Scrollable

Mobile-first reels-style runtime feed viewer for Reddit image/video posts and session-only local uploads.

## Commands

```bash
nvm use 24
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Supabase local verification needs Docker Desktop WSL integration:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
```

## Data Rule

Do not persist, rehost, proxy-cache, or store third-party media, Reddit post payloads, thumbnails, media URLs, or fetched listing responses.

Viewer layouts save tab, grid, timer, and source configuration metadata only. Local layouts open from the viewer's layouts overlay without login; signed-in users can also sync layout metadata to account data.

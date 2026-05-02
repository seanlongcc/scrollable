<p align="center">
  <img src="docs/assets/scrollable_app_small.png" alt="Scrollable app preview" width="100%">
</p>

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)](https://prettier.io/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

## About

Scrollable is a mobile-first reels-style feed viewer for user-provided URLs and local uploads. Paste sources, add local media, and arrange everything into swipeable fixed-grid or free-form layouts.

Third-party media stays runtime-only. Scrollable saves your layout and source settings, not copied third-party media.

## Features

### Viewing

- Swipe through images, videos, audio, galleries, Reddit posts, and embedded media
- View multiple feeds at once
- Use touch, mouse, wheel, or keyboard controls
- Auto-advance feeds with timers
- Stack background, main, and overlay layers

### Sources

- Paste Reddit post and subreddit links
- Paste direct media, gallery, and provider links
- Add local images, videos, audio files, or folders
- Mix local files and web sources in one layout

### Workspaces

- Build fixed-grid or free-form layouts
- Save layouts on your device
- Reuse layout templates
- Import and export layout files
- Open saved local layouts on the same device

### Cloud And Sharing

- Sign in with email or Google
- Sync feed settings, layouts, and templates across devices
- Save layouts to the cloud
- Share saved feed settings, layouts, and templates

## Data Privacy

Scrollable does not store or rehost third-party media. Reddit responses, extracted media URLs, thumbnails, provider data, and raw runtime item IDs are used only while you view a feed.

Cloud saves store your settings: source links, layout boxes, layers, timers, templates, and share-link metadata. Local file bytes are not uploaded to Scrollable cloud storage.

Saved local layouts may keep user-selected file bytes in that browser's IndexedDB so they can reopen on the same device. Shared links expose saved settings to people with access to the link.

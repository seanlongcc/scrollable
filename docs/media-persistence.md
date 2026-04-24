# Media Persistence Rule

Scrollable stores user-authored configuration metadata only.

Forbidden:

- Reddit or third-party media files
- Reddit post payloads
- Media URLs and thumbnails
- Cached listing responses
- Proxy-cached third-party media

Allowed:

- Supabase Auth user identity
- User profile/preferences
- Reddit feed configuration settings
- Collections, tags, NSFW flags, share settings, ownership, timestamps
- Runtime logs/rate-limit records that do not contain third-party media payloads
- User-selected local file byte copies in browser IndexedDB for saved local layouts

Runtime feeds fetch source metadata on demand. Local uploads use browser object URLs for the current session only and are revoked on cleanup.

Do not store local upload object URLs or absolute filesystem paths. Browser file paths are not reusable access grants. Saved local layouts may store copied user-selected file bytes as Blob data in browser IndexedDB, plus a metadata-only `cacheSetId` in saved layouts. On refresh, the app rebuilds fresh object URLs from that browser cache. If cached bytes are missing, ask the user to re-upload.

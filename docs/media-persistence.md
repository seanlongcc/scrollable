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

Runtime feeds fetch source metadata on demand. Local uploads use browser object URLs for the current session only and are revoked on cleanup.

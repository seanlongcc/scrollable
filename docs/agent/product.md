# Agent Product Reference

Detailed product intent and Reddit/NSFW implementation notes for AI coding agents.

## Product Intent

Build a reels-like scrollable image/video feed viewer.

Planned capabilities:

- Accept user-provided Reddit post permalinks and subreddit listing URLs, then fetch media metadata at runtime.
- Do not require Reddit API/OAuth keys for runtime Reddit post-link or subreddit-listing fetching.
- Provide a configurable timer for feed advancement.
- Provide a slice/filter input for excluding items from the initial listing, since sticky posts count in listing limits.
- Support posts with multiple images by presenting those images as a horizontal left-to-right sequence inside the vertical feed.
- Support user-uploaded local image/video/audio files as a general scrollable feed.
- Support multiple feeds displayed in a grid-like view.
- Support up to three stacked layout layers so background or overlay sources can persist behind the active editing layer.
- Support saved feed configurations and collections of configurations.
- Support sharing configurations and collections.
- Support collection tags and NSFW marking.
- Require sign-in before viewing NSFW collections.

## Reddit And NSFW Notes

When implementing Reddit integration:

- Fetch only user-provided Reddit post links and subreddit listing URLs through public JSON endpoints unless product direction changes.
- Respect Reddit API/public endpoint terms, rate limits, and content restrictions.
- Treat Reddit responses as runtime source data, not application-owned content.
- Avoid saving third-party post/listing/media payloads beyond user-pasted post permalinks, subreddit listing URLs, and opaque `sha256:` hashes for user-hidden listing items.
- Make failure states explicit: invalid post URL, private/deleted/not found post, rate limited, unsupported media, and network error.

# Reddit Subreddit Listing Source Design

Scrollable will accept Reddit subreddit listing URLs alongside direct Reddit post links. A user can paste a URL such as `https://www.reddit.com/r/kpop/top/?t=week` or `https://www.reddit.com/r/kpop/hot/`, choose a media count, and open a runtime feed from the first usable media posts in that listing.

## Scope

- The Reddit source input accepts direct post URLs and subreddit listing URLs.
- Supported listing sorts are `hot`, `new`, `rising`, `top`, and `controversial`.
- Supported time ranges are `day`, `week`, `month`, `year`, and `all` when present in the listing URL.
- The default usable media count is 10 per Reddit source URL, with a configurable limit up to 200.
- Runtime fetching may request more than the selected media count so sticky, text-only, unsupported, deleted, filtered NSFW, and unavailable posts can be skipped before filling the feed.

## Persistence

Saved layouts store only user-provided Reddit source URLs, the selected media count, NSFW preference, timer settings, and layout metadata. They must not store Reddit listing payloads, post payloads, derived Reddit post URLs, media URLs, thumbnails, or normalized runtime media items.

## Runtime Flow

1. Parse pasted Reddit URLs.
2. Direct post URLs fetch their existing `.json?raw_json=1` runtime payload.
3. Listing URLs fetch `/r/<subreddit>/<sort>/.json?raw_json=1&limit=<fetchLimit>`, preserving `t=<range>` when present. The fetch limit is at least 200 so sticky, text-only, and unsupported posts do not exhaust the listing too early.
4. Normalize all fetched payloads through the existing Reddit normalization path.
5. Return the first selected number of usable media posts per source URL after skips. Stacked multi-subreddit sources concatenate those per-subreddit results into one feed.

## Errors

- Invalid direct post URL: `invalid_reddit_post_url`
- Invalid subreddit listing URL: `invalid_reddit_listing_url`
- Reddit not found/private/deleted response: existing not-found error
- Reddit rate limit: existing rate-limit error
- No usable media after filtering: `reddit_source_has_no_supported_media`

## Testing

Tests cover listing URL parsing, listing fetch URL construction, media limit behavior after skipped posts, API/UI query parameters, and workspace serialization without runtime media persistence.

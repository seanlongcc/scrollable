# Reddit Post Links Source Design

## Summary

Scrollable will replace subreddit auto-listing through Reddit OAuth with a direct Reddit post links source. Users paste one or more Reddit post permalinks, and the app fetches each post's public `.json?raw_json=1` payload at runtime to build in-memory media items.

## Behavior

- The Add source dialog exposes a Reddit post links textarea instead of subreddit/sort/range/limit/skip controls.
- Each non-empty line must be a `reddit.com` or `redd.it` post URL that resolves to a comments permalink.
- Fetching stays server-side through the app API with `cache: "no-store"` and a normal User-Agent.
- The existing Reddit normalization path converts fetched post payloads into runtime feed items, including galleries and videos.
- Unsupported links or posts without supported media return an explicit error or unsupported count; supported posts still open when at least one item normalizes successfully.
- The existing timer setting remains part of the source UI.

## Persistence And Privacy

- User-pasted Reddit post permalinks are allowed stored configuration data because the user intentionally provides them.
- The app still must never persist Reddit post payloads, third-party media URLs, thumbnails, cached JSON responses, or normalized runtime items.
- Saved layouts may store only the pasted post URLs, timer/NSFW preferences, and layout metadata. Reopening a saved Reddit links source refetches runtime media from the stored post URLs.
- Shared collection browsing remains metadata-only until a runtime feed is opened.

## Errors

- Invalid URL: reject before fetch with `invalid_reddit_post_url`.
- Reddit fetch failure: return `reddit_post_fetch_failed`.
- Private/deleted/not found post: return `reddit_post_not_found`.
- No supported media after normalization: return `reddit_post_has_no_supported_media`.
- NSFW runtime disabled: filter NSFW posts the same way existing normalization does.

## Test Focus

- URL parsing accepts Reddit permalinks and rejects subreddit/listing URLs.
- Fetching post links does not require `REDDIT_CLIENT_ID` or `REDDIT_CLIENT_SECRET`.
- Normalization handles direct post JSON payloads.
- UI posts pasted links to the new endpoint and saved layout serialization stores links but not runtime media.

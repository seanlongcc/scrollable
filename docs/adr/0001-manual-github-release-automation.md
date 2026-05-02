# Manual GitHub Release Automation

Scrollable releases are manually started GitHub Release runs with a human-selected semantic version, created only after production deploys from `main`. The workflow should automate verification, tag creation, generated release notes, and publishing, but it must not run on every `main` push, update `package.json`, create draft/prerelease releases, upload custom assets, or overwrite an existing tag/release.

This keeps a release as an intentional production checkpoint rather than a synonym for every deploy or merge. The release tag is the source of truth for release identity, the canonical production URL is `https://scrollable.app`, and release notes stay metadata-only so they preserve deploy history without expanding the app's media/privacy surface.

## Considered Options

- Automatic release on every `main` push: rejected because small fixes, CI-only changes, and deployment retries would create noisy product checkpoints.
- Automatic semantic version bumps from commits: rejected because this private app does not publish packages, and commit-derived version changes add ceremony before release practice is mature.
- Updating existing releases: rejected because release versions should behave as immutable production checkpoints.

## Consequences

Release creation requires explicit human intent and a version input. The release workflow should fail if the selected tag or release already exists.

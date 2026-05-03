# Site Changelog and Release Version Design

Scrollable should expose release history inside the app without creating a second source of truth. GitHub Releases remain the canonical release record, while the site provides a readable `/changelog` page and compact legal/footer links for release discovery.

## Goals

- Show a user-facing changelog on the site.
- Display the latest release version near existing legal links.
- Keep GitHub Releases as the source of truth.
- Avoid manual duplicate changelog maintenance.
- Avoid client-exposed GitHub secrets.
- Preserve metadata-only release display; do not introduce media payloads or third-party source data.

## Non-Goals

- Do not show every commit or merged pull request as a site changelog item.
- Do not create a database-backed changelog.
- Do not add AI summarization or a separate changelog authoring workflow.
- Do not use `package.json` version as app release identity.

## User Interface

Add a `/changelog` page with the same restrained, legal-adjacent visual language as Terms and Privacy. The page lists published GitHub releases newest first. The latest release is expanded by default. Older releases are collapsed behind native details/summary controls so the page remains scannable while still exposing the full GitHub release body.

The legal/footer surfaces should include:

- `Privacy`
- `Terms`
- `Changelog`
- `vX.Y.Z` when the latest release can be loaded

`Changelog` links to `/changelog`. The version text links directly to the latest GitHub Release. If the latest release cannot be loaded, hide the version text and keep the `Changelog` link.

Apply the footer/link treatment to the desktop workbench footer and account dialog footer. Add `Changelog` to legal page navigation. Keep mobile constraints in mind: links must wrap cleanly without overflowing.

## Data Source

Fetch published releases from the public GitHub repository:

`https://api.github.com/repos/seanlongcc/scrollable/releases`

Map only the fields needed by the UI:

- tag name
- release name
- published date
- GitHub HTML URL
- markdown body
- draft/prerelease flags for filtering

Filter out drafts and prereleases. The repo is public, so no GitHub token is required for the first implementation.

## Data Flow

Create a focused server-side release helper that fetches GitHub Releases with Next.js fetch revalidation set to 900 seconds. `/changelog` calls this helper server-side.

Client-rendered legal/footer components need latest release metadata without calling GitHub directly from the browser. Add a tiny metadata-only API route for the latest release. The returned payload includes only the latest tag and GitHub URL.

Render release bodies as Markdown. Prefer a small standard Markdown renderer over ad hoc parsing so generated GitHub release notes keep headings, links, and lists.

Do not persist release data in Supabase or localStorage.

## Failure States

If GitHub has no published releases, `/changelog` shows a calm empty state such as “No published releases yet.”

If GitHub fetch fails, `/changelog` shows “Release history is temporarily unavailable.” Footer legal links remain visible, and the latest version text is hidden. Do not show a toast for release metadata failures.

## Release Workflow Linkage

The future release workflow should create GitHub Releases with a predictable metadata-only deployment section:

- Production: `https://scrollable.app`
- Commit: the release commit SHA
- Verification: core gates passed

The changelog page does not need to parse this section in the first version. It renders the release body from GitHub.

## Testing

Add focused tests for the release data mapper:

- filters drafts and prereleases
- handles missing release body
- handles missing published date gracefully
- returns no latest release for empty data

Update UI tests for:

- workbench footer includes `Changelog`
- footer shows linked latest version when metadata exists
- footer hides version when metadata is unavailable
- account dialog includes `Changelog`
- legal page navigation includes `Changelog`
- changelog page renders populated, empty, and unavailable states

Run browser verification on mobile and desktop because legal/footer wrapping and the new page affect layout.

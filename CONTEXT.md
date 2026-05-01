# Scrollable

Scrollable is a reels-like media feed viewer with production operations that preserve clear product history.

## Language

**Release**:
A named checkpoint of user-visible product state that reached production.
_Avoid_: Preview deploy, pull request build, every merge

**Published Release**:
A release visible as the latest production checkpoint.
_Avoid_: Draft release, prerelease

**Immutable Release Checkpoint**:
A release version that must not be recreated or overwritten by automation.
_Avoid_: Reusing a version, updating an existing release by workflow

**Release Version**:
A human-selected semantic version assigned to a production release.
_Avoid_: Automatic version bump, package version

**Production Deploy**:
A successful deployment of `main` to the live Vercel production environment.
_Avoid_: Release, preview

**Production URL**:
The canonical live app URL for production users.
_Avoid_: Preview URL, workflow summary URL

**Preview Deploy**:
A temporary Vercel deployment for reviewing a pull request before production.
_Avoid_: Release, production

**Release Run**:
A manually started automation that creates a release for a selected release version.
_Avoid_: Automatic release on every `main` push

**Release Verification**:
Final sanity checks run during a release run before a release is created.
_Avoid_: Full CI duplicate

**Release Notes**:
Metadata-only summary of what changed in a release and how it was deployed.
_Avoid_: Media payloads, third-party media URLs, raw source data

**Changelog**:
The user-facing release history shown on the Scrollable site from published GitHub releases.
_Avoid_: Commit log, pull request stream, manual duplicate changelog

## Relationships

- A **Release** is created as a **Published Release** after exactly one **Production Deploy** succeeds.
- A **Release** has exactly one **Release Version**.
- A **Release Version** identifies one **Immutable Release Checkpoint**.
- A **Release Run** creates at most one **Release**.
- A **Release Run** includes **Release Verification**.
- A **Release** references the current `main` production commit and one **Production URL**.
- **Release Notes** describe one **Release**.
- A **Changelog** lists **Published Releases** newest first.
- A **Preview Deploy** does not create a **Release**.

## Example Dialogue

> **Dev:** "Should this pull request preview create a release?"
> **Domain expert:** "No. A release is only the named checkpoint after the production deploy from `main` succeeds."

## Flagged Ambiguities

- "release" was used to mean both feature tracking and deployment tracking; resolved: **Release** means a production checkpoint, not every merged feature.
- "version" could mean package metadata or release identity; resolved: **Release Version** is chosen by a human for release identity.
- "automated release" could mean automatic triggering or automatic execution; resolved: release execution is automated, but a **Release Run** is manually triggered.
- Package metadata versions do not define release identity; resolved: release tags are the source of truth for **Release Version**.

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublishedGitHubReleases } from "@/lib/releases/github";
import ChangelogPage from "./page";

vi.mock("@/lib/releases/github", () => ({
  fetchPublishedGitHubReleases: vi.fn(),
}));

describe("ChangelogPage", () => {
  beforeEach(() => {
    vi.mocked(fetchPublishedGitHubReleases).mockReset();
  });

  it("renders latest release expanded and older releases collapsed", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.2.0",
          name: "Version 0.2.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "## Changed\n\n- Added site changelog",
        },
        {
          tagName: "v0.1.0",
          name: "Initial release",
          publishedAt: null,
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.1.0",
          body: "",
        },
      ],
    });

    render(await ChangelogPage());

    expect(
      screen.getByRole("heading", { name: "Changelog" }),
    ).toBeInTheDocument();
    const latest = screen.getByTestId("release-v0.2.0");
    expect(latest).toHaveAttribute("open");
    expect(
      within(latest).getByRole("heading", { name: "Changed" }),
    ).toBeInTheDocument();
    expect(
      within(latest).getByText("Added site changelog"),
    ).toBeInTheDocument();
    expect(
      within(latest).getByRole("link", { name: "View full release" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
    );

    const older = screen.getByTestId("release-v0.1.0");
    expect(older).not.toHaveAttribute("open");
    expect(
      within(older).getByText("No release notes provided."),
    ).toBeInTheDocument();
  });

  it("renders an empty state when no releases exist", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [],
    });

    render(await ChangelogPage());

    expect(screen.getByText("No published releases yet.")).toBeInTheDocument();
  });

  it("renders an unavailable state when GitHub fetch fails", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "unavailable",
      releases: [],
    });

    render(await ChangelogPage());

    expect(
      screen.getByText("Release history is temporarily unavailable."),
    ).toBeInTheDocument();
  });

  it("does not render markdown images from release notes", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.3.0",
          name: "Version 0.3.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0",
          body: "![tracking pixel](https://example.com/tracker.gif)",
        },
      ],
    });

    const { container } = render(await ChangelogPage());

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("resolves relative markdown links against the GitHub repository", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.3.0",
          name: "Version 0.3.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0",
          body: "[compare changes](compare/v0.2.0...v0.3.0)",
        },
      ],
    });

    render(await ChangelogPage());

    expect(
      screen.getByRole("link", { name: "compare changes" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/compare/v0.2.0...v0.3.0",
    );
  });

  it("renders malformed percent markdown links as plain text", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.3.0",
          name: "Version 0.3.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0",
          body: "[bad percent](%zz)",
        },
      ],
    });

    render(await ChangelogPage());

    expect(screen.getByText("bad percent")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "bad percent" }),
    ).not.toBeInTheDocument();
  });

  it("renders angle-bracket markdown links as plain text", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.3.0",
          name: "Version 0.3.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0",
          body: "[bad angle](<bad>)",
        },
      ],
    });

    render(await ChangelogPage());

    expect(screen.getByText("bad angle")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "bad angle" }),
    ).not.toBeInTheDocument();
  });

  it("renders a disclosure cue for release summaries", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.3.0",
          name: "Version 0.3.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0",
          body: "Release notes",
        },
      ],
    });

    render(await ChangelogPage());

    const release = screen.getByTestId("release-v0.3.0");
    expect(within(release).getByText("Details")).toBeInTheDocument();
  });
});

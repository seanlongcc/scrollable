import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  isLocalFileCacheSupported,
  openSavedLayouts,
  selectSourceGrouping,
  stubRandomUuids,
  stubUrlResolveFetch,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench URL sources", () => {
  installFeedWorkbenchTestHooks();

  it("orders add-source type segments as Local, Reddit, URL and starts on Local", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });
    const sourceType = within(dialog).getByRole("group", {
      name: "Source type",
    });

    expect(
      within(sourceType)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Local", "Reddit", "URL"]);
    expect(
      within(sourceType).getByRole("button", { name: "Local" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(sourceType).getByRole("button", { name: "Local" }).className,
    ).toContain("!h-10");
    expect(
      within(sourceType).getByRole("button", { name: "Local" }).className,
    ).not.toContain("!h-11");
    expect(
      within(dialog).getByRole("group", { name: "Local upload picker" }),
    ).toBeInTheDocument();
  });

  it("reopens add-source dialog on the last selected source type", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    let dialog = await screen.findByRole("dialog", { name: "Add source" });
    await user.click(within(dialog).getByRole("button", { name: "URL" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Close dialog" }),
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));
    dialog = await screen.findByRole("dialog", { name: "Add source" });
    const sourceType = within(dialog).getByRole("group", {
      name: "Source type",
    });

    expect(
      within(sourceType).getByRole("button", { name: "URL" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByLabelText("URL")).toBeInTheDocument();
  });

  it("uses one shared old-style grouping control in the add-source dialog", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);
    await waitFor(() => expect(isLocalFileCacheSupported).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });

    expect(
      within(dialog).queryByText("Source grouping"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("group", { name: "Source mode" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", {
        name: "Add sources as one stacked source",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", {
        name: "Add sources as separate sources",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: "Add local files as separate sources",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: "Add Reddit links as separate sources",
      }),
    ).not.toBeInTheDocument();
  });

  it("adds a unified URL source and saves only URL metadata plus resolver hint", async () => {
    const fetchMock = stubUrlResolveFetch({
      resolution: {
        status: "resolved",
        mode: "direct-media",
        hint: "direct-media",
        title: "Direct image",
        externalUrl: "https://cdn.test/photo.jpg",
        items: [
          {
            id: "url:https://cdn.test/photo.jpg",
            source: "url",
            title: "Direct image",
            isNsfw: false,
            createdAt: "2026-04-25T00:00:00.000Z",
            media: [{ type: "image", url: "https://cdn.test/photo.jpg" }],
          },
        ],
      },
      nextResolverHint: "direct-media",
    });
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    expect(screen.getByLabelText("URL")).toHaveValue("");
    expect(screen.getByLabelText("URL")).toHaveAttribute(
      "placeholder",
      expect.stringContaining("https://example.com/media-or-page"),
    );
    setUrlValue("https://cdn.test/photo.jpg");
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect(await screen.findByAltText("Direct image")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "url=https%3A%2F%2Fcdn.test%2Fphoto.jpg",
    );

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";

    expect(saved).toContain('"kind":"url"');
    expect(saved).toContain("https://cdn.test/photo.jpg");
    expect(saved).toContain('"resolverHint":"direct-media"');
    expect(saved).not.toContain("url:https://cdn.test/photo.jpg");
    expect(saved).not.toContain('"media"');
  });

  it("adds pasted URL links as separate URL sources", async () => {
    const fetchMock = stubUrlResolveFetch((url) => ({
      resolution: {
        status: "resolved",
        mode: "direct-media",
        hint: "direct-media",
        title: new URL(url).hostname,
        externalUrl: url,
        items: [
          {
            id: `url:${url}`,
            source: "url",
            title: new URL(url).hostname,
            isNsfw: false,
            createdAt: "2026-04-25T00:00:00.000Z",
            media: [{ type: "image", url }],
          },
        ],
      },
      nextResolverHint: "direct-media",
    }));
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    await selectSourceGrouping(user, "Separate sources");
    setUrlValue(
      "https://cdn-one.test/photo.jpg\nhttps://cdn-two.test/photo.jpg",
    );
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect(await screen.findByAltText("cdn-one.test")).toBeInTheDocument();
    expect(await screen.findByAltText("cdn-two.test")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "url=https%3A%2F%2Fcdn-one.test%2Fphoto.jpg",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "url=https%3A%2F%2Fcdn-two.test%2Fphoto.jpg",
    );
  });

  it("adds a gallery URL source and saves only the gallery resolver hint", async () => {
    stubUrlResolveFetch({
      resolution: {
        status: "resolved",
        mode: "provider",
        hint: "provider:gallery",
        provider: "gallery",
        title: "Gallery URL",
        externalUrl: "https://nhentai.net/g/123456/",
        items: [
          {
            id: "url:gallery:runtime",
            source: "url",
            title: "Gallery image",
            isNsfw: true,
            createdAt: "2026-04-25T00:00:00.000Z",
            media: [
              {
                type: "image",
                url: "https://i.nhentai.net/galleries/98765/1.jpg",
              },
            ],
          },
        ],
      },
      nextResolverHint: "provider:gallery",
    });
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue("https://nhentai.net/g/123456/");
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect(await screen.findByAltText("Gallery image")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";

    expect(saved).toContain('"kind":"url"');
    expect(saved).toContain("https://nhentai.net/g/123456/");
    expect(saved).toContain('"resolverHint":"provider:gallery"');
    expect(saved).not.toContain("https://i.nhentai.net/galleries/98765/1.jpg");
    expect(saved).not.toContain("url:gallery:runtime");
    expect(saved).not.toContain('"media"');
  });

  it("resets source inputs each time the add-source dialog opens", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue("https://old.example/video");
    await user.type(screen.getByLabelText("Title"), "Old title");
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/pics/comments/abc123/old/",
    );
    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    await openAddSourceUrlPanel(user);

    expect(screen.getByLabelText("URL")).toHaveValue("");
    expect(screen.getByLabelText("Title")).toHaveValue("");
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    expect(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
    ).toHaveValue("");
  });

  it("anchors the add-source dialog within the viewport", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });

    expect(dialog.className).toContain("fixed");
    expect(dialog.className).not.toContain("relative");
  });

  it("reopens a saved URL source by trying its resolver hint first", async () => {
    const fetchMock = stubUrlResolveFetch({
      resolution: {
        status: "resolved",
        mode: "metadata",
        hint: "metadata",
        title: "Saved article",
        externalUrl: "https://example.com/article",
        metadata: {
          title: "Saved article",
          description: "Runtime-only description",
          siteName: "Example",
        },
      },
      nextResolverHint: "metadata",
    });
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            name: "Saved URL",
            layers: [{ id: "layer-1", name: "Layer 1" }],
            activeLayerId: "layer-1",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            globalTimerSeconds: 10,
            updatedAt: "2026-04-25T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "Saved article",
                layerId: "layer-1",
                timerMode: "global",
                timerSeconds: 10,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "url",
                  url: "https://example.com/article",
                  title: "Saved article",
                  resolverHint: "metadata",
                },
              },
            ],
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Saved URL"]);

    expect(await screen.findByText("Runtime-only description")).toBeVisible();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("hint=metadata");
  });

  it("shows a blocked URL iframe fallback with an external-open action", async () => {
    stubUrlResolveFetch({
      resolution: {
        status: "blocked",
        title: "Blocked site",
        externalUrl: "https://blocked.example/",
        reason: "url_source_frame_blocked",
      },
    });
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue("https://blocked.example/");
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect((await screen.findAllByText("Blocked site"))[0]).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open externally" }),
    ).toHaveAttribute("href", "https://blocked.example/");
    expect(screen.queryByLabelText("Blocked site timer progress")).toBeNull();
  });

  it.each([
    {
      label: "generic iframe",
      resolution: {
        status: "resolved" as const,
        mode: "iframe" as const,
        hint: "iframe" as const,
        title: "Unknown site",
        externalUrl: "https://unknown.example/",
        iframeUrl: "https://unknown.example/",
      },
    },
    {
      label: "Hitomi provider",
      resolution: {
        status: "resolved" as const,
        mode: "provider" as const,
        hint: "provider:hitomi" as const,
        provider: "hitomi",
        title: "Hitomi",
        externalUrl: "https://hitomi.la/cg/sample-123.html",
        iframeUrl: "https://hitomi.la/cg/sample-123.html",
      },
    },
    {
      label: "Instagram provider",
      resolution: {
        status: "resolved" as const,
        mode: "provider" as const,
        hint: "provider:instagram" as const,
        provider: "instagram",
        title: "Instagram",
        externalUrl: "https://www.instagram.com/p/example/",
        iframeUrl: "https://www.instagram.com/p/example/embed",
      },
    },
    {
      label: "TikTok provider",
      resolution: {
        status: "resolved" as const,
        mode: "provider" as const,
        hint: "provider:tiktok" as const,
        provider: "tiktok",
        title: "TikTok",
        externalUrl: "https://www.tiktok.com/@user/video/7611467568305540365",
        iframeUrl: "https://www.tiktok.com/embed/v2/7611467568305540365",
      },
    },
    {
      label: "Twitter/X provider",
      resolution: {
        status: "resolved" as const,
        mode: "provider" as const,
        hint: "provider:twitter" as const,
        provider: "twitter",
        title: "Twitter/X",
        externalUrl: "https://x.com/example/status/2047918257261150588",
        iframeUrl:
          "https://platform.twitter.com/embed/Tweet.html?id=2047918257261150588",
      },
    },
  ])("warns before rendering $label page embeds", async ({ resolution }) => {
    stubUrlResolveFetch({
      resolution,
      nextResolverHint: resolution.hint,
    });
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue(resolution.externalUrl);
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect(
      await screen.findByText("Site not natively supported"),
    ).toBeVisible();
    expect(container.querySelector("iframe")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Display site" }));

    expect(await screen.findByTitle(resolution.title)).toBeInTheDocument();
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      resolution.iframeUrl,
    );
  });

  it("renders YouTube provider URL sources as embedded provider panes", async () => {
    stubUrlResolveFetch({
      resolution: {
        status: "resolved",
        mode: "provider",
        hint: "provider:youtube",
        provider: "youtube",
        title: "YouTube video",
        externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        iframeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      nextResolverHint: "provider:youtube",
    });
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "Open URL" }));

    expect(await screen.findByTitle("YouTube video")).toBeInTheDocument();
    expectYoutubeIframeSrc(
      container.querySelector("iframe"),
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(container.querySelector("iframe")).toHaveAttribute(
      "allow",
      expect.stringContaining("autoplay"),
    );

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";

    expect(saved).toContain('"resolverHint":"provider:youtube"');
    expect(saved).not.toContain("youtube.com/embed");
  });

  it("keeps YouTube provider iframes mounted while another layer is active", async () => {
    stubUrlResolveFetch({
      resolution: {
        status: "resolved",
        mode: "provider",
        hint: "provider:youtube",
        provider: "youtube",
        title: "YouTube video",
        externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        iframeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      nextResolverHint: "provider:youtube",
    });
    stubRandomUuids(["workspace-1", "session-1", "layer-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await openAddSourceUrlPanel(user);
    setUrlValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "Open URL" }));
    expect(await screen.findByTitle("YouTube video")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));

    expectYoutubeIframeSrc(
      container.querySelector("iframe[title='YouTube video']"),
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("caps active mobile iframe fallback panes", async () => {
    vi.stubGlobal("innerWidth", 390);
    stubUrlResolveFetch((url) => ({
      resolution: {
        status: "resolved",
        mode: "iframe",
        hint: "iframe",
        title: new URL(url).hostname,
        externalUrl: url,
        iframeUrl: url,
      },
      nextResolverHint: "iframe",
    }));
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "iframe-layout",
        workspaces: [
          {
            id: "iframe-layout",
            name: "Iframe wall",
            layers: [{ id: "layer-1", name: "Layer 1" }],
            activeLayerId: "layer-1",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 2 },
            globalTimerSeconds: 10,
            updatedAt: "2026-04-25T00:00:00.000Z",
            sessions: [1, 2, 3].map((index) => ({
              id: `session-${index}`,
              title: `Site ${index}`,
              layerId: "layer-1",
              timerMode: "global",
              timerSeconds: 10,
              fixedSlot: index - 1,
              freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
              sourceConfig: {
                kind: "url",
                url: `https://site-${index}.example/`,
                resolverHint: "iframe",
              },
            })),
          },
        ],
      }),
    );

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Iframe wall"]);

    await screen.findAllByText("site-1.example");
    for (const button of screen.getAllByRole("button", {
      name: "Display site",
    })) {
      await user.click(button);
    }

    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(screen.getAllByText("Iframe limit reached")).toHaveLength(2);
  });

  it("keeps the add-source dialog available when UI chrome is hidden", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Hide UI" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add source to empty cell" })[0],
    );

    expect(
      await screen.findByRole("dialog", { name: "Add source" }),
    ).toBeInTheDocument();
  });
});

async function openAddSourceUrlPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add source" }));
  const dialog = await screen.findByRole("dialog", { name: "Add source" });
  await user.click(within(dialog).getByRole("button", { name: "URL" }));

  return dialog;
}

function setUrlValue(value: string) {
  fireEvent.change(screen.getByLabelText("URL"), {
    target: { value },
  });
}

function expectYoutubeIframeSrc(
  iframe: Element | null,
  expectedBaseUrl: string,
) {
  expect(iframe).toHaveAttribute("src", expect.any(String));
  const src = iframe?.getAttribute("src") ?? "";
  const url = new URL(src);

  expect(`${url.origin}${url.pathname}`).toBe(expectedBaseUrl);
  expect(url.searchParams.get("enablejsapi")).toBe("1");
}

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  redditListingFromRuntimeItems,
  selectSourceGrouping,
  stubRuntimeFetch,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench Reddit source inputs", () => {
  installFeedWorkbenchTestHooks();

  it("fetches pasted Reddit post links directly from Reddit", async () => {
    const fetchMock = stubRuntimeFetch();

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/pics, r/aww" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    const secondRequestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[1]?.[0],
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestUrl).toBe(
      "https://www.reddit.com/r/pics/comments/abc123/runtime_image/.json?raw_json=1",
    );
    expect(secondRequestUrl).toBe(
      "https://www.reddit.com/r/aww/comments/def456/runtime_image/.json?raw_json=1",
    );
    expect(requestUrl).not.toContain("/api/reddit/listing");
  });

  it("sends subreddit listing URLs with a custom media count", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.clear(screen.getByLabelText("Reddit media count"));
    await user.type(screen.getByLabelText("Reddit media count"), "24");
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/kpop/top/?t=week",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toBe(
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
    );
  });

  it("allows subreddit media counts up to 200", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.clear(screen.getByLabelText("Reddit media count"));
    await user.type(screen.getByLabelText("Reddit media count"), "200");
    await user.type(screen.getByLabelText("Subreddit name"), "kpop");
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toContain("limit=200");
  });

  it("accepts a bare subreddit name with listing controls", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });
    expect(
      within(dialog).getByRole("button", { name: "Use subreddit name" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByLabelText("Subreddit name")).toHaveValue("");
    expect(within(dialog).getByLabelText("Subreddit name")).toHaveAttribute(
      "placeholder",
      "popular, pics, aww",
    );
    await user.type(within(dialog).getByLabelText("Subreddit name"), "kpop");
    await user.click(within(dialog).getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "Top" }));
    await user.click(
      within(dialog).getByRole("combobox", { name: "Time range" }),
    );
    await user.click(screen.getByRole("option", { name: "Week" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toBe(
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
    );
  });

  it("defaults subreddit listings to top week", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });
    await user.type(within(dialog).getByLabelText("Subreddit name"), "kpop");
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toBe(
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
    );
  });

  it("accepts multiple bare subreddit names with listing controls", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
      {
        id: "runtime-aww",
        source: "reddit",
        title: "Runtime aww",
        subreddit: "aww",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    const dialog = await screen.findByRole("dialog", { name: "Add source" });
    await user.type(
      within(dialog).getByLabelText("Subreddit name"),
      "kpop, aww",
    );
    await user.click(within(dialog).getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "Top" }));
    await user.click(
      within(dialog).getByRole("combobox", { name: "Time range" }),
    );
    await user.click(screen.getByRole("option", { name: "Week" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop, r/aww" });
    expect(screen.getByAltText("Runtime kpop")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Global next" }));
    expect(screen.getByAltText("Runtime aww")).toBeInTheDocument();
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    const secondRequestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[1]?.[0],
    );
    expect(requestUrl).toBe(
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
    );
    expect(secondRequestUrl).toBe(
      "https://www.reddit.com/r/aww/top/.json?raw_json=1&t=week&limit=200",
    );
  });

  it("keeps bare subreddit examples out of the Reddit links placeholder", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));

    const placeholder = screen
      .getByLabelText("Paste Reddit post or subreddit links, one per line")
      .getAttribute("placeholder");
    expect(placeholder).toContain("Specific post link");
    expect(placeholder).toContain("Sorted subreddit link");
    expect(placeholder).not.toContain("Subreddit name");
    expect(placeholder).not.toContain("\nkpop");
  });

  it("can add Reddit post links as separate sources", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);
      const subreddit = requestUrl.includes("/r/aww/") ? "aww" : "pics";

      return {
        ok: true,
        json: async () =>
          redditListingFromRuntimeItems(
            [
              {
                id: `reddit:${subreddit}`,
                source: "reddit",
                title: `Runtime ${subreddit}`,
                subreddit,
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [
                  {
                    type: "image",
                    url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
                  },
                ],
              },
            ],
            requestUrl,
          ),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await selectSourceGrouping(user, "Separate sources");
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/pics" });
    await screen.findByRole("button", { name: "Remove r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://www.reddit.com/r/pics/comments/abc123/runtime_image/.json?raw_json=1",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://www.reddit.com/r/aww/comments/def456/runtime_image/.json?raw_json=1",
    );
  });

  it("edits a Reddit source by removing a link and refetching remaining media", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);
      const subreddit = requestUrl.includes("/r/aww/") ? "aww" : "pics";

      return {
        ok: true,
        json: async () =>
          redditListingFromRuntimeItems(
            [
              {
                id: `reddit:${subreddit}-${fetchMock.mock.calls.length}`,
                source: "reddit",
                title: `Runtime ${subreddit}`,
                subreddit,
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [
                  {
                    type: "image",
                    url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
                  },
                ],
              },
            ],
            requestUrl,
          ),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await screen.findByRole("button", { name: "Edit r/pics, r/aww" });

    await user.click(
      screen.getByRole("button", { name: "Edit r/pics, r/aww" }),
    );
    const editDialog = await screen.findByRole("dialog", {
      name: "Edit source",
    });
    await user.click(
      within(editDialog).getByRole("button", { name: "Remove r/pics link" }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    await screen.findByRole("button", { name: "Edit r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refetchUrl = String(fetchMock.mock.calls[2]?.[0]);
    expect(refetchUrl).toBe(
      "https://www.reddit.com/r/aww/comments/def456/runtime_image/.json?raw_json=1",
    );
  });
});

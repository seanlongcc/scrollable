import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  redditApiPayloadFromRuntimeItems,
  selectSourceGrouping,
  stubRuntimeFetch,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench Reddit source inputs", () => {
  installFeedWorkbenchTestHooks();

  it("fetches pasted Reddit post links through the app API", async () => {
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
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/pics, r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
      limit: "10",
    });
    expectRedditApiRequest(fetchMock, {
      index: 1,
      url: "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      limit: "10",
    });
  });

  it("sends subreddit listing URLs with a custom post count", async () => {
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
    await user.clear(screen.getByLabelText("Reddit post count"));
    await user.type(screen.getByLabelText("Reddit post count"), "24");
    await user.click(await screen.findByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/kpop/top/?t=week",
    );
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: "24",
    });
  });

  it("allows subreddit post counts up to 100", async () => {
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
    await user.clear(screen.getByLabelText("Reddit post count"));
    await user.type(screen.getByLabelText("Reddit post count"), "100");
    await user.type(screen.getByLabelText("Subreddit name"), "kpop");
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: "100",
    });
  });

  it("does not focus the post count field when editing a Reddit source", async () => {
    stubRuntimeFetch();

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Edit r/pics" });

    await user.click(screen.getByRole("button", { name: "Edit r/pics" }));

    const editDialog = await screen.findByRole("dialog", {
      name: "Edit source",
    });
    expect(
      within(editDialog).getByLabelText("Reddit post count"),
    ).not.toHaveFocus();
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
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: "10",
    });
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
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: "10",
    });
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
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/kpop, r/aww" });
    expect(screen.getByAltText("Runtime kpop")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Global next" }));
    expect(screen.getByAltText("Runtime aww")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: "10",
    });
    expectRedditApiRequest(fetchMock, {
      index: 1,
      url: "https://www.reddit.com/r/aww/top/?t=week",
      limit: "10",
    });
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
    expect(placeholder).toContain(
      "https://www.reddit.com/r/pics/comments/abc123/title/",
    );
    expect(placeholder).toContain("https://www.reddit.com/r/pics/top/?t=week");
    expect(placeholder).not.toContain("Subreddit name");
    expect(placeholder).not.toContain("\nkpop");
  });

  it("can add Reddit post links as separate sources", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);
      const items = [
        {
          id: "reddit:pics",
          source: "reddit" as const,
          title: "Runtime pics",
          subreddit: "pics",
          isNsfw: false,
          createdAt: "2026-04-24T00:00:00.000Z",
          media: [
            {
              type: "image" as const,
              url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            },
          ],
        },
        {
          id: "reddit:aww",
          source: "reddit" as const,
          title: "Runtime aww",
          subreddit: "aww",
          isNsfw: false,
          createdAt: "2026-04-24T00:00:00.000Z",
          media: [
            {
              type: "image" as const,
              url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            },
          ],
        },
      ];

      return {
        ok: true,
        json: async () => redditApiPayloadFromRuntimeItems(items, requestUrl),
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
    await user.click(screen.getByRole("button", { name: "Add source" }));

    await screen.findByRole("button", { name: "Remove r/pics" });
    await screen.findByRole("button", { name: "Remove r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectRedditApiRequest(fetchMock, {
      url: "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
      limit: "10",
    });
    expectRedditApiRequest(fetchMock, {
      index: 1,
      url: "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      limit: "10",
    });
  });

  it("edits a Reddit source without exposing per-link removal", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);
      const callIndex = fetchMock.mock.calls.length;
      const items = [
        {
          id: `reddit:pics-${callIndex}`,
          source: "reddit" as const,
          title: "Runtime pics",
          subreddit: "pics",
          isNsfw: false,
          createdAt: "2026-04-24T00:00:00.000Z",
          media: [
            {
              type: "image" as const,
              url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            },
          ],
        },
        {
          id: `reddit:aww-${callIndex}`,
          source: "reddit" as const,
          title: "Runtime aww",
          subreddit: "aww",
          isNsfw: false,
          createdAt: "2026-04-24T00:00:00.000Z",
          media: [
            {
              type: "image" as const,
              url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            },
          ],
        },
      ];

      return {
        ok: true,
        json: async () => redditApiPayloadFromRuntimeItems(items, requestUrl),
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
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await screen.findByRole("button", { name: "Edit r/pics, r/aww" });

    await user.click(
      screen.getByRole("button", { name: "Edit r/pics, r/aww" }),
    );
    const editDialog = await screen.findByRole("dialog", {
      name: "Edit source",
    });
    expect(
      within(editDialog).queryByRole("button", { name: "Remove r/pics link" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    await screen.findByRole("button", { name: "Edit r/pics, r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expectRedditApiRequest(fetchMock, {
      index: 2,
      url: "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
      limit: "10",
    });
    expectRedditApiRequest(fetchMock, {
      index: 3,
      url: "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      limit: "10",
    });
  });
});

function expectRedditApiRequest(
  fetchMock: ReturnType<typeof vi.fn>,
  {
    index = 0,
    url,
    limit,
  }: {
    index?: number;
    url: string;
    limit: string;
  },
) {
  const request = new URL(
    String(fetchMock.mock.calls[index]?.[0]),
    "http://localhost",
  );
  expect(request.pathname).toBe("/api/reddit/listing");
  expect(request.searchParams.get("urls")).toBe(url);
  expect(request.searchParams.get("allowNsfw")).toBe("true");
  expect(request.searchParams.get("limit")).toBe(limit);
  expect(fetchMock.mock.calls[index]?.[1]).toEqual({ cache: "no-store" });
  expect(
    fetchMock.mock.calls.some(([input]) =>
      String(input).startsWith("https://www.reddit.com"),
    ),
  ).toBe(false);
}

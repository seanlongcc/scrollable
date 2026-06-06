import { afterEach, describe, expect, it } from "vitest";

import { fetchBrowserRedditRuntimePostItems } from "./browser-reddit-runtime";

afterEach(() => {
  document.head.querySelectorAll("script").forEach((script) => {
    script.remove();
  });
});

describe("fetchBrowserRedditRuntimePostItems", () => {
  it("overfetches listing JSONP so skipped posts do not reduce the requested media count", async () => {
    const request = fetchBrowserRedditRuntimePostItems({
      url: "https://www.reddit.com/r/kpop/top/?t=week",
      allowNsfw: true,
      limit: 2,
    });

    const script = await waitForRedditJsonpScript();
    const scriptUrl = new URL(script.src);
    expect(scriptUrl.searchParams.get("limit")).toBe("4");
    expect(scriptUrl.searchParams.get("include_over_18")).toBe("on");

    resolveRedditJsonpScript(script, {
      kind: "Listing",
      data: {
        children: [
          {
            data: {
              id: "sticky",
              stickied: true,
              title: "Sticky",
              subreddit: "kpop",
              post_hint: "image",
              url: "https://i.redd.it/sticky.jpg",
            },
          },
          {
            data: {
              id: "self",
              title: "Text post",
              subreddit: "kpop",
            },
          },
          {
            data: {
              id: "one",
              title: "One",
              subreddit: "kpop",
              post_hint: "image",
              url: "https://i.redd.it/one.jpg",
            },
          },
          {
            data: {
              id: "two",
              title: "Two",
              subreddit: "kpop",
              post_hint: "image",
              url: "https://i.redd.it/two.jpg",
            },
          },
        ],
      },
    });

    await expect(request).resolves.toMatchObject([
      { id: "reddit:one" },
      { id: "reddit:two" },
    ]);
  });
});

async function waitForRedditJsonpScript() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const script = document.head.querySelector("script");
    if (script) return script;

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Reddit JSONP script was not appended");
}

function resolveRedditJsonpScript(script: HTMLScriptElement, payload: unknown) {
  const callbackName = new URL(script.src).searchParams.get("jsonp");
  expect(callbackName).toBeTruthy();

  (window as unknown as Record<string, (payload: unknown) => void>)[
    callbackName!
  ](payload);
}

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { getSharedLayoutMetadata } from "@/lib/data/share";

vi.mock("@/lib/data/share", () => ({
  getSharedLayoutMetadata: vi.fn(),
}));

import SharedLayoutPage from "./page";
import { getSharedLayoutMetadata as getSharedLayoutMetadataMock } from "@/lib/data/share";

const mockGetSharedLayoutMetadata = vi.mocked(getSharedLayoutMetadataMock);

describe("SharedLayoutPage", () => {
  it("lists saved source URLs and uses normal weight for shared page controls", async () => {
    mockGetSharedLayoutMetadata.mockResolvedValue({
      status: "ok",
      slug: "layout-share",
      layout: {
        id: "layout-1",
        owner_id: "owner-1",
        name: "mango 2",
        layers: [],
        active_layer_id: "layer-1",
        layout_mode: "free",
        fixed_columns: 2,
        fixed_rows: 2,
        global_timer_seconds: 15,
        metadata_bytes: 1536,
        sessions: [
          {
            sourceConfig: {
              kind: "reddit",
              urls: [
                "https://www.reddit.com/r/pics/top/?t=week",
                "https://www.reddit.com/r/aww/comments/example/post/",
              ],
            },
          },
          {
            sourceConfig: {
              kind: "url",
              url: "https://example.com/gallery",
            },
          },
          {
            sourceConfig: {
              kind: "local",
              fileCount: 3,
            },
          },
        ],
        template_slots: [],
        created_at: "2026-05-02T00:00:00.000Z",
        updated_at: "2026-05-02T00:00:00.000Z",
      },
      summary: {
        sourceCount: 3,
        boxCount: 3,
        sourceCounts: { reddit: 1, url: 1, local: 1 },
      },
    } satisfies Awaited<ReturnType<typeof getSharedLayoutMetadata>>);

    render(
      await SharedLayoutPage({ params: Promise.resolve({ slug: "abc" }) }),
    );

    expect(screen.getByText("mango 2")).toHaveClass("font-sans");
    expect(screen.getByText("mango 2")).toHaveClass("font-normal");
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("reddit 1 · url 1 · local 1")).toBeInTheDocument();

    expect(
      screen.queryByRole("list", { name: "Reddit sources" }),
    ).not.toBeInTheDocument();
    const firstRedditLink = screen.getByRole("link", {
      name: "https://www.reddit.com/r/pics/top/?t=week",
    });
    expect(firstRedditLink).toHaveAttribute(
      "href",
      "https://www.reddit.com/r/pics/top/?t=week",
    );
    expect(firstRedditLink).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", {
        name: "https://www.reddit.com/r/aww/comments/example/post/",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.reddit.com/r/aww/comments/example/post/",
    );

    expect(
      screen.queryByRole("list", { name: "URL sources" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://example.com/gallery" }),
    ).toHaveAttribute("href", "https://example.com/gallery");
    expect(screen.getByText("3 local files")).toBeInTheDocument();

    for (const label of ["Viewer", "Open now", "Import"]) {
      expect(screen.getByRole("link", { name: label })).toHaveClass(
        "font-normal",
      );
    }
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SourceDialog, type SourceDialogProps } from "./source-add-dialog";

describe("SourceDialog", () => {
  it("offers stacked grouping for URL sources", () => {
    render(<SourceDialog {...dialogProps({ sourceKind: "url" })} />);

    expect(
      screen.getByRole("button", { name: "Add sources as one stacked source" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Add sources as separate sources" }),
    ).toBeInTheDocument();
  });
});

function dialogProps(
  overrides: Partial<SourceDialogProps> = {},
): SourceDialogProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    sourceKind: "local",
    urlValue: "",
    urlTitle: "",
    redditUrls: "",
    redditInputMode: "subreddit",
    subredditName: "",
    redditSort: "top",
    redditTimeRange: "week",
    redditLimit: 10,
    isLoading: false,
    sourceGroupingMode: "stacked",
    setSourceKind: vi.fn(),
    setUrlValue: vi.fn(),
    setUrlTitle: vi.fn(),
    setRedditUrls: vi.fn(),
    setRedditInputMode: vi.fn(),
    setSubredditName: vi.fn(),
    setRedditSort: vi.fn(),
    setRedditTimeRange: vi.fn(),
    setRedditLimit: vi.fn(),
    setSourceGroupingMode: vi.fn(),
    openUrlSource: vi.fn(),
    fetchRedditFeed: vi.fn(),
    addLocalFiles: vi.fn(),
    selectLocalFilesWithHandles: vi.fn(),
    selectLocalFolderWithHandles: vi.fn(),
    addDroppedLocalFiles: vi.fn(),
    allowLocalFileDrop: vi.fn(),
    ...overrides,
  };
}

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/viewer/feed-workbench", () => ({
  FeedWorkbench: ({ initialWorkspaceId }: { initialWorkspaceId?: string }) => (
    <main
      data-initial-workspace-id={initialWorkspaceId ?? ""}
      data-testid="feed-workbench"
    />
  ),
}));

import Home from "./page";

describe("Home", () => {
  it("does not pass a generated workspace id during server render", () => {
    render(<Home />);

    expect(screen.getByTestId("feed-workbench")).toHaveAttribute(
      "data-initial-workspace-id",
      "",
    );
  });
});

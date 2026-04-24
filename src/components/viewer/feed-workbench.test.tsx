import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedWorkbench } from "./feed-workbench";

describe("FeedWorkbench", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render saved or shared media previews before runtime feed opens", () => {
    const { container } = render(<FeedWorkbench />);

    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("renders a live multi-view workspace with fixed 2x1 defaults", () => {
    const { container } = render(<FeedWorkbench />);

    expect(
      screen.getByRole("heading", { name: "Multi-view wall" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Fixed columns")).toHaveValue(2);
    expect(screen.getByLabelText("Fixed rows")).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Master next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("maximizes a runtime feed into focus plus satellite mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "runtime-1",
              source: "reddit",
              title: "Runtime image",
              subreddit: "pics",
              isNsfw: false,
              createdAt: "2026-04-24T00:00:00.000Z",
              media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
            },
          ],
        }),
      })),
    );
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Maximize r/pics" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Maximize r/pics" }));

    expect(screen.getByText("Focus view")).toBeInTheDocument();
    expect(screen.getByText("Satellite views")).toBeInTheDocument();
  });
});

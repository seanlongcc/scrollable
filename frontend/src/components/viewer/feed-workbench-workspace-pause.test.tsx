import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  stubRandomUuids,
  stubRuntimeFetch,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench workspace pause state", () => {
  installFeedWorkbenchTestHooks();

  it("keeps paused source timers when switching layout tabs", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["session-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });
    await user.click(selectedPlaybackButton("Pause"));
    expect(selectedPlaybackButton("Play")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Untitled layout" }));
    await user.click(screen.getByRole("button", { name: "Select r/pics" }));

    expect(selectedPlaybackButton("Play")).toBeInTheDocument();
  });
});

function selectedPlaybackButton(name: "Pause" | "Play") {
  return within(
    screen.getAllByLabelText("Selected source playback controls")[0]!,
  ).getByRole("button", { name });
}

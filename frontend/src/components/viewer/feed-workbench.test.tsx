import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench", () => {
  installFeedWorkbenchTestHooks();

  it("does not render saved or shared media previews before runtime feed opens", () => {
    const { container } = render(<FeedWorkbench />);

    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("renders fixed 2x1 workspace controls", () => {
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Columns")).toHaveValue(2);
    expect(screen.getByLabelText("Columns")).toHaveAttribute("max", "16");
    expect(screen.getByLabelText("Rows")).toHaveValue(1);
    expect(screen.getByLabelText("Rows")).toHaveAttribute("max", "16");
    expect(
      screen.getByRole("button", { name: "Global next" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add source" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("does not render the clear button in server markup for an empty layout", () => {
    const html = renderToString(<FeedWorkbench />);
    const clearButtonHtml =
      html.match(/<button(?=[^>]*title="Clear")[^>]*>/)?.[0] ?? "";

    expect(clearButtonHtml).toBe("");
  });

  it("hides the clear button after hydration when the layout is empty", async () => {
    render(<FeedWorkbench />);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Clear" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens sign in and sign up as an overlay", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reddit" }),
    ).not.toBeInTheDocument();
  });
});

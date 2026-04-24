import { render } from "@testing-library/react";
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
});

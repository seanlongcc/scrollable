import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReleaseVersionLink } from "./release-version-link";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReleaseVersionLink", () => {
  it("links the latest version to the GitHub release", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          release: {
            tagName: "v0.2.0",
            htmlUrl:
              "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          },
        }),
      })),
    );

    render(<ReleaseVersionLink className="test-class" />);

    const link = await screen.findByRole("link", { name: "v0.2.0" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveClass("test-class");
  });

  it("renders nothing when latest release is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ release: null }),
      })),
    );

    const { container } = render(<ReleaseVersionLink />);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/releases/latest"),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network failed");
      }),
    );

    const { container } = render(<ReleaseVersionLink />);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/releases/latest"),
    );
    expect(container).toBeEmptyDOMElement();
  });
});

import { describe, expect, it, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: toastMocks.toast,
}));

import { showRuntimeNotice } from "./runtime-notice-toast";

describe("showRuntimeNotice", () => {
  it("uses warning toasts for warning notices", () => {
    showRuntimeNotice({
      tone: "warning",
      message:
        "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
    });

    expect(toastMocks.toast.warning).toHaveBeenCalledWith(
      "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
    );
    expect(toastMocks.toast.error).not.toHaveBeenCalled();
  });

  it("uses error toasts for error notices", () => {
    showRuntimeNotice({
      tone: "error",
      message: "Reddit fetch failed",
    });

    expect(toastMocks.toast.error).toHaveBeenCalledWith("Reddit fetch failed");
  });
});

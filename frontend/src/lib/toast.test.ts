import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LAZY_TOASTER_REQUEST_EVENT } from "./toast-events";
import { toast } from "./toast";

const sonnerMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: sonnerMocks.toast,
}));

describe("toast", () => {
  afterEach(() => {
    sonnerMocks.toast.error.mockClear();
    sonnerMocks.toast.message.mockClear();
    sonnerMocks.toast.success.mockClear();
    sonnerMocks.toast.warning.mockClear();
  });

  it("requests lazy toaster mount before showing a toast", async () => {
    const onToastRequest = vi.fn();
    window.addEventListener(LAZY_TOASTER_REQUEST_EVENT, onToastRequest);

    toast.success("Saved");

    expect(onToastRequest).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(sonnerMocks.toast.success).toHaveBeenCalledWith("Saved"),
    );

    window.removeEventListener(LAZY_TOASTER_REQUEST_EVENT, onToastRequest);
  });

  it("keeps toast options intact when delegating to Sonner", async () => {
    toast.warning("Saved without files", {
      description: "Reload files after refresh.",
    });

    await waitFor(() =>
      expect(sonnerMocks.toast.warning).toHaveBeenCalledWith(
        "Saved without files",
        {
          description: "Reload files after refresh.",
        },
      ),
    );
  });
});

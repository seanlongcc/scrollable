import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalObjectUrlRegistry } from "./object-urls";

describe("LocalObjectUrlRegistry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates session-only URLs and revokes all on cleanup", () => {
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second")
      .mockReturnValueOnce("blob:third");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const registry = new LocalObjectUrlRegistry();
    const image = new File(["a"], "a.png", { type: "image/png" });
    const video = new File(["b"], "b.mp4", { type: "video/mp4" });
    const audio = new File(["c"], "c.mp3", { type: "audio/mpeg" });

    expect(registry.add(image)).toMatchObject({
      source: "local",
      title: "a.png",
      media: [{ type: "image", url: "blob:first" }],
    });
    expect(registry.add(video).media[0]).toMatchObject({
      type: "video",
      url: "blob:second",
    });
    expect(registry.add(audio).media[0]).toMatchObject({
      type: "audio",
      url: "blob:third",
    });

    registry.revokeAll();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:third");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  createLocalRuntimeItems,
  createLocalSessionSources,
  localFileReferencesFromFiles,
} from "./local-sources";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createLocalSessionSources", () => {
  it("applies per-file video ranges to local runtime video items", () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi
        .fn()
        .mockReturnValueOnce("blob:video")
        .mockReturnValueOnce("blob:image"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("video")
        .mockReturnValueOnce("image"),
    });
    const files = [
      new File(["video"], "clip.mp4", { type: "video/mp4" }),
      new File(["image"], "still.png", { type: "image/png" }),
    ];

    const items = createLocalRuntimeItems(
      files,
      { current: null },
      {
        0: { startSeconds: 10, endSeconds: 30 },
      },
    );

    expect(items[0]?.media[0]).toMatchObject({
      type: "video",
      videoTimeRange: { startSeconds: 10, endSeconds: 30 },
    });
    expect(items[1]?.media[0]).not.toHaveProperty("videoTimeRange");
  });

  it("randomizes grouped local source item order", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.1);
    const files = ["first", "second", "third"].map(
      (name) => new File(["x"], `${name}.png`, { type: "image/png" }),
    );
    const items = files.map((file): RuntimeFeedItem => {
      const name = file.name.replace(".png", "");

      return {
        id: `local:${name}`,
        source: "local",
        title: file.name,
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: `blob:${name}` }],
      };
    });

    const [source] = await createLocalSessionSources({
      fileReferences: localFileReferencesFromFiles(files),
      items,
      sourceGroupingMode: "stacked",
      cacheFiles: vi.fn(async () => "cache-1"),
    });

    expect(source?.items.map((item) => item.id)).toEqual([
      "local:second",
      "local:third",
      "local:first",
    ]);
  });
});

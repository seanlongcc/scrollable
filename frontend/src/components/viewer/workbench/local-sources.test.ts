import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  createLocalSessionSources,
  localFileReferencesFromFiles,
} from "./local-sources";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLocalSessionSources", () => {
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

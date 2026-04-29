import { EyeOff, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEFAULT_REDDIT_MEDIA_LIMIT, MAX_REDDIT_MEDIA_LIMIT } from "./types";
import type { FeedSession } from "./types";
import {
  clamp,
  redditHashesForItemId,
  redditHiddenItemHashes,
  redditItemHashInput,
  redditRuntimeItemLabels,
  subredditFromRedditUrl,
} from "./helpers";

export function EditSourceDialog({
  source,
  open,
  onOpenChange,
  onSaveReddit,
  onSaveUrl,
  onSaveLocal,
}: {
  source: FeedSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveReddit: (
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) => void;
  onSaveUrl: (id: string, url: string, title?: string) => void;
  onSaveLocal: (id: string, files: File[]) => void;
}) {
  type LocalEditEntry = { file: File; previewUrl?: string };
  const [redditUrls, setRedditUrls] = useState<string[]>(
    source.sourceConfig.kind === "reddit" ? source.sourceConfig.urls : [],
  );
  const [redditLimit, setRedditLimit] = useState(
    source.sourceConfig.kind === "reddit"
      ? (source.sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT)
      : DEFAULT_REDDIT_MEDIA_LIMIT,
  );
  const [localEntries, setLocalEntries] = useState<LocalEditEntry[]>(
    source.sourceConfig.kind === "local"
      ? (source.localFiles ?? []).map((file, index) => ({
          file,
          previewUrl: source.items[index]?.media[0]?.url,
        }))
      : [],
  );
  const [urlValue, setUrlValue] = useState(
    source.sourceConfig.kind === "url" ? source.sourceConfig.url : "",
  );
  const [urlTitle, setUrlTitle] = useState(
    source.sourceConfig.kind === "url" ? (source.sourceConfig.title ?? "") : "",
  );
  const [hiddenRedditItemIds, setHiddenRedditItemIds] = useState<string[]>([]);
  const [unhiddenRedditHashes, setUnhiddenRedditHashes] = useState<string[]>(
    [],
  );
  const [savedHiddenHashMatches, setSavedHiddenHashMatches] = useState<
    Record<string, string[]>
  >({});

  const currentSource = source;
  const isReddit = currentSource.sourceConfig.kind === "reddit";
  const isUrl = currentSource.sourceConfig.kind === "url";
  const savedHiddenHashes = useMemo(
    () =>
      currentSource.sourceConfig.kind === "reddit"
        ? redditHiddenItemHashes(currentSource.sourceConfig)
        : [],
    [currentSource.sourceConfig],
  );
  const savedHiddenHashSet = useMemo(
    () => new Set(savedHiddenHashes),
    [savedHiddenHashes],
  );
  const activeHiddenHashSet = useMemo(
    () =>
      new Set(
        savedHiddenHashes.filter(
          (hash) => !unhiddenRedditHashes.includes(hash),
        ),
      ),
    [savedHiddenHashes, unhiddenRedditHashes],
  );
  const runtimeRedditItems = useMemo(
    () =>
      currentSource.sourceConfig.kind === "reddit"
        ? (currentSource.allItems ?? currentSource.items)
        : [],
    [currentSource.allItems, currentSource.items, currentSource.sourceConfig],
  );
  const redditItemLabels = redditRuntimeItemLabels(runtimeRedditItems);
  const hiddenRedditCount = runtimeRedditItems.filter((item) => {
    const itemId = redditItemHashInput(item.id);
    const savedMatches = savedHiddenHashMatches[itemId] ?? [];

    return (
      hiddenRedditItemIds.includes(itemId) ||
      savedMatches.some((hash) => activeHiddenHashSet.has(hash))
    );
  }).length;

  useEffect(() => {
    if (!isReddit || !savedHiddenHashes.length || !runtimeRedditItems.length) {
      return;
    }

    let cancelled = false;

    async function matchSavedHiddenHashes() {
      const entries = await Promise.all(
        runtimeRedditItems.map(async (item) => {
          const itemId = redditItemHashInput(item.id);
          const matches = (await redditHashesForItemId(item.id)).filter(
            (hash) => savedHiddenHashSet.has(hash),
          );

          return [itemId, matches] as const;
        }),
      );

      if (!cancelled) {
        setSavedHiddenHashMatches(
          Object.fromEntries(entries.filter((entry) => entry[1].length)),
        );
      }
    }

    void matchSavedHiddenHashes();

    return () => {
      cancelled = true;
    };
  }, [
    isReddit,
    runtimeRedditItems,
    savedHiddenHashes.length,
    savedHiddenHashSet,
  ]);

  function removeRedditUrl(index: number) {
    setRedditUrls((current) =>
      current.filter((_url, currentIndex) => currentIndex !== index),
    );
  }

  function updateRedditUrl(index: number, value: string) {
    setRedditUrls((current) =>
      current.map((url, currentIndex) =>
        currentIndex === index ? value : url,
      ),
    );
  }

  function save() {
    if (isReddit) {
      onSaveReddit(
        currentSource.id,
        redditUrls.map((url) => url.trim()).filter(Boolean),
        redditLimit,
        hiddenRedditItemIds,
        unhiddenRedditHashes,
      );
      return;
    }

    if (isUrl) {
      onSaveUrl(
        currentSource.id,
        urlValue.trim(),
        urlTitle.trim() || undefined,
      );
      return;
    }

    onSaveLocal(
      currentSource.id,
      localEntries.map((entry) => entry.file),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[min(94vw,42rem)] overflow-y-auto overflow-x-hidden border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(18,10,10,0.72)] sm:max-w-2xl",
          isReddit
            ? "grid h-[min(92dvh,46rem)] grid-rows-[auto_minmax(0,1fr)]"
            : "max-h-[92dvh]",
        )}
      >
        <DialogHeader>
          <DialogTitle>Edit source</DialogTitle>
          <DialogDescription className="sr-only">
            Edit source contents without changing layout placement.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "grid gap-3",
            isReddit && "min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]",
          )}
        >
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <Pencil className="size-4 text-primary" />
            <span className="truncate font-medium">{source.title}</span>
          </div>

          {isReddit ? (
            <>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Reddit media count
                <Input
                  type="number"
                  min={1}
                  max={MAX_REDDIT_MEDIA_LIMIT}
                  value={redditLimit || ""}
                  onChange={(event) => {
                    if (event.target.value === "") {
                      setRedditLimit(0);
                      return;
                    }

                    setRedditLimit(
                      clamp(
                        Number(event.target.value),
                        1,
                        MAX_REDDIT_MEDIA_LIMIT,
                      ),
                    );
                  }}
                  className="h-9"
                />
              </Label>
              <div className="grid gap-2">
                {redditUrls.map((url, index) => {
                  const subreddit = subredditFromRedditUrl(url);

                  return (
                    <div
                      key={`${url}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                    >
                      <Input
                        value={url}
                        onChange={(event) =>
                          updateRedditUrl(index, event.target.value)
                        }
                        aria-label={`Reddit source ${index + 1}`}
                        className="h-9 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="border-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        aria-label={`Remove ${subreddit ? `r/${subreddit}` : `Reddit ${index + 1}`} link`}
                        onClick={() => removeRedditUrl(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="grid min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-background/45 p-3">
                <div className="grid w-full grid-cols-[minmax(0,1fr)_5rem] items-center gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Items
                  </h3>
                  <span
                    className={cn(
                      "w-20 rounded-full border border-border bg-surface px-2 py-0.5 text-center text-[11px] text-muted-foreground transition-opacity",
                      !hiddenRedditCount && "invisible opacity-0",
                    )}
                    aria-hidden={!hiddenRedditCount}
                  >
                    {hiddenRedditCount} hidden
                  </span>
                </div>
                {runtimeRedditItems.length ? (
                  <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
                    {runtimeRedditItems.map((item) => {
                      const subreddit = item.subreddit ?? source.title;
                      const itemId = redditItemHashInput(item.id);
                      const label = redditItemLabels.get(item.id) ?? item.title;
                      const savedMatches = savedHiddenHashMatches[itemId] ?? [];
                      const isSavedHidden = savedMatches.some((hash) =>
                        activeHiddenHashSet.has(hash),
                      );
                      const isHidden =
                        hiddenRedditItemIds.includes(itemId) || isSavedHidden;

                      return (
                        <div
                          key={itemId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2"
                        >
                          <span className="truncate text-xs font-medium">
                            {label}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={isHidden ? "default" : "outline"}
                            aria-label={`${isHidden ? "Unhide" : "Hide"} ${label} from r/${subreddit}`}
                            onClick={() => {
                              if (savedMatches.length) {
                                setUnhiddenRedditHashes((current) =>
                                  isSavedHidden
                                    ? [
                                        ...current,
                                        ...savedMatches.filter(
                                          (hash) => !current.includes(hash),
                                        ),
                                      ]
                                    : current.filter(
                                        (hash) => !savedMatches.includes(hash),
                                      ),
                                );
                                return;
                              }

                              setHiddenRedditItemIds((current) =>
                                current.includes(itemId)
                                  ? current.filter(
                                      (candidate) => candidate !== itemId,
                                    )
                                  : [...current, itemId],
                              );
                            }}
                          >
                            <EyeOff />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No runtime items in this source.
                  </div>
                )}
              </div>
            </>
          ) : isUrl ? (
            <div className="grid gap-3">
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                URL
                <Input
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </Label>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Title
                <Input
                  value={urlTitle}
                  onChange={(event) => setUrlTitle(event.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </Label>
            </div>
          ) : (
            <div className="grid gap-2">
              {localEntries.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {localEntries.map(({ file, previewUrl }, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface p-2"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-md border border-border/70 bg-background">
                        {previewUrl && file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={`Preview ${file.name}`}
                            className="size-full object-cover"
                          />
                        ) : file.type.startsWith("video/") ? (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            Video
                          </span>
                        ) : file.type.startsWith("audio/") ? (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            Audio
                          </span>
                        ) : (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            File
                          </span>
                        )}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="absolute right-1 top-1 border-0 bg-background/60 text-foreground/90 backdrop-blur hover:bg-destructive/15 hover:text-destructive"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setLocalEntries((current) =>
                              current.filter(
                                (_entry, currentIndex) =>
                                  currentIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <span
                        className="truncate text-xs font-medium"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Reload files before editing this source.
                </div>
              )}
            </div>
          )}

          <Button type="button" onClick={save} className="w-full">
            <Save />
            Save source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

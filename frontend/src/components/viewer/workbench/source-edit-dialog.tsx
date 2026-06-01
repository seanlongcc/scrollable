import { EyeOff, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UrlSourceRow } from "@/lib/url-source/types";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";
import { RedditSourceEditControls } from "./reddit-source-edit-controls";
import {
  LocalSourceFilesEditor,
  localEntriesFromSource,
  prepareLocalVideoTimeRanges,
  type LocalEditEntry,
} from "./source-edit-local-files";
import {
  SaveSourceButton,
  SavingSourceOverlay,
} from "./source-edit-saving-status";
import {
  UrlSourceRowsEditor,
  prepareUrlRowsForSave,
  urlRowsFromSource,
  type UrlEditRow,
} from "./source-edit-url-rows";
import { DEFAULT_REDDIT_MEDIA_LIMIT } from "./types";
import type { FeedSession, RedditListingSort, RedditTimeRange } from "./types";
import {
  buildRedditUrlsFromListingControls,
  redditListingControlsFromUrls,
  redditHashesForItemId,
  redditHiddenItemHashes,
  redditItemHashInput,
  redditRuntimeItemLabels,
} from "./helpers";

function focusEditDialogSurface(event: Event) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus({ preventScroll: true });
  }
}

export function EditSourceDialog({
  source,
  open,
  videoDurations = {},
  onOpenChange,
  onSaveReddit,
  onSaveUrl,
  onSaveLocal,
}: {
  source: FeedSession;
  open: boolean;
  videoDurations?: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSaveReddit: (
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) => void | Promise<void>;
  onSaveUrl: (
    id: string,
    rows: UrlSourceRow[],
    title?: string,
  ) => void | Promise<void>;
  onSaveLocal: (
    id: string,
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => void | Promise<void>;
}) {
  const [redditUrls, setRedditUrls] = useState<string[]>(
    source.sourceConfig.kind === "reddit" ? source.sourceConfig.urls : [],
  );
  const initialRedditListingControls = redditListingControlsFromUrls(
    source.sourceConfig.kind === "reddit" ? source.sourceConfig.urls : [],
  );
  const [subredditName, setSubredditName] = useState(
    initialRedditListingControls.subredditName,
  );
  const [redditSort, setRedditSort] = useState<RedditListingSort>(
    initialRedditListingControls.redditSort,
  );
  const [redditTimeRange, setRedditTimeRange] = useState<RedditTimeRange>(
    initialRedditListingControls.redditTimeRange,
  );
  const [redditLimit, setRedditLimit] = useState(
    source.sourceConfig.kind === "reddit"
      ? (source.sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT)
      : DEFAULT_REDDIT_MEDIA_LIMIT,
  );
  const [localEntries, setLocalEntries] = useState<LocalEditEntry[]>(
    localEntriesFromSource(source, videoDurations),
  );
  const [urlRows, setUrlRows] = useState<UrlEditRow[]>(
    urlRowsFromSource(source, videoDurations),
  );
  const [urlTitle, setUrlTitle] = useState(
    source.sourceConfig.kind === "url" ? (source.sourceConfig.title ?? "") : "",
  );
  const [sourceEditError, setSourceEditError] = useState<string | null>(null);
  const [hiddenRedditItemIds, setHiddenRedditItemIds] = useState<string[]>([]);
  const [unhiddenRedditHashes, setUnhiddenRedditHashes] = useState<string[]>(
    [],
  );
  const [isSaving, setIsSaving] = useState(false);
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

  function updateRedditUrls(value: string) {
    setRedditUrls(value.split(/\r?\n/));
  }

  function updateRedditListingControls(next: {
    subredditName?: string;
    redditSort?: RedditListingSort;
    redditTimeRange?: RedditTimeRange;
  }) {
    const nextSubredditName = next.subredditName ?? subredditName;
    const nextRedditSort = next.redditSort ?? redditSort;
    const nextRedditTimeRange = next.redditTimeRange ?? redditTimeRange;

    setSubredditName(nextSubredditName);
    setRedditSort(nextRedditSort);
    setRedditTimeRange(nextRedditTimeRange);

    try {
      setRedditUrls(
        buildRedditUrlsFromListingControls({
          subredditName: nextSubredditName,
          redditSort: nextRedditSort,
          redditTimeRange: nextRedditTimeRange,
          fallbackUrls: redditUrls,
        }),
      );
    } catch {
      return;
    }
  }

  async function runSave(action: () => void | Promise<void>) {
    setIsSaving(true);
    try {
      await action();
    } finally {
      setIsSaving(false);
    }
  }

  async function save() {
    if (isSaving) return;
    setSourceEditError(null);

    if (isReddit) {
      await runSave(() =>
        onSaveReddit(
          currentSource.id,
          redditUrls.map((url) => url.trim()).filter(Boolean),
          redditLimit,
          hiddenRedditItemIds,
          unhiddenRedditHashes,
        ),
      );
      return;
    }

    if (isUrl) {
      const preparedRows = prepareUrlRowsForSave(urlRows);
      setUrlRows(preparedRows.editorRows);
      if (!preparedRows.ok) {
        setSourceEditError(preparedRows.error);
        return;
      }

      await runSave(() =>
        onSaveUrl(
          currentSource.id,
          preparedRows.rows,
          urlTitle.trim() || undefined,
        ),
      );
      return;
    }

    const localRanges = prepareLocalVideoTimeRanges(localEntries);
    setLocalEntries(localRanges.entries);
    if (!localRanges.ok) {
      setSourceEditError(localRanges.error);
      return;
    }

    await runSave(() =>
      onSaveLocal(
        currentSource.id,
        localEntries.map((entry) => entry.file),
        localRanges.videoTimeRanges,
      ),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[92dvh] w-[min(94vw,42rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-2xl border border-border/70 bg-popover pb-[calc(1rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-[0_-18px_64px_rgba(18,10,10,0.58)] sm:max-w-2xl md:rounded-xl md:pb-4 md:shadow-[0_20px_64px_rgba(18,10,10,0.62)]",
          isReddit
            ? "md:h-[min(92dvh,46rem)] md:grid-rows-[auto_minmax(0,1fr)]"
            : "",
        )}
        aria-busy={isSaving}
        onOpenAutoFocus={focusEditDialogSurface}
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
            isReddit &&
              "md:min-h-0 md:grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]",
          )}
        >
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-3 py-2 text-sm">
            <Pencil className="size-4 text-primary" />
            <span
              className="text-wrap-anywhere line-clamp-2 font-medium"
              title={source.title}
            >
              {source.title}
            </span>
          </div>

          {isReddit ? (
            <>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Reddit source URLs
                <Textarea
                  value={redditUrls.join("\n")}
                  onChange={(event) => updateRedditUrls(event.target.value)}
                  aria-label="Reddit source URLs"
                  className="min-h-40 max-h-64 resize-y overflow-y-auto [field-sizing:fixed] font-mono text-xs leading-5"
                />
              </Label>
              <RedditSourceEditControls
                subredditName={subredditName}
                redditSort={redditSort}
                redditTimeRange={redditTimeRange}
                redditLimit={redditLimit}
                onListingChange={updateRedditListingControls}
                onLimitChange={setRedditLimit}
              />
              <div className="grid min-h-24 w-full grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-background/45 p-3 md:min-h-0">
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
                  <div className="grid max-h-56 min-h-0 content-start gap-1.5 overflow-y-auto pr-1 md:max-h-none">
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
                          className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2"
                        >
                          <span
                            className="text-wrap-anywhere line-clamp-2 text-xs font-medium"
                            title={label}
                          >
                            {label}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={isHidden ? "default" : "outline"}
                            className="size-11 min-h-11 min-w-11 md:size-7 md:min-h-0 md:min-w-0"
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
                  <div className="text-wrap-anywhere flex min-h-16 items-center rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No runtime items in this source.
                  </div>
                )}
              </div>
            </>
          ) : isUrl ? (
            <div className="grid gap-3">
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Title
                <Input
                  value={urlTitle}
                  onChange={(event) => setUrlTitle(event.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </Label>
              <UrlSourceRowsEditor rows={urlRows} onRowsChange={setUrlRows} />
            </div>
          ) : (
            <div className="grid gap-2">
              <LocalSourceFilesEditor
                entries={localEntries}
                onEntriesChange={setLocalEntries}
              />
            </div>
          )}

          {sourceEditError ? (
            <p
              role="alert"
              className="text-wrap-anywhere rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {sourceEditError}
            </p>
          ) : null}

          <SaveSourceButton isSaving={isSaving} onSave={() => void save()} />
        </div>
        {isSaving ? <SavingSourceOverlay /> : null}
      </DialogContent>
    </Dialog>
  );
}

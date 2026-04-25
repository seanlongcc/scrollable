import {
  EyeOff,
  FolderOpen,
  Globe,
  Grid2X2,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DirectoryInput } from "./fields";
import {
  DEFAULT_REDDIT_MEDIA_LIMIT,
  MAX_REDDIT_MEDIA_LIMIT,
  REDDIT_SORT_OPTIONS,
  REDDIT_TIME_OPTIONS,
} from "./types";
import type {
  FeedSession,
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SourceGroupingMode,
} from "./types";
import {
  clamp,
  redditHashesForItemId,
  redditHiddenItemHashes,
  redditItemHashInput,
  redditRuntimeItemLabels,
  subredditFromRedditUrl,
} from "./helpers";

export function SourceDialog({
  open,
  onOpenChange,
  urlValue,
  urlTitle,
  redditUrls,
  redditInputMode,
  subredditName,
  redditSort,
  redditTimeRange,
  redditLimit,
  isLoading,
  sourceGroupingMode,
  setUrlValue,
  setUrlTitle,
  setRedditUrls,
  setRedditInputMode,
  setSubredditName,
  setRedditSort,
  setRedditTimeRange,
  setRedditLimit,
  setSourceGroupingMode,
  openUrlSource,
  fetchRedditFeed,
  addLocalFiles,
  addDroppedLocalFiles,
  allowLocalFileDrop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlValue: string;
  urlTitle: string;
  redditUrls: string;
  redditInputMode: RedditInputMode;
  subredditName: string;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditLimit: number;
  isLoading: boolean;
  sourceGroupingMode: SourceGroupingMode;
  setUrlValue: (value: string) => void;
  setUrlTitle: (value: string) => void;
  setRedditUrls: (value: string) => void;
  setRedditInputMode: (value: RedditInputMode) => void;
  setSubredditName: (value: string) => void;
  setRedditSort: (value: RedditListingSort) => void;
  setRedditTimeRange: (value: RedditTimeRange) => void;
  setRedditLimit: (value: number) => void;
  setSourceGroupingMode: (value: SourceGroupingMode) => void;
  openUrlSource: () => void;
  fetchRedditFeed: () => void;
  addLocalFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isLoading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        aria-busy={isLoading}
        className="grid max-h-[96dvh] w-[min(96vw,72rem)] max-w-[72rem] overflow-x-hidden overflow-y-auto border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:max-w-[72rem]"
      >
        {isLoading ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-popover/82 px-6 backdrop-blur-sm">
            <div
              role="status"
              aria-live="polite"
              className="grid justify-items-center gap-2 rounded-lg border border-border bg-background px-5 py-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            >
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Preparing source</span>
            </div>
          </div>
        ) : null}
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription className="sr-only">
            Choose local files or paste a URL, Reddit post, or subreddit link
            for the viewer.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "grid min-w-0 gap-4",
            isLoading && "pointer-events-none select-none opacity-50",
          )}
        >
          <div
            className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
            role="group"
            aria-label="Source mode"
          >
            <Button
              type="button"
              size="sm"
              variant={sourceGroupingMode === "stacked" ? "default" : "ghost"}
              disabled={isLoading}
              onClick={() => setSourceGroupingMode("stacked")}
              aria-label="Add sources as one stacked source"
            >
              Stacked
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sourceGroupingMode === "separate" ? "default" : "ghost"}
              disabled={isLoading}
              onClick={() => setSourceGroupingMode("separate")}
              aria-label="Add sources as separate sources"
            >
              Separate
            </Button>
          </div>
          <section className="grid gap-3 rounded-lg border border-border bg-surface p-3">
            <h2 className="text-sm font-medium">URL source</h2>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,10rem)_auto] sm:items-end">
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                URL
                <Input
                  value={urlValue}
                  disabled={isLoading}
                  onChange={(event) => setUrlValue(event.target.value)}
                  placeholder="https://example.com/media-or-page"
                  className="h-9 font-mono text-xs"
                />
              </Label>
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                Title
                <Input
                  value={urlTitle}
                  disabled={isLoading}
                  onChange={(event) => setUrlTitle(event.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </Label>
              <Button
                type="button"
                onClick={openUrlSource}
                disabled={isLoading}
                aria-label="Open URL"
                className="h-9"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Globe />}
                Open URL
              </Button>
            </div>
          </section>
          <div className="grid min-h-[39rem] min-w-0 gap-5 md:grid-cols-2">
            <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-surface p-3">
              <h2 className="text-sm font-medium">Local source</h2>
              <div
                className="grid min-h-0 gap-3 text-sm text-muted-foreground"
                role="group"
                aria-label="Local upload picker"
              >
                <div className="grid min-h-0 grid-rows-2 gap-3">
                  <Label
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    aria-label="Drop files"
                    onDragOver={isLoading ? undefined : allowLocalFileDrop}
                    onDragEnter={isLoading ? undefined : allowLocalFileDrop}
                    onDrop={isLoading ? undefined : addDroppedLocalFiles}
                    className="size-full min-h-0 cursor-pointer justify-center rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex flex-col items-center justify-center gap-2">
                      <Upload className="size-6 text-primary" />
                      <span className="grid gap-1">
                        <span className="text-sm font-medium text-foreground">
                          Files
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Drop files here or click to select
                        </span>
                      </span>
                    </span>
                    <span className="sr-only">Image/video files</span>
                    <Input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      multiple
                      disabled={isLoading}
                      className="sr-only"
                      aria-label="Image/video files"
                      onChange={addLocalFiles}
                    />
                  </Label>
                  <Label
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    aria-label="Drop folder"
                    onDragOver={isLoading ? undefined : allowLocalFileDrop}
                    onDragEnter={isLoading ? undefined : allowLocalFileDrop}
                    onDrop={isLoading ? undefined : addDroppedLocalFiles}
                    className="size-full min-h-0 cursor-pointer justify-center rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="size-6 text-primary" />
                      <span className="grid gap-1">
                        <span className="text-sm font-medium text-foreground">
                          Folder
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Drop a folder here or click to select
                        </span>
                      </span>
                    </span>
                    <span className="sr-only">Image/video folder</span>
                    <DirectoryInput
                      type="file"
                      accept="image/*,video/*,audio/*"
                      multiple
                      disabled={isLoading}
                      directory=""
                      webkitdirectory=""
                      className="sr-only"
                      aria-label="Image/video folder"
                      onChange={addLocalFiles}
                    />
                  </Label>
                </div>
              </div>
            </section>

            <section className="grid min-h-0 min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-2 rounded-lg border border-border bg-surface p-3">
              <h2 className="text-sm font-medium">Reddit</h2>
              <div
                className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
                role="group"
                aria-label="Reddit input mode"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={
                    redditInputMode === "subreddit" ? "default" : "ghost"
                  }
                  aria-label="Use subreddit name"
                  aria-pressed={redditInputMode === "subreddit"}
                  disabled={isLoading}
                  onClick={() => setRedditInputMode("subreddit")}
                >
                  Subreddit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={redditInputMode === "links" ? "default" : "ghost"}
                  aria-label="Use Reddit links"
                  aria-pressed={redditInputMode === "links"}
                  disabled={isLoading}
                  onClick={() => setRedditInputMode("links")}
                >
                  Links
                </Button>
              </div>
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                Reddit media count
                <Input
                  type="number"
                  min={1}
                  max={MAX_REDDIT_MEDIA_LIMIT}
                  value={redditLimit || ""}
                  disabled={isLoading}
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
              {redditInputMode === "subreddit" ? (
                <div className="grid content-start gap-3">
                  <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                    Subreddit name
                    <Input
                      value={subredditName}
                      disabled={isLoading}
                      onChange={(event) => setSubredditName(event.target.value)}
                      placeholder="kpop, pics, aww"
                      className="h-9 font-mono"
                    />
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <LabeledSelect
                      label="Sort"
                      value={redditSort}
                      options={REDDIT_SORT_OPTIONS}
                      disabled={isLoading}
                      onValueChange={(value) =>
                        setRedditSort(value as RedditListingSort)
                      }
                    />
                    <LabeledSelect
                      label="Time range"
                      value={redditTimeRange}
                      options={REDDIT_TIME_OPTIONS}
                      disabled={
                        isLoading ||
                        (redditSort !== "top" && redditSort !== "controversial")
                      }
                      onValueChange={(value) =>
                        setRedditTimeRange(value as RedditTimeRange)
                      }
                    />
                  </div>
                </div>
              ) : (
                <Textarea
                  aria-label="Paste Reddit post or subreddit links, one per line"
                  value={redditUrls}
                  disabled={isLoading}
                  onChange={(event) => setRedditUrls(event.target.value)}
                  placeholder={`Accepted links:
1. Specific post link:
https://www.reddit.com/r/<community>/comments/<post_id>/<post_title>/
2. Sorted subreddit link:
https://www.reddit.com/r/<community>/top/?t=week

Use the Subreddit tab for bare names.`}
                  className="h-full min-h-0 resize-none font-mono text-xs leading-5"
                />
              )}
              <Button
                type="button"
                onClick={fetchRedditFeed}
                disabled={isLoading}
                aria-label="Open Reddit links"
                className="self-end"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Grid2X2 />}
                Open Reddit
              </Button>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LabeledSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled?: boolean;
  onValueChange: (value: T) => void;
}) {
  return (
    <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={label} className="h-9 w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Label>
  );
}

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
          "w-[min(94vw,42rem)] overflow-y-auto overflow-x-hidden border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:max-w-2xl",
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

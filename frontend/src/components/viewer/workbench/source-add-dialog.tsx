import { FolderOpen, Globe, Grid2X2, Loader2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent as ReactDragEvent } from "react";

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
import { DirectoryInput } from "./fields";
import { LabeledSelect } from "./source-dialog-fields";
import {
  MAX_REDDIT_MEDIA_LIMIT,
  REDDIT_SORT_OPTIONS,
  REDDIT_TIME_OPTIONS,
} from "./types";
import type {
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SourceGroupingMode,
} from "./types";
import { clamp } from "./helpers";

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

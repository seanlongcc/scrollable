import { FolderOpen, Globe, Grid2X2, Loader2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent as ReactDragEvent, useState } from "react";

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
import { DirectoryInput, placeCaretAfterInputValue } from "./fields";
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

type SourceKind = "url" | "local" | "reddit";

const sourceSectionClass =
  "grid gap-3 rounded-xl border border-border/70 bg-background/55 p-3";
const sourceDropZoneClass =
  "grid min-h-24 cursor-pointer place-items-center rounded-xl border border-dashed border-border/70 bg-surface/55 p-3 text-center transition-[background-color,border-color,box-shadow] hover:border-primary/70 hover:bg-muted/55 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:outline-none";

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
  selectLocalFilesWithHandles,
  selectLocalFolderWithHandles,
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
  selectLocalFilesWithHandles: () => Promise<boolean>;
  selectLocalFolderWithHandles: () => Promise<boolean>;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
}) {
  const [sourceKind, setSourceKind] = useState<SourceKind>("local");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isLoading) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        aria-busy={isLoading}
        className="mobile-compact-controls top-auto bottom-0 left-0 max-h-[86dvh] w-full max-w-none translate-x-0 translate-y-0 content-start gap-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-2xl border border-border/70 bg-popover p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-[0_-18px_64px_rgba(18,10,10,0.58)] data-open:animate-none data-closed:animate-none sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[82dvh] md:w-[min(92vw,26rem)] md:max-w-[26rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:pb-3 md:shadow-[0_20px_64px_rgba(18,10,10,0.62)]"
      >
        {isLoading ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-popover/82 px-6 backdrop-blur-sm">
            <div
              role="status"
              aria-live="polite"
              className="grid max-w-full justify-items-center gap-2 rounded-lg border border-border bg-background px-5 py-4 text-center shadow-[0_16px_48px_rgba(18,10,10,0.55)]"
            >
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Preparing source</span>
            </div>
          </div>
        ) : null}
        <DialogHeader className="pr-12 md:pr-10">
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription className="sr-only">
            Add URL, local, or Reddit source.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "grid min-w-0 gap-3",
            isLoading && "pointer-events-none select-none opacity-50",
          )}
        >
          <SegmentedControl
            value={sourceKind}
            options={[
              ["local", "Local"],
              ["reddit", "Reddit"],
              ["url", "URL"],
            ]}
            ariaLabel="Source type"
            disabled={isLoading}
            onChange={(value) => setSourceKind(value as SourceKind)}
          />

          {sourceKind === "url" ? (
            <section className={sourceSectionClass}>
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                URL
                <Textarea
                  value={urlValue}
                  disabled={isLoading}
                  onChange={(event) => setUrlValue(event.target.value)}
                  placeholder={`Paste one or many links, one per line.

https://example.com/media-or-page`}
                  className="min-h-40 resize-none font-mono text-xs leading-5 md:min-h-56"
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
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Globe />}
                Open URL
              </Button>
            </section>
          ) : null}

          {sourceKind === "local" ? (
            <section
              role="group"
              aria-label="Local upload picker"
              className={sourceSectionClass}
            >
              <div className="grid grid-cols-2 gap-2">
                <Label
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  aria-label="Drop files"
                  onDragOver={isLoading ? undefined : allowLocalFileDrop}
                  onDragEnter={isLoading ? undefined : allowLocalFileDrop}
                  onDrop={isLoading ? undefined : addDroppedLocalFiles}
                  onClick={(event) => {
                    if (isLoading) return;
                    if (!("showOpenFilePicker" in window)) return;
                    event.preventDefault();
                    void selectLocalFilesWithHandles();
                  }}
                  className={sourceDropZoneClass}
                >
                  <span className="grid justify-items-center gap-2">
                    <Upload className="size-5 text-primary" />
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      Files
                    </span>
                  </span>
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
                  onClick={(event) => {
                    if (isLoading) return;
                    if (!("showDirectoryPicker" in window)) return;
                    event.preventDefault();
                    void selectLocalFolderWithHandles();
                  }}
                  className={sourceDropZoneClass}
                >
                  <span className="grid justify-items-center gap-2">
                    <FolderOpen className="size-5 text-primary" />
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      Folder
                    </span>
                  </span>
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
            </section>
          ) : null}

          {sourceKind === "reddit" ? (
            <section className={sourceSectionClass}>
              <SegmentedControl
                value={redditInputMode}
                options={[
                  ["subreddit", "Subreddit", "Use subreddit name"],
                  ["links", "Links", "Use Reddit links"],
                ]}
                ariaLabel="Reddit input mode"
                disabled={isLoading}
                onChange={(value) =>
                  setRedditInputMode(value as RedditInputMode)
                }
              />
              {redditInputMode === "subreddit" ? (
                <div className="grid gap-3">
                  <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                    Name
                    <Input
                      aria-label="Subreddit name"
                      value={subredditName}
                      disabled={isLoading}
                      onChange={(event) => setSubredditName(event.target.value)}
                      placeholder="popular, pics, aww"
                      className="h-9 font-mono"
                    />
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
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
                <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                  Links
                  <Textarea
                    aria-label="Paste Reddit post or subreddit links, one per line"
                    value={redditUrls}
                    disabled={isLoading}
                    onChange={(event) => setRedditUrls(event.target.value)}
                    placeholder={`Paste one or many Reddit links, one per line.

https://www.reddit.com/r/pics/comments/abc123/title/
https://www.reddit.com/r/pics/top/?t=week`}
                    className="min-h-40 resize-none font-mono text-xs leading-5 md:min-h-56"
                  />
                </Label>
              )}
              <div className="grid gap-2">
                <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                  Reddit media count
                  <Input
                    aria-label="Reddit media count"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={MAX_REDDIT_MEDIA_LIMIT}
                    value={redditLimit || ""}
                    disabled={isLoading}
                    onFocus={(event) =>
                      placeCaretAfterInputValue(event.currentTarget)
                    }
                    onChange={(event) => {
                      const nextDraft = event.target.value;
                      if (!nextDraft.trim()) {
                        setRedditLimit(0);
                        return;
                      }

                      const next = Number(nextDraft);
                      if (!Number.isInteger(next)) return;

                      setRedditLimit(clamp(next, 1, MAX_REDDIT_MEDIA_LIMIT));
                    }}
                    className="h-9 text-center"
                  />
                </Label>
                <div className="grid content-end">
                  <Button
                    type="button"
                    onClick={fetchRedditFeed}
                    disabled={isLoading}
                    aria-label="Open Reddit links"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Grid2X2 />
                    )}
                    Open Reddit
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="grid gap-2 rounded-xl border border-border/70 bg-background/55 p-3">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Grouping
            </h2>
            <SegmentedControl
              value={sourceGroupingMode}
              options={[
                ["stacked", "Stacked", "Add sources as one stacked source"],
                ["separate", "Separate", "Add sources as separate sources"],
              ]}
              ariaLabel="Source mode"
              disabled={isLoading}
              onChange={(value) =>
                setSourceGroupingMode(value as SourceGroupingMode)
              }
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SegmentedControl({
  value,
  options,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: string;
  options: Array<[string, string, string?]>;
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-xl border border-border/70 bg-background/70 p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map(([optionValue, label, ariaLabel]) => (
        <Button
          key={optionValue}
          type="button"
          size="sm"
          variant={value === optionValue ? "default" : "ghost"}
          aria-label={ariaLabel}
          aria-pressed={value === optionValue}
          disabled={disabled}
          onClick={() => onChange(optionValue)}
          className="!h-10 !min-h-10 min-w-0 overflow-hidden rounded-lg md:!h-7 md:!min-h-0"
        >
          <span className="min-w-0 truncate">{label}</span>
        </Button>
      ))}
    </div>
  );
}

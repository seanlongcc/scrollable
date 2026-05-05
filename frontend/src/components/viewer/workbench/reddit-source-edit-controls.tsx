import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeCaretAfterInputValue } from "./fields";
import { LabeledSelect } from "./source-dialog-fields";
import {
  MAX_REDDIT_MEDIA_LIMIT,
  REDDIT_SORT_OPTIONS,
  REDDIT_TIME_OPTIONS,
} from "./types";
import type { RedditListingSort, RedditTimeRange } from "./types";
import { clamp } from "./helpers";

export function RedditSourceEditControls({
  subredditName,
  redditSort,
  redditTimeRange,
  redditLimit,
  onListingChange,
  onLimitChange,
}: {
  subredditName: string;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditLimit: number;
  onListingChange: (next: {
    subredditName?: string;
    redditSort?: RedditListingSort;
    redditTimeRange?: RedditTimeRange;
  }) => void;
  onLimitChange: (limit: number) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_7.5rem_8.25rem_6.25rem]">
      <Label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
        Subreddit
        <Input
          aria-label="Subreddit name"
          value={subredditName}
          onChange={(event) =>
            onListingChange({ subredditName: event.target.value })
          }
          placeholder="popular, pics, aww"
          className="h-9 font-mono text-xs"
        />
      </Label>
      <LabeledSelect
        label="Sort"
        value={redditSort}
        options={REDDIT_SORT_OPTIONS}
        onValueChange={(value) =>
          onListingChange({ redditSort: value as RedditListingSort })
        }
      />
      <LabeledSelect
        label="Time range"
        value={redditTimeRange}
        options={REDDIT_TIME_OPTIONS}
        disabled={redditSort !== "top" && redditSort !== "controversial"}
        onValueChange={(value) =>
          onListingChange({ redditTimeRange: value as RedditTimeRange })
        }
      />
      <Label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
        Reddit post count
        <Input
          aria-label="Reddit post count"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={MAX_REDDIT_MEDIA_LIMIT}
          value={redditLimit || ""}
          onFocus={(event) => placeCaretAfterInputValue(event.currentTarget)}
          onChange={(event) => {
            const nextDraft = event.target.value;
            if (!nextDraft.trim()) {
              onLimitChange(0);
              return;
            }

            const next = Number(nextDraft);
            if (!Number.isInteger(next)) return;

            onLimitChange(clamp(next, 1, MAX_REDDIT_MEDIA_LIMIT));
          }}
          className="h-9 text-center text-foreground"
        />
      </Label>
    </div>
  );
}

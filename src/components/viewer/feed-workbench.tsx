"use client";

import { FolderOpen, Grid2X2, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FeedViewer } from "@/components/viewer/feed-viewer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { parseFeedConfigInput } from "@/lib/config/feed-config";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";

type FeedSession = {
  id: string;
  title: string;
  timerSeconds: number;
  items: RuntimeFeedItem[];
};

export function FeedWorkbench() {
  const [subreddit, setSubreddit] = useState("pics");
  const [sort, setSort] = useState<"top" | "hot" | "new">("top");
  const [timeRange, setTimeRange] = useState<
    "hour" | "day" | "week" | "month" | "year" | "all"
  >("day");
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(12);
  const [allowNsfw, setAllowNsfw] = useState(true);
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const registryRef = useRef<LocalObjectUrlRegistry | null>(null);

  useEffect(() => {
    return () => registryRef.current?.revokeAll();
  }, []);

  const focused = useMemo(
    () => sessions.find((session) => session.id === focusedId),
    [focusedId, sessions],
  );

  async function fetchRedditFeed() {
    setIsLoading(true);
    try {
      const config = parseFeedConfigInput({
        subreddit,
        sort,
        timeRange,
        limit,
        skip,
        timerSeconds,
      });
      const params = new URLSearchParams({
        subreddit: config.subreddit,
        sort: config.sort,
        timeRange: config.timeRange,
        limit: String(config.limit),
        skip: String(config.skip),
        allowNsfw: String(allowNsfw),
      });
      const response = await fetch(`/api/reddit/listing?${params}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "reddit_error");
      }

      const session = {
        id: crypto.randomUUID(),
        title: `r/${config.subreddit}`,
        timerSeconds: config.timerSeconds,
        items: payload.items as RuntimeFeedItem[],
      };

      setSessions((current) => [session, ...current]);
      setFocusedId(session.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reddit fetch failed");
    } finally {
      setIsLoading(false);
    }
  }

  function addLocalFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (registryRef.current === null) {
      registryRef.current = new LocalObjectUrlRegistry();
    }
    const registry = registryRef.current;
    if (!files.length || !registry) return;

    const items = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file) => registry.add(file));

    if (!items.length) return;

    const session = {
      id: crypto.randomUUID(),
      title: "Local upload",
      timerSeconds,
      items,
    };

    setSessions((current) => [session, ...current]);
    setFocusedId(session.id);
    event.target.value = "";
  }

  if (focused) {
    return (
      <FeedViewer
        key={focused.id}
        title={focused.title}
        items={focused.items}
        timerSeconds={focused.timerSeconds}
        onBackToGrid={() => setFocusedId(null)}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-5 md:grid-cols-[360px_1fr] md:px-8">
        <section className="grid content-start gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                scrollable
              </p>
              <h1 className="text-2xl font-semibold">Feed console</h1>
            </div>
            <Button asChild size="icon" variant="outline" aria-label="Library">
              <Link href="/library">
                <FolderOpen />
              </Link>
            </Button>
          </div>

          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>Reddit source</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Label className="grid gap-1 text-sm">
                Subreddit
                <Input
                  value={subreddit}
                  onChange={(event) => setSubreddit(event.target.value)}
                />
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Label className="grid gap-1 text-sm">
                  Sort
                  <Select
                    value={sort}
                    onValueChange={(value) =>
                      setSort(value as "top" | "hot" | "new")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">top</SelectItem>
                      <SelectItem value="hot">hot</SelectItem>
                      <SelectItem value="new">new</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>
                <Label className="grid gap-1 text-sm">
                  Range
                  <Select
                    value={timeRange}
                    onValueChange={(value) =>
                      setTimeRange(
                        value as
                          | "hour"
                          | "day"
                          | "week"
                          | "month"
                          | "year"
                          | "all",
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">hour</SelectItem>
                      <SelectItem value="day">day</SelectItem>
                      <SelectItem value="week">week</SelectItem>
                      <SelectItem value="month">month</SelectItem>
                      <SelectItem value="year">year</SelectItem>
                      <SelectItem value="all">all</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>
              </div>
              <SliderField label={`Limit ${limit}`} value={limit} onValueChange={setLimit} min={1} max={100} />
              <SliderField label={`Skip ${skip}`} value={skip} onValueChange={setSkip} min={0} max={20} />
              <SliderField label={`Timer ${timerSeconds}s`} value={timerSeconds} onValueChange={setTimerSeconds} min={3} max={60} />
              <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                NSFW runtime
                <Switch checked={allowNsfw} onCheckedChange={setAllowNsfw} />
              </label>
              <Button type="button" onClick={fetchRedditFeed} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Grid2X2 />}
                Open
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>Local source</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
                <Upload className="mr-2 size-4" />
                <span>Image/video files</span>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  onChange={addLocalFiles}
                />
              </Label>
            </CardContent>
          </Card>
        </section>

        <section className="grid content-start gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Feed grid</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {sessions.length} active
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.length === 0 ? (
              <div className="rounded-lg border border-border/60 p-6 text-sm text-muted-foreground">
                No runtime feeds open.
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setFocusedId(session.id)}
                  className="grid min-h-36 rounded-lg border border-border/60 bg-card p-4 text-left transition hover:border-cyan-300/70"
                >
                  <span className="font-medium">{session.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {session.items.length} items · {session.timerSeconds}s
                  </span>
                  <span className="self-end font-mono text-xs text-muted-foreground">
                    runtime only
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SliderField({
  label,
  value,
  onValueChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Label className="grid gap-2 text-sm">
      {label}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(next) => onValueChange(next[0] ?? value)}
      />
    </Label>
  );
}

"use client";

import {
  FolderOpen,
  Grid2X2,
  LayoutGrid,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FeedViewPane } from "@/components/viewer/feed-view-pane";
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
import { Switch } from "@/components/ui/switch";
import { parseFeedConfigInput } from "@/lib/config/feed-config";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FIXED_GRID,
  type FixedGrid,
  type FreeRect,
  createFixedGrid,
  createFreeRect,
} from "@/lib/viewer/layout";
import {
  advanceTimerState,
  applyMasterDuration,
  createTimerState,
  masterMoveTimerIndexes,
  masterRestartTimers,
  masterTogglePaused,
  moveTimerIndex,
  togglePaused,
  type TimerMode,
  type TimerState,
} from "@/lib/viewer/timer";

type LayoutMode = "fixed" | "free";

type FeedSession = {
  id: string;
  title: string;
  timerMode: TimerMode;
  timer: TimerState;
  freeRect: FreeRect;
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
  const [masterSeconds, setMasterSeconds] = useState(12);
  const [allowNsfw, setAllowNsfw] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("fixed");
  const [fixedGrid, setFixedGrid] = useState<FixedGrid>(DEFAULT_FIXED_GRID);
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [galleryIndexes, setGalleryIndexes] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const registryRef = useRef<LocalObjectUrlRegistry | null>(null);

  useEffect(() => {
    return () => registryRef.current?.revokeAll();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          timer: advanceTimerState(session.timer, 250),
        })),
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  const maximized = useMemo(
    () => sessions.find((session) => session.id === maximizedId),
    [maximizedId, sessions],
  );
  const selected = useMemo(
    () => sessions.find((session) => session.id === selectedId) ?? sessions[0],
    [selectedId, sessions],
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

      addSession({
        title: `r/${config.subreddit}`,
        timerSeconds: config.timerSeconds,
        items: payload.items as RuntimeFeedItem[],
      });
      setIsSourceOpen(false);
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

    addSession({ title: "Local upload", timerSeconds, items });
    setIsSourceOpen(false);
    event.target.value = "";
  }

  function addSession({
    title,
    timerSeconds: sessionTimerSeconds,
    items,
  }: {
    title: string;
    timerSeconds: number;
    items: RuntimeFeedItem[];
  }) {
    setSessions((current) => {
      const id = crypto.randomUUID();
      const session = {
        id,
        title,
        timerMode: "own" as TimerMode,
        timer: createTimerState({
          durationSeconds: sessionTimerSeconds,
          itemCount: items.length,
        }),
        freeRect: defaultFreeRect(current.length),
        items,
      };
      setSelectedId(id);
      return [session, ...current];
    });
  }

  function updateFixedGrid(next: Partial<FixedGrid>) {
    try {
      setFixedGrid((current) =>
        createFixedGrid(next.columns ?? current.columns, next.rows ?? current.rows),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid grid");
    }
  }

  function updateSession(
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) {
    setSessions((current) =>
      current.map((session) => (session.id === id ? updater(session) : session)),
    );
  }

  function removeSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
    setGalleryIndexes((current) => {
      const next = { ...current };
      sessions
        .find((session) => session.id === id)
        ?.items.forEach((item) => delete next[item.id]);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
    if (maximizedId === id) setMaximizedId(null);
  }

  function updateFreeRect(id: string, nextRect: Partial<FreeRect>) {
    updateSession(id, (session) => {
      try {
        return {
          ...session,
          freeRect: createFreeRect({ ...session.freeRect, ...nextRect }),
        };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid free layout");
        return session;
      }
    });
  }

  function changeGallery(itemId: string, direction: 1 | -1) {
    const item = sessions
      .flatMap((session) => session.items)
      .find((candidate) => candidate.id === itemId);
    if (!item) return;

    setGalleryIndexes((state) => {
      const current = state[itemId] ?? 0;
      const next = (current + direction + item.media.length) % item.media.length;
      return { ...state, [itemId]: next };
    });
  }

  function setMasterTimerSeconds(value: number) {
    setMasterSeconds(value);
    const timers = applyMasterDuration(toMultiTimerState(sessions), value);
    setSessions((current) =>
      current.map((session) => ({
        ...session,
        timer: timers[session.id]?.timer ?? session.timer,
      })),
    );
  }

  function runMasterAction(action: "next" | "pause" | "restart") {
    const timers = toMultiTimerState(sessions);
    const nextTimers =
      action === "next"
        ? masterMoveTimerIndexes(timers, 1)
        : action === "pause"
          ? masterTogglePaused(timers)
          : masterRestartTimers(timers);

    setSessions((current) =>
      current.map((session) => ({
        ...session,
        timer: nextTimers[session.id]?.timer ?? session.timer,
      })),
    );
  }

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
              scrollable
            </p>
            <h1 className="truncate text-xl font-semibold">Multi-view wall</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="icon" variant="outline" aria-label="Library">
              <Link href="/library">
                <FolderOpen />
              </Link>
            </Button>

            <Button
              type="button"
              size="icon"
              variant={layoutMode === "fixed" ? "default" : "outline"}
              onClick={() => setLayoutMode("fixed")}
              aria-label="Fixed layout mode"
            >
              <Grid2X2 />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={layoutMode === "free" ? "default" : "outline"}
              onClick={() => setLayoutMode("free")}
              aria-label="Free layout mode"
            >
              <LayoutGrid />
            </Button>

            <NumberField
              label="Fixed columns"
              value={fixedGrid.columns}
              min={1}
              max={8}
              onChange={(value) => updateFixedGrid({ columns: value })}
            />
            <NumberField
              label="Fixed rows"
              value={fixedGrid.rows}
              min={1}
              max={8}
              onChange={(value) => updateFixedGrid({ rows: value })}
            />

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => runMasterAction("pause")}
                aria-label="Master pause"
              >
                {sessions.some((session) => !session.timer.isPaused) ? <Pause /> : <Play />}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => runMasterAction("next")}
                aria-label="Master next"
              >
                <SkipForward />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => runMasterAction("restart")}
                aria-label="Master restart"
              >
                <RotateCcw />
              </Button>
              <NumberField
                label="Master timer seconds"
                value={masterSeconds}
                min={3}
                max={120}
                onChange={setMasterTimerSeconds}
              />
            </div>

            <Button
              type="button"
              aria-label="Add source"
              onClick={() => setIsSourceOpen(true)}
            >
              <Plus />
              Add source
            </Button>

            <Dialog open={isSourceOpen} onOpenChange={setIsSourceOpen}>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add source</DialogTitle>
                  <DialogDescription>
                    Runtime media only. Saved configs still store metadata, not media.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 md:grid-cols-2">
                  <section className="grid content-start gap-3 rounded-lg border border-border/60 p-3">
                    <h2 className="text-sm font-medium">Reddit source</h2>
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
                        <select
                          value={sort}
                          onChange={(event) =>
                            setSort(event.target.value as "top" | "hot" | "new")
                          }
                          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        >
                          <option value="top">top</option>
                          <option value="hot">hot</option>
                          <option value="new">new</option>
                        </select>
                      </Label>
                      <Label className="grid gap-1 text-sm">
                        Range
                        <select
                          value={timeRange}
                          onChange={(event) =>
                            setTimeRange(
                              event.target.value as
                                | "hour"
                                | "day"
                                | "week"
                                | "month"
                                | "year"
                                | "all",
                            )
                          }
                          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        >
                          <option value="hour">hour</option>
                          <option value="day">day</option>
                          <option value="week">week</option>
                          <option value="month">month</option>
                          <option value="year">year</option>
                          <option value="all">all</option>
                        </select>
                      </Label>
                    </div>
                    <NumberField
                      label="Limit"
                      value={limit}
                      min={1}
                      max={100}
                      onChange={setLimit}
                    />
                    <NumberField
                      label="Skip"
                      value={skip}
                      min={0}
                      max={100}
                      onChange={setSkip}
                    />
                    <NumberField
                      label="View timer seconds"
                      value={timerSeconds}
                      min={3}
                      max={120}
                      onChange={setTimerSeconds}
                    />
                    <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                      NSFW runtime
                      <Switch checked={allowNsfw} onCheckedChange={setAllowNsfw} />
                    </label>
                    <Button
                      type="button"
                      onClick={fetchRedditFeed}
                      disabled={isLoading}
                      aria-label="Open Reddit source"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : <Grid2X2 />}
                      Open Reddit source
                    </Button>
                  </section>

                  <section className="grid content-start gap-3 rounded-lg border border-border/60 p-3">
                    <h2 className="text-sm font-medium">Local source</h2>
                    <Label className="flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
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
                  </section>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {maximized ? (
        <FocusLayout
          focused={maximized}
          sessions={sessions}
          galleryIndexes={galleryIndexes}
          onRestore={() => setMaximizedId(null)}
          onFocus={setMaximizedId}
          onGalleryChange={changeGallery}
          onMove={(id, direction) =>
            updateSession(id, (session) => ({
              ...session,
              timer: moveTimerIndex(session.timer, direction),
            }))
          }
          onTogglePaused={(id) =>
            updateSession(id, (session) => ({
              ...session,
              timer: togglePaused(session.timer),
            }))
          }
          onRestart={(id) =>
            updateSession(id, (session) => ({
              ...session,
              timer: { ...session.timer, elapsedMs: 0 },
            }))
          }
        />
      ) : (
        <section className="grid min-h-0 gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-white/65">
              {sessions.length} active · {layoutMode === "fixed" ? "Fixed" : "Free"}{" "}
              layout
            </div>
            {selected && layoutMode === "free" ? (
              <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <NumberField
                  label="Free column"
                  value={selected.freeRect.column}
                  min={1}
                  max={8}
                  onChange={(value) => updateFreeRect(selected.id, { column: value })}
                />
                <NumberField
                  label="Free row"
                  value={selected.freeRect.row}
                  min={1}
                  max={8}
                  onChange={(value) => updateFreeRect(selected.id, { row: value })}
                />
                <NumberField
                  label="Column span"
                  value={selected.freeRect.columnSpan}
                  min={1}
                  max={8}
                  onChange={(value) =>
                    updateFreeRect(selected.id, { columnSpan: value })
                  }
                />
                <NumberField
                  label="Row span"
                  value={selected.freeRect.rowSpan}
                  min={1}
                  max={8}
                  onChange={(value) => updateFreeRect(selected.id, { rowSpan: value })}
                />
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "min-h-[65dvh] overflow-auto rounded-lg border border-white/10 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] p-2",
              layoutMode === "free" && "bg-[size:12.5%_12.5%]",
            )}
          >
            <div
              className="grid h-[calc(100dvh-9.5rem)] min-h-[520px] min-w-[720px] gap-2"
              style={{
                gridTemplateColumns:
                  layoutMode === "fixed"
                    ? `repeat(${fixedGrid.columns}, minmax(0, 1fr))`
                    : "repeat(8, minmax(0, 1fr))",
                gridTemplateRows:
                  layoutMode === "fixed"
                    ? `repeat(${fixedGrid.rows}, minmax(0, 1fr))`
                    : "repeat(8, minmax(0, 1fr))",
              }}
            >
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="min-h-0"
                  style={
                    layoutMode === "free"
                      ? {
                          gridColumn: `${session.freeRect.column} / span ${session.freeRect.columnSpan}`,
                          gridRow: `${session.freeRect.row} / span ${session.freeRect.rowSpan}`,
                        }
                      : undefined
                  }
                  onFocus={() => setSelectedId(session.id)}
                  onClick={() => setSelectedId(session.id)}
                >
                  <FeedViewPane
                    title={session.title}
                    items={session.items}
                    timer={session.timer}
                    timerMode={session.timerMode}
                    galleryIndexes={galleryIndexes}
                    compact={fixedGrid.columns * fixedGrid.rows > 4}
                    onGalleryChange={changeGallery}
                    onMove={(direction) =>
                      updateSession(session.id, (current) => ({
                        ...current,
                        timer: moveTimerIndex(current.timer, direction),
                      }))
                    }
                    onTogglePaused={() =>
                      updateSession(session.id, (current) => ({
                        ...current,
                        timer: togglePaused(current.timer),
                      }))
                    }
                    onRestart={() =>
                      updateSession(session.id, (current) => ({
                        ...current,
                        timer: { ...current.timer, elapsedMs: 0 },
                      }))
                    }
                    onMaximize={() => setMaximizedId(session.id)}
                    onRemove={() => removeSession(session.id)}
                    onTimerModeChange={(mode) =>
                      updateSession(session.id, (current) => ({
                        ...current,
                        timerMode: mode,
                        timer:
                          mode === "master"
                            ? { ...current.timer, durationSeconds: masterSeconds }
                            : current.timer,
                      }))
                    }
                  />
                </div>
              ))}
              {Array.from({
                length: Math.max(
                  0,
                  fixedGrid.columns * fixedGrid.rows - sessions.length,
                ),
              }).map((_, index) => (
                <button
                  key={`empty-${index}`}
                  type="button"
                  onClick={() => setIsSourceOpen(true)}
                  aria-label="Add source to empty cell"
                  className="grid min-h-0 place-items-center rounded-lg border border-dashed border-white/20 bg-white/[0.03] text-sm text-white/40 transition hover:border-cyan-300/60 hover:text-cyan-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-4" />
                    Add source
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function FocusLayout({
  focused,
  sessions,
  galleryIndexes,
  onRestore,
  onFocus,
  onGalleryChange,
  onMove,
  onTogglePaused,
  onRestart,
}: {
  focused: FeedSession;
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  onRestore: () => void;
  onFocus: (id: string) => void;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onMove: (id: string, direction: 1 | -1) => void;
  onTogglePaused: (id: string) => void;
  onRestart: (id: string) => void;
}) {
  const satellites = sessions.filter((session) => session.id !== focused.id);

  return (
    <section className="grid min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="grid min-h-[68dvh] gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-cyan-100">Focus view</h2>
          <Button type="button" variant="outline" onClick={onRestore}>
            <Maximize2 />
            Restore grid
          </Button>
        </div>
        <FeedViewPane
          title={focused.title}
          items={focused.items}
          timer={focused.timer}
          timerMode={focused.timerMode}
          galleryIndexes={galleryIndexes}
          isFocused
          onGalleryChange={onGalleryChange}
          onMove={(direction) => onMove(focused.id, direction)}
          onTogglePaused={() => onTogglePaused(focused.id)}
          onRestart={() => onRestart(focused.id)}
        />
      </div>

      <aside className="grid min-h-0 content-start gap-2">
        <h2 className="text-sm font-medium text-white/70">Satellite views</h2>
        {satellites.length ? (
          satellites.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onFocus(session.id)}
              className="h-32 min-h-0 text-left"
            >
              <FeedViewPane
                title={session.title}
                items={session.items}
                timer={session.timer}
                timerMode={session.timerMode}
                galleryIndexes={galleryIndexes}
                compact
                onGalleryChange={onGalleryChange}
                onMove={(direction) => onMove(session.id, direction)}
                onTogglePaused={() => onTogglePaused(session.id)}
                onRestart={() => onRestart(session.id)}
              />
            </button>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
            No satellite views
          </div>
        )}
      </aside>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Label className="grid min-w-20 gap-1 text-[11px] text-white/60">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="h-7 w-20 bg-white/5 text-white"
      />
    </Label>
  );
}

function defaultFreeRect(index: number): FreeRect {
  const column = ((index * 2) % 8) + 1;
  const row = Math.floor((index * 2) / 8) * 2 + 1;

  return createFreeRect({
    column,
    row: Math.min(row, 7),
    columnSpan: 2,
    rowSpan: 2,
  });
}

function toMultiTimerState(sessions: FeedSession[]) {
  return Object.fromEntries(
    sessions.map((session) => [
      session.id,
      {
        mode: session.timerMode,
        timer: session.timer,
      },
    ]),
  );
}

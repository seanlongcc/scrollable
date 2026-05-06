import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";

type OrderableSource = Pick<
  FeedSession,
  "items" | "allItems" | "isOrderRandomized" | "sourceConfig"
>;

export function randomizeRuntimeItems<T>(items: readonly T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }

  return next;
}

export function canRandomizeSessionSource(session: OrderableSource | null) {
  return Boolean(
    session &&
    session.items.length > 1 &&
    (session.sourceConfig.kind === "local" ||
      session.sourceConfig.kind === "reddit" ||
      session.sourceConfig.kind === "url"),
  );
}

export function isSessionOrderRandomized(session: OrderableSource | null) {
  return Boolean(
    canRandomizeSessionSource(session) && session?.isOrderRandomized !== false,
  );
}

export function toggleSessionOrderRandomized(
  session: FeedSession,
): FeedSession {
  return isSessionOrderRandomized(session)
    ? setSessionOrderRandomized(session, false)
    : setSessionOrderRandomized(session, true);
}

export function setSessionOrderRandomized(
  session: FeedSession,
  isOrderRandomized: boolean,
): FeedSession {
  if (!canRandomizeSessionSource(session)) return session;

  const nextSource = setSourceOrderRandomized(session, isOrderRandomized);

  return {
    ...nextSource,
    timer: timerForOrderedItems(session, nextSource.items.length),
  };
}

export function randomizeSessionItems(session: FeedSession): FeedSession {
  return setSessionOrderRandomized(session, true);
}

export function randomizeAllSessionSources(
  sessions: FeedSession[],
): FeedSession[] {
  return setAllSessionSourcesOrderRandomized(sessions, true);
}

export function setAllSessionSourcesOrderRandomized(
  sessions: FeedSession[],
  isOrderRandomized: boolean,
): FeedSession[] {
  return mapOrderableSources(sessions, (session) =>
    setSessionOrderRandomized(session, isOrderRandomized),
  );
}

export function setSourceInputsOrderRandomized<T extends OrderableSource>(
  sources: T[],
  isOrderRandomized: boolean,
): T[] {
  return mapOrderableSources(sources, (source) =>
    setSourceOrderRandomized(source, isOrderRandomized),
  );
}

function setSourceOrderRandomized<T extends OrderableSource>(
  source: T,
  isOrderRandomized: boolean,
): T {
  if (!canRandomizeSessionSource(source)) return source;

  const orderedItems = visibleSourceOrderItems(source);
  const nextItems = isOrderRandomized
    ? randomizeRuntimeItems(orderedItems)
    : orderedItems;

  return {
    ...source,
    items: nextItems,
    isOrderRandomized,
  };
}

function mapOrderableSources<T extends OrderableSource>(
  sources: T[],
  mapSource: (source: T) => T,
): T[] {
  let changed = false;
  const nextSources = sources.map((source) => {
    const nextSource = mapSource(source);
    if (nextSource !== source) changed = true;
    return nextSource;
  });

  return changed ? nextSources : sources;
}

function visibleSourceOrderItems(source: OrderableSource) {
  const allItems = source.allItems;
  if (!allItems) return source.items;

  const visibleIds = new Set(source.items.map((item) => item.id));
  const orderedVisibleItems = allItems.filter((item) =>
    visibleIds.has(item.id),
  );

  return orderedVisibleItems.length ? orderedVisibleItems : source.items;
}

function timerForOrderedItems(session: FeedSession, itemCount: number) {
  return {
    ...createTimerState({
      durationSeconds: session.timer.durationSeconds,
      itemCount,
    }),
    isPaused: session.timer.isPaused,
  };
}

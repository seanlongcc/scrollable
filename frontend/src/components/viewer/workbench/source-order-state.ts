import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";

export function randomizeRuntimeItems<T>(items: readonly T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }

  return next;
}

export function canRandomizeSessionSource(session: FeedSession | null) {
  return Boolean(
    session &&
    session.items.length > 1 &&
    (session.sourceConfig.kind === "local" ||
      session.sourceConfig.kind === "reddit" ||
      session.sourceConfig.kind === "url"),
  );
}

export function isSessionOrderRandomized(session: FeedSession | null) {
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

  const orderedItems = visibleSourceOrderItems(session);
  const nextItems = isOrderRandomized
    ? randomizeRuntimeItems(orderedItems)
    : orderedItems;

  return {
    ...session,
    items: nextItems,
    isOrderRandomized,
    timer: timerForOrderedItems(session, nextItems.length),
  };
}

export function randomizeSessionItems(session: FeedSession): FeedSession {
  if (!canRandomizeSessionSource(session)) return session;

  const nextItems = randomizeRuntimeItems(visibleSourceOrderItems(session));

  return {
    ...session,
    items: nextItems,
    isOrderRandomized: true,
    timer: timerForOrderedItems(session, nextItems.length),
  };
}

function visibleSourceOrderItems(session: FeedSession) {
  const allItems = session.allItems;
  if (!allItems) return session.items;

  const visibleIds = new Set(session.items.map((item) => item.id));
  const orderedVisibleItems = allItems.filter((item) =>
    visibleIds.has(item.id),
  );

  return orderedVisibleItems.length ? orderedVisibleItems : session.items;
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

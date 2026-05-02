import { useCallback, useState } from "react";

export type FeedMediaTransition =
  | "idle"
  | "feed-next"
  | "feed-previous"
  | "gallery-next"
  | "gallery-previous";

export type FeedMediaTransitionSnapshot = {
  itemId: string | null;
  activeIndex: number;
  itemCount: number;
  galleryIndex: number;
  galleryCount: number;
  mediaKey: string | null;
};

type PendingTransitionDirections = {
  feed: 1 | -1 | null;
  gallery: 1 | -1 | null;
};

const NO_PENDING_DIRECTIONS: PendingTransitionDirections = {
  feed: null,
  gallery: null,
};

export function useFeedMediaTransition(snapshot: FeedMediaTransitionSnapshot): {
  transition: FeedMediaTransition;
  setFeedDirection: (direction: 1 | -1) => void;
  setGalleryDirection: (direction: 1 | -1) => void;
} {
  const [state, setState] = useState<{
    snapshot: FeedMediaTransitionSnapshot;
    transition: FeedMediaTransition;
    pendingDirections: PendingTransitionDirections;
  }>({
    snapshot,
    transition: "idle",
    pendingDirections: NO_PENDING_DIRECTIONS,
  });
  const setFeedDirection = useCallback((direction: 1 | -1) => {
    setState((current) => ({
      ...current,
      pendingDirections: { feed: direction, gallery: null },
    }));
  }, []);
  const setGalleryDirection = useCallback((direction: 1 | -1) => {
    setState((current) => ({
      ...current,
      pendingDirections: { feed: null, gallery: direction },
    }));
  }, []);

  if (!isSameSnapshot(state.snapshot, snapshot)) {
    const transition = resolveFeedMediaTransition(
      state.snapshot,
      snapshot,
      state.pendingDirections,
    );
    setState({
      snapshot,
      transition,
      pendingDirections: NO_PENDING_DIRECTIONS,
    });
    return { transition, setFeedDirection, setGalleryDirection };
  }

  return {
    transition: state.transition,
    setFeedDirection,
    setGalleryDirection,
  };
}

export function resolveFeedMediaTransition(
  previous: FeedMediaTransitionSnapshot,
  next: FeedMediaTransitionSnapshot,
  preferredDirections: {
    feed?: 1 | -1 | null;
    gallery?: 1 | -1 | null;
  } = {},
): FeedMediaTransition {
  if (
    !previous.itemId ||
    !next.itemId ||
    !previous.mediaKey ||
    !next.mediaKey
  ) {
    return "idle";
  }

  if (previous.activeIndex !== next.activeIndex || preferredDirections.feed) {
    const direction =
      preferredDirections.feed ??
      resolveCircularDirection(
        previous.activeIndex,
        next.activeIndex,
        next.itemCount,
      );
    return direction === -1 ? "feed-previous" : "feed-next";
  }

  if (
    previous.itemId === next.itemId &&
    (previous.galleryIndex !== next.galleryIndex || preferredDirections.gallery)
  ) {
    const direction =
      preferredDirections.gallery ??
      resolveCircularDirection(
        previous.galleryIndex,
        next.galleryIndex,
        next.galleryCount,
      );
    return direction === -1 ? "gallery-previous" : "gallery-next";
  }

  return "idle";
}

function resolveCircularDirection(
  previousIndex: number,
  nextIndex: number,
  count: number,
) {
  if (count <= 1 || previousIndex === nextIndex) return 1;

  const forwardDistance = (nextIndex - previousIndex + count) % count;
  const backwardDistance = (previousIndex - nextIndex + count) % count;
  return forwardDistance <= backwardDistance ? 1 : -1;
}

function isSameSnapshot(
  previous: FeedMediaTransitionSnapshot,
  next: FeedMediaTransitionSnapshot,
) {
  return (
    previous.itemId === next.itemId &&
    previous.activeIndex === next.activeIndex &&
    previous.itemCount === next.itemCount &&
    previous.galleryIndex === next.galleryIndex &&
    previous.galleryCount === next.galleryCount &&
    previous.mediaKey === next.mediaKey
  );
}

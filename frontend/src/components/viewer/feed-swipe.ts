const SWIPE_MIN_DISTANCE_PX = 48;
const SWIPE_AXIS_DOMINANCE = 1.15;

export type FeedSwipeIntent = {
  axis: "feed" | "gallery";
  direction: 1 | -1;
} | null;

export function resolveFeedSwipeIntent({
  startX,
  startY,
  endX,
  endY,
  hasGallery,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hasGallery: boolean;
}): FeedSwipeIntent {
  const deltaX = startX - endX;
  const deltaY = startY - endY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (Math.max(absX, absY) < SWIPE_MIN_DISTANCE_PX) return null;

  if (absX > absY * SWIPE_AXIS_DOMINANCE) {
    if (!hasGallery) return null;
    return { axis: "gallery", direction: deltaX > 0 ? 1 : -1 };
  }

  if (absY > absX * SWIPE_AXIS_DOMINANCE) {
    return { axis: "feed", direction: deltaY > 0 ? 1 : -1 };
  }

  return null;
}

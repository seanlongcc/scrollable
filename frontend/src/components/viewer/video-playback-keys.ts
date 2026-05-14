export function videoPlaybackStateKey({
  viewId,
  title,
  itemId,
  galleryIndex,
}: {
  viewId?: string;
  title: string;
  itemId: string;
  galleryIndex: number;
}) {
  return `${viewId ?? title}:${itemId}:${galleryIndex}`;
}

export function videoPlaybackDuration({
  videoDurations,
  viewId,
  title,
  itemId,
  galleryIndex,
}: {
  videoDurations: Record<string, number>;
  viewId?: string;
  title: string;
  itemId: string | undefined;
  galleryIndex: number;
}) {
  if (!itemId) return undefined;

  const duration =
    videoDurations[
      videoPlaybackStateKey({ viewId, title, itemId, galleryIndex })
    ];

  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

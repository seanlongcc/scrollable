import { type TouchEvent, useCallback, useRef } from "react";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { resolveFeedSwipeIntent } from "./feed-swipe";

type TouchSwipeState = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

export function useFeedSwipe({
  activeItem,
  onGalleryChange,
  onMove,
}: {
  activeItem?: RuntimeFeedItem;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onMove: (direction: 1 | -1) => void;
}) {
  const touchSwipeRef = useRef<TouchSwipeState | null>(null);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || isSwipeIgnoredTarget(event.target)) {
      touchSwipeRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    const state = touchSwipeRef.current;
    if (!state || event.touches.length !== 1) {
      touchSwipeRef.current = null;
      return;
    }

    const touch = event.touches[0];
    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
  }, []);

  const finishTouchSwipe = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const state = touchSwipeRef.current;
      touchSwipeRef.current = null;
      if (!state) return;

      const intent = resolveFeedSwipeIntent({
        startX: state.startX,
        startY: state.startY,
        endX: clientX,
        endY: clientY,
        hasGallery: Boolean(
          activeItem?.media.length && activeItem.media.length > 1,
        ),
      });
      if (!intent) return;

      if (intent.axis === "gallery") {
        if (activeItem) onGalleryChange(activeItem.id, intent.direction);
        return;
      }

      onMove(intent.direction);
    },
    [activeItem, onGalleryChange, onMove],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        touchSwipeRef.current = null;
        return;
      }

      finishTouchSwipe(touch);
    },
    [finishTouchSwipe],
  );

  const handleTouchCancel = useCallback(() => {
    touchSwipeRef.current = null;
  }, []);

  return {
    onTouchCancel: handleTouchCancel,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchStart: handleTouchStart,
  };
}

function isSwipeIgnoredTarget(target: EventTarget) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "button,a,input,select,textarea,[role='button'],[data-swipe-ignore='true']",
      ),
    )
  );
}

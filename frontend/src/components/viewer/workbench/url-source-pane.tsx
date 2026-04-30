import {
  ExternalLink,
  Globe,
  Info,
  Maximize2,
  MousePointer2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import { cn } from "@/lib/utils";
import {
  urlResolutionIframeUrl,
  urlResolutionRequiresDisplayWarning,
} from "./helpers";
import {
  destroyYouTubePlayer,
  loadYouTubeIframeApi,
  reportYouTubePlaybackTime,
  resumeYouTubePlayer,
  type YouTubePlayer,
} from "./youtube-iframe-api";

export function UrlSourcePane({
  title,
  resolution,
  isRuntimeLoading,
  hideUi,
  isFocused,
  canMountIframe,
  iframePlaybackSeconds = 0,
  onIframePlaybackTimeChange,
  onSelect,
  onToggleSelect,
  onMaximize,
  onRemove,
}: {
  title: string;
  resolution?: UrlRuntimeResolution;
  isRuntimeLoading?: boolean;
  hideUi?: boolean;
  isFocused?: boolean;
  canMountIframe: boolean;
  iframePlaybackSeconds?: number;
  onIframePlaybackTimeChange?: (seconds: number) => void;
  onSelect?: () => void;
  onToggleSelect?: () => void;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const [approvedFallbackIframeUrl, setApprovedFallbackIframeUrl] = useState<
    string | null
  >(null);
  const displayTitle = resolution?.title ?? title;
  const externalUrl = resolution?.externalUrl;
  const iframeUrl = resolution ? urlResolutionIframeUrl(resolution) : null;
  const requiresDisplayWarning =
    urlResolutionRequiresDisplayWarning(resolution);
  const hasApprovedFallbackIframe =
    Boolean(iframeUrl) && approvedFallbackIframeUrl === iframeUrl;
  const shouldShowDisplayWarning =
    Boolean(iframeUrl) && requiresDisplayWarning && !hasApprovedFallbackIframe;
  const shouldMountIframe =
    Boolean(iframeUrl) &&
    canMountIframe &&
    (!requiresDisplayWarning || hasApprovedFallbackIframe);
  const iframeBlocked =
    resolution?.status === "resolved" &&
    iframeUrl &&
    !shouldShowDisplayWarning &&
    !shouldMountIframe;
  const sourceChromeClass = cn(
    "transition-opacity duration-200",
    !isFocused &&
      "opacity-0 group-hover/source:opacity-100 group-focus-within/source:opacity-100",
  );

  function selectThen(action?: () => void) {
    onSelect?.();
    action?.();
  }

  return (
    <article className="group/source relative grid size-full min-h-0 overflow-hidden rounded-2xl border border-border/65 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.014)]">
      {shouldMountIframe ? (
        <RuntimeIframe
          key={iframeUrl}
          title={displayTitle}
          iframeUrl={iframeUrl ?? ""}
          initialPlaybackSeconds={iframePlaybackSeconds}
          onPlaybackTimeChange={onIframePlaybackTimeChange}
        />
      ) : (
        <div className="absolute inset-0 z-0 grid place-items-center overflow-auto bg-background p-4">
          <div className="grid max-h-full max-w-md justify-items-center gap-3 text-center">
            <Globe className="size-8 text-primary" />
            <div className="grid max-w-full gap-1">
              <h3 className="text-wrap-anywhere text-sm font-medium">
                {displayTitle}
              </h3>
              {isRuntimeLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading runtime media
                </p>
              ) : resolution?.status === "resolved" &&
                resolution.mode === "metadata" ? (
                <>
                  {resolution.metadata.siteName ? (
                    <p className="text-[11px] font-medium text-primary">
                      <span className="text-wrap-anywhere">
                        {resolution.metadata.siteName}
                      </span>
                    </p>
                  ) : null}
                  {resolution.metadata.description ? (
                    <p className="text-wrap-anywhere line-clamp-4 text-xs text-muted-foreground">
                      {resolution.metadata.description}
                    </p>
                  ) : null}
                  {resolution.metadata.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolution.metadata.thumbnailUrl}
                      alt=""
                      className="mx-auto mt-1 max-h-36 max-w-full rounded-md border border-border object-contain"
                    />
                  ) : null}
                </>
              ) : shouldShowDisplayWarning ? (
                <>
                  <p className="text-xs font-medium text-primary">
                    Site not natively supported
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This source will open as an embedded site instead of native
                    media.
                  </p>
                </>
              ) : iframeBlocked ? (
                <p className="text-xs text-muted-foreground">
                  Iframe limit reached
                </p>
              ) : resolution?.status === "blocked" ? (
                <p className="text-xs text-muted-foreground">
                  This site blocks embedded viewing.
                </p>
              ) : resolution?.status === "unsupported" ? (
                <p className="text-xs text-muted-foreground">
                  This URL cannot be displayed inside the viewer.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  URL source is waiting for runtime resolution.
                </p>
              )}
            </div>
            {shouldShowDisplayWarning ? (
              <Button
                size="sm"
                className="min-w-0 max-w-full"
                onClick={() =>
                  selectThen(() => setApprovedFallbackIframeUrl(iframeUrl))
                }
              >
                <Info />
                <span className="min-w-0 truncate">Display site</span>
              </Button>
            ) : null}
            {externalUrl ? (
              <Button asChild size="sm" variant="outline" className="min-w-0">
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onSelect}
                >
                  <ExternalLink />
                  <span className="min-w-0 truncate">Open externally</span>
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {!hideUi && (onRemove || onMaximize || onSelect) ? (
        <div
          className={cn(
            "pointer-events-none absolute top-2 left-2 z-30 grid gap-1 md:left-auto md:right-2",
            sourceChromeClass,
          )}
        >
          {onRemove ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={() => selectThen(onRemove)}
              aria-label={`Remove ${displayTitle}`}
            >
              <X />
            </Button>
          ) : null}
          {onMaximize ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={() => selectThen(onMaximize)}
              aria-label={`Maximize ${displayTitle}`}
            >
              <Maximize2 />
            </Button>
          ) : null}
          {onSelect ? (
            <Button
              type="button"
              size="icon-sm"
              variant={isFocused ? "default" : "outline"}
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={onToggleSelect ?? onSelect}
              aria-label={`Select ${displayTitle}`}
              aria-pressed={isFocused}
            >
              <MousePointer2 />
            </Button>
          ) : null}
        </div>
      ) : null}

      {!hideUi && isFocused ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2",
            sourceChromeClass,
          )}
        >
          <div className="min-w-0 rounded-xl border border-border/60 bg-background/78 px-2 py-1.5 backdrop-blur">
            <div className="text-wrap-anywhere line-clamp-2 text-xs font-medium">
              {displayTitle}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              URL source
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function RuntimeIframe({
  title,
  iframeUrl,
  initialPlaybackSeconds,
  onPlaybackTimeChange,
}: {
  title: string;
  iframeUrl: string;
  initialPlaybackSeconds: number;
  onPlaybackTimeChange?: (seconds: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onPlaybackTimeChangeRef = useRef(onPlaybackTimeChange);
  const fallbackPlaybackRef = useRef({
    startedAt: 0,
    startSeconds: normalizedPlaybackSeconds(initialPlaybackSeconds),
  });
  const lastKnownPlaybackSecondsRef = useRef(
    normalizedPlaybackSeconds(initialPlaybackSeconds),
  );
  const hasAuthoritativeYoutubeTimeRef = useRef(false);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const youtubePlayerReadyRef = useRef(false);
  const pendingYoutubeSeekSecondsRef = useRef(
    normalizedPlaybackSeconds(initialPlaybackSeconds),
  );
  const [src] = useState(() =>
    iframeUrlWithPlaybackStart(iframeUrl, initialPlaybackSeconds),
  );

  useEffect(() => {
    onPlaybackTimeChangeRef.current = onPlaybackTimeChange;
  }, [onPlaybackTimeChange]);

  useEffect(() => {
    fallbackPlaybackRef.current = {
      startedAt: Date.now(),
      startSeconds: normalizedPlaybackSeconds(initialPlaybackSeconds),
    };
  }, [initialPlaybackSeconds]);

  useEffect(() => {
    if (!isYoutubeIframeUrl(iframeUrl)) return;
    let disposed = false;
    let player: YouTubePlayer | null = null;

    loadYouTubeIframeApi()
      .then((api) => {
        if (disposed || !iframeRef.current) return;

        player = new api.Player(iframeRef.current, {
          events: {
            onReady: (event) => {
              if (disposed) return;
              player = event.target;
              youtubePlayerRef.current = event.target;
              youtubePlayerReadyRef.current = true;
              resumeYouTubePlayer(
                event.target,
                pendingYoutubeSeekSecondsRef.current,
                true,
              );
            },
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch(() => {
        youtubePlayerRef.current = null;
        youtubePlayerReadyRef.current = false;
      });

    return () => {
      disposed = true;
      const playerToDestroy = player ?? youtubePlayerRef.current;
      if (playerToDestroy) {
        const reportedSeconds = reportYouTubePlaybackTime(
          playerToDestroy,
          onPlaybackTimeChangeRef.current,
        );
        if (reportedSeconds !== null) {
          lastKnownPlaybackSecondsRef.current = reportedSeconds;
          hasAuthoritativeYoutubeTimeRef.current = true;
        }
        destroyYouTubePlayer(playerToDestroy);
      }
      if (!playerToDestroy || youtubePlayerRef.current === playerToDestroy) {
        youtubePlayerRef.current = null;
        youtubePlayerReadyRef.current = false;
      }
    };
  }, [iframeUrl]);

  useEffect(() => {
    if (!isYoutubeIframeUrl(iframeUrl)) return;
    const resumeSeconds = normalizedPlaybackSeconds(initialPlaybackSeconds);
    pendingYoutubeSeekSecondsRef.current = resumeSeconds;

    const player = youtubePlayerRef.current;
    if (!player || !youtubePlayerReadyRef.current) return;

    resumeYouTubePlayer(player, resumeSeconds, false);
  }, [iframeUrl, initialPlaybackSeconds]);

  useEffect(() => {
    if (!isYoutubeIframeUrl(iframeUrl)) return;
    function reportPlaybackTime() {
      const player = youtubePlayerRef.current;
      const reportedFromPlayer = player
        ? reportYouTubePlaybackTime(player, onPlaybackTimeChangeRef.current)
        : null;
      if (reportedFromPlayer !== null) {
        lastKnownPlaybackSecondsRef.current = reportedFromPlayer;
        hasAuthoritativeYoutubeTimeRef.current = true;
        return;
      }

      const reportPlaybackTimeChange = onPlaybackTimeChangeRef.current;
      if (!reportPlaybackTimeChange) return;
      if (hasAuthoritativeYoutubeTimeRef.current) {
        reportPlaybackTimeChange(lastKnownPlaybackSecondsRef.current);
        return;
      }
      const { startedAt, startSeconds } = fallbackPlaybackRef.current;
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const fallbackSeconds = startSeconds + elapsedSeconds;
      lastKnownPlaybackSecondsRef.current = fallbackSeconds;
      reportPlaybackTimeChange(fallbackSeconds);
    }

    const intervalId = window.setInterval(reportPlaybackTime, 1000);

    return () => {
      window.clearInterval(intervalId);
      reportPlaybackTime();
    };
  }, [iframeUrl]);

  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      ref={iframeRef}
      referrerPolicy="no-referrer-when-downgrade"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      className="absolute inset-0 z-0 size-full border-0 bg-background"
    />
  );
}

function iframeUrlWithPlaybackStart(value: string, seconds: number) {
  if (!isYoutubeIframeUrl(value)) return value;

  const url = new URL(value);
  url.searchParams.set("enablejsapi", "1");
  const startSeconds = normalizedPlaybackSeconds(seconds);
  if (startSeconds > 0) {
    url.searchParams.set("start", String(startSeconds));
  }

  return url.toString();
}

function isYoutubeIframeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      (host === "youtube.com" || host === "youtube-nocookie.com") &&
      url.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
}

function normalizedPlaybackSeconds(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

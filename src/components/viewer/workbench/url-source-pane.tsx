import { ExternalLink, Globe, Info, Maximize2, Pencil, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import {
  urlResolutionIframeUrl,
  urlResolutionRequiresDisplayWarning,
} from "./helpers";

export function UrlSourcePane({
  title,
  resolution,
  isRuntimeLoading,
  hideUi,
  canMountIframe,
  onMaximize,
  onEdit,
  onRemove,
}: {
  title: string;
  resolution?: UrlRuntimeResolution;
  isRuntimeLoading?: boolean;
  hideUi?: boolean;
  canMountIframe: boolean;
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

  return (
    <article className="group/source relative grid size-full min-h-0 overflow-hidden rounded-lg border border-border/70 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.018)]">
      {shouldMountIframe ? (
        <iframe
          title={displayTitle}
          src={iframeUrl ?? ""}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          className="absolute inset-0 z-0 size-full border-0 bg-background"
        />
      ) : (
        <div className="absolute inset-0 z-0 grid place-items-center bg-background p-4">
          <div className="grid max-w-md justify-items-center gap-3 text-center">
            <Globe className="size-8 text-primary" />
            <div className="grid gap-1">
              <h3 className="text-sm font-medium">{displayTitle}</h3>
              {isRuntimeLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading runtime media
                </p>
              ) : resolution?.status === "resolved" &&
                resolution.mode === "metadata" ? (
                <>
                  {resolution.metadata.siteName ? (
                    <p className="text-[11px] font-medium text-primary">
                      {resolution.metadata.siteName}
                    </p>
                  ) : null}
                  {resolution.metadata.description ? (
                    <p className="text-xs text-muted-foreground">
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
                onClick={() => setApprovedFallbackIframeUrl(iframeUrl)}
              >
                <Info />
                Display site
              </Button>
            ) : null}
            {externalUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open externally
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {hideUi ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 opacity-0 transition-opacity duration-200 group-hover/source:opacity-100 group-focus-within/source:opacity-100">
          <div className="min-w-0 rounded-md bg-background/75 px-2 py-1.5 backdrop-blur">
            <div className="truncate text-xs font-medium">{displayTitle}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              URL source
            </div>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-1">
            {onMaximize ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onMaximize}
                aria-label={`Maximize ${displayTitle}`}
              >
                <Maximize2 />
              </Button>
            ) : null}
            {onEdit ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onEdit}
                aria-label={`Edit ${displayTitle}`}
              >
                <Pencil />
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onRemove}
                aria-label={`Remove ${displayTitle}`}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

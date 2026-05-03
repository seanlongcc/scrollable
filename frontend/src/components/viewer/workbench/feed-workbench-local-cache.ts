import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  clearLocalFileCache,
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheSupported,
  type LocalFileByteCacheConfirmation,
  type LocalFileCacheStorageStatus,
} from "@/lib/local-uploads/file-cache";
import type { FeedSession } from "./types";

export function useFeedWorkbenchLocalCache({
  sessions,
  showWorkbenchOverlays,
}: {
  sessions: FeedSession[];
  showWorkbenchOverlays: () => void;
}) {
  const largeLocalByteCacheResolverRef = useRef<
    ((confirmed: boolean) => void) | null
  >(null);
  const [canCacheLocalFiles, setCanCacheLocalFiles] = useState(() =>
    isLocalFileCacheSupported(),
  );
  const [largeLocalByteCachePrompt, setLargeLocalByteCachePrompt] =
    useState<LocalFileByteCacheConfirmation | null>(null);
  const [localCacheStorageFullStatus, setLocalCacheStorageFullStatus] =
    useState<LocalFileCacheStorageStatus | null>(null);
  const [localCacheStatus, setLocalCacheStatus] =
    useState<LocalFileCacheStorageStatus | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCanCacheLocalFiles(isLocalFileCacheSupported());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const confirmLargeLocalByteCache = useCallback(
    (confirmation: LocalFileByteCacheConfirmation) =>
      new Promise<boolean>((resolve) => {
        largeLocalByteCacheResolverRef.current = resolve;
        showWorkbenchOverlays();
        setLargeLocalByteCachePrompt(confirmation);
      }),
    [showWorkbenchOverlays],
  );

  const answerLargeLocalByteCachePrompt = useCallback((confirmed: boolean) => {
    largeLocalByteCacheResolverRef.current?.(confirmed);
    largeLocalByteCacheResolverRef.current = null;
    setLargeLocalByteCachePrompt(null);
  }, []);

  const refreshLocalCacheStatus = useCallback(async () => {
    const status = formatLocalFileCacheStorageStatus(
      await estimateLocalFileCacheStorage(),
    );
    setLocalCacheStatus(status);
    return status;
  }, []);

  const refreshLocalCacheStatusForCurrentLayout = useCallback(async () => {
    if (!sessions.some((session) => session.sourceConfig.kind === "local")) {
      setLocalCacheStatus(null);
      return null;
    }

    return refreshLocalCacheStatus();
  }, [refreshLocalCacheStatus, sessions]);

  const clearLocalCache = useCallback(async () => {
    await clearLocalFileCache();
    setLocalCacheStorageFullStatus(null);
    await refreshLocalCacheStatus();
  }, [refreshLocalCacheStatus]);

  const setLocalCacheStorageFullStatusWithOverlay = useCallback(
    (status: LocalFileCacheStorageStatus | null) => {
      if (status) showWorkbenchOverlays();
      setLocalCacheStorageFullStatus(status);
    },
    [showWorkbenchOverlays],
  );

  return {
    canCacheLocalFiles,
    largeLocalByteCachePrompt,
    localCacheStorageFullStatus,
    localCacheStatus,
    confirmLargeLocalByteCache,
    answerLargeLocalByteCachePrompt,
    refreshLocalCacheStatus,
    refreshLocalCacheStatusForCurrentLayout,
    clearLocalCache,
    setLocalCacheStorageFullStatus: setLocalCacheStorageFullStatus as Dispatch<
      SetStateAction<LocalFileCacheStorageStatus | null>
    >,
    setLocalCacheStorageFullStatusWithOverlay,
  };
}

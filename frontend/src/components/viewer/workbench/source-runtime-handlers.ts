import type {
  ChangeEvent,
  Dispatch,
  DragEvent as ReactDragEvent,
  SetStateAction,
} from "react";
import { toast } from "sonner";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import {
  addPreparedLocalSourceAction,
  addRedditSourceAction,
  addUrlSourceAction,
  prepareLocalSourceAddAction,
} from "./source-add-actions";
import {
  defaultSourceAddFormState,
  sourceAddPanelPlacement,
} from "./source-add-state";
import {
  applyRuntimeHydrationAction,
  hydrateRuntimeSessionsAction,
} from "./runtime-hydration-actions";
import {
  applyEditedRedditSourceToSession,
  applyEditedUrlSourceToSession,
  withSessionRuntimeLoading,
} from "./source-edit-state";
import {
  editPreparedLocalSourceAction,
  editPreparedRedditSourceAction,
  editUrlSourceAction,
  prepareLocalSourceEditAction,
  prepareRedditSourceEditAction,
} from "./source-edit-actions";
import {
  applyLocalRuntimeItemsToSession,
  cacheLocalFiles as cacheLocalFilesForWorkbench,
  createLocalRuntimeItems as createLocalRuntimeItemsForWorkbench,
  filesFromDataTransfer,
  getUploadableFiles,
} from "./local-sources";
import {
  placeSessions,
  type SessionPlacementSourceInput,
} from "./session-placement";
import type {
  FeedSession,
  LayoutMode,
  PersistedSourceConfig,
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SourceGroupingMode,
  WorkspaceTemplateSlot,
} from "./types";

type SourceRuntimeHandlersInput = {
  redditInputMode: RedditInputMode;
  subredditName: string;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditUrls: string;
  redditLimit: number;
  sourceGroupingMode: SourceGroupingMode;
  availableSeparateSourceSlots: number;
  urlValue: string;
  urlTitle: string;
  activeLayerId: string;
  globalSeconds: number;
  pendingFixedSlot: number | null;
  pendingTemplateSlotId: string | null;
  templateSlots: WorkspaceTemplateSlot[];
  layoutMode: LayoutMode;
  sessions: FeedSession[];
  canCacheLocalFiles: boolean;
  visibleFixedCells: number;
  registryRef: { current: LocalObjectUrlRegistry | null };
  createId: () => string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsSourceOpen: Dispatch<SetStateAction<boolean>>;
  setUrlValue: Dispatch<SetStateAction<string>>;
  setUrlTitle: Dispatch<SetStateAction<string>>;
  setRedditUrls: Dispatch<SetStateAction<string>>;
  setRedditInputMode: Dispatch<SetStateAction<RedditInputMode>>;
  setSubredditName: Dispatch<SetStateAction<string>>;
  setRedditSort: Dispatch<SetStateAction<RedditListingSort>>;
  setRedditTimeRange: Dispatch<SetStateAction<RedditTimeRange>>;
  setRedditLimit: Dispatch<SetStateAction<number>>;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setEditingSourceId: Dispatch<SetStateAction<string | null>>;
  setPendingFixedSlot: Dispatch<SetStateAction<number | null>>;
  setPendingTemplateSlotId: Dispatch<SetStateAction<string | null>>;
  setTemplateSlots: Dispatch<SetStateAction<WorkspaceTemplateSlot[]>>;
};

export function useSourceRuntimeHandlers({
  redditInputMode,
  subredditName,
  redditSort,
  redditTimeRange,
  redditUrls,
  redditLimit,
  sourceGroupingMode,
  availableSeparateSourceSlots,
  urlValue,
  urlTitle,
  activeLayerId,
  globalSeconds,
  pendingFixedSlot,
  pendingTemplateSlotId,
  templateSlots,
  layoutMode,
  sessions,
  canCacheLocalFiles,
  visibleFixedCells,
  registryRef,
  createId,
  setIsLoading,
  setIsSourceOpen,
  setUrlValue,
  setUrlTitle,
  setRedditUrls,
  setRedditInputMode,
  setSubredditName,
  setRedditSort,
  setRedditTimeRange,
  setRedditLimit,
  setSessions,
  setSelectedId,
  setEditingSourceId,
  setPendingFixedSlot,
  setPendingTemplateSlotId,
  setTemplateSlots,
}: SourceRuntimeHandlersInput) {
  async function fetchRedditFeed() {
    setIsLoading(true);
    try {
      const result = await addRedditSourceAction({
        redditInputMode,
        subredditName,
        redditSort,
        redditTimeRange,
        redditUrls,
        redditLimit,
        sourceGroupingMode,
        availableSeparateSourceSlots,
      });

      if (result.status !== "ready") {
        toast.error(result.error);
        return;
      }

      addSessions(result.sources);
      setIsSourceOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function openUrlSource() {
    setIsLoading(true);
    try {
      const result = await addUrlSourceAction({ urlValue, urlTitle });

      if (result.status !== "ready") {
        toast.error(result.error);
        return;
      }

      addSession(result.source);
      setIsSourceOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function addLocalFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(event.target.files ?? []);
    await addLocalFileList(files, () => {
      input.value = "";
    });
  }

  async function addDroppedLocalFiles(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    await addLocalFileList(await filesFromDataTransfer(event.dataTransfer));
  }

  function allowLocalFileDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  async function addLocalFileList(files: File[], onSettled?: () => void) {
    const prepared = prepareLocalSourceAddAction({
      files,
      sourceGroupingMode,
      availableSeparateSourceSlots,
      createRuntimeItems: createLocalRuntimeItems,
    });

    if (prepared.status === "slot-error") {
      toast.error(prepared.error);
      onSettled?.();
      return;
    }

    if (prepared.status === "empty") {
      onSettled?.();
      return;
    }

    setIsLoading(true);

    try {
      const result = await addPreparedLocalSourceAction({
        uploadableFiles: prepared.uploadableFiles,
        items: prepared.items,
        sourceGroupingMode,
        cacheFiles: cacheLocalFiles,
      });

      if (result.status !== "ready") {
        toast.error(result.error);
        return;
      }

      addSessions(result.sources);
      setIsSourceOpen(false);
    } finally {
      setIsLoading(false);
      onSettled?.();
    }
  }

  async function replaceLocalSessionFiles(
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.target;
    const files = getUploadableFiles(Array.from(event.target.files ?? []));
    const items = createLocalRuntimeItems(files);
    input.value = "";

    if (!items.length) return;

    try {
      applyLocalRuntimeItems(id, items, await cacheLocalFiles(files), files);
    } catch (error) {
      updateSession(id, (current) => ({ ...current, isRuntimeLoading: false }));
      toast.error(
        error instanceof Error ? error.message : "Local file cache failed",
      );
    }
  }

  async function cacheLocalFiles(files: File[]) {
    return cacheLocalFilesForWorkbench({
      files,
      canCacheLocalFiles,
      createCacheSetId: createId,
      onCacheRejected: () =>
        toast.warning("Local files will need reload after refresh"),
    });
  }

  function applyLocalRuntimeItems(
    id: string,
    items: RuntimeFeedItem[],
    cacheSetId?: string,
    files?: File[],
  ) {
    updateSession(id, (session) =>
      applyLocalRuntimeItemsToSession({ session, items, cacheSetId, files }),
    );
  }

  function createLocalRuntimeItems(files: File[]) {
    return createLocalRuntimeItemsForWorkbench(files, registryRef);
  }

  function addSession({
    title,
    items,
    allItems,
    urlResolution,
    localFiles,
    sourceConfig,
  }: {
    title: string;
    items: RuntimeFeedItem[];
    allItems?: RuntimeFeedItem[];
    urlResolution?: UrlRuntimeResolution;
    localFiles?: File[];
    sourceConfig: PersistedSourceConfig;
  }) {
    addSessions([
      { title, items, allItems, urlResolution, localFiles, sourceConfig },
    ]);
  }

  function addSessions(sources: SessionPlacementSourceInput[]) {
    setSessions((current) => {
      const result = placeSessions({
        current,
        sources,
        activeLayerId,
        globalSeconds,
        pendingFixedSlot,
        pendingTemplateSlotId,
        templateSlots,
        createId,
      });

      if (result.noFreeLayoutSpace) {
        toast.error("No space left in free layout");
      }

      if (result.selectedSessionId) {
        setSelectedId(result.selectedSessionId);
        setPendingFixedSlot(null);
        setPendingTemplateSlotId(null);
        if (result.consumedTemplateSlotId) {
          setTemplateSlots((currentSlots) =>
            currentSlots.filter(
              (slot) => slot.id !== result.consumedTemplateSlotId,
            ),
          );
        }
      }

      return result.sessions;
    });
  }

  function openSourcePanel(
    fixedSlot: number | null = null,
    templateSlotId: string | null = null,
  ) {
    const placement = sourceAddPanelPlacement(fixedSlot, templateSlotId);
    setPendingFixedSlot(placement.pendingFixedSlot);
    setPendingTemplateSlotId(placement.pendingTemplateSlotId);
    resetSourceInputs();
    setIsSourceOpen(true);
  }

  function resetSourceInputs() {
    const next = defaultSourceAddFormState();
    setUrlValue(next.urlValue);
    setUrlTitle(next.urlTitle);
    setRedditUrls(next.redditUrls);
    setSubredditName(next.subredditName);
    setRedditInputMode(next.redditInputMode);
    setRedditSort(next.redditSort);
    setRedditTimeRange(next.redditTimeRange);
    setRedditLimit(next.redditLimit);
  }

  function openEditSource(id: string) {
    setEditingSourceId(id);
  }

  function updateSession(
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? updater(session) : session,
      ),
    );
  }

  async function saveRedditSourceEdit(
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) {
    const prepared = prepareRedditSourceEditAction({ urls, limit });

    if (prepared.status !== "ready") {
      toast.error(prepared.error);
      return;
    }

    updateSession(id, (session) => withSessionRuntimeLoading(session, true));

    const result = await editPreparedRedditSourceAction({
      currentSource: sessions.find((session) => session.id === id),
      urls: prepared.urls,
      limit: prepared.limit,
      hiddenItemIds,
      unhiddenItemHashes,
    });

    if (result.status !== "ready") {
      updateSession(id, (session) => withSessionRuntimeLoading(session, false));
      toast.error(result.error);
      return;
    }

    updateSession(id, (session) =>
      applyEditedRedditSourceToSession(session, result.result),
    );
    setEditingSourceId(null);
  }

  async function saveUrlSourceEdit(id: string, url: string, title?: string) {
    updateSession(id, (session) => withSessionRuntimeLoading(session, true));

    const result = await editUrlSourceAction({
      currentSource: sessions.find((session) => session.id === id),
      url,
      title,
    });

    if (result.status !== "ready") {
      updateSession(id, (session) => withSessionRuntimeLoading(session, false));
      toast.error(result.error);
      return;
    }

    updateSession(id, (session) =>
      applyEditedUrlSourceToSession(session, result.result),
    );
    setEditingSourceId(null);
  }

  async function saveLocalSourceEdit(id: string, files: File[]) {
    const prepared = prepareLocalSourceEditAction({ files });

    if (prepared.status !== "ready") {
      toast.error(prepared.error);
      return;
    }

    const result = await editPreparedLocalSourceAction({
      files: prepared.files,
      createRuntimeItems: createLocalRuntimeItems,
      cacheFiles: cacheLocalFiles,
    });

    if (result.status !== "ready") {
      updateSession(id, (session) => ({ ...session, isRuntimeLoading: false }));
      toast.error(result.error);
      return;
    }

    applyLocalRuntimeItems(id, result.items, result.cacheSetId, result.files);
    setEditingSourceId(null);
  }

  async function hydrateRuntimeItems(nextSessions: FeedSession[]) {
    const result = await hydrateRuntimeSessionsAction({
      sessions: nextSessions,
      visibility: {
        activeLayerId,
        layoutMode,
        visibleFixedCells,
      },
      createLocalRuntimeItems,
      onError: (message) => toast.error(message),
    });

    if (result.status === "empty") return;

    setSessions((current) =>
      applyRuntimeHydrationAction({
        sessions: current,
        hydrated: result.hydrated,
      }),
    );
  }

  return {
    fetchRedditFeed,
    openUrlSource,
    addLocalFiles,
    addDroppedLocalFiles,
    allowLocalFileDrop,
    replaceLocalSessionFiles,
    openSourcePanel,
    openEditSource,
    updateSession,
    saveRedditSourceEdit,
    saveUrlSourceEdit,
    saveLocalSourceEdit,
    hydrateRuntimeItems,
  };
}

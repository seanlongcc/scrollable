export const LARGE_LOCAL_BYTE_CACHE_WARNING_BYTES = 512 * 1024 * 1024;
export const LOCAL_FILE_CACHE_STORAGE_RESERVE_BYTES = 128 * 1024 * 1024;
export const FIREFOX_BEST_EFFORT_CACHE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
const STORAGE_FULL_USAGE_RATIO = 0.98;

export type LocalFileCacheStorageEstimate = {
  status: "available" | "unavailable";
  usageBytes?: number;
  quotaBytes?: number;
  displayQuotaBytes?: number;
  persisted?: boolean;
};

export type LocalFileCacheStorageStatus = {
  label: string;
  freeLabel?: string;
};

export type LocalFileByteCacheConfirmation = {
  totalBytes: number;
  fileCount: number;
  storageStatus?: LocalFileCacheStorageStatus;
};

export type LocalFileCacheSaveOptions = {
  confirmLargeByteCache?: (
    confirmation: LocalFileByteCacheConfirmation,
  ) => boolean | Promise<boolean>;
  skipByteCachePreparation?: boolean;
};

export class LocalFileCacheCancelledError extends Error {
  constructor() {
    super("Local file byte cache cancelled");
    this.name = "LocalFileCacheCancelledError";
  }
}

export class LocalFileCacheStorageFullError extends Error {
  readonly storageEstimate: LocalFileCacheStorageEstimate;
  readonly storageStatus: LocalFileCacheStorageStatus;
  readonly requiredBytes: number;

  constructor({
    storageEstimate,
    storageStatus,
    requiredBytes,
  }: {
    storageEstimate: LocalFileCacheStorageEstimate;
    storageStatus: LocalFileCacheStorageStatus;
    requiredBytes: number;
  }) {
    super("Local file cache storage is full");
    this.name = "LocalFileCacheStorageFullError";
    this.storageEstimate = storageEstimate;
    this.storageStatus = storageStatus;
    this.requiredBytes = requiredBytes;
  }
}

export function isLocalFileCacheCancelled(error: unknown) {
  return (
    error instanceof LocalFileCacheCancelledError ||
    (error instanceof Error && error.name === "LocalFileCacheCancelledError")
  );
}

export function isLocalFileCacheStorageFull(error: unknown) {
  return (
    error instanceof LocalFileCacheStorageFullError ||
    (error instanceof Error && error.name === "LocalFileCacheStorageFullError")
  );
}

export async function estimateLocalFileCacheStorage(): Promise<LocalFileCacheStorageEstimate> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { status: "unavailable" };
  }

  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.() ?? Promise.resolve(false),
    ]);
    const usageBytes = estimate.usage;
    const quotaBytes = estimate.quota;
    const displayQuotaBytes = displayQuotaForStorageEstimate({
      quotaBytes,
      persisted,
    });

    return {
      status: "available",
      usageBytes,
      quotaBytes,
      displayQuotaBytes,
      persisted,
    };
  } catch {
    return { status: "unavailable" };
  }
}

export function formatLocalFileCacheStorageStatus(
  estimate: LocalFileCacheStorageEstimate,
): LocalFileCacheStorageStatus {
  if (
    estimate.status !== "available" ||
    estimate.usageBytes === undefined ||
    estimate.displayQuotaBytes === undefined
  ) {
    return { label: "Local cache: storage usage unavailable" };
  }

  const freeBytes = Math.max(
    0,
    estimate.displayQuotaBytes - estimate.usageBytes,
  );
  const estimated =
    estimate.persisted === true &&
    estimate.displayQuotaBytes > FIREFOX_BEST_EFFORT_CACHE_QUOTA_BYTES
      ? " estimated"
      : "";

  return {
    label: `Local cache: ${formatGibibytes(
      estimate.usageBytes,
    )} / ${formatGibibytes(estimate.displayQuotaBytes)} used${estimated}`,
    freeLabel: `${formatGibibytes(freeBytes)} free`,
  };
}

export async function prepareLocalByteCacheWrite(
  confirmation: LocalFileByteCacheConfirmation,
  options: LocalFileCacheSaveOptions,
) {
  const storageEstimate = await estimateLocalFileCacheStorage();
  const storageStatus = formatLocalFileCacheStorageStatus(storageEstimate);
  ensureStorageHasByteCacheRoom({
    confirmation,
    storageEstimate,
    storageStatus,
  });

  if (
    confirmation.totalBytes <= LARGE_LOCAL_BYTE_CACHE_WARNING_BYTES ||
    !options.confirmLargeByteCache
  ) {
    return;
  }

  if (
    !(await options.confirmLargeByteCache({
      ...confirmation,
      storageStatus,
    }))
  ) {
    throw new LocalFileCacheCancelledError();
  }
}

function ensureStorageHasByteCacheRoom({
  confirmation,
  storageEstimate,
  storageStatus,
}: {
  confirmation: LocalFileByteCacheConfirmation;
  storageEstimate: LocalFileCacheStorageEstimate;
  storageStatus: LocalFileCacheStorageStatus;
}) {
  if (
    storageEstimate.status !== "available" ||
    storageEstimate.usageBytes === undefined ||
    storageEstimate.displayQuotaBytes === undefined
  ) {
    return;
  }

  const requiredBytes =
    confirmation.totalBytes + LOCAL_FILE_CACHE_STORAGE_RESERVE_BYTES;
  const freeBytes =
    storageEstimate.displayQuotaBytes - storageEstimate.usageBytes;
  const usageRatio =
    storageEstimate.displayQuotaBytes > 0
      ? storageEstimate.usageBytes / storageEstimate.displayQuotaBytes
      : 1;

  if (usageRatio >= STORAGE_FULL_USAGE_RATIO || freeBytes < requiredBytes) {
    throw new LocalFileCacheStorageFullError({
      storageEstimate,
      storageStatus,
      requiredBytes,
    });
  }
}

function displayQuotaForStorageEstimate({
  quotaBytes,
  persisted,
}: {
  quotaBytes?: number;
  persisted: boolean;
}) {
  if (quotaBytes === undefined) return undefined;
  if (isFirefox() && !persisted) {
    return Math.min(quotaBytes, FIREFOX_BEST_EFFORT_CACHE_QUOTA_BYTES);
  }

  return quotaBytes;
}

function formatGibibytes(bytes: number) {
  const value = bytes / 1024 ** 3;
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} GB`;
}

function isFirefox() {
  return (
    typeof navigator !== "undefined" && /Firefox\//.test(navigator.userAgent)
  );
}

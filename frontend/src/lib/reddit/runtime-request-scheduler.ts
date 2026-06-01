import type { RuntimeFeedItem } from "@/lib/feed/types";

import { shouldTryNextRedditRequest, toRedditPostError } from "./source";

export type RedditRuntimeRequest = {
  url: string;
  headers: Record<string, string>;
  parser: "json" | "rss";
};

type NormalizedRedditResponse = {
  items: RuntimeFeedItem[];
  unsupportedIds: string[];
};

type RedditRequestOptions = {
  subreddit: string;
  allowNsfw?: boolean;
  limit?: number;
};

type NormalizeRedditResponse = (
  response: Response,
  parser: RedditRuntimeRequest["parser"],
  options: RedditRequestOptions,
) => Promise<NormalizedRedditResponse>;

type RedditRequestOutcome =
  | {
      normalized: NormalizedRedditResponse;
      status: "supported";
    }
  | {
      status: "unsupported";
      unsupportedIds: string[];
    }
  | {
      status: "retryable";
      statusCode: number;
    }
  | {
      error: Error;
      status: "fatal";
    };

export type RedditRequestGroupResult =
  | {
      normalized: NormalizedRedditResponse;
      status: "supported";
    }
  | {
      fatalError: Error | null;
      lastRetryableStatus: number;
      lastUnsupportedIds: string[];
      sawOkResponse: boolean;
      status: "empty";
    };

const REDDIT_REQUEST_TIMEOUT_MS = 8000;

export async function fetchFirstSupportedRedditResponse(
  requests: RedditRuntimeRequest[],
  options: RedditRequestOptions & {
    normalizeResponse: NormalizeRedditResponse;
    userAgent: string;
  },
): Promise<RedditRequestGroupResult> {
  const runningRequests = requests.map((request) =>
    startRedditRequest(request, options),
  );
  const pendingRequests = new Set(runningRequests);
  let sawOkResponse = false;
  let lastRetryableStatus = 502;
  let lastUnsupportedIds: string[] = [];
  let fatalError: Error | null = null;

  while (pendingRequests.size) {
    const { outcome, runningRequest } = await Promise.race(
      [...pendingRequests].map(async (pendingRequest) => ({
        outcome: await pendingRequest.promise,
        runningRequest: pendingRequest,
      })),
    );
    pendingRequests.delete(runningRequest);

    if (outcome.status === "supported") {
      for (const pendingRequest of pendingRequests) {
        pendingRequest.abort();
      }

      return {
        normalized: outcome.normalized,
        status: "supported",
      };
    }

    if (outcome.status === "unsupported") {
      sawOkResponse = true;
      lastUnsupportedIds = outcome.unsupportedIds;
      continue;
    }

    if (outcome.status === "retryable") {
      lastRetryableStatus = outcome.statusCode;
      continue;
    }

    fatalError = outcome.error;
    for (const pendingRequest of pendingRequests) {
      pendingRequest.abort();
    }
    break;
  }

  return {
    fatalError,
    lastRetryableStatus,
    lastUnsupportedIds,
    sawOkResponse,
    status: "empty",
  };
}

export async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput) => Promise<TOutput>,
) {
  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < inputs.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(inputs[index] as TInput);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, () =>
      worker(),
    ),
  );

  return results;
}

function startRedditRequest(
  request: RedditRuntimeRequest,
  options: RedditRequestOptions & {
    normalizeResponse: NormalizeRedditResponse;
    userAgent: string;
  },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REDDIT_REQUEST_TIMEOUT_MS);
  const abort = () => {
    clearTimeout(timeout);
    controller.abort();
  };
  const promise: Promise<RedditRequestOutcome> = Promise.resolve()
    .then(() =>
      fetch(request.url, {
        headers: {
          "User-Agent": options.userAgent,
          ...request.headers,
        },
        cache: "no-store",
        signal: controller.signal,
      }),
    )
    .then(async (response) => {
      if (!response.ok) {
        if (shouldTryNextRedditRequest(response.status)) {
          return {
            status: "retryable" as const,
            statusCode: response.status,
          };
        }

        return {
          error: toRedditPostError(response.status),
          status: "fatal" as const,
        };
      }

      const normalized = await options.normalizeResponse(
        response,
        request.parser,
        options,
      );
      if (normalized.items.length > 0) {
        return {
          normalized,
          status: "supported" as const,
        };
      }

      return {
        status: "unsupported" as const,
        unsupportedIds: normalized.unsupportedIds,
      };
    })
    .catch(() => ({
      status: "retryable" as const,
      statusCode: 502,
    }))
    .finally(() => {
      clearTimeout(timeout);
    });

  return { abort, promise };
}

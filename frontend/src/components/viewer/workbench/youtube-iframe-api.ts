export type YouTubePlayer = {
  destroy?: () => void;
  getCurrentTime?: () => number;
  mute?: () => void;
  pauseVideo?: () => void;
  playVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

export function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube IFrame API loaded without Player"));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      youtubeApiPromise = null;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

export function resumeYouTubePlayer(
  player: YouTubePlayer,
  seconds: number,
  forcePlay: boolean,
) {
  const startSeconds = normalizedPlaybackSeconds(seconds);
  const currentSeconds = readYouTubePlaybackTime(player);
  const shouldSeek =
    startSeconds > 0 &&
    (currentSeconds === null || Math.abs(currentSeconds - startSeconds) > 1.5);

  if (!forcePlay && !shouldSeek) return;

  try {
    player.mute?.();
  } catch {
    // YouTube API can throw while the iframe is being replaced.
  }

  if (shouldSeek) {
    try {
      player.seekTo?.(startSeconds, true);
    } catch {
      // A later ready/tick can retry from pending runtime state.
    }
  }

  try {
    player.playVideo?.();
  } catch {
    // Browser autoplay policy may still reject unmuted/manual playback.
  }
}

export function reportYouTubePlaybackTime(
  player: YouTubePlayer,
  onPlaybackTimeChange: ((seconds: number) => void) | undefined,
) {
  if (!onPlaybackTimeChange) return null;
  const currentSeconds = readYouTubePlaybackTime(player);
  if (currentSeconds === null) return null;

  const reportedSeconds = normalizedPlaybackSeconds(currentSeconds);
  onPlaybackTimeChange(reportedSeconds);
  return reportedSeconds;
}

export function pauseYouTubePlayer(
  player: YouTubePlayer,
  onPlaybackTimeChange: ((seconds: number) => void) | undefined,
) {
  const reportedSeconds = reportYouTubePlaybackTime(
    player,
    onPlaybackTimeChange,
  );

  try {
    player.pauseVideo?.();
  } catch {
    // Player may reject commands while iframe is being replaced.
  }

  return reportedSeconds;
}

export function destroyYouTubePlayer(player: YouTubePlayer) {
  try {
    player.destroy?.();
  } catch {
    // Player may already be gone after React removes the iframe.
  }
}

function readYouTubePlaybackTime(player: YouTubePlayer) {
  try {
    const currentSeconds = player.getCurrentTime?.();
    return typeof currentSeconds === "number" &&
      Number.isFinite(currentSeconds) &&
      currentSeconds >= 0
      ? currentSeconds
      : null;
  } catch {
    return null;
  }
}

function normalizedPlaybackSeconds(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

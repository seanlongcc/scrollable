import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const RELEASE_API_URL =
  process.env.YTDLP_RELEASE_API_URL ??
  "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";

const assetName = standaloneAssetName(process.platform, process.arch);
if (!assetName) {
  console.warn(
    `[yt-dlp] No standalone binary configured for ${process.platform}/${process.arch}; using package fallback.`,
  );
  process.exit(0);
}

const targetDirectory =
  process.env.YOUTUBE_DL_DIR ??
  join(process.cwd(), "node_modules", "youtube-dl-exec", "bin");
const targetPath = join(targetDirectory, assetName);

await mkdir(targetDirectory, { recursive: true });
const asset = await releaseAsset(assetName);
const response = await fetch(asset.browser_download_url, {
  headers: githubHeaders(),
});

if (!response.ok) {
  throw new Error(
    `Failed to download ${assetName}: ${response.status} ${response.statusText}`,
  );
}

await writeFile(targetPath, Buffer.from(await response.arrayBuffer()), {
  mode: 0o755,
});
await chmod(targetPath, 0o755);
console.log(`[yt-dlp] Installed standalone ${assetName} at ${targetPath}`);

function standaloneAssetName(platform, arch) {
  if (platform === "linux" && arch === "x64") return "yt-dlp_linux";
  if (platform === "linux" && arch === "arm64") return "yt-dlp_linux_aarch64";
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "win32") return "yt-dlp.exe";
  return null;
}

async function releaseAsset(name) {
  const response = await fetch(RELEASE_API_URL, { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch yt-dlp release: ${response.status} ${response.statusText}`,
    );
  }

  const release = await response.json();
  const asset = release.assets?.find((entry) => entry.name === name);
  if (!asset?.browser_download_url) {
    throw new Error(`yt-dlp release asset not found: ${name}`);
  }

  return asset;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "scrollable-ytdlp-installer",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

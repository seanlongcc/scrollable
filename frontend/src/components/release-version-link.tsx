"use client";

import { useEffect, useState } from "react";

type LatestReleaseResponse = {
  release: {
    tagName: string;
    htmlUrl: string;
  } | null;
};

type ReleaseVersionLinkProps = {
  className?: string;
};

export function ReleaseVersionLink({ className }: ReleaseVersionLinkProps) {
  const [release, setRelease] =
    useState<LatestReleaseResponse["release"]>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLatestRelease() {
      try {
        const response = await fetch("/api/releases/latest");
        if (!response.ok) return;

        const payload = (await response.json()) as LatestReleaseResponse;
        if (isMounted) {
          setRelease(validRelease(payload.release) ? payload.release : null);
        }
      } catch {
        if (isMounted) setRelease(null);
      }
    }

    void loadLatestRelease();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!release) return null;

  return (
    <a
      className={className}
      href={release.htmlUrl}
      rel="noreferrer"
      target="_blank"
    >
      {release.tagName}
    </a>
  );
}

function validRelease(
  release: LatestReleaseResponse["release"],
): release is NonNullable<LatestReleaseResponse["release"]> {
  return (
    typeof release?.tagName === "string" &&
    release.tagName.length > 0 &&
    typeof release.htmlUrl === "string" &&
    release.htmlUrl.length > 0
  );
}

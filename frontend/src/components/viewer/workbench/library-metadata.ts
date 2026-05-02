import type { LayoutMode } from "./types";

export type LibraryMetadataLabel = {
  visible: string;
  title: string;
};

export function layoutLibraryMetadata(
  layoutMode: LayoutMode,
  sourceCount: number,
  fileCount: number,
): LibraryMetadataLabel {
  const counts = sourceFileLibraryMetadata(sourceCount, fileCount);

  return {
    visible: `${layoutMode} · ${counts.visible}`,
    title: `${layoutMode} · ${counts.title}`,
  };
}

export function sourceFileLibraryMetadata(
  sourceCount: number,
  fileCount: number,
): LibraryMetadataLabel {
  return {
    visible: `${sourceCount} src · ${fileCompactLabel(fileCount)}`,
    title: `${countLabel(sourceCount, "source")} · ${countLabel(fileCount, "file")}`,
  };
}

export function templateLibraryMetadata(
  boxCount: number,
): LibraryMetadataLabel {
  return {
    visible: `free · ${boxCount} box`,
    title: `free template · ${countLabel(boxCount, "box", "boxes")}`,
  };
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function fileCompactLabel(count: number) {
  return countLabel(count, "file");
}

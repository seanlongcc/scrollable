import { randomUUID } from "node:crypto";

import { FeedWorkbench } from "@/components/viewer/feed-workbench";

export default function Home() {
  return <FeedWorkbench initialWorkspaceId={randomUUID()} />;
}

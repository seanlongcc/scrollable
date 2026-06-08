import { toast } from "@/lib/toast";

import type { RuntimeNotice } from "./runtime-source-notices";

export function showRuntimeNotice(notice: RuntimeNotice) {
  if (notice.tone === "warning") {
    toast.warning(notice.message);
    return;
  }

  toast.error(notice.message);
}

export function showRuntimeActionNotice(result: {
  error: string;
  notice?: RuntimeNotice;
}) {
  showRuntimeNotice(result.notice ?? { tone: "error", message: result.error });
}

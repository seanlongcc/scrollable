import { requestLazyToasterMount } from "./toast-events";

type SonnerToast = typeof import("sonner").toast;
type ToastMethod = "error" | "message" | "success" | "warning";
type ToastArgs<Method extends ToastMethod> = SonnerToast[Method] extends (
  ...args: infer Args
) => unknown
  ? Args
  : never;

function callToast<Method extends ToastMethod>(
  method: Method,
  ...args: ToastArgs<Method>
) {
  requestLazyToasterMount();

  void import("sonner").then(({ toast: sonnerToast }) => {
    const toastMethod = sonnerToast[method] as unknown as (
      ...toastArgs: ToastArgs<Method>
    ) => unknown;

    toastMethod(...args);
  });
}

export const toast = {
  error: (...args: ToastArgs<"error">) => callToast("error", ...args),
  message: (...args: ToastArgs<"message">) => callToast("message", ...args),
  success: (...args: ToastArgs<"success">) => callToast("success", ...args),
  warning: (...args: ToastArgs<"warning">) => callToast("warning", ...args),
};

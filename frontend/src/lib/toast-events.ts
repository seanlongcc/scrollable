export const LAZY_TOASTER_REQUEST_EVENT = "scrollable:lazy-toaster-request";

export function requestLazyToasterMount() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(LAZY_TOASTER_REQUEST_EVENT));
}

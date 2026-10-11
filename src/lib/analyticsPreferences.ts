const testKey = "cbs-analytics-test-v1";

/** A browser preference, never a customer identity or access credential. */
export function analyticsTestMode() {
  if (typeof window === "undefined") return false;
  try {
    const requested = new URLSearchParams(window.location.search).get("analytics_test");
    if (requested === "1") localStorage.setItem(testKey, "1");
    return requested === "1" || localStorage.getItem(testKey) === "1";
  } catch { return false; }
}

export function setAnalyticsTestMode(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(testKey, "1");
    else localStorage.removeItem(testKey);
  } catch { /* Storage may be unavailable. */ }
}

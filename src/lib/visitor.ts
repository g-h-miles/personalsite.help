const STORAGE_KEY = "personalsite.help:visitor";

/**
 * A random id for this browser, kept in localStorage, so outbound clicks can be
 * counted once per visitor (see sites.recordClick). Undefined when storage is
 * unavailable; the server then only counts signed-in clicks.
 */
export function visitorId(): string | undefined {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

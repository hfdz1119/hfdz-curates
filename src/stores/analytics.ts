export type AnalyticsEvent = "resource_open" | "resource_link_click" | "search_submit" | "category_select" | "tag_select";

// Kept as an adapter so a future analytics provider does not touch UI components.
export function track(event: AnalyticsEvent, payload: Record<string, string> = {}) {
  if (import.meta.env.DEV) console.debug("[analytics]", event, payload);
}

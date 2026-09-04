import { describe, expect, it } from "vitest";
import { defaultPortalHomePreferences, normalizePortalHomePreferences, portalHomePreferencesStore } from "./portalHomePreferences";

describe("portalHomePreferences", () => {
  it("normalizes invalid values to bounded preferences", () => {
    const value = normalizePortalHomePreferences({ iconSize: 999, iconRadius: -4, accent: "unknown", theme: "nope", background: { type: "video", url: " https://cdn.example/video.mp4 " } });
    expect(value.iconSize).toBe(72);
    expect(value.iconRadius).toBe(0);
    expect(value.accent).toBe("aurora");
    expect(value.theme).toBe("system");
    expect(value.background?.url).toBe("https://cdn.example/video.mp4");
  });

  it("imports and exports a normalized JSON preference set", () => {
    const next = portalHomePreferencesStore.importJson(JSON.stringify({ ...defaultPortalHomePreferences, density: "compact", showNames: false }));
    expect(next.density).toBe("compact");
    expect(next.showNames).toBe(false);
    expect(JSON.parse(portalHomePreferencesStore.exportJson()).density).toBe("compact");
  });
});

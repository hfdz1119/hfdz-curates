import { describe, expect, it } from "vitest";
import { portalAppearance } from "./portalAppearance";
import { portalSites } from "./portalSites";

describe("HFDZ Home portal sites", () => {
  it("contains exactly five unique HFDZ destinations", () => {
    expect(portalSites).toHaveLength(5);
    expect(new Set(portalSites.map((site) => site.id)).size).toBe(5);
  });

  it("uses secure first-party destinations", () => {
    for (const site of portalSites) {
      const url = new URL(site.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe(site.hostname);
      expect(url.hostname === "hfdz1119.top" || url.hostname.endsWith(".hfdz1119.top")).toBe(true);
    }
  });

  it("has one primary destination", () => {
    expect(portalSites.filter((site) => site.emphasis === "primary")).toHaveLength(1);
  });

  it("uses the first-party knowledge workspace domain", () => {
    const notes = portalSites.find((site) => site.id === "notes");
    expect(notes?.url).toBe("https://kb.hfdz1119.top");
    expect(notes?.hostname).toBe("kb.hfdz1119.top");
  });

  it("uses typed icon sources with safe custom assets", () => {
    for (const site of portalSites) {
      expect(["auto", "custom", "lucide"]).toContain(site.icon.mode);
      if (site.icon.mode === "custom") expect(site.icon.src.startsWith("/") || site.icon.src.startsWith(`https://${site.hostname}/`)).toBe(true);
    }
  });

  it("uses a user-managed local WebP background", () => {
    expect(portalAppearance.backgroundImage).toBe("/backgrounds/home-background.webp");
  });
});

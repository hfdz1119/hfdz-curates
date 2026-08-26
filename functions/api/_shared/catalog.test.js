import { describe, expect, it } from "vitest";
import { hasDuplicateSite, siteUrlKey } from "./catalog.js";

describe("portal catalog URLs", () => {
  it("normalizes equivalent site URLs", () => {
    expect(siteUrlKey("https://EXAMPLE.com:443/path/#section")).toBe("https://example.com/path");
    expect(siteUrlKey("https://example.com/path")).toBe("https://example.com/path");
  });

  it("detects duplicates while allowing the edited item", () => {
    const sites = [{ id: "one", url: "https://example.com/" }];
    expect(hasDuplicateSite(sites, "https://EXAMPLE.com")).toBe(true);
    expect(hasDuplicateSite(sites, "https://example.com/", "one")).toBe(false);
  });
});

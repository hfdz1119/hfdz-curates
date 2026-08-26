import { describe, expect, it } from "vitest";
import { fetchMetadata, isPrivateAddress, validatePublicUrl } from "./metadata.js";

class TestHTMLRewriter {
  constructor() { this.handlers = new Map(); }
  on(selector, handler) { this.handlers.set(selector, handler); return this; }
  transform(response) {
    return new Response(new ReadableStream({ start: async (controller) => {
      const html = await response.text();
      const title = html.match(/<title>(.*?)<\/title>/i)?.[1];
      if (title) this.handlers.get("title")?.text({ text: title });
      for (const tag of html.match(/<meta\s+[^>]*>/gi) ?? []) this.handlers.get("meta")?.element({ getAttribute: (name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? null });
      for (const tag of html.match(/<link\s+[^>]*>/gi) ?? []) this.handlers.get("link")?.element({ getAttribute: (name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? null });
      controller.close();
    } }));
  }
}

const publicResolver = async () => ["8.8.8.8"];

describe("metadata URL safety", () => {
  it.each(["127.0.0.1", "10.1.2.3", "169.254.1.1", "192.168.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1"])("recognizes %s as private", (address) => expect(isPrivateAddress(address)).toBe(true));
  it.each(["http://localhost/", "https://admin.internal/", "https://127.0.0.1/"])("rejects %s", (url) => expect(() => validatePublicUrl(url)).toThrow());
  it("rejects credentials and unsupported protocols", () => {
    expect(() => validatePublicUrl("https://user:pass@example.com/")).toThrow();
    expect(() => validatePublicUrl("file:///etc/passwd")).toThrow();
  });
});

describe("metadata fetching", () => {
  it("extracts standard metadata and resolves a relative HTTPS icon", async () => {
    const fetchImpl = async () => new Response('<html><head><title>Example</title><meta name="description" content="Useful site"><link rel="icon" href="/icon.png"></head></html>', { headers: { "content-type": "text/html" } });
    await expect(fetchMetadata("https://example.com/path", { fetchImpl, resolveHost: publicResolver, HTMLRewriterImpl: TestHTMLRewriter })).resolves.toEqual({ title: "Example", description: "Useful site", iconUrl: "https://example.com/icon.png" });
  });

  it("rejects redirects to a private target before following them", async () => {
    const fetchImpl = async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } });
    await expect(fetchMetadata("https://example.com", { fetchImpl, resolveHost: publicResolver, HTMLRewriterImpl: TestHTMLRewriter })).rejects.toThrow("私有网络");
  });

  it("rejects oversized HTML responses", async () => {
    const fetchImpl = async () => new Response("x", { headers: { "content-type": "text/html", "content-length": "600000" } });
    await expect(fetchMetadata("https://example.com", { fetchImpl, resolveHost: publicResolver, HTMLRewriterImpl: TestHTMLRewriter })).rejects.toThrow("页面过大");
  });
});

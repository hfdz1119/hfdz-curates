const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan"];

function ipv4Parts(value) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.map(Number);
}

export function isPrivateAddress(value) {
  const host = value.replace(/^\[|\]$/g, "").toLowerCase();
  const parts = ipv4Parts(host);
  if (parts) {
    const [a, b] = parts;
    const c = parts[2];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0 && c === 0) || (a === 192 && b === 0 && c === 2) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || a >= 224;
  }
  if (!host.includes(":")) return false;
  if (host.startsWith("::ffff:")) {
    const mapped = host.slice(7);
    if (ipv4Parts(mapped)) return isPrivateAddress(mapped);
    const words = mapped.split(":");
    if (words.length === 2 && words.every((word) => /^[0-9a-f]{1,4}$/.test(word))) {
      const high = Number.parseInt(words[0], 16); const low = Number.parseInt(words[1], 16);
      return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
  }
  return host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || /^fe[89ab]/.test(host) || host.startsWith("ff") || host.startsWith("2001:db8:");
}

export function validatePublicUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("请输入有效的网站地址。"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("只支持不含凭据的 HTTP 或 HTTPS 地址。");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) || isPrivateAddress(hostname)) throw new Error("不能识别本地或私有网络地址。");
  return url;
}

async function defaultResolveHost(hostname, fetchImpl) {
  if (ipv4Parts(hostname) || hostname.includes(":")) return [hostname];
  const query = async (type) => {
    const response = await fetchImpl(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error("无法验证网站网络地址。");
    const body = await response.json();
    return Array.isArray(body.Answer) ? body.Answer.filter((answer) => answer.type === 1 || answer.type === 28).map((answer) => answer.data) : [];
  };
  const addresses = (await Promise.all([query("A"), query("AAAA")])).flat();
  if (!addresses.length) throw new Error("网站域名没有可用的公网地址。");
  return addresses;
}

async function assertPublicTarget(url, fetchImpl, resolveHost) {
  const addresses = await resolveHost(url.hostname, fetchImpl);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error("不能识别解析到私有网络的网站。");
}

async function readLimitedHtml(response) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_HTML_BYTES) throw new Error("网站页面过大，无法自动识别。");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("网站页面过大，无法自动识别。"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder().decode(bytes);
}

async function parseHtmlMetadata(html, pageUrl, HTMLRewriterImpl) {
  const values = { title: "", ogTitle: "", description: "", ogDescription: "", iconHref: "" };
  const transformed = new HTMLRewriterImpl()
    .on("title", { text(text) { values.title += text.text; } })
    .on("meta", { element(element) {
      const name = (element.getAttribute("name") || "").toLowerCase();
      const property = (element.getAttribute("property") || "").toLowerCase();
      const content = (element.getAttribute("content") || "").trim();
      if (name === "description" && !values.description) values.description = content;
      if (property === "og:description" && !values.ogDescription) values.ogDescription = content;
      if (property === "og:title" && !values.ogTitle) values.ogTitle = content;
    } })
    .on("link", { element(element) {
      const rel = (element.getAttribute("rel") || "").toLowerCase().split(/\s+/);
      if (!values.iconHref && rel.some((value) => value === "icon" || value === "shortcut")) values.iconHref = element.getAttribute("href") || "";
    } })
    .transform(new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }));
  await transformed.arrayBuffer();
  let iconUrl = "";
  try {
    const candidate = new URL(values.iconHref || "/favicon.ico", pageUrl);
    if (candidate.protocol === "https:" && !candidate.username && !candidate.password) { validatePublicUrl(candidate.href); iconUrl = candidate.href; }
  } catch { /* Keep the icon field empty when the page advertises an unsafe URL. */ }
  return { title: (values.title.trim() || values.ogTitle).slice(0, 80), description: (values.description || values.ogDescription).trim().slice(0, 180), iconUrl };
}

export async function fetchMetadata(value, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const resolveHost = dependencies.resolveHost ?? defaultResolveHost;
  const HTMLRewriterImpl = dependencies.HTMLRewriterImpl ?? HTMLRewriter;
  let target = validatePublicUrl(value);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicTarget(target, fetchImpl, resolveHost);
    const response = await fetchImpl(target.href, { redirect: "manual", headers: { accept: "text/html,application/xhtml+xml", "user-agent": "HFDZ-Metadata/1.0" }, signal: AbortSignal.timeout(6000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("网站重定向次数过多。");
      target = validatePublicUrl(new URL(location, target).href);
      continue;
    }
    if (!response.ok) throw new Error(`网站返回了 ${response.status}。`);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("网站没有返回可识别的 HTML 页面。");
    return parseHtmlMetadata(await readLimitedHtml(response), target, HTMLRewriterImpl);
  }
  throw new Error("无法识别网站信息。");
}

export { MAX_HTML_BYTES, MAX_REDIRECTS };

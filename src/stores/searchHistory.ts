const KEY = "hfdz-navigation:search-history:v1";
const LIMIT = 5;

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export const searchHistoryStore = {
  get: read,
  add(value: string) {
    const query = value.trim();
    if (!query) return read();
    const next = [query, ...read().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },
  clear() { localStorage.removeItem(KEY); }
};

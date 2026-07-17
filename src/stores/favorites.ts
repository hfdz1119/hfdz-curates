import { z } from "zod";

const KEY = "hfdz-navigation:favorites:v1";
const exportSchema = z.object({ version: z.literal(1), resourceIds: z.array(z.string()).max(1000) });

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(ids: string[]) { localStorage.setItem(KEY, JSON.stringify([...new Set(ids)])); }

export const favoritesStore = {
  get: read,
  toggle(id: string) {
    const ids = read();
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    write(next);
    return next;
  },
  clear() { write([]); },
  export() { return JSON.stringify({ version: 1, resourceIds: read() }, null, 2); },
  import(value: string, validIds: Set<string>) {
    const parsed = exportSchema.parse(JSON.parse(value));
    const next = [...new Set([...read(), ...parsed.resourceIds.filter((id) => validIds.has(id))])];
    write(next);
    return next;
  }
};

import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchHistoryStore } from "./searchHistory";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });

describe("searchHistoryStore", () => {
  beforeEach(() => storage.clear());
  it("deduplicates and caps history at five entries", () => {
    for (let index = 0; index < 9; index += 1) searchHistoryStore.add(`query-${index}`);
    searchHistoryStore.add("QUERY-8");
    expect(searchHistoryStore.get()).toEqual(["QUERY-8", "query-7", "query-6", "query-5", "query-4"]);
  });
});

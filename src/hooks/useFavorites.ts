import { useCallback, useState } from "react";
import { favoritesStore } from "../stores/favorites";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => favoritesStore.get());
  const toggle = useCallback((id: string) => setIds(favoritesStore.toggle(id)), []);
  const clear = useCallback(() => { favoritesStore.clear(); setIds([]); }, []);
  return { ids, toggle, clear, setIds };
}

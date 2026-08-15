import { DEFAULT_PORTAL_PALETTE, isPortalPaletteId, type PortalPaletteId } from "../data/portalPalettes";

export const PORTAL_PALETTE_STORAGE_KEY = "hfdz-navigation:palette";

function getStorage() {
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export const portalPaletteStore = {
  get(): PortalPaletteId {
    try {
      const storedPalette = getStorage()?.getItem(PORTAL_PALETTE_STORAGE_KEY) ?? null;
      return isPortalPaletteId(storedPalette) ? storedPalette : DEFAULT_PORTAL_PALETTE;
    } catch {
      return DEFAULT_PORTAL_PALETTE;
    }
  },
  set(palette: PortalPaletteId) {
    try {
      getStorage()?.setItem(PORTAL_PALETTE_STORAGE_KEY, palette);
    } catch {
      // The selected palette still applies for this session when storage is unavailable.
    }
    return palette;
  },
};

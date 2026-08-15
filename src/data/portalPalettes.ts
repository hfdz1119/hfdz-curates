export type PortalPaletteId = "aurora" | "sakura" | "lavender" | "sunset";

export type PortalPalette = {
  id: PortalPaletteId;
  label: string;
  colors: readonly [string, string, string];
};

export const portalPalettes: readonly PortalPalette[] = [
  { id: "aurora", label: "Aurora", colors: ["#4F9DFF", "#8B5CFF", "#4DE1C1"] },
  { id: "sakura", label: "Sakura", colors: ["#FF86B7", "#C86CFF", "#FFB08B"] },
  { id: "lavender", label: "Lavender", colors: ["#8798FF", "#B06CFF", "#73E4D4"] },
  { id: "sunset", label: "Sunset", colors: ["#FF8A65", "#E85D9E", "#FFD166"] },
] as const;

export const DEFAULT_PORTAL_PALETTE: PortalPaletteId = "aurora";

export function isPortalPaletteId(value: string | null): value is PortalPaletteId {
  return portalPalettes.some((palette) => palette.id === value);
}

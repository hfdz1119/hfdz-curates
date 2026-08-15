import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Palette } from "lucide-react";
import { portalPalettes, type PortalPaletteId } from "../data/portalPalettes";

type PortalPalettePickerProps = {
  value: PortalPaletteId;
  onChange: (palette: PortalPaletteId) => void;
};

export function PortalPalettePicker({ value, onChange }: PortalPalettePickerProps) {
  const menuId = useId();
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedPalette = portalPalettes.find((palette) => palette.id === value) ?? portalPalettes[0];

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;

    const selectedIndex = portalPalettes.findIndex((palette) => palette.id === value);
    const frameId = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("pointerdown", handleOutsidePointer);
    };
  }, [open, value]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    let nextIndex = currentIndex;

    if (["ArrowDown", "ArrowRight"].includes(event.key)) nextIndex = (currentIndex + 1) % portalPalettes.length;
    else if (["ArrowUp", "ArrowLeft"].includes(event.key)) nextIndex = (currentIndex - 1 + portalPalettes.length) % portalPalettes.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = portalPalettes.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    } else return;

    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
  };

  return <div className="portal-palette-picker" ref={pickerRef}>
    <button
      className="portal-palette-trigger"
      type="button"
      ref={triggerRef}
      aria-label={`切换首页配色，当前为 ${selectedPalette.label}`}
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen((current) => !current)}
    >
      <Palette size={16} aria-hidden="true" />
      <span>色彩</span>
      <span className="portal-palette-dots" aria-hidden="true">
        {selectedPalette.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
      </span>
    </button>

    {open && <div className="portal-palette-menu" id={menuId} role="radiogroup" aria-label="首页配色" onKeyDown={handleMenuKeyDown}>
      {portalPalettes.map((palette, index) => <button
        className="portal-palette-option"
        type="button"
        role="radio"
        aria-checked={palette.id === value}
        tabIndex={palette.id === value ? 0 : -1}
        key={palette.id}
        ref={(element) => { optionRefs.current[index] = element; }}
        onClick={() => {
          onChange(palette.id);
          closeMenu(true);
        }}
      >
        <span className="portal-palette-option-dots" aria-hidden="true">
          {palette.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
        </span>
        <span>{palette.label}</span>
        {palette.id === value && <Check size={16} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}

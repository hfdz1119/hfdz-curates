# HFDZ Home token notes

## Primitive layer

- Canvas: `#0F1117`
- Palette: Aurora `#4F9DFF / #8B5CFF / #4DE1C1`；Sakura `#FF86B7 / #C86CFF / #FFB08B`；Lavender `#8798FF / #B06CFF / #73E4D4`；Sunset `#FF8A65 / #E85D9E / #FFD166`。
- Accent: 当前 palette 的第一色用于焦点和主强调，第二、三色只作为低频环境光与渐变收尾。
- Type: Inter / Noto Sans SC。
- Spacing: existing 4–72px scale in `src/styles.css`。
- Motion: 140–200ms for hover and color feedback; reduced-motion remains mandatory。

## Semantic layer

- `--surface-page`, `--surface-base`, `--surface-elevated` define the theme surface stack。
- `--text-primary`, `--text-secondary`, `--text-muted` define readable hierarchy over either theme。
- `--border-subtle`, `--border-strong`, `--border-focus` define separation and keyboard focus。

## Portal component layer

- `--portal-panel-surface` is the single blurred glass plane。
- `--portal-card-surface` and hover tokens are translucent fills without nested blur。
- `--portal-overlay` keeps uploaded backgrounds subordinate to navigation content。
- `--portal-panel-radius` is larger than card radius to preserve hierarchy。
- `--portal-dialog-surface` and `--portal-input-surface` keep the URL setting readable over any background image。
- `--portal-accent`, `--portal-secondary`, `--portal-action` and their RGB companions map the selected HFDZ palette without recoloring neutral glass surfaces。

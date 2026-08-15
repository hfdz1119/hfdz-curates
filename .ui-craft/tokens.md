# HFDZ Home token notes

## Primitive layer

- Canvas: `#0F1117`
- Accent: HFDZ blue `#4F9DFF`; purple只作为低频环境光。
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

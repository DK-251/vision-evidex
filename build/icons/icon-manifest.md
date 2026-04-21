# Vision-EviDex icon manifest

All icons use the Fluent Design System 2 visual language established in the
brand prompt: **135° linear gradient `#0078D4 → #00B4D8`** (primary) or
`#0078D4 → #6B2FBA` (secondary / premium), rounded line caps and joins,
`<title>` + `<desc>` for a11y, `@media (prefers-color-scheme: dark)` or
parent `data-theme='dark'` where the icon appears on a themed surface.

## App shell (icons/ root)

| File | Dim | Use |
|---|---|---|
| `app-icon-1024.svg`         | 1024×1024 | Master brand mark. Source of truth for all derivatives. |
| `app-icon-512.svg`          | 512×512   | `electron-builder` → `build/icon-512.png` source (via `sharp` or rsvg). |
| `app-icon-256.svg`          | 256×256   | Windows Explorer / About dialog. Adds verification checkmark in shield. |
| `app-icon-128.svg`          | 128×128   | General mid-size. |
| `app-icon-64.svg`           | 64×64     | Simplified — aperture only, no shield. |
| `app-icon-48.svg`           | 48×48     | Windows shell shortcuts. |
| `app-icon-taskbar-32.svg`   | 32×32     | Taskbar — abstracted 6-point star + shield dot. |
| `app-icon-32.svg`           | 32×32     | Alias of taskbar (bundled into `.ico`). |
| `app-icon-16.svg`           | 16×16     | Minimal — gradient rounded square with 6-ray star. |
| `favicon-32.svg`            | 32×32     | Browser/docs favicon — VE monogram, white background. |
| `tray-icon-light.svg`       | 16×16     | System tray on light taskbar — dark navy strokes. |
| `tray-icon-dark.svg`        | 16×16     | System tray on dark taskbar — white strokes. |

## Onboarding

| File | Dim | Use |
|---|---|---|
| `onboarding-hero-animated.svg` | 200×200 viewBox, rendered at 120×120 | Hero mark on welcome/branding card. 5 named @keyframes + reduced-motion fallback. |
| `step-01-activate.svg`       | 32×32 | Licence activation step header. |
| `step-02-welcome.svg`        | 32×32 | Welcome tour step header. |
| `step-03-profile.svg`        | 32×32 | User profile step header. |
| `step-04-branding.svg`       | 32×32 | Organisation & branding step header. |
| `step-05-template.svg`       | 32×32 | Default template step header. |
| `step-06-hotkeys.svg`        | 32×32 | Hotkey config step header. |
| `step-07-appearance.svg`     | 32×32 | Theme/storage step header. |
| `step-08-complete.svg`       | 32×32 | Summary step header. |
| `step-icons-preview.svg`     | 320×40 | Visual review row — renders all 8 side-by-side. |

## In-app (content surfaces)

| File | Dim | Use |
|---|---|---|
| `report-default-branding.svg` | 240×60 | Report header placeholder when no company logo is set. Used by `ExportService` → Word / PDF / HTML templates. |
| `status-pass.svg`     | 16×16 | Capture thumbnail tag — pass. |
| `status-fail.svg`     | 16×16 | Capture thumbnail tag — fail. |
| `status-blocked.svg`  | 16×16 | Capture thumbnail tag — blocked. |
| `status-skip.svg`     | 16×16 | Capture thumbnail tag — skip. |
| `status-untagged.svg` | 16×16 | Capture thumbnail tag — untagged (muted). |
| `nav-capture-regular.svg`  | 20×20 | Sidebar nav — Capture (inactive). `currentColor`. |
| `nav-capture-filled.svg`   | 20×20 | Sidebar nav — Capture (active). Gradient fill. |
| `nav-evidence-regular.svg` | 20×20 | Sidebar nav — Evidence (inactive). |
| `nav-evidence-filled.svg`  | 20×20 | Sidebar nav — Evidence (active). |
| `nav-audit-regular.svg`    | 20×20 | Sidebar nav — Audit (inactive). |
| `nav-audit-filled.svg`     | 20×20 | Sidebar nav — Audit (active). |

## Final project layout (target)

```
vision-evidex/
└── build/
    ├── icon.ico              (bundled Windows .ico — generated from SVGs)
    ├── icon-512.png          (electron-builder source)
    ├── tray-icon-light.ico
    ├── tray-icon-dark.ico
    └── icons/
        ├── app-icon-1024.svg
        ├── app-icon-512.svg
        ├── app-icon-256.svg
        ├── app-icon-128.svg
        ├── app-icon-64.svg
        ├── app-icon-48.svg
        ├── app-icon-taskbar-32.svg
        ├── app-icon-32.svg
        ├── app-icon-16.svg
        ├── favicon-32.svg
        ├── tray-icon-light.svg
        ├── tray-icon-dark.svg
        ├── onboarding-hero-animated.svg
        ├── step-01-activate.svg … step-08-complete.svg
        ├── step-icons-preview.svg
        ├── report-default-branding.svg
        ├── status-pass.svg … status-untagged.svg
        └── nav-capture-regular.svg … nav-audit-filled.svg
```

## Building the Windows `.ico` bundle

The `.ico` must contain 16, 32, 48, 64, 256 sizes. We first rasterise each SVG
to a PNG using `sharp` (already available via electron-builder dependencies),
then pack with `png-to-ico` which preserves the Vista+ PNG-in-ICO layout.

```bash
# One-shot bundle script — runs from vision-evidex/ project root
npx sharp-cli -i build/icons/app-icon-16.svg  -o build/tmp/icon-16.png  resize 16
npx sharp-cli -i build/icons/app-icon-32.svg  -o build/tmp/icon-32.png  resize 32
npx sharp-cli -i build/icons/app-icon-48.svg  -o build/tmp/icon-48.png  resize 48
npx sharp-cli -i build/icons/app-icon-64.svg  -o build/tmp/icon-64.png  resize 64
npx sharp-cli -i build/icons/app-icon-256.svg -o build/tmp/icon-256.png resize 256
npx png-to-ico \
    build/tmp/icon-16.png \
    build/tmp/icon-32.png \
    build/tmp/icon-48.png \
    build/tmp/icon-64.png \
    build/tmp/icon-256.png \
  > build/icon.ico

# Electron-builder source PNG (for macOS/Linux fallbacks, product page, etc.)
npx sharp-cli -i build/icons/app-icon-512.svg -o build/icon-512.png resize 512

# Tray .ico variants
npx sharp-cli -i build/icons/tray-icon-light.svg -o build/tmp/tray-light-16.png resize 16
npx sharp-cli -i build/icons/tray-icon-dark.svg  -o build/tmp/tray-dark-16.png  resize 16
npx png-to-ico build/tmp/tray-light-16.png > build/tray-icon-light.ico
npx png-to-ico build/tmp/tray-dark-16.png  > build/tray-icon-dark.ico

# Clean up
rm -rf build/tmp
```

ImageMagick alternative (if `sharp-cli` / `png-to-ico` aren't installed):

```bash
magick convert \
  build/icons/app-icon-16.svg \
  build/icons/app-icon-32.svg \
  build/icons/app-icon-48.svg \
  build/icons/app-icon-64.svg \
  build/icons/app-icon-256.svg \
  -compress zip \
  build/icon.ico
```

## electron-builder icon hook

Add this to `electron-builder.config.js` (or under the `build` key in
`package.json`):

```js
module.exports = {
  appId: 'com.vision-evidex.app',
  productName: 'Vision-EviDex',
  directories: { buildResources: 'build' },
  win: {
    icon: 'build/icon.ico',
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
  },
  // mac/linux kept for cross-platform packaging even though v1 is Windows-only
  mac:   { icon: 'build/icon-512.png' },
  linux: { icon: 'build/icon-512.png' },
};
```

`TrayService` wires the tray variants at runtime — paths resolved via
`app.getAppPath()` so they work in both dev and packaged builds:

```ts
const trayIcon = nativeTheme.shouldUseDarkColors
  ? path.join(app.getAppPath(), 'build/tray-icon-dark.ico')
  : path.join(app.getAppPath(), 'build/tray-icon-light.ico');
```

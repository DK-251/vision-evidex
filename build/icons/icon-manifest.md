# Vision-EviDex icon manifest

All icons use the Fluent Design System 2 visual language. Gradient stops
`#0078D4 → #00B4D8` (primary) or `#0078D4 → #6B2FBA` (secondary), rounded
line caps and joins, `<title>` + `<desc>` for a11y, and
`@media (prefers-color-scheme: dark)` or a parent `data-theme='dark'`
where the icon appears on a themed surface.

The renderer uses two inline React-SVG twins of these files (see
`src/renderer/components/brand/BrandIcons.tsx`):

- `AppMark` ← `app-icon-32.svg` / `app-icon-taskbar-32.svg`
- `OnboardingHero` ← `onboarding-hero-animated.svg`

All other in-app icons (onboarding step headers, field icons, nav, etc.)
use `@fluentui/react-icons` at runtime; the SVGs below are for
**packaging-time assets only**.

## App shell

| File | Dim | Use |
|---|---|---|
| `app-icon-1024.svg`         | 1024×1024 | Master brand mark. Source of truth for all derivatives. |
| `app-icon-512.svg`          | 512×512   | `electron-builder` → `build/icon-512.png` source. |
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
| `onboarding-hero-animated.svg` | 200×200 viewBox, rendered at 120×120 | Hero mark on welcome/branding card. 5 named @keyframes + reduced-motion fallback. Twin in `BrandIcons.tsx` → `OnboardingHero`. |

## Reports

| File | Dim | Use |
|---|---|---|
| `report-default-branding.svg` | 240×60 | Report header placeholder when no company logo is set. Used by `ExportService` → Word / PDF / HTML templates. |

## Final project layout (target)

```
vision-evidex/
└── build/
    ├── icon.ico              (bundled Windows .ico — generated from SVGs)
    ├── icon-512.png          (electron-builder source)
    ├── tray-icon-light.ico
    ├── tray-icon-dark.ico
    └── icons/
        ├── app-icon-{1024,512,256,128,64,48,32,16}.svg
        ├── app-icon-taskbar-32.svg
        ├── favicon-32.svg
        ├── tray-icon-light.svg
        ├── tray-icon-dark.svg
        ├── onboarding-hero-animated.svg
        ├── report-default-branding.svg
        └── icon-manifest.md
```

## Building the Windows `.ico` bundle

The `.ico` must contain 16, 32, 48, 64, 256 sizes. We rasterise each
SVG to a PNG first (with `sharp`), then pack with `png-to-ico`:

```bash
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

npx sharp-cli -i build/icons/app-icon-512.svg -o build/icon-512.png resize 512

npx sharp-cli -i build/icons/tray-icon-light.svg -o build/tmp/tray-light-16.png resize 16
npx sharp-cli -i build/icons/tray-icon-dark.svg  -o build/tmp/tray-dark-16.png  resize 16
npx png-to-ico build/tmp/tray-light-16.png > build/tray-icon-light.ico
npx png-to-ico build/tmp/tray-dark-16.png  > build/tray-icon-dark.ico

rm -rf build/tmp
```

ImageMagick alternative:

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
  mac:   { icon: 'build/icon-512.png' },
  linux: { icon: 'build/icon-512.png' },
};
```

`TrayService` wires the tray variants at runtime:

```ts
const trayIcon = nativeTheme.shouldUseDarkColors
  ? path.join(app.getAppPath(), 'build/tray-icon-dark.ico')
  : path.join(app.getAppPath(), 'build/tray-icon-light.ico');
```

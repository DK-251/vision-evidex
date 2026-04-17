/**
 * electron-builder configuration — dual-mode MSI builder.
 *
 * Mode is controlled by build-time env vars:
 *   EVIDEX_LICENCE_MODE = 'keygen' | 'none'
 *   EVIDEX_SIGN_BUILD   = 'true'   | 'false'
 *
 * Build commands:
 *   npm run dist:standard    → consumer / standard enterprise (Keygen.sh activation)
 *   npm run dist:enterprise  → no outbound activation (IT-managed distribution)
 */

const mode = process.env.EVIDEX_LICENCE_MODE || 'none';
const sign = process.env.EVIDEX_SIGN_BUILD === 'true';

if (!['keygen', 'none'].includes(mode)) {
  throw new Error(
    `Invalid EVIDEX_LICENCE_MODE: "${mode}". Must be "keygen" or "none".`
  );
}

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.vision-evidex.app',
  productName: mode === 'none' ? 'Vision-EviDex Enterprise' : 'Vision-EviDex',
  copyright: `Copyright © ${new Date().getFullYear()} Vision-EviDex`,
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'out/**/*',
    'package.json',
    '!node_modules/**/*.md',
    '!node_modules/**/test/**',
    '!node_modules/**/tests/**',
    '!node_modules/**/*.ts',
    '!node_modules/**/*.map',
  ],
  asar: true,
  asarUnpack: [
    '**/node_modules/better-sqlite3/**',
    '**/node_modules/sharp/**',
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.ico',
    artifactName: '${productName}-${version}-setup.${ext}',
    ...(sign && {
      certificateFile: process.env.CERT_FILE,
      certificatePassword: process.env.CERT_PASS,
      signingHashAlgorithms: ['sha256'],
      signDlls: false,
    }),
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    shortcutName: mode === 'none' ? 'Vision-EviDex Enterprise' : 'Vision-EviDex',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
  },
  extraMetadata: {
    EVIDEX_LICENCE_MODE: mode,
  },
};

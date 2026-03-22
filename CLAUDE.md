# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

LocalConvert is a privacy-focused, open-source (MIT licensed) desktop file converter. Built with **Tauri v2** (Rust backend) + **React 19** (TypeScript frontend). Cross-platform: Windows, macOS, and Linux. All file conversions run locally via external CLI tools (FFmpeg, ImageMagick, LibreOffice, Pandoc, Ghostscript, Tesseract, 7-Zip). Supports 100+ formats across video, audio, image, document, PDF, archive, and more.

## CRITICAL: Migration Context

This project was originally built on **Tauri v1** and is being migrated to **Tauri v2**. All new code MUST use Tauri v2 APIs and patterns. When you encounter v1 patterns, migrate them to v2. Key differences:

### Tauri v2 Migration Rules

1. **No allowlist** — The v1 `tauri > allowlist` in `tauri.conf.json` is REMOVED. Use the **capabilities/permissions** system instead. Create `src-tauri/capabilities/default.json` with explicit permission grants.

2. **Plugins replace core APIs** — These are now separate crates and npm packages:
   - `tauri::api::process` → `tauri-plugin-shell` (crate) + `@tauri-apps/plugin-shell` (npm)
   - `tauri::api::fs` → `tauri-plugin-fs` (crate) + `@tauri-apps/plugin-fs` (npm)
   - `tauri::api::dialog` → `tauri-plugin-dialog` (crate) + `@tauri-apps/plugin-dialog` (npm)
   - `tauri::api::path` → `tauri-plugin-fs` or `tauri::path` (built-in)
   - `tauri::api::shell::open` → `tauri-plugin-opener` (crate) + `@tauri-apps/plugin-opener` (npm)
   - Updater → `tauri-plugin-updater` (crate) + `@tauri-apps/plugin-updater` (npm)
   - Notification → `tauri-plugin-notification` (crate) + `@tauri-apps/plugin-notification` (npm)

3. **JS import changes:**
   - `@tauri-apps/api/tauri` → `@tauri-apps/api/core`
   - `@tauri-apps/api/window` → `@tauri-apps/api/webviewWindow`
   - `invoke()` is now from `@tauri-apps/api/core`
   - `Window` type → `WebviewWindow` type
   - All plugin APIs use `@tauri-apps/plugin-<name>` packages

4. **Rust API changes:**
   - `tauri::Window` → `tauri::WebviewWindow`
   - `Manager::get_window()` → `Manager::get_webview_window()`
   - `tauri::api::process::Command` → `tauri_plugin_shell::process::Command` via `ShellExt`
   - Plugin registration in `lib.rs` via `.plugin(tauri_plugin_shell::init())` etc.
   - Commands use `tauri::command` attribute (unchanged) but handler registration syntax may differ

5. **Config structure changes (`tauri.conf.json`):**
   - `tauri > windows` → `app > windows`
   - `tauri > bundle` → `bundle`
   - `tauri > security` → `app > security`
   - `tauri > cli` → `plugins > cli`
   - `tauri > updater` → `plugins > updater` AND `bundle > updater`
   - `tauri > allowlist` → REMOVED (use capabilities)
   - Add `"identifier"` at root level

6. **Capabilities file** — Create `src-tauri/capabilities/default.json`:
   ```json
   {
     "identifier": "default",
     "description": "Default capabilities for LocalConvert",
     "windows": ["main"],
     "permissions": [
       "core:default",
       "shell:allow-execute",
       "shell:allow-open",
       "shell:allow-spawn",
       "shell:allow-stdin-write",
       "shell:allow-kill",
       "dialog:allow-open",
       "dialog:allow-save",
       "dialog:allow-message",
       "dialog:allow-ask",
       "fs:default",
       "fs:allow-read",
       "fs:allow-write",
       "fs:allow-exists",
       "fs:allow-mkdir",
       "fs:allow-remove",
       "fs:allow-rename",
       "fs:allow-copy-file",
       "fs:allow-stat",
       "fs:allow-readdir",
       "notification:default",
       "notification:allow-notify",
       "updater:default",
       "opener:default"
     ]
   }
   ```

7. **Sidecar / External Binary changes** — In v1, external binaries were defined in the allowlist. In v2, use the shell plugin permissions. The `externalBin` config stays in `bundle` but execution goes through `tauri_plugin_shell`.

## Development Commands

```bash
npm install                # Install frontend dependencies
npm run tauri dev          # Start dev mode (Vite on port 1420 + Tauri backend with hot reload)
npm run tauri build        # Production build
npm run build              # Build frontend only (tsc + vite build → dist/)
```

There are no automated tests currently. No linter is configured in package.json.

## Architecture

### IPC Flow

Frontend communicates with Rust via Tauri's `invoke()` / event system:
- **Frontend → Backend:** `invoke<T>("command_name", { params })` from `@tauri-apps/api/core` (async)
- **Backend → Frontend:** `app.emit("event_name", payload)` (used for conversion progress updates)

### Frontend (`src/`)

- **State:** Single Zustand store in `src/store/useStore.ts` — all app state and actions live here. No prop drilling.
- **Components:** `src/components/` — feature-based (FileDropZone, ConversionPanel, SettingsModal, VideoTrimmer, etc.)
- **PDF Editor:** `src/components/PdfEditor/` — uses pdf-lib for manipulation, pdfjs-dist for rendering, Fabric.js for canvas drawing
- **Formats:** `src/types/formats.ts` — format definitions and category→conversion mappings
- **Styling:** Tailwind CSS with custom dark theme colors defined in `tailwind.config.js`. Dark mode is class-based.
- **Animations:** Framer Motion throughout (AnimatePresence for enter/exit transitions)

### Backend (`src-tauri/src/`)

- **`lib.rs`** — Tauri app setup: plugin registration (shell, dialog, fs, notification, updater, opener), command handler registration, app data dir initialization
- **`commands.rs`** — All Tauri IPC command handlers (40+ commands). This is the main API surface.
- **`converter.rs`** — Conversion orchestration: builds CLI arguments, spawns external tool processes via `tauri_plugin_shell`, parses progress from stderr, emits progress events. Uses global `RUNNING_PROCESSES` HashMap for cancellation.
- **`tools.rs`** — External tool detection: finds executables on PATH and common install locations (MUST be cross-platform — Windows, macOS, Linux paths), detects GPU encoders (NVENC, VCE, QSV), caches tool paths.
- **`types.rs`** — Shared Rust types (all derive Serialize/Deserialize for IPC)
- **`pdf_text_editor.rs`** — Pure Rust PDF text editing via lopdf (no external tool needed)

### Conversion Routing

File extension → category → external tool:
- Video/Audio → FFmpeg
- Image → ImageMagick
- Document → LibreOffice or Pandoc
- PDF operations → Ghostscript (compression, merge, split) or lopdf (text editing)
- Archives → 7-Zip
- OCR → Tesseract

### Key Configuration

- **`src-tauri/tauri.conf.json`** — Tauri v2 format: `app` (windows, security), `bundle` (targets, updater), `plugins`, `build`
- **`src-tauri/capabilities/default.json`** — Permission grants for the main window
- **`vite.config.ts`** — Dev server on port 1420 (strict), manual chunks for pdfjs/fabric/pdflib
- **`tailwind.config.js`** — Custom color palette (dark-50..950, accent-50..900), gradients

## Cross-Platform Requirements

### Tool Detection (`tools.rs`)

Tool paths MUST check platform-specific locations:

**Windows:**
- FFmpeg: `C:\ffmpeg\bin\ffmpeg.exe`, `C:\Program Files\ffmpeg\bin\ffmpeg.exe`, PATH
- ImageMagick: `C:\Program Files\ImageMagick-*\magick.exe`, PATH
- Ghostscript: `C:\Program Files\gs\*\bin\gswin64c.exe`, PATH
- LibreOffice: `C:\Program Files\LibreOffice\program\soffice.exe`
- 7-Zip: `C:\Program Files\7-Zip\7z.exe`
- Tesseract: `C:\Program Files\Tesseract-OCR\tesseract.exe`

**macOS:**
- FFmpeg: `/opt/homebrew/bin/ffmpeg` (Apple Silicon), `/usr/local/bin/ffmpeg` (Intel), PATH
- ImageMagick: `/opt/homebrew/bin/magick`, `/usr/local/bin/magick`, PATH
- Ghostscript: `/opt/homebrew/bin/gs`, `/usr/local/bin/gs`, PATH
- LibreOffice: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- 7-Zip: `/opt/homebrew/bin/7z`, `/usr/local/bin/7z`, PATH
- Tesseract: `/opt/homebrew/bin/tesseract`, `/usr/local/bin/tesseract`, PATH
- Pandoc: `/opt/homebrew/bin/pandoc`, `/usr/local/bin/pandoc`, PATH

**Linux:**
- All tools typically at `/usr/bin/<tool>` or `/usr/local/bin/<tool>`, PATH
- FFmpeg: `/usr/bin/ffmpeg`
- ImageMagick: `/usr/bin/magick` or `/usr/bin/convert`
- Ghostscript: `/usr/bin/gs`
- LibreOffice: `/usr/bin/soffice` or `/usr/bin/libreoffice`
- 7-Zip: `/usr/bin/7z` or `/usr/bin/p7zip`
- Tesseract: `/usr/bin/tesseract`
- Pandoc: `/usr/bin/pandoc`

Use `#[cfg(target_os = "windows")]`, `#[cfg(target_os = "macos")]`, `#[cfg(target_os = "linux")]` for platform-specific code paths.

### Platform-Specific Features

- **Windows context menu integration** — Gate behind `#[cfg(target_os = "windows")]`. Do NOT compile on macOS/Linux.
- **Windows registry access (`winreg` crate)** — Gate behind `#[cfg(target_os = "windows")]`.
- **Ghostscript binary name** — `gswin64c.exe` on Windows, `gs` on macOS/Linux.
- **LibreOffice binary name** — `soffice.exe` on Windows, `soffice` on macOS/Linux.
- **GPU detection** — NVENC works on all platforms, QSV on Windows/Linux, VCE/VCN on Windows/Linux. Gate macOS GPU detection appropriately (VideoToolbox for Apple Silicon).

### Cargo.toml Platform Dependencies

```toml
[target.'cfg(target_os = "windows")'.dependencies]
winreg = "0.52"

[target.'cfg(target_os = "macos")'.dependencies]
# Add macOS-specific deps here if needed

[target.'cfg(target_os = "linux")'.dependencies]
# Add Linux-specific deps here if needed
```

## Auto-Updater Setup

### Rust Side (`lib.rs`)

Register the updater plugin:
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    // ... other plugins
```

### Config (`tauri.conf.json`)

```json
{
  "bundle": {
    "updater": {
      "endpoints": [
        "https://github.com/freddiehdxd/localconvert-app/releases/latest/download/latest.json"
      ],
      "pubkey": "UPDATER_PUBKEY_HERE",
      "windows": {
        "installMode": "passive"
      }
    }
  },
  "plugins": {
    "updater": {
      "pubkey": "UPDATER_PUBKEY_HERE",
      "endpoints": [
        "https://github.com/freddiehdxd/localconvert-app/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### Frontend — Check for updates on startup

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdate() {
  const update = await check();
  if (update) {
    await update.downloadAndInstall();
    await relaunch();
  }
}
```

## GitHub Actions CI/CD

The repo uses GitHub Actions for cross-platform releases. The workflow at `.github/workflows/release.yml` triggers on version tags (`v*`) and builds for Windows (NSIS + MSI), macOS (DMG for Intel + Apple Silicon), and Linux (AppImage + .deb).

### Workflow Requirements

- Use `tauri-apps/tauri-action@v0` for building
- Matrix strategy: `windows-latest`, `macos-latest` (Apple Silicon), `macos-13` (Intel), `ubuntu-22.04`
- Generate updater artifacts (`latest.json`) with signatures
- Upload all build artifacts to GitHub Releases
- Use `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets for updater signing

### Release Workflow Structure

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create-release.outputs.id }}
    steps:
      - uses: actions/create-release@v1

  build-tauri:
    needs: create-release
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
            args: ''
          - platform: macos-latest
            args: '--target aarch64-apple-darwin'
          - platform: macos-13
            args: '--target x86_64-apple-darwin'
          - platform: windows-latest
            args: ''
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: ${{ matrix.args }}

  publish-release:
    needs: [create-release, build-tauri]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        # Set release from draft to published
```

## Conventions

- TypeScript strict mode is enabled (`noUnusedLocals`, `noUnusedParameters`)
- Path alias: `@/*` maps to `src/*`
- Rust error handling: `Result<T, String>` pattern for all commands
- Rust edition 2021
- Toast notifications (react-hot-toast) for user-facing feedback
- All Tauri commands are async
- Platform-specific code uses `#[cfg(target_os = "...")]` — NEVER use runtime OS checks when compile-time checks work
- When adding new Tauri commands, ALWAYS also add the corresponding permission in `src-tauri/capabilities/default.json`
- When adding new plugins, register them in BOTH `lib.rs` (Rust side) AND install the npm package (JS side)

## License

MIT — Open source. A separate closed-source Pro version may be offered in the future with additional features.

## Migration Checklist (for Claude Code reference)

When performing the v1→v2 migration, follow this order:

1. ☐ Run `npx tauri migrate` from project root to auto-migrate what it can
2. ☐ Update `Cargo.toml` — change `tauri` to v2, add plugin crates (`tauri-plugin-shell`, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-notification`, `tauri-plugin-updater`, `tauri-plugin-opener`, `tauri-plugin-process`)
3. ☐ Update `package.json` — add `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-process`
4. ☐ Rewrite `tauri.conf.json` to v2 structure (see Config structure changes above)
5. ☐ Create `src-tauri/capabilities/default.json` with all required permissions
6. ☐ Migrate `lib.rs` — register all plugins, update command registration
7. ☐ Migrate `commands.rs` — replace all `tauri::api::*` calls with plugin equivalents
8. ☐ Migrate `converter.rs` — replace `tauri::api::process::Command` with `tauri_plugin_shell` APIs
9. ☐ Migrate `tools.rs` — add macOS and Linux tool detection paths, gate Windows-only code
10. ☐ Migrate all frontend `import` statements to new package paths
11. ☐ Replace `Window` with `WebviewWindow` everywhere
12. ☐ Add auto-updater integration (Rust plugin + frontend check)
13. ☐ Create `.github/workflows/release.yml` for cross-platform CI/CD
14. ☐ Update LICENSE to MIT
15. ☐ Test on Windows, then macOS, then Linux

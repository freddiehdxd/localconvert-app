# LocalConvert - Technical Context

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| Vite | 5.x | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 11.x | Animations |
| Zustand | 4.x | State management |
| Lucide React | 0.400+ | Icons |
| React Hot Toast | 2.x | Notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | 2.x | Desktop framework |
| Rust | 1.70+ | Backend language |
| Serde | 1.x | Serialization |
| Tokio | 1.x | Async runtime |

### External Tools

| Tool | Purpose | Install Method |
|------|---------|----------------|
| FFmpeg | Video/Audio | winget, chocolatey, manual |
| ImageMagick | Images | winget, chocolatey, manual |
| LibreOffice | Documents | installer |
| Pandoc | Documents | winget, chocolatey, installer |
| Ghostscript | PDF | installer |
| Tesseract | OCR | installer |
| 7-Zip | Archives | winget, chocolatey, installer |

## Development Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 18+ (use nvm or direct install)
# Windows: https://nodejs.org/

# Install Tauri CLI
cargo install tauri-cli
```

### Project Setup
```bash
# Install dependencies
npm install

# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

## Technical Constraints

### Windows-Specific
- Path separators are backslashes
- External tools have .exe extension
- Ghostscript binary is `gswin64c.exe`
- LibreOffice binary is `soffice.exe`

### Tauri v2 Specifics
- Commands are async by default
- Plugin system for shell/dialog/fs
- Scoped file system access
- IPC via `invoke()`

### Performance Targets
- App startup: < 3 seconds
- File list render: < 100ms for 100 files
- Conversion start: < 500ms (excluding actual conversion)

## Dependencies

### npm Dependencies
```json
{
  "@tauri-apps/api": "^2.0.0",
  "@tauri-apps/plugin-dialog": "^2.0.0",
  "@tauri-apps/plugin-fs": "^2.0.0",
  "@tauri-apps/plugin-shell": "^2.0.0",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.400.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-hot-toast": "^2.4.1",
  "zustand": "^4.5.0"
}
```

### Cargo Dependencies
```toml
tauri = "2"
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

## File Structure

```
localconvert-windows/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── FileDropZone.tsx
│   │   ├── FileList.tsx
│   │   ├── FileCard.tsx
│   │   ├── ConversionPanel.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── HistoryModal.tsx
│   │   ├── ToolsSetupModal.tsx
│   │   └── WelcomeScreen.tsx
│   ├── store/
│   │   └── useStore.ts       # Zustand store
│   ├── types/
│   │   └── formats.ts        # Format definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs            # Entry point
│   │   ├── main.rs           # Main
│   │   ├── commands.rs       # Tauri commands
│   │   ├── converter.rs      # Conversion logic
│   │   ├── tools.rs          # Tool management
│   │   └── types.rs          # Type definitions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/
│   └── icon.svg
├── memory-bank/              # Project documentation
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Build Process

### Development
1. Vite serves frontend on port 1420
2. Tauri spawns WebView pointing to Vite
3. Hot reload enabled for both frontend and backend

### Production
1. Vite builds frontend to `dist/`
2. Tauri bundles frontend with Rust binary
3. Output: `.msi` installer and `.exe` bundle

## Testing Strategy

### Manual Testing
- Tool detection on fresh install
- Conversion of each format category
- Batch conversion (10+ files)
- Error handling for missing tools
- Error handling for corrupt files

### Future: Automated Testing
- Unit tests for conversion logic (Rust)
- Component tests (React Testing Library)
- E2E tests (Playwright with Tauri)

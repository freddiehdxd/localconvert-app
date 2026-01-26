# LocalConvert - Active Context

## Current State

### What's Built
- Complete project structure with Tauri v2 + React + Vite
- Full UI implementation with dark theme
- File drop zone with drag-and-drop support
- File list with category filtering
- Conversion panel with quality controls
- Settings modal for preferences
- History modal for session conversions
- Tools setup modal for first-run experience
- Rust backend with conversion commands
- Tool detection and management
- Support for all major format categories

### What's Working
- Project compiles and runs
- UI is fully functional and responsive
- File detection and categorization
- Format suggestions based on input
- Tool status checking
- Settings persistence

### What Needs Testing
- Actual conversions with installed tools
- Tool download links
- Edge cases (large files, special characters)
- Error handling paths

## Current Focus

### Immediate Priorities
1. Test with installed conversion tools
2. Verify all conversion paths work
3. Handle missing tool scenarios gracefully
4. Polish error messages

### Technical Decisions Made
- Using external tools rather than bundling (smaller app size, easier updates)
- Zustand for state (simpler than Redux, sufficient for this app)
- Framer Motion for animations (best-in-class React animation library)
- Tailwind for styling (rapid development, consistent design)

## Next Steps

### Short Term
1. Generate proper app icons (`cargo tauri icon`)
2. Add keyboard shortcuts (Ctrl+V to paste files)
3. Implement folder drop (recursive file discovery)
4. Add "Open in Explorer" for completed conversions

### Medium Term
1. PDF tools (merge, split, compress, rotate)
2. Image tools (resize, crop, compress)
3. Video tools (trim, extract audio)
4. OCR for scanned PDFs

### Long Term
1. Conversion presets
2. Watch folder mode
3. Custom output naming patterns
4. Plugin system for new formats

## Active Decisions

### Open Questions
- Should we bundle any tools for out-of-box experience?
- How to handle very large files (> 4GB)?
- Should progress be shown per-file or overall?

### Resolved Decisions
- ✅ Dark mode default (matches modern design trends)
- ✅ External tools not bundled (user installs separately)
- ✅ Session-only history (privacy-first approach)
- ✅ User selects output directory (explicit control)

## Known Issues

### Fixed Bugs
- **Conversion cancellation not working** (Jan 2026): Fixed - cancellation now properly kills the running FFmpeg/ImageMagick process instead of just updating UI state

### Technical Debt
- Tool version parsing could be more robust
- Error messages could be more user-friendly
- Some TypeScript types could be stricter

## Recent Changes

### Latest Updates (Jan 2026)
- Initial project creation
- Complete UI implementation
- Rust backend with all conversion commands
- Memory bank documentation
- **Fixed conversion cancellation bug**: Implemented proper process management with:
  - Process tracking via job IDs
  - Polling-based cancellation checking during conversion
  - Actual process killing via `child.kill()` when cancelled
  - Frontend now passes job IDs and calls backend `cancel_conversion` command
- **Fixed WebM GPU encoding**: WebM now uses AV1 GPU encoding when available (av1_nvenc for NVIDIA RTX 4000+), falling back to VP9 software encoding otherwise
- **Added real progress tracking with ETA**:
  - Get video/audio duration via ffprobe
  - Parse FFmpeg's progress output in real-time
  - Send progress events to frontend via Tauri events
  - Display actual progress percentage, speed (e.g., 1.5x), and estimated time remaining
- **Implemented true PDF text replacement (Sejda-like)**:
  - Click-to-edit text blocks in PDF editor
  - Whiteout + replace approach using pdf-lib
  - Comprehensive font mapping from PDF fonts to StandardFonts
  - Overflow detection with visual indicators
  - Modified/revert badges on edited text blocks
  - Keyboard shortcuts (Ctrl+S, Ctrl+Shift+S)
  - Rust backend with lopdf for future optimization
  - Edit count indicators in toolbar and overlay

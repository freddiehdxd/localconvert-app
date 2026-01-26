# LocalConvert - System Patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │
│  │DropZone │  │ FileList │  │ Sidebar │  │  Modals  │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └────┬─────┘  │
│       │            │             │            │          │
│       └────────────┴──────┬──────┴────────────┘          │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │ Zustand Store│                      │
│                    └──────┬──────┘                       │
└───────────────────────────┼─────────────────────────────┘
                            │ Tauri Commands
┌───────────────────────────┼─────────────────────────────┐
│                    Rust Backend                          │
│                    ┌──────▼──────┐                       │
│                    │  Commands   │                       │
│                    └──────┬──────┘                       │
│       ┌───────────────────┼───────────────────┐         │
│       │                   │                   │          │
│  ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐    │
│  │ Tools   │        │ Converter │       │  Types  │    │
│  │ Manager │        │  Engine   │       │         │    │
│  └────┬────┘        └─────┬─────┘       └─────────┘    │
│       │                   │                              │
└───────┼───────────────────┼─────────────────────────────┘
        │                   │
┌───────▼───────────────────▼─────────────────────────────┐
│              External Conversion Tools                   │
│  ┌────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │
│  │ FFmpeg │ │ImageMagick│ │LibreOffice│ │  Pandoc   │  │
│  └────────┘ └───────────┘ └──────────┘ └────────────┘  │
│  ┌────────────┐ ┌───────────┐ ┌─────┐                   │
│  │ Ghostscript│ │ Tesseract │ │ 7z  │                   │
│  └────────────┘ └───────────┘ └─────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### Frontend Patterns

#### State Management (Zustand)
- Single store for all application state
- Actions colocated with state
- No prop drilling through component tree

#### Component Composition
- Small, focused components
- Props for configuration
- Composition over inheritance

#### Animation Strategy
- Framer Motion for all animations
- AnimatePresence for enter/exit
- Layout animations for list reordering

### Backend Patterns

#### Command Pattern
- Each Tauri command is a discrete operation
- Commands are async by default
- Error handling via Result types

#### Tool Abstraction
- Conversion tools accessed through unified interface
- Tool detection handles platform differences
- Graceful degradation when tools missing

#### Category-Based Routing
- File category determined by extension
- Category routes to appropriate converter
- Converters know which external tool to use

## File Flow

```
User drops file
       │
       ▼
get_file_info() → FileInfo { path, name, ext, size, category }
       │
       ▼
User selects format
       │
       ▼
convert_file() ─────────────────────────────────────────┐
       │                                                │
       ▼                                                │
Determine category from extension                       │
       │                                                │
       ▼                                                │
Route to category converter:                            │
  - video → FFmpeg                                      │
  - audio → FFmpeg                                      │
  - image → ImageMagick                                 │
  - document → Pandoc/LibreOffice                       │
  - pdf → Ghostscript                                   │
  - archive → 7-Zip                                     │
       │                                                │
       ▼                                                │
Build command arguments                                 │
       │                                                │
       ▼                                                │
Execute external tool                                   │
       │                                                │
       ▼                                                │
Return ConversionResult { success, output_path, error } │
       │                                                │
       └────────────────────────────────────────────────┘
```

## Error Handling

### Frontend
- Toast notifications for user-facing errors
- Console logging for debug info
- Graceful fallbacks for missing features

### Backend
- Result<T, String> for all commands
- Detailed error messages
- Tool-specific error parsing

## Security Considerations

### File System Access
- Scoped to user directories (Downloads, Documents, Desktop)
- No arbitrary file system access
- User must explicitly select paths

### External Tool Execution
- Whitelisted commands only
- Arguments validated before execution
- No shell injection possible

### Data Privacy
- No network requests from conversion logic
- No analytics or telemetry
- Files never leave user's device

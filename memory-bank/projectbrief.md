# LocalConvert - Project Brief

## Overview
LocalConvert is a privacy-focused desktop file converter for Windows that runs entirely locally. Unlike cloud-based converters like CloudConvert, all processing happens on the user's device with no uploads or data transmission.

## Core Requirements

### Privacy First
- All file conversions must happen locally
- No network requests for conversion operations
- No telemetry or tracking

### Format Support
- **Video**: MP4, WebM, MOV, AVI, MKV, GIF, WMV, FLV, MPEG, 3GP, OGV
- **Audio**: MP3, WAV, FLAC, AAC, OGG, WMA, M4A, AIFF, OPUS
- **Image**: PNG, JPG/JPEG, WebP, AVIF, GIF, BMP, TIFF, ICO, SVG, HEIC, RAW
- **Document**: PDF, DOCX, DOC, TXT, RTF, ODT, HTML, MD, EPUB, MOBI
- **Spreadsheet**: XLSX, XLS, CSV, ODS, TSV
- **Presentation**: PPTX, PPT, ODP, PDF
- **Ebook**: EPUB, MOBI, AZW3, PDF, FB2
- **Archive**: ZIP, 7Z, RAR, TAR, TAR.GZ, TAR.BZ2
- **Vector**: SVG, EPS, PDF, AI, DXF
- **Font**: TTF, OTF, WOFF, WOFF2, EOT

### User Experience
- Modern, clean UI with dark mode default
- Drag-and-drop as primary interaction
- Minimal clicks to convert (drop → format → convert)
- Real-time progress feedback
- Batch conversion support

## Technical Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Tauri v2 (Rust)
- **State**: Zustand
- **Conversion Engines**: FFmpeg, ImageMagick, LibreOffice, Pandoc, Ghostscript, Tesseract, 7-Zip

## Target Platform
Windows 10/11 (x64)

## Success Metrics
- User can convert any supported format with 3 or fewer clicks
- Conversion quality matches industry-standard tools
- App starts in under 3 seconds
- Memory footprint under 200MB idle

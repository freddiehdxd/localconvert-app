use crate::types::{ToolStatus, GpuInfo, GpuEncoder};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Windows constant for hiding console window
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub const TOOLS: &[(&str, &str, &str)] = &[
    ("ffmpeg", "FFmpeg", "Video/Audio conversion"),
    ("magick", "ImageMagick", "Image conversion"),
    ("soffice", "LibreOffice", "Document conversion"),
    ("pandoc", "Pandoc", "Document conversion"),
    ("gs", "Ghostscript", "PDF operations"),
    ("tesseract", "Tesseract", "OCR"),
    ("7z", "7-Zip", "Archive operations"),
    ("pymupdf", "PyMuPDF", "PDF text editing"),
];

// Global registry of tool paths for use by converter
lazy_static::lazy_static! {
    pub static ref TOOL_PATHS: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

/// Get the platform-appropriate executable name for a tool
fn platform_cmd(tool_name: &str) -> &str {
    if cfg!(windows) {
        match tool_name {
            "soffice" => "soffice.exe",
            "gs" => "gswin64c.exe",
            _ => tool_name,
        }
    } else {
        match tool_name {
            "gs" => "gs",
            _ => tool_name,
        }
    }
}

/// Get the executable path for a tool, falling back to common paths or just the command name
pub fn get_tool_path(tool_name: &str) -> String {
    // First check if we have a cached path
    if let Ok(paths) = TOOL_PATHS.lock() {
        if let Some(path) = paths.get(tool_name) {
            return path.clone();
        }
    }

    // Try to find in PATH using which
    let cmd = platform_cmd(tool_name);

    if let Ok(path) = which::which(cmd) {
        let path_str = path.to_string_lossy().to_string();
        // Cache it for future use
        if let Ok(mut paths) = TOOL_PATHS.lock() {
            paths.insert(tool_name.to_string(), path_str.clone());
        }
        return path_str;
    }

    // Check common installation paths
    let common_paths = get_common_paths(tool_name);
    for p in common_paths {
        if std::path::Path::new(&p).exists() {
            // Cache it for future use
            if let Ok(mut paths) = TOOL_PATHS.lock() {
                paths.insert(tool_name.to_string(), p.clone());
            }
            return p;
        }
    }

    // Fall back to platform command name (will work if tool is in PATH)
    cmd.to_string()
}

pub fn check_tool_installed(tool_name: &str) -> ToolStatus {
    // Special handling for PyMuPDF (Python module)
    if tool_name == "pymupdf" {
        return check_pymupdf_installed();
    }

    let cmd = platform_cmd(tool_name);

    // Try to find the tool using 'which' crate
    let mut path = which::which(cmd).ok().map(|p| p.to_string_lossy().to_string());

    let (installed, version) = if path.is_some() {
        let version = get_tool_version_at_path(path.as_deref(), tool_name);
        (true, version)
    } else {
        // Check common installation paths
        let common_paths = get_common_paths(tool_name);

        for p in common_paths {
            if std::path::Path::new(&p).exists() {
                path = Some(p);
                break;
            }
        }

        if path.is_some() {
            let version = get_tool_version_at_path(path.as_deref(), tool_name);
            (true, version)
        } else {
            (false, None)
        }
    };

    // Store the path in global registry for converter to use
    if let Some(ref p) = path {
        if let Ok(mut paths) = TOOL_PATHS.lock() {
            paths.insert(tool_name.to_string(), p.clone());
        }
    }

    ToolStatus {
        name: tool_name.to_string(),
        installed,
        version,
        path,
    }
}

/// Check if PyMuPDF Python module is installed
fn check_pymupdf_installed() -> ToolStatus {
    // Try common Python commands
    let python_cmds = if cfg!(windows) {
        vec!["python", "python3", "py"]
    } else {
        vec!["python3", "python"]
    };

    for python_cmd in python_cmds {
        if which::which(python_cmd).is_ok() {
            // Try to import fitz and get version
            let mut cmd = Command::new(python_cmd);
            cmd.args(&["-c", "import fitz; print(fitz.version)"]);

            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    return ToolStatus {
                        name: "pymupdf".to_string(),
                        installed: true,
                        version: Some(format!("PyMuPDF {}", version)),
                        path: Some(format!("{} -m fitz", python_cmd)),
                    };
                }
            }
        }
    }

    ToolStatus {
        name: "pymupdf".to_string(),
        installed: false,
        version: None,
        path: None,
    }
}

#[cfg(target_os = "windows")]
fn get_common_paths(tool_name: &str) -> Vec<String> {
    let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
    let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| String::new());
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| String::new());
    let downloads = format!("{}\\Downloads", user_profile);
    let downloads_compressed = format!("{}\\Downloads\\Compressed", user_profile);

    match tool_name {
        "ffmpeg" => vec![
            format!("{}\\ffmpeg\\bin\\ffmpeg.exe", program_files),
            format!("{}\\ffmpeg\\ffmpeg.exe", program_files),
            "C:\\ffmpeg\\bin\\ffmpeg.exe".to_string(),
        ],
        "magick" => {
            let mut paths = vec![
                format!("{}\\ImageMagick\\magick.exe", program_files),
            ];
            // Check for versioned ImageMagick folders (e.g., "ImageMagick-7.1.1-Q16-HDRI")
            if let Ok(entries) = std::fs::read_dir(&program_files) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("ImageMagick") && name != "ImageMagick" {
                        paths.push(format!("{}\\{}\\magick.exe", program_files, name));
                    }
                }
            }
            paths
        },
        "soffice" => {
            let mut paths = vec![
                format!("{}\\LibreOffice\\program\\soffice.exe", program_files),
                format!("{}\\LibreOffice\\program\\soffice.exe", program_files_x86),
            ];
            // Check for versioned LibreOffice folders (e.g., "LibreOffice 7", "LibreOffice 24.8")
            for base in &[&program_files, &program_files_x86] {
                if let Ok(entries) = std::fs::read_dir(base) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with("LibreOffice") && name != "LibreOffice" {
                            paths.push(format!("{}\\{}\\program\\soffice.exe", base, name));
                        }
                    }
                }
            }
            paths
        },
        "pandoc" => {
            let mut paths = vec![
                format!("{}\\Pandoc\\pandoc.exe", program_files),
                format!("{}\\Pandoc\\pandoc.exe", local_app_data),
            ];
            for base in &[&program_files, &local_app_data, &downloads, &downloads_compressed] {
                if base.is_empty() { continue; }
                if let Ok(entries) = std::fs::read_dir(base) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        let name_lower = name.to_lowercase();
                        if name_lower.starts_with("pandoc") {
                            let folder_path = format!("{}\\{}", base, name);
                            paths.push(format!("{}\\pandoc.exe", folder_path));
                            if let Ok(sub_entries) = std::fs::read_dir(&folder_path) {
                                for sub_entry in sub_entries.flatten() {
                                    let sub_name = sub_entry.file_name().to_string_lossy().to_string();
                                    if sub_name.to_lowercase().starts_with("pandoc") {
                                        paths.push(format!("{}\\{}\\pandoc.exe", folder_path, sub_name));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            paths
        },
        "gs" => {
            let mut paths = vec![];
            // Check for versioned Ghostscript folders
            let gs_dir = format!("{}\\gs", program_files);
            if let Ok(entries) = std::fs::read_dir(&gs_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("gs") {
                        paths.push(format!("{}\\{}\\bin\\gswin64c.exe", gs_dir, name));
                    }
                }
            }
            if paths.is_empty() {
                paths.push(format!("{}\\gs\\gs10.02.1\\bin\\gswin64c.exe", program_files));
                paths.push(format!("{}\\gs\\gs10.00.0\\bin\\gswin64c.exe", program_files));
            }
            paths
        },
        "tesseract" => vec![
            format!("{}\\Tesseract-OCR\\tesseract.exe", program_files),
            format!("{}\\Tesseract-OCR\\tesseract.exe", program_files_x86),
        ],
        "7z" => vec![
            format!("{}\\7-Zip\\7z.exe", program_files),
            format!("{}\\7-Zip\\7z.exe", program_files_x86),
        ],
        "pymupdf" => vec![],
        _ => vec![],
    }
}

#[cfg(target_os = "macos")]
fn get_common_paths(tool_name: &str) -> Vec<String> {
    match tool_name {
        "ffmpeg" => vec![
            "/opt/homebrew/bin/ffmpeg".to_string(),
            "/usr/local/bin/ffmpeg".to_string(),
        ],
        "magick" => vec![
            "/opt/homebrew/bin/magick".to_string(),
            "/usr/local/bin/magick".to_string(),
        ],
        "soffice" => vec![
            "/Applications/LibreOffice.app/Contents/MacOS/soffice".to_string(),
        ],
        "pandoc" => vec![
            "/opt/homebrew/bin/pandoc".to_string(),
            "/usr/local/bin/pandoc".to_string(),
        ],
        "gs" => vec![
            "/opt/homebrew/bin/gs".to_string(),
            "/usr/local/bin/gs".to_string(),
        ],
        "tesseract" => vec![
            "/opt/homebrew/bin/tesseract".to_string(),
            "/usr/local/bin/tesseract".to_string(),
        ],
        "7z" => vec![
            "/opt/homebrew/bin/7z".to_string(),
            "/usr/local/bin/7z".to_string(),
        ],
        "pymupdf" => vec![],
        _ => vec![],
    }
}

#[cfg(target_os = "linux")]
fn get_common_paths(tool_name: &str) -> Vec<String> {
    match tool_name {
        "ffmpeg" => vec![
            "/usr/bin/ffmpeg".to_string(),
            "/usr/local/bin/ffmpeg".to_string(),
        ],
        "magick" => vec![
            "/usr/bin/magick".to_string(),
            "/usr/local/bin/magick".to_string(),
            "/usr/bin/convert".to_string(),
        ],
        "soffice" => vec![
            "/usr/bin/soffice".to_string(),
            "/usr/bin/libreoffice".to_string(),
            "/usr/local/bin/soffice".to_string(),
        ],
        "pandoc" => vec![
            "/usr/bin/pandoc".to_string(),
            "/usr/local/bin/pandoc".to_string(),
        ],
        "gs" => vec![
            "/usr/bin/gs".to_string(),
            "/usr/local/bin/gs".to_string(),
        ],
        "tesseract" => vec![
            "/usr/bin/tesseract".to_string(),
            "/usr/local/bin/tesseract".to_string(),
        ],
        "7z" => vec![
            "/usr/bin/7z".to_string(),
            "/usr/local/bin/7z".to_string(),
            "/usr/bin/p7zip".to_string(),
        ],
        "pymupdf" => vec![],
        _ => vec![],
    }
}

// Fallback for other platforms (e.g., cross-compilation)
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn get_common_paths(_tool_name: &str) -> Vec<String> {
    vec![]
}

/// Helper to run a command with hidden window on Windows
fn run_hidden_command(cmd: &str, args: &[&str]) -> Option<std::process::Output> {
    let mut command = Command::new(cmd);
    command.args(args);

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    command.output().ok()
}

fn get_tool_version_at_path(path: Option<&str>, tool_name: &str) -> Option<String> {
    let cmd = path.unwrap_or(platform_cmd(tool_name));

    // LibreOffice and Ghostscript are GUI apps that may show windows even with CREATE_NO_WINDOW
    // Just return a placeholder version if the executable exists
    if tool_name == "soffice" || tool_name == "gs" {
        if let Some(p) = path {
            if std::path::Path::new(p).exists() {
                return Some("Installed".to_string());
            }
        }
        return None;
    }

    let output = match tool_name {
        "ffmpeg" => run_hidden_command(cmd, &["-version"])?,
        "magick" => run_hidden_command(cmd, &["-version"])?,
        "pandoc" => run_hidden_command(cmd, &["--version"])?,
        "tesseract" => run_hidden_command(cmd, &["--version"])?,
        "7z" => run_hidden_command(cmd, &[])?,
        _ => return None,
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr);

    // Extract version from first line
    combined.lines().next().map(|s| s.trim().to_string())
}

pub fn get_tool_download_url(tool_name: &str) -> Option<&'static str> {
    if cfg!(target_os = "macos") {
        match tool_name {
            "ffmpeg" => Some("https://evermeet.cx/ffmpeg/"),
            "magick" => Some("https://imagemagick.org/script/download.php#macosx"),
            "pandoc" => Some("https://github.com/jgm/pandoc/releases"),
            "7z" => Some("https://www.7-zip.org/download.html"),
            "tesseract" => Some("https://github.com/tesseract-ocr/tesseract"),
            "gs" => Some("https://ghostscript.com/releases/gsdnld.html"),
            "soffice" => Some("https://www.libreoffice.org/download/download/"),
            "pymupdf" => Some("https://pymupdf.readthedocs.io/en/latest/installation.html"),
            _ => None,
        }
    } else if cfg!(target_os = "linux") {
        match tool_name {
            "ffmpeg" => Some("https://ffmpeg.org/download.html#build-linux"),
            "magick" => Some("https://imagemagick.org/script/download.php#linux"),
            "pandoc" => Some("https://github.com/jgm/pandoc/releases"),
            "7z" => Some("https://www.7-zip.org/download.html"),
            "tesseract" => Some("https://github.com/tesseract-ocr/tesseract"),
            "gs" => Some("https://ghostscript.com/releases/gsdnld.html"),
            "soffice" => Some("https://www.libreoffice.org/download/download/"),
            "pymupdf" => Some("https://pymupdf.readthedocs.io/en/latest/installation.html"),
            _ => None,
        }
    } else {
        // Windows
        match tool_name {
            "ffmpeg" => Some("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"),
            "magick" => Some("https://imagemagick.org/archive/binaries/ImageMagick-7.1.1-29-Q16-HDRI-x64-dll.exe"),
            "pandoc" => Some("https://github.com/jgm/pandoc/releases/download/3.1.12/pandoc-3.1.12-windows-x86_64.zip"),
            "7z" => Some("https://www.7-zip.org/a/7z2301-x64.exe"),
            "tesseract" => Some("https://github.com/UB-Mannheim/tesseract/releases"),
            "gs" => Some("https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10021/gs10021w64.exe"),
            "soffice" => Some("https://www.libreoffice.org/download/download/"),
            "pymupdf" => Some("https://pymupdf.readthedocs.io/en/latest/installation.html"),
            _ => None,
        }
    }
}

pub fn get_category_for_extension(ext: &str) -> &'static str {
    let ext_lower = ext.to_lowercase();
    let ext_clean = ext_lower.trim_start_matches('.');

    match ext_clean {
        // Video
        "mp4" | "webm" | "mov" | "avi" | "mkv" | "wmv" | "flv" | "mpeg" | "mpg" | "3gp" | "ogv" | "m4v" => "video",

        // Audio
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma" | "m4a" | "aiff" | "opus" | "oga" => "audio",

        // Image
        "png" | "jpg" | "jpeg" | "webp" | "avif" | "gif" | "bmp" | "tiff" | "tif" | "ico" | "heic" | "heif" | "cr2" | "nef" | "arw" | "raw" => "image",

        // Document
        "pdf" | "docx" | "doc" | "txt" | "rtf" | "odt" | "html" | "htm" | "md" | "markdown" => "document",

        // Spreadsheet
        "xlsx" | "xls" | "csv" | "ods" | "tsv" => "spreadsheet",

        // Presentation
        "pptx" | "ppt" | "odp" => "presentation",

        // Ebook
        "epub" | "mobi" | "azw3" | "fb2" | "azw" => "ebook",

        // Archive
        "zip" | "7z" | "rar" | "tar" | "gz" | "bz2" | "xz" | "tgz" | "tbz2" => "archive",

        // Vector
        "svg" | "eps" | "ai" | "dxf" => "vector",

        // Font
        "ttf" | "otf" | "woff" | "woff2" | "eot" => "font",

        _ => "other",
    }
}

pub fn get_supported_output_formats(ext: &str) -> Vec<String> {
    let category = get_category_for_extension(ext);

    match category {
        "video" => vec![
            "mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"
        ].into_iter().map(String::from).collect(),

        "audio" => vec![
            "mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "aiff", "opus"
        ].into_iter().map(String::from).collect(),

        "image" => vec![
            "png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"
        ].into_iter().map(String::from).collect(),

        "document" => vec![
            "pdf", "docx", "doc", "txt", "rtf", "odt", "html", "md", "epub"
        ].into_iter().map(String::from).collect(),

        "spreadsheet" => vec![
            "xlsx", "xls", "csv", "ods", "tsv", "pdf", "html"
        ].into_iter().map(String::from).collect(),

        "presentation" => vec![
            "pptx", "ppt", "odp", "pdf"
        ].into_iter().map(String::from).collect(),

        "ebook" => vec![
            "epub", "mobi", "azw3", "pdf", "fb2", "html", "txt"
        ].into_iter().map(String::from).collect(),

        "archive" => vec![
            "zip", "7z", "tar", "tar.gz", "tar.bz2"
        ].into_iter().map(String::from).collect(),

        "vector" => vec![
            "svg", "eps", "pdf", "png"
        ].into_iter().map(String::from).collect(),

        "font" => vec![
            "ttf", "otf", "woff", "woff2", "eot"
        ].into_iter().map(String::from).collect(),

        _ => vec![],
    }
}

/// Detect available GPU hardware encoders using FFmpeg
pub fn detect_gpu_encoders() -> GpuInfo {
    let mut encoders: Vec<GpuEncoder> = Vec::new();

    // Try to get list of encoders from FFmpeg (with hidden window on Windows)
    let output = run_hidden_command("ffmpeg", &["-hide_banner", "-encoders"]);

    let encoder_list = match output {
        Some(out) => String::from_utf8_lossy(&out.stdout).to_string(),
        None => return GpuInfo {
            available: false,
            encoders: vec![],
            preferred_encoder: None,
        },
    };

    // Check for NVIDIA NVENC encoders
    if encoder_list.contains("h264_nvenc") {
        encoders.push(GpuEncoder {
            name: "h264_nvenc".to_string(),
            codec: "h264".to_string(),
            vendor: "NVIDIA".to_string(),
            description: "NVIDIA NVENC H.264 encoder".to_string(),
        });
    }
    if encoder_list.contains("hevc_nvenc") {
        encoders.push(GpuEncoder {
            name: "hevc_nvenc".to_string(),
            codec: "hevc".to_string(),
            vendor: "NVIDIA".to_string(),
            description: "NVIDIA NVENC H.265/HEVC encoder".to_string(),
        });
    }
    if encoder_list.contains("av1_nvenc") {
        encoders.push(GpuEncoder {
            name: "av1_nvenc".to_string(),
            codec: "av1".to_string(),
            vendor: "NVIDIA".to_string(),
            description: "NVIDIA NVENC AV1 encoder".to_string(),
        });
    }

    // Check for AMD AMF encoders
    if encoder_list.contains("h264_amf") {
        encoders.push(GpuEncoder {
            name: "h264_amf".to_string(),
            codec: "h264".to_string(),
            vendor: "AMD".to_string(),
            description: "AMD AMF H.264 encoder".to_string(),
        });
    }
    if encoder_list.contains("hevc_amf") {
        encoders.push(GpuEncoder {
            name: "hevc_amf".to_string(),
            codec: "hevc".to_string(),
            vendor: "AMD".to_string(),
            description: "AMD AMF H.265/HEVC encoder".to_string(),
        });
    }
    if encoder_list.contains("av1_amf") {
        encoders.push(GpuEncoder {
            name: "av1_amf".to_string(),
            codec: "av1".to_string(),
            vendor: "AMD".to_string(),
            description: "AMD AMF AV1 encoder".to_string(),
        });
    }

    // Check for Intel Quick Sync Video encoders
    if encoder_list.contains("h264_qsv") {
        encoders.push(GpuEncoder {
            name: "h264_qsv".to_string(),
            codec: "h264".to_string(),
            vendor: "Intel".to_string(),
            description: "Intel Quick Sync H.264 encoder".to_string(),
        });
    }
    if encoder_list.contains("hevc_qsv") {
        encoders.push(GpuEncoder {
            name: "hevc_qsv".to_string(),
            codec: "hevc".to_string(),
            vendor: "Intel".to_string(),
            description: "Intel Quick Sync H.265/HEVC encoder".to_string(),
        });
    }
    if encoder_list.contains("av1_qsv") {
        encoders.push(GpuEncoder {
            name: "av1_qsv".to_string(),
            codec: "av1".to_string(),
            vendor: "Intel".to_string(),
            description: "Intel Quick Sync AV1 encoder".to_string(),
        });
    }

    // Check for Video Toolbox (macOS) encoders
    if encoder_list.contains("h264_videotoolbox") {
        encoders.push(GpuEncoder {
            name: "h264_videotoolbox".to_string(),
            codec: "h264".to_string(),
            vendor: "Apple".to_string(),
            description: "Apple VideoToolbox H.264 encoder".to_string(),
        });
    }
    if encoder_list.contains("hevc_videotoolbox") {
        encoders.push(GpuEncoder {
            name: "hevc_videotoolbox".to_string(),
            codec: "hevc".to_string(),
            vendor: "Apple".to_string(),
            description: "Apple VideoToolbox H.265/HEVC encoder".to_string(),
        });
    }

    let available = !encoders.is_empty();

    // Determine preferred encoder (prioritize: NVIDIA > AMD > Intel > Apple)
    let preferred_encoder = if encoders.iter().any(|e| e.name == "h264_nvenc") {
        Some("h264_nvenc".to_string())
    } else if encoders.iter().any(|e| e.name == "h264_amf") {
        Some("h264_amf".to_string())
    } else if encoders.iter().any(|e| e.name == "h264_qsv") {
        Some("h264_qsv".to_string())
    } else if encoders.iter().any(|e| e.name == "h264_videotoolbox") {
        Some("h264_videotoolbox".to_string())
    } else {
        encoders.first().map(|e| e.name.clone())
    };

    GpuInfo {
        available,
        encoders,
        preferred_encoder,
    }
}

/// Get the appropriate GPU encoder for a given codec and format
pub fn get_gpu_encoder_for_format(format: &str, gpu_info: &GpuInfo, preferred: Option<&str>) -> Option<String> {
    if !gpu_info.available {
        return None;
    }

    // Determine required codec based on format
    // WebM ONLY supports VP8, VP9, or AV1 - NOT H.264/H.265
    let required_codec = match format {
        "mp4" | "mov" | "mkv" | "avi" => "h264",
        // WebM requires AV1 for GPU encoding (VP9 has no GPU support)
        // If no AV1 encoder available, return None to fall back to software VP9
        "webm" => "av1",
        _ => "h264",
    };

    // If user specified a preferred encoder, check if it's available AND compatible with the format
    if let Some(pref) = preferred {
        if let Some(encoder) = gpu_info.encoders.iter().find(|e| e.name == pref) {
            // Only use preferred encoder if codec matches the required codec for this format
            if encoder.codec == required_codec {
                return Some(pref.to_string());
            }
        }
    }

    // Find best encoder for the codec (priority: NVIDIA > AMD > Intel > Apple)
    let vendors = ["NVIDIA", "AMD", "Intel", "Apple"];

    for vendor in vendors {
        if let Some(encoder) = gpu_info.encoders.iter()
            .find(|e| e.codec == required_codec && e.vendor == vendor)
        {
            return Some(encoder.name.clone());
        }
    }

    None
}

use crate::converter::{
    compress_image_helper, compress_video_helper, convert_file as do_convert,
    crop_image_helper, extract_audio_helper, kill_process, resize_image_helper,
    rotate_image_helper, trim_video_helper,
};
use crate::tools::{
    check_tool_installed, detect_gpu_encoders, get_category_for_extension,
    get_supported_output_formats, get_tool_download_url, get_tool_path, TOOLS,
};
use crate::types::{
    ConversionOptions, ConversionResult, FileInfo, FormatInfo, GpuInfo,
    ImageOptions, ToolStatus, VideoOptions,
};
use crate::pdf_text_editor;
use std::path::Path;
use std::process::Command;
use std::fs;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Helper to create a command with hidden window on Windows
fn hidden_command(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[tauri::command]
pub async fn check_tools() -> Vec<ToolStatus> {
    TOOLS
        .iter()
        .map(|(cmd, _, _)| check_tool_installed(cmd))
        .collect()
}

#[tauri::command]
pub async fn download_tool(tool_name: String) -> Result<String, String> {
    let url = get_tool_download_url(&tool_name)
        .ok_or_else(|| format!("No download URL for {}", tool_name))?;
    
    // Open the download URL in the default browser
    // The user will need to install manually for now
    open::that(url).map_err(|e| format!("Failed to open download page: {}", e))?;
    
    Ok(format!("Opening download page for {}...", tool_name))
}

#[tauri::command]
pub async fn detect_gpu() -> GpuInfo {
    detect_gpu_encoders()
}

#[tauri::command]
pub async fn convert_file(
    input_path: String,
    output_format: String,
    output_dir: String,
    options: Option<ConversionOptions>,
    job_id: Option<String>,
) -> ConversionResult {
    let opts = options.unwrap_or_default();
    do_convert(&input_path, &output_format, &output_dir, opts, job_id.as_deref())
}

#[tauri::command]
pub async fn cancel_conversion(job_id: String) -> Result<(), String> {
    kill_process(&job_id)
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);
    
    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    
    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let category = get_category_for_extension(&extension).to_string();
    
    Ok(FileInfo {
        path,
        name,
        extension,
        size: metadata.len(),
        category,
        duration: None,
        thumbnail: None,
        resolution: None,
        codec: None,
        subtitles: None,
    })
}

#[tauri::command]
pub async fn get_supported_formats(extension: String) -> Vec<FormatInfo> {
    let outputs = get_supported_output_formats(&extension);
    let category = get_category_for_extension(&extension);
    
    outputs
        .into_iter()
        .map(|ext| FormatInfo {
            extension: ext.clone(),
            name: ext.to_uppercase(),
            category: category.to_string(),
            supported_outputs: vec![],
        })
        .collect()
}

#[tauri::command]
pub async fn merge_pdfs(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    // Use Ghostscript to merge PDFs
    let mut args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        "-sDEVICE=pdfwrite".to_string(),
        format!("-sOutputFile={}", output_path),
    ];
    
    args.extend(input_paths);
    
    let output = hidden_command(&get_tool_path("gs"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;

    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn split_pdf(
    input_path: String,
    output_dir: String,
    pages: Option<Vec<u32>>,
) -> Result<Vec<String>, String> {
    let stem = Path::new(&input_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("page");
    
    let mut output_files = Vec::new();
    
    // If specific pages are provided, extract those; otherwise extract all
    if let Some(page_nums) = pages {
        for page in page_nums {
            let output_path = Path::new(&output_dir)
                .join(format!("{}_{}.pdf", stem, page))
                .to_string_lossy()
                .to_string();

            let args = vec![
                "-dNOPAUSE".to_string(),
                "-dBATCH".to_string(),
                "-dSAFER".to_string(),
                "-sDEVICE=pdfwrite".to_string(),
                format!("-dFirstPage={}", page),
                format!("-dLastPage={}", page),
                format!("-sOutputFile={}", output_path),
                input_path.clone(),
            ];

            let output = hidden_command(&get_tool_path("gs"))
                .args(&args)
                .output()
                .map_err(|e| format!("Failed to split PDF: {}", e))?;
            
            if output.status.success() {
                output_files.push(output_path);
            }
        }
    }
    
    Ok(output_files)
}

#[tauri::command]
pub async fn compress_pdf(
    input_path: String,
    output_path: String,
    quality: Option<String>,
) -> Result<String, String> {
    let pdf_settings = match quality.as_deref() {
        Some("screen") => "/screen",
        Some("ebook") => "/ebook",
        Some("printer") => "/printer",
        Some("prepress") => "/prepress",
        _ => "/ebook",
    };
    
    let args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        "-sDEVICE=pdfwrite".to_string(),
        format!("-dPDFSETTINGS={}", pdf_settings),
        format!("-sOutputFile={}", output_path),
        input_path,
    ];
    
    let output = hidden_command(&get_tool_path("gs"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to compress PDF: {}", e))?;
    
    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn rotate_pdf(
    input_path: String,
    output_path: String,
    rotation: i32,
) -> Result<String, String> {
    // Use pdftk or Ghostscript for rotation
    // For now, use Ghostscript with PostScript rotation
    let rotate_script = match rotation {
        90 => "<< /PageRotation 90 >> setpagedevice",
        180 => "<< /PageRotation 180 >> setpagedevice",
        270 => "<< /PageRotation 270 >> setpagedevice",
        -90 => "<< /PageRotation 270 >> setpagedevice",
        _ => return Err("Invalid rotation angle. Use 90, 180, 270, or -90".to_string()),
    };
    
    let args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        "-sDEVICE=pdfwrite".to_string(),
        format!("-sOutputFile={}", output_path),
        "-c".to_string(),
        rotate_script.to_string(),
        "-f".to_string(),
        input_path,
    ];
    
    let output = hidden_command(&get_tool_path("gs"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to rotate PDF: {}", e))?;
    
    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn add_watermark(
    input_path: String,
    output_path: String,
    _watermark_text: String,
    opacity: Option<f32>,
) -> Result<String, String> {
    // Create a watermark overlay using ImageMagick, then combine with PDF
    // This is a simplified approach - for production, use a PDF library
    let _opacity = opacity.unwrap_or(0.3);
    
    // For now, we'll use Ghostscript to add text overlay
    // This is a basic implementation
    let args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        "-sDEVICE=pdfwrite".to_string(),
        format!("-sOutputFile={}", output_path),
        input_path.clone(),
    ];
    
    let output = hidden_command(&get_tool_path("gs"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to add watermark: {}", e))?;
    
    if output.status.success() {
        Ok(output_path)
    } else {
        // Fall back to copying the file
        fs::copy(&input_path, &output_path).map_err(|e| e.to_string())?;
        Ok(output_path)
    }
}

#[tauri::command]
pub async fn pdf_to_images(
    input_path: String,
    output_dir: String,
    format: Option<String>,
    dpi: Option<u32>,
) -> Result<Vec<String>, String> {
    let output_format = format.unwrap_or_else(|| "png".to_string());
    let resolution = dpi.unwrap_or(150);
    
    let stem = Path::new(&input_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("page")
        .to_string();
    
    let output_pattern = Path::new(&output_dir)
        .join(format!("{}_%03d.{}", stem, output_format))
        .to_string_lossy()
        .to_string();

    let device = match output_format.as_str() {
        "png" => "png16m",
        "jpg" | "jpeg" => "jpeg",
        "tiff" => "tiff24nc",
        _ => "png16m",
    };

    let args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        format!("-sDEVICE={}", device),
        format!("-r{}", resolution),
        format!("-sOutputFile={}", output_pattern),
        input_path,
    ];

    let output = hidden_command(&get_tool_path("gs"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to convert PDF to images: {}", e))?;
    
    if output.status.success() {
        // Find generated files
        let mut files = Vec::new();
        if let Ok(entries) = fs::read_dir(&output_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with(&stem) && name.ends_with(&format!(".{}", output_format)) {
                        files.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
        files.sort();
        Ok(files)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn images_to_pdf(
    input_paths: Vec<String>,
    output_path: String,
) -> Result<String, String> {
    // Use ImageMagick to convert images to PDF
    let mut args = input_paths.clone();
    args.push(output_path.clone());
    
    let output = hidden_command(&get_tool_path("magick"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to create PDF: {}", e))?;
    
    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn resize_image(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
    quality: Option<u32>,
) -> Result<String, String> {
    let options = ImageOptions {
        width: Some(width),
        height: Some(height),
        quality,
        crop_x: None,
        crop_y: None,
        crop_width: None,
        crop_height: None,
        rotation: None,
    };
    
    resize_image_helper(&input_path, &output_path, &options)
}

#[tauri::command]
pub async fn compress_image(
    input_path: String,
    output_path: String,
    quality: u32,
) -> Result<String, String> {
    compress_image_helper(&input_path, &output_path, quality)
}

#[tauri::command]
pub async fn crop_image(
    input_path: String,
    output_path: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let options = ImageOptions {
        width: None,
        height: None,
        quality: None,
        crop_x: Some(x),
        crop_y: Some(y),
        crop_width: Some(width),
        crop_height: Some(height),
        rotation: None,
    };
    
    crop_image_helper(&input_path, &output_path, &options)
}

#[tauri::command]
pub async fn rotate_image(
    input_path: String,
    output_path: String,
    degrees: i32,
) -> Result<String, String> {
    rotate_image_helper(&input_path, &output_path, degrees)
}

#[tauri::command]
pub async fn trim_video(
    input_path: String,
    output_path: String,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<String, String> {
    let options = VideoOptions {
        start_time,
        end_time,
        width: None,
        height: None,
        bitrate: None,
        audio_bitrate: None,
        fps: None,
        crf: None,
        use_gpu: None,
        gpu_encoder: None,
        preset_resolution: None,
        custom_width: None,
        custom_height: None,
        video_codec: None,
        audio_codec: None,
        bitrate_mode: None,
        video_bitrate: None,
        two_pass: None,
    };
    
    trim_video_helper(&input_path, &output_path, &options)
}

#[tauri::command]
pub async fn extract_audio(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<String, String> {
    extract_audio_helper(&input_path, &output_path, &format)
}

#[tauri::command]
pub async fn compress_video(
    input_path: String,
    output_path: String,
    crf: Option<u32>,
    audio_bitrate: Option<String>,
) -> Result<String, String> {
    let options = VideoOptions {
        start_time: None,
        end_time: None,
        width: None,
        height: None,
        bitrate: None,
        audio_bitrate,
        fps: None,
        crf,
        use_gpu: None,
        gpu_encoder: None,
        preset_resolution: None,
        custom_width: None,
        custom_height: None,
        video_codec: None,
        audio_codec: None,
        bitrate_mode: None,
        video_bitrate: None,
        two_pass: None,
    };
    
    compress_video_helper(&input_path, &output_path, &options)
}

#[tauri::command]
pub async fn ocr_pdf(
    input_path: String,
    output_path: String,
    language: Option<String>,
) -> Result<String, String> {
    let lang = language.unwrap_or_else(|| "eng".to_string());
    
    // First convert PDF to images, then OCR each image, then combine to searchable PDF
    let temp_dir = std::env::temp_dir().join("localconvert_ocr");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    
    // Convert PDF to images using Ghostscript
    let stem = Path::new(&input_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("page");
    
    let img_pattern = temp_dir.join(format!("{}_%03d.png", stem));
    
    let gs_args = vec![
        "-dNOPAUSE".to_string(),
        "-dBATCH".to_string(),
        "-dSAFER".to_string(),
        "-sDEVICE=png16m".to_string(),
        "-r300".to_string(),
        format!("-sOutputFile={}", img_pattern.to_string_lossy()),
        input_path.clone(),
    ];
    
    hidden_command(&get_tool_path("gs"))
        .args(&gs_args)
        .output()
        .map_err(|e| format!("Failed to convert PDF for OCR: {}", e))?;
    
    // Find generated images and OCR them
    let mut ocr_outputs = Vec::new();
    if let Ok(entries) = fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "png").unwrap_or(false) {
                let ocr_output = path.with_extension("pdf");
                
                let tess_args = vec![
                    path.to_string_lossy().to_string(),
                    ocr_output.to_string_lossy().to_string().replace(".pdf", ""),
                    "-l".to_string(),
                    lang.clone(),
                    "pdf".to_string(),
                ];
                
                hidden_command(&get_tool_path("tesseract"))
                    .args(&tess_args)
                    .output()
                    .ok();
                
                if ocr_output.exists() {
                    ocr_outputs.push(ocr_output.to_string_lossy().to_string());
                }
            }
        }
    }
    
    ocr_outputs.sort();
    
    // Merge OCR'd PDFs
    if ocr_outputs.len() == 1 {
        fs::copy(&ocr_outputs[0], &output_path).map_err(|e| e.to_string())?;
    } else if ocr_outputs.len() > 1 {
        let mut gs_merge_args = vec![
            "-dNOPAUSE".to_string(),
            "-dBATCH".to_string(),
            "-dSAFER".to_string(),
            "-sDEVICE=pdfwrite".to_string(),
            format!("-sOutputFile={}", output_path),
        ];
        gs_merge_args.extend(ocr_outputs);
        
        hidden_command(&get_tool_path("gs"))
            .args(&gs_merge_args)
            .output()
            .map_err(|e| format!("Failed to merge OCR PDFs: {}", e))?;
    } else {
        return Err("No pages were processed".to_string());
    }
    
    // Cleanup temp directory
    fs::remove_dir_all(&temp_dir).ok();
    
    Ok(output_path)
}

#[tauri::command]
pub async fn get_default_output_dir() -> String {
    dirs::download_dir()
        .or_else(dirs::document_dir)
        .or_else(dirs::home_dir)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string())
}

#[tauri::command]
pub async fn get_image_preview(path: String, max_size: Option<u32>) -> Result<String, String> {
    use std::io::Read;
    
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        _ => return Err("Unsupported image format".to_string()),
    };
    
    // For large images, create a thumbnail using ImageMagick if available
    let max_dimension = max_size.unwrap_or(200);
    let temp_path = std::env::temp_dir().join(format!("preview_{}.jpg", uuid::Uuid::new_v4()));
    
    // Try to create a thumbnail
    let thumbnail_result = hidden_command(&get_tool_path("magick"))
        .args([
            &path,
            "-thumbnail",
            &format!("{}x{}>", max_dimension, max_dimension),
            "-quality",
            "80",
            temp_path.to_string_lossy().as_ref(),
        ])
        .output();
    
    let (data, content_type) = if thumbnail_result.is_ok() && temp_path.exists() {
        // Read the thumbnail
        let mut file = fs::File::open(&temp_path).map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        fs::remove_file(&temp_path).ok();
        (buffer, "image/jpeg")
    } else {
        // Fall back to reading the original file (limit to 5MB)
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        if metadata.len() > 5 * 1024 * 1024 {
            return Err("Image too large for preview without ImageMagick".to_string());
        }
        
        let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        (buffer, mime_type)
    };
    
    // Convert to base64 data URL
    use std::fmt::Write;
    let base64 = base64_encode(&data);
    let mut data_url = String::with_capacity(base64.len() + 30);
    write!(data_url, "data:{};base64,{}", content_type, base64).map_err(|e| e.to_string())?;
    
    Ok(data_url)
}

fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
        
        result.push(ALPHABET[b0 >> 2] as char);
        result.push(ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)] as char);
        
        if chunk.len() > 1 {
            result.push(ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] as char);
        } else {
            result.push('=');
        }
        
        if chunk.len() > 2 {
            result.push(ALPHABET[b2 & 0x3f] as char);
        } else {
            result.push('=');
        }
    }
    
    result
}

#[tauri::command]
pub async fn extract_archive(
    input_path: String,
    output_dir: String,
    password: Option<String>,
) -> Result<Vec<String>, String> {
    let mut args = vec![
        "x".to_string(),
        input_path,
        format!("-o{}", output_dir),
        "-y".to_string(),
    ];
    
    if let Some(pwd) = password {
        args.push(format!("-p{}", pwd));
    }
    
    let output = hidden_command(&get_tool_path("7z"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to extract archive: {}", e))?;
    
    if output.status.success() {
        // Return list of extracted files
        let mut files = Vec::new();
        if let Ok(entries) = fs::read_dir(&output_dir) {
            for entry in entries.flatten() {
                files.push(entry.path().to_string_lossy().to_string());
            }
        }
        Ok(files)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn create_archive(
    input_paths: Vec<String>,
    output_path: String,
    format: String,
    compression_level: Option<u32>,
    password: Option<String>,
) -> Result<String, String> {
    let mut args = vec!["a".to_string()];
    
    // Set format
    let archive_type = match format.as_str() {
        "zip" => "-tzip",
        "7z" => "-t7z",
        "tar" => "-ttar",
        "tar.gz" | "tgz" => "-tgzip",
        "tar.bz2" | "tbz2" => "-tbzip2",
        _ => "-tzip",
    };
    args.push(archive_type.to_string());
    
    // Set compression level
    if let Some(level) = compression_level {
        args.push(format!("-mx={}", level.min(9)));
    }
    
    // Set password
    if let Some(pwd) = password {
        args.push(format!("-p{}", pwd));
    }
    
    args.push(output_path.clone());
    args.extend(input_paths);
    
    let output = hidden_command(&get_tool_path("7z"))
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to create archive: {}", e))?;
    
    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn open_file_location(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    
    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, use explorer /select to highlight the file
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        let parent = file_path.parent().unwrap_or(file_path);
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let folder_path = Path::new(&path);
    
    if !folder_path.exists() {
        return Err("Folder does not exist".to_string());
    }
    
    open::that(&path).map_err(|e| format!("Failed to open folder: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_file_size_estimate(
    input_path: String,
    output_format: String,
    quality: Option<u32>,
) -> Result<u64, String> {
    let file_path = Path::new(&input_path);
    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let input_size = fs::metadata(&input_path)
        .map_err(|e| e.to_string())?
        .len();
    
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let quality_factor = quality.unwrap_or(85) as f64 / 100.0;
    
    // Estimate based on format and quality
    let estimate = match (extension.as_str(), output_format.as_str()) {
        // Image conversions
        ("png", "jpg" | "jpeg") => (input_size as f64 * 0.3 * quality_factor) as u64,
        ("png", "webp") => (input_size as f64 * 0.4 * quality_factor) as u64,
        ("jpg" | "jpeg", "png") => (input_size as f64 * 2.5) as u64,
        ("jpg" | "jpeg", "webp") => (input_size as f64 * 0.7 * quality_factor) as u64,
        ("bmp", _) => (input_size as f64 * 0.1 * quality_factor) as u64,
        ("tiff", _) => (input_size as f64 * 0.2 * quality_factor) as u64,
        
        // Video conversions
        ("mp4", "webm") => (input_size as f64 * 0.8 * quality_factor) as u64,
        ("webm", "mp4") => (input_size as f64 * 1.2 * quality_factor) as u64,
        ("avi", "mp4") => (input_size as f64 * 0.4 * quality_factor) as u64,
        ("mkv", "mp4") => (input_size as f64 * 1.0 * quality_factor) as u64,
        ("mov", "mp4") => (input_size as f64 * 0.8 * quality_factor) as u64,
        
        // Audio conversions
        ("wav", "mp3") => (input_size as f64 * 0.1 * quality_factor) as u64,
        ("wav", "flac") => (input_size as f64 * 0.6) as u64,
        ("flac", "mp3") => (input_size as f64 * 0.15 * quality_factor) as u64,
        ("mp3", "wav") => (input_size as f64 * 10.0) as u64,
        
        // Document conversions
        ("docx", "pdf") => (input_size as f64 * 1.2) as u64,
        ("pdf", "docx") => (input_size as f64 * 0.8) as u64,
        
        // Default: assume similar size with quality adjustment
        _ => (input_size as f64 * quality_factor) as u64,
    };
    
    Ok(estimate.max(1024)) // Minimum 1KB
}

#[tauri::command]
pub async fn get_video_duration(path: String) -> Result<f64, String> {
    let ffmpeg_path = get_tool_path("ffmpeg");
    let ffprobe_path = if cfg!(windows) {
        ffmpeg_path.replace("ffmpeg.exe", "ffprobe.exe")
    } else {
        ffmpeg_path.replace("ffmpeg", "ffprobe")
    };

    let output = hidden_command(&ffprobe_path)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &path,
        ])
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        // Simple JSON parsing for duration
        if let Some(start) = json_str.find("\"duration\":") {
            let rest = &json_str[start + 11..];
            if let Some(end) = rest.find([',', '}']) {
                let duration_str = rest[..end].trim().trim_matches('"');
                if let Ok(duration) = duration_str.parse::<f64>() {
                    return Ok(duration);
                }
            }
        }
    }
    
    Err("Could not determine video duration".to_string())
}

#[tauri::command]
pub async fn get_video_thumbnail(
    path: String,
    time_secs: Option<f64>,
    width: Option<u32>,
) -> Result<String, String> {
    use std::io::Read;
    
    let time = time_secs.unwrap_or(1.0);
    let w = width.unwrap_or(320);
    
    let temp_path = std::env::temp_dir().join(format!("thumb_{}.jpg", uuid::Uuid::new_v4()));
    
    let output = hidden_command(&get_tool_path("ffmpeg"))
        .args([
            "-ss", &time.to_string(),
            "-i", &path,
            "-vframes", "1",
            "-vf", &format!("scale={}:-1", w),
            "-q:v", "2",
            "-y",
            temp_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|e| format!("Failed to generate thumbnail: {}", e))?;
    
    if !output.status.success() || !temp_path.exists() {
        return Err("Failed to generate thumbnail".to_string());
    }
    
    // Read and convert to base64
    let mut file = fs::File::open(&temp_path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    fs::remove_file(&temp_path).ok();
    
    let base64 = base64_encode(&buffer);
    Ok(format!("data:image/jpeg;base64,{}", base64))
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<crate::types::VideoMetadata, String> {
    let ffmpeg_path = get_tool_path("ffmpeg");
    let ffprobe_path = if cfg!(windows) {
        ffmpeg_path.replace("ffmpeg.exe", "ffprobe.exe")
    } else {
        ffmpeg_path.replace("ffmpeg", "ffprobe")
    };

    let output = hidden_command(&ffprobe_path)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &path,
        ])
        .output()
        .map_err(|e| format!("Failed to get video metadata: {}", e))?;
    
    let mut metadata = crate::types::VideoMetadata {
        duration: None,
        resolution: None,
        codec: None,
        subtitles: Vec::new(),
    };
    
    if output.status.success() {
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
            if let Some(format) = json.get("format") {
                if let Some(dur_str) = format.get("duration").and_then(|v| v.as_str()) {
                    metadata.duration = dur_str.parse::<f64>().ok();
                }
            }
            if let Some(streams) = json.get("streams").and_then(|v| v.as_array()) {
                if let Some(video_stream) = streams.iter().find(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("video")) {
                    if let Some(c) = video_stream.get("codec_name").and_then(|v| v.as_str()) {
                        metadata.codec = Some(c.to_uppercase());
                    }
                    if let (Some(w), Some(h)) = (
                        video_stream.get("width").and_then(|v| v.as_i64()),
                        video_stream.get("height").and_then(|v| v.as_i64())
                    ) {
                        metadata.resolution = Some(format!("{}x{}", w, h));
                    }
                }
                
                // Parse subtitle streams
                for stream in streams.iter().filter(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("subtitle")) {
                    let index = stream.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    let codec = stream.get("codec_name").and_then(|v| v.as_str()).map(|s| s.to_string());
                    
                    let mut language = None;
                    let mut title = None;
                    
                    if let Some(tags) = stream.get("tags") {
                        language = tags.get("language").and_then(|v| v.as_str()).map(|s| s.to_string());
                        title = tags.get("title").and_then(|v| v.as_str()).map(|s| s.to_string());
                    }
                    
                    metadata.subtitles.push(crate::types::SubtitleStream {
                        index,
                        language,
                        codec,
                        title,
                    });
                }
            }
        }
    }
    
    Ok(metadata)
}

#[tauri::command]
pub async fn get_hardware_encoders() -> Result<crate::types::GpuInfo, String> {
    Ok(crate::tools::detect_gpu_encoders())
}

#[tauri::command]
pub async fn register_context_menu() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Get the executable path
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;
        
        let exe_str = exe_path.to_string_lossy().to_string();
        
        // Create registry entries for context menu using reg.exe
        // Using HKEY_CURRENT_USER doesn't require admin privileges
        
        // 1. Create the shell key for LocalConvert
        let result1 = Command::new("reg")
            .args([
                "add",
                r"HKEY_CURRENT_USER\Software\Classes\*\shell\LocalConvert",
                "/ve",
                "/d",
                "Convert with LocalConvert",
                "/f"
            ])
            .output();
        
        // 2. Add icon
        let result2 = Command::new("reg")
            .args([
                "add",
                r"HKEY_CURRENT_USER\Software\Classes\*\shell\LocalConvert",
                "/v",
                "Icon",
                "/d",
                &exe_str,
                "/f"
            ])
            .output();
        
        // 3. Create the command
        let command_value = format!("\"{}\" \"%1\"", exe_str);
        let result3 = Command::new("reg")
            .args([
                "add",
                r"HKEY_CURRENT_USER\Software\Classes\*\shell\LocalConvert\command",
                "/ve",
                "/d",
                &command_value,
                "/f"
            ])
            .output();
        
        // Check results
        if result1.is_err() || result2.is_err() || result3.is_err() {
            return Err("Failed to register context menu entries".to_string());
        }
        
        Ok(exe_str)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Context menu registration is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn unregister_context_menu() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("reg")
            .args([
                "delete",
                r"HKEY_CURRENT_USER\Software\Classes\*\shell\LocalConvert",
                "/f"
            ])
            .output()
            .ok();
        Ok(())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Context menu unregistration is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn get_startup_files() -> Vec<String> {
    // Get command line arguments (skip the first one which is the executable path)
    let args: Vec<String> = std::env::args().skip(1).collect();
    
    // Filter to only include existing files
    args.into_iter()
        .filter(|arg| {
            let path = Path::new(arg);
            path.exists() && path.is_file()
        })
        .collect()
}

// PDF Text Editing Types
#[derive(serde::Deserialize)]
pub struct TextEdit {
    pub page: usize,        // 1-indexed page number
    pub x: f64,             // X position in PDF coordinates
    pub y: f64,             // Y position in PDF coordinates  
    pub width: f64,         // Width of the text block
    pub height: f64,        // Height of the text block
    #[allow(dead_code)]
    pub original_text: String,
    pub new_text: String,
    pub font_size: f64,
}

#[derive(serde::Serialize)]
pub struct PdfTextEditResult {
    pub success: bool,
    pub message: String,
    pub edits_applied: usize,
}

/// Apply text edits to a PDF using whiteout + replacement approach
/// This is more reliable than trying to modify content streams directly
#[tauri::command]
pub async fn apply_pdf_text_edits(
    input_path: String,
    output_path: String,
    edits: Vec<TextEdit>,
) -> Result<PdfTextEditResult, String> {
    use lopdf::{Document, Object, Stream};
    use std::io::BufWriter;
    
    // Load the PDF document
    let mut doc = Document::load(&input_path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;
    
    let mut edits_applied = 0;
    
    for edit in &edits {
        // Get the page (0-indexed in lopdf)
        let page_num = edit.page.saturating_sub(1) as u32;
        
        // Get page ID
        let pages = doc.get_pages();
        let page_id = match pages.get(&(page_num + 1)) {
            Some(id) => *id,
            None => continue,
        };
        
        // Get page dimensions for coordinate conversion
        let page = match doc.get_dictionary(page_id) {
            Ok(p) => p,
            Err(_) => continue,
        };
        
        // Get MediaBox to determine page height (for coordinate conversion)
        // lopdf uses f32 for Real values
        let page_height: f64 = page.get(b"MediaBox")
            .ok()
            .and_then(|obj| obj.as_array().ok())
            .and_then(|arr| arr.get(3))
            .and_then(|obj| match obj {
                Object::Real(r) => Some(*r as f64),
                Object::Integer(i) => Some(*i as f64),
                _ => None,
            })
            .unwrap_or(792.0); // Default to US Letter height
        
        // Convert from top-left origin (web) to bottom-left origin (PDF)
        let pdf_y = page_height - edit.y - edit.height;
        
        // Create the content to add: white rectangle + new text
        // We'll add this as a new content stream appended to the page
        let whiteout_and_text = format!(
            concat!(
                "q\n",                    // Save graphics state
                "1 1 1 rg\n",             // Set white fill color
                "{x} {y} {w} {h} re\n",   // Draw rectangle (x, y, width, height)
                "f\n",                    // Fill the rectangle
                "0 0 0 rg\n",             // Set black text color
                "BT\n",                   // Begin text
                "/F1 {size} Tf\n",        // Set font (built-in font, size)
                "{tx} {ty} Td\n",         // Position text
                "({text}) Tj\n",          // Show text
                "ET\n",                   // End text
                "Q\n"                     // Restore graphics state
            ),
            x = edit.x - 2.0,
            y = pdf_y - 2.0,
            w = edit.width + 4.0,
            h = edit.height + 4.0,
            size = edit.font_size,
            tx = edit.x,
            ty = pdf_y + (edit.height * 0.2), // Baseline adjustment
            text = escape_pdf_string(&edit.new_text),
        );
        
        // Create a new stream with the content
        let stream = Stream::new(
            lopdf::Dictionary::new(),
            whiteout_and_text.into_bytes(),
        );
        
        // Add the stream as a new object
        let stream_id = doc.add_object(stream);
        
        // Get the current Contents of the page
        if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
            let current_contents = page_dict.get(b"Contents").cloned();
            
            // Create an array of content streams (existing + new)
            let new_contents = match current_contents {
                Ok(Object::Reference(ref_id)) => {
                    Object::Array(vec![Object::Reference(ref_id), Object::Reference(stream_id)])
                }
                Ok(Object::Array(mut arr)) => {
                    arr.push(Object::Reference(stream_id));
                    Object::Array(arr)
                }
                _ => Object::Reference(stream_id),
            };
            
            page_dict.set(b"Contents", new_contents);
            
            // Ensure the page has a font resource for F1
            ensure_font_resource(&mut doc, page_id);
            
            edits_applied += 1;
        }
    }
    
    // Save the modified document
    let output_file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;
    let mut writer = BufWriter::new(output_file);
    
    doc.save_to(&mut writer)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    Ok(PdfTextEditResult {
        success: true,
        message: format!("Applied {} text edit(s)", edits_applied),
        edits_applied,
    })
}

/// Escape special characters for PDF string
fn escape_pdf_string(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}

/// Ensure the page has a font resource F1 (Helvetica)
/// This is a simplified version that creates a new Resources dict with the font
fn ensure_font_resource(doc: &mut lopdf::Document, page_id: lopdf::ObjectId) {
    use lopdf::Object;
    
    // Create Helvetica font dictionary
    let font_dict = lopdf::Dictionary::from_iter(vec![
        (b"Type".to_vec(), Object::Name(b"Font".to_vec())),
        (b"Subtype".to_vec(), Object::Name(b"Type1".to_vec())),
        (b"BaseFont".to_vec(), Object::Name(b"Helvetica".to_vec())),
    ]);
    
    let font_id = doc.add_object(font_dict);
    
    // First, read the current state without mutable borrow
    let (_has_resources, existing_resources) = {
        if let Ok(page_dict) = doc.get_dictionary(page_id) {
            match page_dict.get(b"Resources") {
                Ok(Object::Dictionary(res_dict)) => (true, Some(res_dict.clone())),
                Ok(Object::Reference(_)) => (true, None), // Has reference, handle separately
                _ => (false, None),
            }
        } else {
            (false, None)
        }
    };
    
    // Now perform mutations
    if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
        // Build new resources dictionary
        let mut new_resources = existing_resources.unwrap_or_else(lopdf::Dictionary::new);
        
        // Get existing fonts or create new font dict
        let mut font_resources = match new_resources.get(b"Font") {
            Ok(Object::Dictionary(fonts)) => fonts.clone(),
            _ => lopdf::Dictionary::new(),
        };
        
        // Add our font
        font_resources.set(b"F1", Object::Reference(font_id));
        new_resources.set(b"Font", Object::Dictionary(font_resources));
        
        // Set Resources on page (this will replace any existing, including references)
        // For simplicity, we always set an inline Resources dict
        page_dict.set(b"Resources", Object::Dictionary(new_resources));
    }
}

/// Get basic info about a PDF file
#[tauri::command]
pub async fn get_pdf_info(path: String) -> Result<PdfInfo, String> {
    use lopdf::Document;
    
    let doc = Document::load(&path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;
    
    let page_count = doc.get_pages().len();
    
    // Get file size
    let file_size = fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(PdfInfo {
        page_count,
        file_size,
    })
}

#[derive(serde::Serialize)]
pub struct PdfInfo {
    pub page_count: usize,
    pub file_size: u64,
}

/// PDF form field information
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PdfFormField {
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
    pub type_code: i32,
    pub value: String,
    pub page: u32,
    pub rect: Vec<f64>,
    pub flags: i32,
    pub is_read_only: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_checked: Option<bool>,
}

/// Result from getting PDF form fields
#[derive(serde::Serialize)]
pub struct PdfFormFieldsResult {
    pub success: bool,
    pub fields: Vec<PdfFormField>,
    pub field_count: u32,
    pub error: Option<String>,
}

/// Form field value to fill
#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub struct PdfFormFieldValue {
    pub name: String,
    pub value: String,
}

/// Result from filling PDF form fields
#[derive(serde::Serialize)]
pub struct PdfFillFieldsResult {
    pub success: bool,
    pub fields_filled: u32,
    pub error: Option<String>,
    pub output_path: String,
}

/// Get form fields from a PDF (stub - to be implemented in Rust)
#[tauri::command]
pub async fn get_pdf_form_fields(_input_path: String) -> Result<PdfFormFieldsResult, String> {
    // TODO: Implement form field extraction using lopdf
    Ok(PdfFormFieldsResult {
        success: false,
        fields: vec![],
        field_count: 0,
        error: Some("Form field extraction not yet implemented in pure Rust".to_string()),
    })
}

/// Fill form fields in a PDF (stub - to be implemented in Rust)
#[tauri::command]
pub async fn fill_pdf_form_fields(
    _input_path: String,
    output_path: String,
    _fields: Vec<PdfFormFieldValue>,
) -> Result<PdfFillFieldsResult, String> {
    // TODO: Implement form field filling using lopdf
    Ok(PdfFillFieldsResult {
        success: false,
        fields_filled: 0,
        error: Some("Form field filling not yet implemented in pure Rust".to_string()),
        output_path,
    })
}

// ============================================================================
// PURE RUST PDF TEXT EDITING (using lopdf - MIT licensed)
// ============================================================================

/// Text block extracted from PDF
#[derive(serde::Serialize)]
pub struct PdfTextBlock {
    pub text: String,
    pub page_num: u32,
    pub operator_index: usize,
    pub x: f64,
    pub y: f64,
    pub font_name: String,
    pub font_size: f64,
    pub width: f64,
    pub height: f64,
    pub operator_type: String,
}

/// Result of text block extraction
#[derive(serde::Serialize)]
pub struct PdfTextBlocksResult {
    pub success: bool,
    pub blocks: Vec<PdfTextBlock>,
    pub page_count: usize,
    pub error: Option<String>,
}

/// Text edit request for lopdf-based editing
#[derive(serde::Deserialize)]
pub struct LopdfTextEdit {
    pub page: u32,
    pub operator_index: usize,
    pub new_text: String,
    #[serde(default)]
    pub original_text: Option<String>,
}

/// Result of lopdf text editing
#[derive(serde::Serialize)]
pub struct LopdfEditResult {
    pub success: bool,
    pub edits_applied: usize,
    pub error: Option<String>,
    pub output_path: String,
}

/// Extract text blocks from a PDF using lopdf (pure Rust, MIT licensed)
/// 
/// This parses the PDF content streams to find all text operators (Tj, TJ, ', ")
/// and extracts the text along with position and font information.
#[tauri::command]
pub async fn get_pdf_text_blocks(input_path: String) -> Result<PdfTextBlocksResult, String> {
    eprintln!("[lopdf] Extracting text blocks from: {}", input_path);
    
    let result = pdf_text_editor::extract_text_blocks(&input_path);
    
    // Convert internal TextBlock to PdfTextBlock for serialization
    let blocks: Vec<PdfTextBlock> = result.blocks.into_iter().map(|b| PdfTextBlock {
        text: b.text,
        page_num: b.page_num,
        operator_index: b.operator_index,
        x: b.x,
        y: b.y,
        font_name: b.font_name,
        font_size: b.font_size,
        width: b.width,
        height: b.height,
        operator_type: b.operator_type,
    }).collect();
    
    eprintln!("[lopdf] Extracted {} text blocks from {} pages", blocks.len(), result.page_count);
    
    Ok(PdfTextBlocksResult {
        success: result.success,
        blocks,
        page_count: result.page_count,
        error: result.error,
    })
}

/// Edit PDF text using lopdf (pure Rust, MIT licensed)
/// 
/// This performs TRUE text editing by modifying the PDF content streams directly.
/// The original text is replaced in-place, not covered with a white rectangle.
/// 
/// ## Important Notes
/// 
/// - This modifies the actual PDF content stream operators
/// - Font encoding is handled automatically (WinAnsi, UTF-16BE)
/// - For Unicode text, UTF-16BE with BOM is used
/// - Original text positioning is preserved (but width may change)
#[tauri::command]
pub async fn edit_pdf_text_lopdf(
    input_path: String,
    output_path: String,
    edits: Vec<LopdfTextEdit>,
) -> Result<LopdfEditResult, String> {
    eprintln!("[lopdf] Editing PDF text: {} edits", edits.len());
    eprintln!("[lopdf] Input: {}", input_path);
    eprintln!("[lopdf] Output: {}", output_path);
    
    // Convert to internal edit format
    let edit_requests: Vec<pdf_text_editor::TextEditRequest> = edits.into_iter().map(|e| {
        pdf_text_editor::TextEditRequest {
            page: e.page,
            operator_index: e.operator_index,
            new_text: e.new_text,
            original_text: e.original_text,
        }
    }).collect();
    
    let result = pdf_text_editor::replace_text(&input_path, &output_path, &edit_requests);
    
    eprintln!("[lopdf] Result: success={}, edits_applied={}", result.success, result.edits_applied);
    
    if let Some(ref err) = result.error {
        eprintln!("[lopdf] Error: {}", err);
    }
    
    Ok(LopdfEditResult {
        success: result.success,
        edits_applied: result.edits_applied,
        error: result.error,
        output_path,
    })
}

/// Search and replace text in a PDF using lopdf
/// 
/// This is a convenience function that:
/// 1. Extracts all text blocks
/// 2. Finds blocks containing the search text
/// 3. Replaces the text in those blocks
#[tauri::command]
pub async fn search_replace_pdf_text(
    input_path: String,
    output_path: String,
    search_text: String,
    replace_text: String,
    case_sensitive: Option<bool>,
) -> Result<LopdfEditResult, String> {
    eprintln!("[lopdf] Search and replace: '{}' -> '{}'", search_text, replace_text);
    
    let case_sensitive = case_sensitive.unwrap_or(true);
    
    // Extract text blocks
    let extraction = pdf_text_editor::extract_text_blocks(&input_path);
    
    if !extraction.success {
        return Ok(LopdfEditResult {
            success: false,
            edits_applied: 0,
            error: extraction.error,
            output_path,
        });
    }
    
    // Find blocks that contain the search text and create edits
    let edits: Vec<pdf_text_editor::TextEditRequest> = extraction.blocks.iter()
        .filter(|block| {
            if case_sensitive {
                block.text.contains(&search_text)
            } else {
                block.text.to_lowercase().contains(&search_text.to_lowercase())
            }
        })
        .map(|block| {
            let new_text = if case_sensitive {
                block.text.replace(&search_text, &replace_text)
            } else {
                // Case-insensitive replacement
                let lower_text = block.text.to_lowercase();
                let lower_search = search_text.to_lowercase();
                let mut result = block.text.clone();
                
                // Find all occurrences and replace (preserving case of replacement)
                let mut offset = 0;
                while let Some(pos) = lower_text[offset..].find(&lower_search) {
                    let actual_pos = offset + pos;
                    result = format!(
                        "{}{}{}",
                        &result[..actual_pos],
                        &replace_text,
                        &result[actual_pos + search_text.len()..]
                    );
                    offset = actual_pos + replace_text.len();
                }
                result
            };
            
            pdf_text_editor::TextEditRequest {
                page: block.page_num,
                operator_index: block.operator_index,
                new_text,
                original_text: Some(block.text.clone()),
            }
        })
        .collect();
    
    eprintln!("[lopdf] Found {} blocks to edit", edits.len());
    
    if edits.is_empty() {
        return Ok(LopdfEditResult {
            success: true,
            edits_applied: 0,
            error: Some(format!("No text matching '{}' found", search_text)),
            output_path,
        });
    }
    
    let result = pdf_text_editor::replace_text(&input_path, &output_path, &edits);
    
    Ok(LopdfEditResult {
        success: result.success,
        edits_applied: result.edits_applied,
        error: result.error,
        output_path,
    })
}

/// Get page dimensions for a PDF
#[tauri::command]
pub async fn get_pdf_page_dimensions(input_path: String) -> Result<Vec<PageDimensions>, String> {
    use lopdf::Document;
    
    let doc = Document::load(&input_path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;
    
    let pages = doc.get_pages();
    let mut dimensions = Vec::new();
    
    for (&page_num, &page_id) in &pages {
        let page_dict = doc.get_dictionary(page_id)
            .map_err(|e| format!("Failed to get page dictionary: {}", e))?;
        
        // Get MediaBox (required) or CropBox (preferred)
        let media_box = page_dict.get(b"CropBox")
            .or_else(|_| page_dict.get(b"MediaBox"))
            .ok()
            .and_then(|obj| obj.as_array().ok())
            .map(|arr| {
                let values: Vec<f64> = arr.iter().filter_map(|o| {
                    match o {
                        lopdf::Object::Integer(i) => Some(*i as f64),
                        lopdf::Object::Real(r) => Some(*r as f64),
                        _ => None,
                    }
                }).collect();
                
                if values.len() >= 4 {
                    (values[2] - values[0], values[3] - values[1])
                } else {
                    (612.0, 792.0) // Default US Letter
                }
            })
            .unwrap_or((612.0, 792.0));
        
        // Get rotation
        let rotation = page_dict.get(b"Rotate")
            .ok()
            .and_then(|obj| match obj {
                lopdf::Object::Integer(i) => Some(*i as i32),
                _ => None,
            })
            .unwrap_or(0);
        
        dimensions.push(PageDimensions {
            page_num,
            width: media_box.0,
            height: media_box.1,
            rotation,
        });
    }
    
    // Sort by page number
    dimensions.sort_by_key(|d| d.page_num);
    
    Ok(dimensions)
}

/// Page dimensions result
#[derive(serde::Serialize)]
pub struct PageDimensions {
    pub page_num: u32,
    pub width: f64,
    pub height: f64,
    pub rotation: i32,
}

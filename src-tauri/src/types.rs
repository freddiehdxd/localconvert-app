use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub category: String,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub resolution: Option<String>,
    pub codec: Option<String>,
    pub subtitles: Option<Vec<SubtitleStream>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionOptions {
    pub quality: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub bitrate: Option<String>,
    pub fps: Option<serde_json::Value>,
    pub preserve_metadata: Option<bool>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub compression_level: Option<u32>,
    pub use_gpu: Option<bool>,
    pub gpu_encoder: Option<String>,
    
    // Advanced Video Settings
    pub preset_resolution: Option<String>,
    pub custom_width: Option<u32>,
    pub custom_height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub bitrate_mode: Option<String>,
    pub video_bitrate: Option<f64>,
    pub crf: Option<u32>,
    pub two_pass: Option<bool>,
    
    // New Audio & Subtitle Settings
    pub maintain_aspect_ratio: Option<bool>,
    pub audio_bitrate_kbps: Option<u32>,
    pub audio_sample_rate: Option<String>,
    pub volume_db: Option<i32>,
    pub channel_layout: Option<String>,
    pub subtitle_action: Option<String>,
    pub subtitle_stream_index: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub available: bool,
    pub encoders: Vec<GpuEncoder>,
    pub preferred_encoder: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuEncoder {
    pub name: String,
    pub codec: String,
    pub vendor: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionProgress {
    pub job_id: String,
    pub progress: f32,
    pub current_time_secs: f64,
    pub total_duration_secs: f64,
    pub speed: f64,
    pub eta_secs: Option<f64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatInfo {
    pub extension: String,
    pub name: String,
    pub category: String,
    pub supported_outputs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct PdfOptions {
    pub pages: Option<Vec<u32>>,
    pub rotation: Option<i32>,
    pub watermark_text: Option<String>,
    pub watermark_opacity: Option<f32>,
    pub compression_level: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub quality: Option<u32>,
    pub crop_x: Option<u32>,
    pub crop_y: Option<u32>,
    pub crop_width: Option<u32>,
    pub crop_height: Option<u32>,
    pub rotation: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoOptions {
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub bitrate: Option<String>,
    pub audio_bitrate: Option<String>,
    pub fps: Option<serde_json::Value>,
    pub crf: Option<u32>,
    pub use_gpu: Option<bool>,
    pub gpu_encoder: Option<String>,
    
    // Advanced Video Settings
    pub preset_resolution: Option<String>,
    pub custom_width: Option<u32>,
    pub custom_height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub bitrate_mode: Option<String>,
    pub video_bitrate: Option<f64>,
    pub two_pass: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ArchiveOptions {
    pub format: String,
    pub compression_level: Option<u32>,
    pub password: Option<String>,
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            quality: Some(85),
            width: None,
            height: None,
            bitrate: None,
            fps: None,
            preserve_metadata: Some(true),
            start_time: None,
            end_time: None,
            compression_level: None,
            use_gpu: None,
            gpu_encoder: None,
            preset_resolution: None,
            custom_width: None,
            custom_height: None,
            video_codec: None,
            audio_codec: None,
            bitrate_mode: None,
            video_bitrate: None,
            crf: None,
            two_pass: None,
            maintain_aspect_ratio: None,
            audio_bitrate_kbps: None,
            audio_sample_rate: None,
            volume_db: None,
            channel_layout: None,
            subtitle_action: None,
            subtitle_stream_index: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleStream {
    pub index: usize,
    pub language: Option<String>,
    pub codec: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: Option<f64>,
    pub resolution: Option<String>,
    pub codec: Option<String>,
    pub subtitles: Vec<SubtitleStream>,
}

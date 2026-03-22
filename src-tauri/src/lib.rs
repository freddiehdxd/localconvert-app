mod commands;
mod converter;
mod pdf_text_editor;
mod tools;
mod types;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Initialize app data directory
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            
            // Create binaries directory for conversion tools
            let binaries_dir = app_data_dir.join("binaries");
            std::fs::create_dir_all(&binaries_dir).ok();
            
            // Set app handle for progress events
            converter::set_app_handle(app.handle().clone());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_tools,
            commands::download_tool,
            commands::detect_gpu,
            commands::convert_file,
            commands::cancel_conversion,
            commands::get_file_info,
            commands::get_supported_formats,
            commands::merge_pdfs,
            commands::split_pdf,
            commands::compress_pdf,
            commands::rotate_pdf,
            commands::add_watermark,
            commands::pdf_to_images,
            commands::images_to_pdf,
            commands::resize_image,
            commands::compress_image,
            commands::crop_image,
            commands::rotate_image,
            commands::trim_video,
            commands::extract_audio,
            commands::compress_video,
            commands::ocr_pdf,
            commands::get_default_output_dir,
            commands::get_image_preview,
            commands::extract_archive,
            commands::create_archive,
            commands::open_file_location,
            commands::open_folder,
            commands::get_file_size_estimate,
            commands::get_video_duration,
            commands::get_video_thumbnail,
            commands::register_context_menu,
            commands::unregister_context_menu,
            commands::get_startup_files,
            commands::apply_pdf_text_edits,
            commands::get_pdf_info,
            commands::get_pdf_form_fields,
            commands::fill_pdf_form_fields,
            // Pure Rust PDF text editing (lopdf - MIT licensed)
            commands::get_pdf_text_blocks,
            commands::edit_pdf_text_lopdf,
            commands::search_replace_pdf_text,
            commands::get_pdf_page_dimensions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

//! True PDF Text Editing with lopdf
//! 
//! This module provides functionality to extract and replace text in PDFs
//! by directly modifying the content streams, rather than using whiteout overlays.
//! 
//! ## How PDF Text Works
//! 
//! PDF pages contain "content streams" with operators like:
//! - `BT` ... `ET` = Begin/End text block
//! - `Tf` = Set font (e.g., `/F1 12 Tf`)
//! - `Td`, `Tm` = Position text
//! - `Tj` = Show text string: `(Hello World) Tj`
//! - `TJ` = Show text with positioning: `[(Hel) -20 (lo)] TJ`
//!
//! All libraries used are MIT/Apache 2.0 licensed.

use lopdf::{Document, Object, ObjectId};
use lopdf::content::Content;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a text block extracted from a PDF
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextBlock {
    /// The extracted text content
    pub text: String,
    /// Page number (1-indexed)
    pub page_num: u32,
    /// Object ID of the page
    #[serde(skip)]
    #[allow(dead_code)]
    pub object_id: Option<ObjectId>,
    /// Index of the operator in the content stream
    pub operator_index: usize,
    /// X position in PDF coordinates (from bottom-left)
    pub x: f64,
    /// Y position in PDF coordinates (from bottom-left)
    pub y: f64,
    /// Font name used for this text
    pub font_name: String,
    /// Font size in points
    pub font_size: f64,
    /// Width of the text block (estimated)
    pub width: f64,
    /// Height of the text block (estimated)
    pub height: f64,
    /// The operator type ("Tj" or "TJ")
    pub operator_type: String,
}

/// Represents an edit to be applied to a text block
#[derive(Debug, Clone, Deserialize)]
pub struct TextEditRequest {
    /// Page number (1-indexed)
    pub page: u32,
    /// Index of the operator in the content stream
    pub operator_index: usize,
    /// New text to replace with
    pub new_text: String,
    /// Original text (for verification)
    #[allow(dead_code)]
    pub original_text: Option<String>,
}

/// Result of text extraction
#[derive(Debug, Clone, Serialize)]
pub struct TextExtractionResult {
    pub success: bool,
    pub blocks: Vec<TextBlock>,
    pub page_count: usize,
    pub error: Option<String>,
}

/// Result of text editing
#[derive(Debug, Clone, Serialize)]
pub struct TextEditResult {
    pub success: bool,
    pub edits_applied: usize,
    pub error: Option<String>,
}

/// Font information cached for a page
#[derive(Debug, Clone)]
struct FontInfo {
    #[allow(dead_code)]
    base_font: String,
    encoding: FontEncoding,
    to_unicode: Option<HashMap<u16, char>>,
}

/// Font encoding types
#[derive(Debug, Clone)]
enum FontEncoding {
    WinAnsiEncoding,
    MacRomanEncoding,
    StandardEncoding,
    IdentityH,
    Custom(HashMap<u8, char>),
    Unknown,
}

/// Graphics state for tracking text rendering
#[derive(Debug, Clone, Default)]
struct GraphicsState {
    /// Current font name
    font_name: String,
    /// Current font size
    font_size: f64,
    /// Current X position
    #[allow(dead_code)]
    x: f64,
    /// Current Y position
    #[allow(dead_code)]
    y: f64,
    /// Text matrix
    tm: [f64; 6],
    /// Character spacing
    char_spacing: f64,
    /// Word spacing
    word_spacing: f64,
    /// Horizontal scaling
    horizontal_scaling: f64,
    /// Text leading
    leading: f64,
}

impl GraphicsState {
    fn new() -> Self {
        Self {
            font_name: String::new(),
            font_size: 12.0,
            x: 0.0,
            y: 0.0,
            tm: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            char_spacing: 0.0,
            word_spacing: 0.0,
            horizontal_scaling: 100.0,
            leading: 0.0,
        }
    }
}

/// Extract text blocks from a PDF document
pub fn extract_text_blocks(path: &str) -> TextExtractionResult {
    let doc = match Document::load(path) {
        Ok(d) => d,
        Err(e) => return TextExtractionResult {
            success: false,
            blocks: vec![],
            page_count: 0,
            error: Some(format!("Failed to load PDF: {}", e)),
        },
    };

    let mut blocks = Vec::new();
    let pages = doc.get_pages();
    let page_count = pages.len();

    for (&page_num, &page_id) in &pages {
        match extract_page_text_blocks(&doc, page_num, page_id) {
            Ok(page_blocks) => blocks.extend(page_blocks),
            Err(e) => {
                eprintln!("[PDF Text] Error extracting page {}: {}", page_num, e);
            }
        }
    }

    TextExtractionResult {
        success: true,
        blocks,
        page_count,
        error: None,
    }
}

/// Extract text blocks from a single page
fn extract_page_text_blocks(
    doc: &Document,
    page_num: u32,
    page_id: ObjectId,
) -> Result<Vec<TextBlock>, String> {
    let mut blocks = Vec::new();
    
    // Get page content
    let content_data = doc.get_page_content(page_id)
        .map_err(|e| format!("Failed to get page content: {}", e))?;
    
    let content = Content::decode(&content_data)
        .map_err(|e| format!("Failed to decode content stream: {}", e))?;

    // Get fonts for this page
    let fonts = get_page_fonts(doc, page_id);
    
    // Parse the content stream
    let mut state = GraphicsState::new();
    let mut state_stack: Vec<GraphicsState> = vec![];
    let mut in_text_block = false;
    let mut text_line_x = 0.0;
    let mut text_line_y = 0.0;

    for (idx, operation) in content.operations.iter().enumerate() {
        match operation.operator.as_str() {
            // Graphics state save/restore
            "q" => state_stack.push(state.clone()),
            "Q" => {
                if let Some(s) = state_stack.pop() {
                    state = s;
                }
            }
            
            // Begin/End text block
            "BT" => {
                in_text_block = true;
                text_line_x = 0.0;
                text_line_y = 0.0;
                state.tm = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
            }
            "ET" => {
                in_text_block = false;
            }
            
            // Font selection: /FontName fontSize Tf
            "Tf" => {
                if operation.operands.len() >= 2 {
                    if let Some(Object::Name(name)) = operation.operands.get(0) {
                        state.font_name = String::from_utf8_lossy(name).to_string();
                    }
                    if let Some(size) = get_number(&operation.operands[1]) {
                        state.font_size = size;
                    }
                }
            }
            
            // Text positioning
            "Td" | "TD" => {
                if operation.operands.len() >= 2 {
                    let tx = get_number(&operation.operands[0]).unwrap_or(0.0);
                    let ty = get_number(&operation.operands[1]).unwrap_or(0.0);
                    text_line_x += tx;
                    text_line_y += ty;
                    state.tm[4] = text_line_x;
                    state.tm[5] = text_line_y;
                    
                    if operation.operator == "TD" {
                        state.leading = -ty;
                    }
                }
            }
            
            // Text matrix
            "Tm" => {
                if operation.operands.len() >= 6 {
                    for i in 0..6 {
                        state.tm[i] = get_number(&operation.operands[i]).unwrap_or(state.tm[i]);
                    }
                    text_line_x = state.tm[4];
                    text_line_y = state.tm[5];
                }
            }
            
            // Move to start of next line
            "T*" => {
                text_line_y -= state.leading;
                state.tm[4] = text_line_x;
                state.tm[5] = text_line_y;
            }
            
            // Set character spacing
            "Tc" => {
                if let Some(v) = operation.operands.get(0).and_then(|o| get_number(o)) {
                    state.char_spacing = v;
                }
            }
            
            // Set word spacing
            "Tw" => {
                if let Some(v) = operation.operands.get(0).and_then(|o| get_number(o)) {
                    state.word_spacing = v;
                }
            }
            
            // Set horizontal scaling
            "Tz" => {
                if let Some(v) = operation.operands.get(0).and_then(|o| get_number(o)) {
                    state.horizontal_scaling = v;
                }
            }
            
            // Set text leading
            "TL" => {
                if let Some(v) = operation.operands.get(0).and_then(|o| get_number(o)) {
                    state.leading = v;
                }
            }
            
            // Show text: (text) Tj
            "Tj" => {
                if in_text_block {
                    if let Some(Object::String(bytes, _)) = operation.operands.get(0) {
                        let text = decode_pdf_string(bytes, &state.font_name, &fonts);
                        let width = estimate_text_width(&text, state.font_size);
                        
                        blocks.push(TextBlock {
                            text,
                            page_num,
                            object_id: Some(page_id),
                            operator_index: idx,
                            x: state.tm[4],
                            y: state.tm[5],
                            font_name: state.font_name.clone(),
                            font_size: state.font_size,
                            width,
                            height: state.font_size * 1.2,
                            operator_type: "Tj".to_string(),
                        });
                    }
                }
            }
            
            // Show text with positioning: [(text) kern (text)] TJ
            "TJ" => {
                if in_text_block {
                    if let Some(Object::Array(arr)) = operation.operands.get(0) {
                        let mut combined_text = String::new();
                        
                        for item in arr {
                            match item {
                                Object::String(bytes, _) => {
                                    let decoded = decode_pdf_string(bytes, &state.font_name, &fonts);
                                    combined_text.push_str(&decoded);
                                }
                                Object::Integer(_) | Object::Real(_) => {
                                    // Kerning value - can optionally track for positioning
                                }
                                _ => {}
                            }
                        }
                        
                        if !combined_text.is_empty() {
                            let width = estimate_text_width(&combined_text, state.font_size);
                            
                            blocks.push(TextBlock {
                                text: combined_text,
                                page_num,
                                object_id: Some(page_id),
                                operator_index: idx,
                                x: state.tm[4],
                                y: state.tm[5],
                                font_name: state.font_name.clone(),
                                font_size: state.font_size,
                                width,
                                height: state.font_size * 1.2,
                                operator_type: "TJ".to_string(),
                            });
                        }
                    }
                }
            }
            
            // Show text and move to next line
            "'" => {
                // Move to next line then show text
                text_line_y -= state.leading;
                state.tm[4] = text_line_x;
                state.tm[5] = text_line_y;
                
                if let Some(Object::String(bytes, _)) = operation.operands.get(0) {
                    let text = decode_pdf_string(bytes, &state.font_name, &fonts);
                    let width = estimate_text_width(&text, state.font_size);
                    
                    blocks.push(TextBlock {
                        text,
                        page_num,
                        object_id: Some(page_id),
                        operator_index: idx,
                        x: state.tm[4],
                        y: state.tm[5],
                        font_name: state.font_name.clone(),
                        font_size: state.font_size,
                        width,
                        height: state.font_size * 1.2,
                        operator_type: "'".to_string(),
                    });
                }
            }
            
            // Show text with word/char spacing then move to next line
            "\"" => {
                if operation.operands.len() >= 3 {
                    state.word_spacing = get_number(&operation.operands[0]).unwrap_or(0.0);
                    state.char_spacing = get_number(&operation.operands[1]).unwrap_or(0.0);
                    
                    text_line_y -= state.leading;
                    state.tm[4] = text_line_x;
                    state.tm[5] = text_line_y;
                    
                    if let Some(Object::String(bytes, _)) = operation.operands.get(2) {
                        let text = decode_pdf_string(bytes, &state.font_name, &fonts);
                        let width = estimate_text_width(&text, state.font_size);
                        
                        blocks.push(TextBlock {
                            text,
                            page_num,
                            object_id: Some(page_id),
                            operator_index: idx,
                            x: state.tm[4],
                            y: state.tm[5],
                            font_name: state.font_name.clone(),
                            font_size: state.font_size,
                            width,
                            height: state.font_size * 1.2,
                            operator_type: "\"".to_string(),
                        });
                    }
                }
            }
            
            _ => {}
        }
    }

    Ok(blocks)
}

/// Replace text in a PDF document
pub fn replace_text(
    input_path: &str,
    output_path: &str,
    edits: &[TextEditRequest],
) -> TextEditResult {
    let mut doc = match Document::load(input_path) {
        Ok(d) => d,
        Err(e) => return TextEditResult {
            success: false,
            edits_applied: 0,
            error: Some(format!("Failed to load PDF: {}", e)),
        },
    };

    let pages = doc.get_pages();
    let mut edits_applied = 0;

    // Group edits by page
    let mut page_edits: HashMap<u32, Vec<&TextEditRequest>> = HashMap::new();
    for edit in edits {
        page_edits.entry(edit.page).or_default().push(edit);
    }

    for (page_num, edits) in page_edits {
        let page_id = match pages.get(&page_num) {
            Some(&id) => id,
            None => {
                eprintln!("[PDF Edit] Page {} not found", page_num);
                continue;
            }
        };

        match apply_page_edits(&mut doc, page_id, &edits) {
            Ok(count) => edits_applied += count,
            Err(e) => {
                eprintln!("[PDF Edit] Error editing page {}: {}", page_num, e);
            }
        }
    }

    // Save the modified document
    if let Err(e) = doc.save(output_path) {
        return TextEditResult {
            success: false,
            edits_applied,
            error: Some(format!("Failed to save PDF: {}", e)),
        };
    }

    TextEditResult {
        success: true,
        edits_applied,
        error: None,
    }
}

/// Apply edits to a single page
fn apply_page_edits(
    doc: &mut Document,
    page_id: ObjectId,
    edits: &[&TextEditRequest],
) -> Result<usize, String> {
    // Get page content
    let content_data = doc.get_page_content(page_id)
        .map_err(|e| format!("Failed to get page content: {}", e))?;
    
    let mut content = Content::decode(&content_data)
        .map_err(|e| format!("Failed to decode content stream: {}", e))?;

    // Get fonts for encoding (reserved for future use)
    let _fonts = get_page_fonts(doc, page_id);
    
    let mut edits_applied = 0;

    // Sort edits by operator index (descending) to avoid index shifting issues
    let mut sorted_edits: Vec<_> = edits.iter().collect();
    sorted_edits.sort_by(|a, b| b.operator_index.cmp(&a.operator_index));

    for edit in sorted_edits {
        if edit.operator_index >= content.operations.len() {
            eprintln!("[PDF Edit] Operator index {} out of range", edit.operator_index);
            continue;
        }

        let operation = &mut content.operations[edit.operator_index];
        
        match operation.operator.as_str() {
            "Tj" => {
                // Simple string replacement
                let encoded = encode_pdf_string(&edit.new_text);
                operation.operands[0] = Object::String(encoded, lopdf::StringFormat::Literal);
                edits_applied += 1;
            }
            "TJ" => {
                // TJ array replacement - put all text in a single string
                let encoded = encode_pdf_string(&edit.new_text);
                operation.operands[0] = Object::Array(vec![
                    Object::String(encoded, lopdf::StringFormat::Literal)
                ]);
                edits_applied += 1;
            }
            "'" | "\"" => {
                // Single quote/double quote operators
                let operand_idx = if operation.operator == "\"" { 2 } else { 0 };
                if operation.operands.len() > operand_idx {
                    let encoded = encode_pdf_string(&edit.new_text);
                    operation.operands[operand_idx] = Object::String(encoded, lopdf::StringFormat::Literal);
                    edits_applied += 1;
                }
            }
            _ => {
                eprintln!("[PDF Edit] Unsupported operator: {}", operation.operator);
            }
        }
    }

    // Encode and update the content stream
    let new_content = content.encode()
        .map_err(|e| format!("Failed to encode content stream: {}", e))?;
    
    doc.change_page_content(page_id, new_content)
        .map_err(|e| format!("Failed to update page content: {}", e))?;

    Ok(edits_applied)
}

/// Get font information for a page
fn get_page_fonts(doc: &Document, page_id: ObjectId) -> HashMap<String, FontInfo> {
    let mut fonts = HashMap::new();
    
    // Get the page dictionary
    let page_dict = match doc.get_dictionary(page_id) {
        Ok(d) => d,
        Err(_) => return fonts,
    };
    
    // Get Resources dictionary (might be reference or inline)
    let resources = match page_dict.get(b"Resources") {
        Ok(Object::Dictionary(d)) => d.clone(),
        Ok(Object::Reference(r)) => {
            match doc.get_dictionary(*r) {
                Ok(d) => d.clone(),
                Err(_) => return fonts,
            }
        }
        _ => return fonts,
    };
    
    // Get Font dictionary from Resources
    let font_dict = match resources.get(b"Font") {
        Ok(Object::Dictionary(d)) => d.clone(),
        Ok(Object::Reference(r)) => {
            match doc.get_dictionary(*r) {
                Ok(d) => d.clone(),
                Err(_) => return fonts,
            }
        }
        _ => return fonts,
    };
    
    // Iterate through fonts
    for (name, value) in font_dict.iter() {
        let font_name = String::from_utf8_lossy(name).to_string();
        
        let font_obj = match value {
            Object::Reference(r) => doc.get_dictionary(*r).ok(),
            Object::Dictionary(d) => Some(d),
            _ => None,
        };
        
        if let Some(font_dict) = font_obj {
            let base_font = font_dict.get(b"BaseFont")
                .ok()
                .and_then(|o| match o {
                    Object::Name(n) => Some(String::from_utf8_lossy(n).to_string()),
                    _ => None,
                })
                .unwrap_or_default();
            
            let encoding = get_font_encoding(font_dict, doc);
            let to_unicode = get_to_unicode_map(font_dict, doc);
            
            fonts.insert(font_name, FontInfo {
                base_font,
                encoding,
                to_unicode,
            });
        }
    }
    
    fonts
}

/// Get font encoding from font dictionary
fn get_font_encoding(font_dict: &lopdf::Dictionary, doc: &Document) -> FontEncoding {
    match font_dict.get(b"Encoding") {
        Ok(Object::Name(name)) => {
            match name.as_slice() {
                b"WinAnsiEncoding" => FontEncoding::WinAnsiEncoding,
                b"MacRomanEncoding" => FontEncoding::MacRomanEncoding,
                b"StandardEncoding" => FontEncoding::StandardEncoding,
                b"Identity-H" | b"Identity-V" => FontEncoding::IdentityH,
                _ => FontEncoding::Unknown,
            }
        }
        Ok(Object::Dictionary(enc_dict)) => {
            // Custom encoding with Differences array
            let mut mapping = HashMap::new();
            
            if let Ok(Object::Array(diffs)) = enc_dict.get(b"Differences") {
                let mut current_code = 0u8;
                
                for obj in diffs {
                    match obj {
                        Object::Integer(i) => {
                            current_code = *i as u8;
                        }
                        Object::Name(name) => {
                            if let Some(ch) = glyph_name_to_char(&String::from_utf8_lossy(name)) {
                                mapping.insert(current_code, ch);
                            }
                            current_code = current_code.wrapping_add(1);
                        }
                        _ => {}
                    }
                }
            }
            
            if mapping.is_empty() {
                FontEncoding::WinAnsiEncoding
            } else {
                FontEncoding::Custom(mapping)
            }
        }
        Ok(Object::Reference(r)) => {
            if let Ok(enc_dict) = doc.get_dictionary(*r) {
                get_font_encoding(enc_dict, doc)
            } else {
                FontEncoding::WinAnsiEncoding
            }
        }
        _ => FontEncoding::WinAnsiEncoding,
    }
}

/// Get ToUnicode CMap for font
fn get_to_unicode_map(font_dict: &lopdf::Dictionary, doc: &Document) -> Option<HashMap<u16, char>> {
    let to_unicode = font_dict.get(b"ToUnicode").ok()?;
    
    let stream_data = match to_unicode {
        Object::Reference(r) => {
            let stream = doc.get_object(*r).ok()?;
            if let Object::Stream(s) = stream {
                s.content.clone()
            } else {
                return None;
            }
        }
        Object::Stream(s) => s.content.clone(),
        _ => return None,
    };
    
    // Parse the CMap
    parse_cmap(&stream_data)
}

/// Parse a simple CMap for ToUnicode mapping
fn parse_cmap(data: &[u8]) -> Option<HashMap<u16, char>> {
    let content = String::from_utf8_lossy(data);
    let mut map = HashMap::new();
    
    // Look for beginbfchar/endbfchar pairs
    let mut in_bfchar = false;
    for line in content.lines() {
        let trimmed = line.trim();
        
        if trimmed.contains("beginbfchar") {
            in_bfchar = true;
            continue;
        }
        if trimmed.contains("endbfchar") {
            in_bfchar = false;
            continue;
        }
        
        if in_bfchar {
            // Format: <XX> <XXXX> or <XXXX> <XXXX>
            let parts: Vec<&str> = trimmed.split('<')
                .filter(|s| !s.is_empty())
                .collect();
            
            if parts.len() >= 2 {
                let src = parts[0].trim_end_matches('>').trim();
                let dst = parts[1].trim_end_matches('>').trim();
                
                if let (Ok(src_code), Ok(dst_code)) = (
                    u16::from_str_radix(src, 16),
                    u32::from_str_radix(dst, 16),
                ) {
                    if let Some(ch) = char::from_u32(dst_code) {
                        map.insert(src_code, ch);
                    }
                }
            }
        }
    }
    
    // Also look for beginbfrange/endbfrange
    let mut in_bfrange = false;
    for line in content.lines() {
        let trimmed = line.trim();
        
        if trimmed.contains("beginbfrange") {
            in_bfrange = true;
            continue;
        }
        if trimmed.contains("endbfrange") {
            in_bfrange = false;
            continue;
        }
        
        if in_bfrange {
            // Format: <XX> <XX> <XXXX>
            let parts: Vec<&str> = trimmed.split('<')
                .filter(|s| !s.is_empty())
                .collect();
            
            if parts.len() >= 3 {
                let start = parts[0].trim_end_matches('>').trim();
                let end = parts[1].trim_end_matches('>').trim();
                let dst = parts[2].trim_end_matches('>').trim();
                
                if let (Ok(start_code), Ok(end_code), Ok(dst_start)) = (
                    u16::from_str_radix(start, 16),
                    u16::from_str_radix(end, 16),
                    u32::from_str_radix(dst, 16),
                ) {
                    for (i, code) in (start_code..=end_code).enumerate() {
                        if let Some(ch) = char::from_u32(dst_start + i as u32) {
                            map.insert(code, ch);
                        }
                    }
                }
            }
        }
    }
    
    if map.is_empty() {
        None
    } else {
        Some(map)
    }
}

/// Decode a PDF string to Unicode
fn decode_pdf_string(bytes: &[u8], font_name: &str, fonts: &HashMap<String, FontInfo>) -> String {
    // Check for UTF-16BE BOM
    if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        // UTF-16BE with BOM
        let utf16: Vec<u16> = bytes[2..]
            .chunks(2)
            .map(|c| u16::from_be_bytes([c[0], c.get(1).copied().unwrap_or(0)]))
            .collect();
        return String::from_utf16_lossy(&utf16);
    }
    
    // Check for UTF-16BE without BOM (high bytes present)
    if bytes.len() >= 2 {
        let has_high_bytes = bytes.chunks(2).any(|c| c[0] != 0);
        if has_high_bytes && bytes.iter().all(|&b| b < 128 || b > 127) {
            // Might be UTF-16BE
            let utf16: Vec<u16> = bytes
                .chunks(2)
                .map(|c| u16::from_be_bytes([c[0], c.get(1).copied().unwrap_or(0)]))
                .collect();
            let s = String::from_utf16_lossy(&utf16);
            if !s.contains('\u{FFFD}') {
                return s;
            }
        }
    }
    
    // Get font info
    if let Some(font_info) = fonts.get(font_name) {
        // Try ToUnicode map first
        if let Some(to_unicode) = &font_info.to_unicode {
            let mut result = String::new();
            
            // Check if this is a 2-byte encoding
            if bytes.len() >= 2 && matches!(font_info.encoding, FontEncoding::IdentityH) {
                for chunk in bytes.chunks(2) {
                    if chunk.len() == 2 {
                        let code = u16::from_be_bytes([chunk[0], chunk[1]]);
                        if let Some(&ch) = to_unicode.get(&code) {
                            result.push(ch);
                        } else {
                            result.push('\u{FFFD}');
                        }
                    }
                }
                return result;
            }
            
            // Single-byte lookup
            for &byte in bytes {
                if let Some(&ch) = to_unicode.get(&(byte as u16)) {
                    result.push(ch);
                } else {
                    result.push(byte as char);
                }
            }
            return result;
        }
        
        // Use encoding
        match &font_info.encoding {
            FontEncoding::WinAnsiEncoding => {
                return decode_win_ansi(bytes);
            }
            FontEncoding::MacRomanEncoding => {
                return decode_mac_roman(bytes);
            }
            FontEncoding::Custom(mapping) => {
                let mut result = String::new();
                for &byte in bytes {
                    if let Some(&ch) = mapping.get(&byte) {
                        result.push(ch);
                    } else {
                        result.push(byte as char);
                    }
                }
                return result;
            }
            FontEncoding::IdentityH => {
                // CID font, try as UTF-16BE
                if bytes.len() % 2 == 0 {
                    let utf16: Vec<u16> = bytes
                        .chunks(2)
                        .map(|c| u16::from_be_bytes([c[0], c[1]]))
                        .collect();
                    return String::from_utf16_lossy(&utf16);
                }
            }
            _ => {}
        }
    }
    
    // Default: try WinAnsi, then Latin-1
    let win_ansi = decode_win_ansi(bytes);
    if win_ansi.chars().all(|c| !c.is_control() || c == '\n' || c == '\r' || c == '\t') {
        return win_ansi;
    }
    
    // Fallback to Latin-1
    bytes.iter().map(|&b| b as char).collect()
}

/// Decode WinAnsiEncoding bytes
fn decode_win_ansi(bytes: &[u8]) -> String {
    // Use encoding_rs for proper Windows-1252 decoding
    let (result, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
    result.into_owned()
}

/// Decode MacRomanEncoding bytes
fn decode_mac_roman(bytes: &[u8]) -> String {
    let (result, _, _) = encoding_rs::MACINTOSH.decode(bytes);
    result.into_owned()
}

/// Encode a string for PDF
pub fn encode_pdf_string(text: &str) -> Vec<u8> {
    // For ASCII-compatible text, use simple encoding
    if text.chars().all(|c| c as u32 <= 255) {
        // Try WinAnsi encoding first
        let (result, _, had_errors) = encoding_rs::WINDOWS_1252.encode(text);
        if !had_errors {
            return result.into_owned();
        }
    }
    
    // For Unicode text, use UTF-16BE with BOM
    let mut result = vec![0xFE, 0xFF]; // UTF-16BE BOM
    for c in text.encode_utf16() {
        result.extend_from_slice(&c.to_be_bytes());
    }
    result
}

/// Get a number from a PDF object
fn get_number(obj: &Object) -> Option<f64> {
    match obj {
        Object::Integer(i) => Some(*i as f64),
        Object::Real(r) => Some(*r as f64),
        _ => None,
    }
}

/// Estimate text width based on font size (rough approximation)
fn estimate_text_width(text: &str, font_size: f64) -> f64 {
    // Average character width is about 0.5-0.6 of font size for most fonts
    // This is a rough estimate; actual width depends on the specific font
    let char_count = text.chars().count();
    char_count as f64 * font_size * 0.5
}

/// Convert glyph name to Unicode character
fn glyph_name_to_char(name: &str) -> Option<char> {
    // Common glyph names to Unicode mapping
    match name {
        "space" => Some(' '),
        "exclam" => Some('!'),
        "quotedbl" => Some('"'),
        "numbersign" => Some('#'),
        "dollar" => Some('$'),
        "percent" => Some('%'),
        "ampersand" => Some('&'),
        "quotesingle" => Some('\''),
        "parenleft" => Some('('),
        "parenright" => Some(')'),
        "asterisk" => Some('*'),
        "plus" => Some('+'),
        "comma" => Some(','),
        "hyphen" | "minus" => Some('-'),
        "period" => Some('.'),
        "slash" => Some('/'),
        "zero" => Some('0'),
        "one" => Some('1'),
        "two" => Some('2'),
        "three" => Some('3'),
        "four" => Some('4'),
        "five" => Some('5'),
        "six" => Some('6'),
        "seven" => Some('7'),
        "eight" => Some('8'),
        "nine" => Some('9'),
        "colon" => Some(':'),
        "semicolon" => Some(';'),
        "less" => Some('<'),
        "equal" => Some('='),
        "greater" => Some('>'),
        "question" => Some('?'),
        "at" => Some('@'),
        "bracketleft" => Some('['),
        "backslash" => Some('\\'),
        "bracketright" => Some(']'),
        "asciicircum" => Some('^'),
        "underscore" => Some('_'),
        "grave" | "quoteleft" => Some('`'),
        "braceleft" => Some('{'),
        "bar" => Some('|'),
        "braceright" => Some('}'),
        "asciitilde" => Some('~'),
        "bullet" => Some('•'),
        "ellipsis" => Some('…'),
        "emdash" => Some('—'),
        "endash" => Some('–'),
        "fi" => Some('\u{FB01}'),
        "fl" => Some('\u{FB02}'),
        "quotedblleft" => Some('"'),
        "quotedblright" => Some('"'),
        "quoteright" => Some('\u{2019}'),  // '
        "quoteleft2" => Some('\u{2018}'),  // '
        _ => {
            // Single letter names (A-Z, a-z)
            if name.len() == 1 {
                name.chars().next()
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_ascii() {
        let result = encode_pdf_string("Hello World");
        assert_eq!(result, b"Hello World");
    }

    #[test]
    fn test_encode_unicode() {
        let result = encode_pdf_string("Hello 世界");
        // Should start with UTF-16BE BOM
        assert_eq!(&result[0..2], &[0xFE, 0xFF]);
    }

    #[test]
    fn test_decode_win_ansi() {
        let bytes = vec![0x48, 0x65, 0x6c, 0x6c, 0x6f]; // "Hello"
        let result = decode_win_ansi(&bytes);
        assert_eq!(result, "Hello");
    }
}

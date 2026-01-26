import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { invoke } from '@tauri-apps/api/core';
import type { PdfPage, AnnotationData } from '../types';

interface PdfEditResult {
  success: boolean;
  edits_applied: number;
  error?: string;
  output_path: string;
}

// ============ Form Field Types ============

export interface PdfFormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'combobox' | 'listbox' | 'button' | 'signature' | 'unknown';
  type_code: number;
  value: string;
  page: number;
  rect: [number, number, number, number]; // [x0, y0, x1, y1]
  flags: number;
  is_read_only: boolean;
  options?: string[]; // For dropdown/listbox
  is_checked?: boolean; // For checkbox/radio
}

interface PdfFormFieldsResult {
  success: boolean;
  fields: PdfFormField[];
  field_count: number;
  error?: string;
}

interface PdfFillFieldsResult {
  success: boolean;
  fields_filled: number;
  error?: string;
  output_path: string;
}

/**
 * Get all form fields from a PDF
 */
export async function getPdfFormFields(inputPath: string): Promise<PdfFormFieldsResult> {
  try {
    const result = await invoke<PdfFormFieldsResult>('get_pdf_form_fields', {
      inputPath,
    });
    console.log('[PDF Form Fields] Found:', result.field_count, 'fields');
    return result;
  } catch (error) {
    console.error('[PDF Form Fields] Error:', error);
    return {
      success: false,
      fields: [],
      field_count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fill form fields in a PDF
 */
export async function fillPdfFormFields(
  inputPath: string,
  outputPath: string,
  fields: Array<{ name: string; value: string }>
): Promise<PdfFillFieldsResult> {
  try {
    console.log('[PDF Fill Fields] Filling', fields.length, 'fields');
    const result = await invoke<PdfFillFieldsResult>('fill_pdf_form_fields', {
      inputPath,
      outputPath,
      fields,
    });
    console.log('[PDF Fill Fields] Result:', result);
    return result;
  } catch (error) {
    console.error('[PDF Fill Fields] Error:', error);
    return {
      success: false,
      fields_filled: 0,
      error: error instanceof Error ? error.message : String(error),
      output_path: outputPath,
    };
  }
}

// Interface for lopdf text edit request
interface LopdfTextEdit {
  page: number;
  operator_index: number;
  new_text: string;
  original_text?: string;
}

interface LopdfEditResult {
  success: boolean;
  edits_applied: number;
  error?: string;
  output_path: string;
}

/**
 * Edit PDF text using lopdf (pure Rust, MIT licensed)
 * This performs TRUE text editing by modifying content streams directly.
 */
export async function editPdfTextWithLopdf(
  inputPath: string,
  outputPath: string,
  pages: PdfPage[]
): Promise<PdfEditResult> {
  // First, get text blocks from the PDF to find operator indices
  const textBlocksResult = await invoke<{
    success: boolean;
    blocks: Array<{
      text: string;
      page_num: number;
      operator_index: number;
      x: number;
      y: number;
      font_name: string;
      font_size: number;
    }>;
    error?: string;
  }>('get_pdf_text_blocks', { inputPath });

  if (!textBlocksResult.success) {
    console.warn('[lopdf] Failed to get text blocks:', textBlocksResult.error);
    return {
      success: false,
      edits_applied: 0,
      error: textBlocksResult.error,
      output_path: outputPath,
    };
  }

  // Collect all text edits from all pages
  const edits: LopdfTextEdit[] = [];
  
  for (const page of pages) {
    const editedBlocks = page.textBlocks?.filter(b => b.isEdited && b.editedText !== undefined) || [];
    
    for (const block of editedBlocks) {
      // Find the matching text block from lopdf extraction by matching text and approximate position
      const matchingBlock = textBlocksResult.blocks.find(lb => 
        lb.page_num === page.pageNumber && 
        lb.text === block.text &&
        Math.abs(lb.x - block.x) < 5 &&
        Math.abs(lb.y - (page.height - block.y - block.height)) < 5
      );
      
      if (matchingBlock) {
        edits.push({
          page: page.pageNumber,
          operator_index: matchingBlock.operator_index,
          new_text: block.editedText || '',
          original_text: block.text,
        });
      } else {
        console.warn('[lopdf] Could not find matching block for:', block.text);
        // Try fuzzy match by text content only
        const fuzzyMatch = textBlocksResult.blocks.find(lb =>
          lb.page_num === page.pageNumber &&
          lb.text.includes(block.text.substring(0, 10))
        );
        if (fuzzyMatch) {
          edits.push({
            page: page.pageNumber,
            operator_index: fuzzyMatch.operator_index,
            new_text: block.editedText || '',
            original_text: block.text,
          });
        }
      }
    }
  }
  
  if (edits.length === 0) {
    return {
      success: true,
      edits_applied: 0,
      output_path: outputPath,
    };
  }
  
  console.log('[lopdf] Applying', edits.length, 'text edits');
  
  try {
    const result = await invoke<LopdfEditResult>('edit_pdf_text_lopdf', {
      inputPath,
      outputPath,
      edits,
    });
    return {
      success: result.success,
      edits_applied: result.edits_applied,
      error: result.error,
      output_path: result.output_path,
    };
  } catch (error) {
    return {
      success: false,
      edits_applied: 0,
      error: error instanceof Error ? error.message : String(error),
      output_path: outputPath,
    };
  }
}

/**
 * Smart save function that uses lopdf (pure Rust) for true text editing,
 * with fallback to whiteout method if needed.
 */
export async function savePdfWithTextEditsSmart(
  inputPath: string,
  outputPath: string,
  originalPdfBytes: ArrayBuffer,
  pages: PdfPage[],
  options: SaveOptions = {}
): Promise<{ bytes: Uint8Array; usedLopdf: boolean; editsApplied: number }> {
  const hasEdits = pages.some(p => p.textBlocks?.some(b => b.isEdited && b.editedText !== undefined));
  
  console.log('[PDF Save] Has text edits:', hasEdits);
  
  if (!hasEdits) {
    // No text edits, just apply annotations with pdf-lib
    console.log('[PDF Save] No text edits, using pdf-lib only');
    const bytes = await savePdfWithTextEdits(originalPdfBytes, pages, options);
    return { bytes, usedLopdf: false, editsApplied: 0 };
  }
  
  // Use lopdf (pure Rust) for true text editing
  console.log('[PDF Save] Using lopdf for true text editing...');
  console.log('[PDF Save] Input path:', inputPath);
  console.log('[PDF Save] Output path:', outputPath);
  
  const result = await editPdfTextWithLopdf(inputPath, outputPath, pages);
  console.log('[PDF Save] lopdf result:', result);
  
  if (result.success && result.edits_applied > 0) {
    // Read the modified file back
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const bytes = await readFile(outputPath);
    
    // Apply annotations on top if needed (lopdf only handles text)
    if (options.includeAnnotations) {
      const annotatedBytes = await applyAnnotationsOnly(bytes.buffer as ArrayBuffer, pages);
      return { bytes: annotatedBytes, usedLopdf: true, editsApplied: result.edits_applied };
    }
    
    return { bytes: new Uint8Array(bytes), usedLopdf: true, editsApplied: result.edits_applied };
  } else if (result.error) {
    console.warn('[PDF Save] lopdf text edit failed, falling back to whiteout method:', result.error);
  }
  
  // Fallback to whiteout method
  console.log('[PDF Save] Using whiteout method (fallback)');
  const bytes = await savePdfWithTextEdits(originalPdfBytes, pages, options);
  const editCount = getEditedBlockCount(pages);
  return { bytes, usedLopdf: false, editsApplied: editCount };
}

/**
 * Apply only annotations (no text edits) - used after lopdf text editing
 */
async function applyAnnotationsOnly(
  pdfBytes: ArrayBuffer,
  pages: PdfPage[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pdfPages = pdfDoc.getPages();
  
  for (const pageData of pages) {
    if (pageData.pageNumber > pdfPages.length) continue;
    
    const page = pdfPages[pageData.pageNumber - 1];
    const { height } = page.getSize();
    
    if (pageData.annotations.length > 0) {
      await applyAnnotationsToPage(pdfDoc, page, pageData.annotations, height);
    }
  }
  
  return pdfDoc.save();
}

// Map common PDF font names to pdf-lib StandardFonts
const fontNameMap: Record<string, StandardFonts> = {
  // Helvetica family
  'Helvetica': StandardFonts.Helvetica,
  'Helvetica-Bold': StandardFonts.HelveticaBold,
  'Helvetica-Oblique': StandardFonts.HelveticaOblique,
  'Helvetica-BoldOblique': StandardFonts.HelveticaBoldOblique,
  'HelveticaNeue': StandardFonts.Helvetica,
  'ArialMT': StandardFonts.Helvetica,
  'Arial': StandardFonts.Helvetica,
  'Arial-BoldMT': StandardFonts.HelveticaBold,
  'Arial-ItalicMT': StandardFonts.HelveticaOblique,
  'Arial-BoldItalicMT': StandardFonts.HelveticaBoldOblique,
  
  // Times family
  'Times': StandardFonts.TimesRoman,
  'Times-Roman': StandardFonts.TimesRoman,
  'Times-Bold': StandardFonts.TimesRomanBold,
  'Times-Italic': StandardFonts.TimesRomanItalic,
  'Times-BoldItalic': StandardFonts.TimesRomanBoldItalic,
  'TimesNewRoman': StandardFonts.TimesRoman,
  'TimesNewRomanPS': StandardFonts.TimesRoman,
  'TimesNewRomanPSMT': StandardFonts.TimesRoman,
  'TimesNewRomanPS-BoldMT': StandardFonts.TimesRomanBold,
  'TimesNewRomanPS-ItalicMT': StandardFonts.TimesRomanItalic,
  'TimesNewRomanPS-BoldItalicMT': StandardFonts.TimesRomanBoldItalic,
  
  // Courier family
  'Courier': StandardFonts.Courier,
  'Courier-Bold': StandardFonts.CourierBold,
  'Courier-Oblique': StandardFonts.CourierOblique,
  'Courier-BoldOblique': StandardFonts.CourierBoldOblique,
  'CourierNew': StandardFonts.Courier,
  'CourierNewPS': StandardFonts.Courier,
  'CourierNewPSMT': StandardFonts.Courier,
  
  // Symbol and Zapf
  'Symbol': StandardFonts.Symbol,
  'ZapfDingbats': StandardFonts.ZapfDingbats,
  
  // Common sans-serif mappings
  'sans-serif': StandardFonts.Helvetica,
  'SansSerif': StandardFonts.Helvetica,
  'Verdana': StandardFonts.Helvetica,
  'Tahoma': StandardFonts.Helvetica,
  'Calibri': StandardFonts.Helvetica,
  'Segoe UI': StandardFonts.Helvetica,
  
  // Common serif mappings
  'serif': StandardFonts.TimesRoman,
  'Serif': StandardFonts.TimesRoman,
  'Georgia': StandardFonts.TimesRoman,
  'Cambria': StandardFonts.TimesRoman,
  
  // Monospace mappings
  'monospace': StandardFonts.Courier,
  'Monospace': StandardFonts.Courier,
  'Consolas': StandardFonts.Courier,
  'Monaco': StandardFonts.Courier,
};

/**
 * Get the best matching StandardFont for a given font name
 */
function getStandardFont(fontName: string): StandardFonts {
  // Direct match
  if (fontNameMap[fontName]) {
    return fontNameMap[fontName];
  }
  
  // Try without spaces and special characters
  const normalizedName = fontName.replace(/[\s\-_,]/g, '');
  if (fontNameMap[normalizedName]) {
    return fontNameMap[normalizedName];
  }
  
  // Try partial matching
  const lowerName = fontName.toLowerCase();
  
  if (lowerName.includes('helvetica') || lowerName.includes('arial') || lowerName.includes('sans')) {
    if (lowerName.includes('bold') && lowerName.includes('italic')) {
      return StandardFonts.HelveticaBoldOblique;
    }
    if (lowerName.includes('bold')) {
      return StandardFonts.HelveticaBold;
    }
    if (lowerName.includes('italic') || lowerName.includes('oblique')) {
      return StandardFonts.HelveticaOblique;
    }
    return StandardFonts.Helvetica;
  }
  
  if (lowerName.includes('times') || lowerName.includes('serif')) {
    if (lowerName.includes('bold') && lowerName.includes('italic')) {
      return StandardFonts.TimesRomanBoldItalic;
    }
    if (lowerName.includes('bold')) {
      return StandardFonts.TimesRomanBold;
    }
    if (lowerName.includes('italic')) {
      return StandardFonts.TimesRomanItalic;
    }
    return StandardFonts.TimesRoman;
  }
  
  if (lowerName.includes('courier') || lowerName.includes('mono') || lowerName.includes('consola')) {
    if (lowerName.includes('bold') && (lowerName.includes('italic') || lowerName.includes('oblique'))) {
      return StandardFonts.CourierBoldOblique;
    }
    if (lowerName.includes('bold')) {
      return StandardFonts.CourierBold;
    }
    if (lowerName.includes('italic') || lowerName.includes('oblique')) {
      return StandardFonts.CourierOblique;
    }
    return StandardFonts.Courier;
  }
  
  // Default fallback
  return StandardFonts.Helvetica;
}

/**
 * Parse hex color to RGB values (0-1 range)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 }; // Default to black
}

export interface SaveOptions {
  /** Whether to include annotations (drawings, shapes, etc.) */
  includeAnnotations?: boolean;
  /** Whether to flatten annotations (merge into page content) */
  flattenAnnotations?: boolean;
}

/**
 * Save PDF with text edits applied using whiteout + replacement approach.
 * This is how professional tools like Sejda handle text replacement.
 */
export async function savePdfWithTextEdits(
  originalPdfBytes: ArrayBuffer,
  pages: PdfPage[],
  options: SaveOptions = {}
): Promise<Uint8Array> {
  const { includeAnnotations = true } = options;
  
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pdfPages = pdfDoc.getPages();
  
  // Cache embedded fonts to avoid re-embedding
  const fontCache = new Map<StandardFonts, PDFFont>();
  
  const embedFont = async (standardFont: StandardFonts): Promise<PDFFont> => {
    if (fontCache.has(standardFont)) {
      return fontCache.get(standardFont)!;
    }
    const font = await pdfDoc.embedFont(standardFont);
    fontCache.set(standardFont, font);
    return font;
  };
  
  for (const pageData of pages) {
    if (pageData.pageNumber > pdfPages.length) continue;
    
    const page = pdfPages[pageData.pageNumber - 1];
    const { height } = page.getSize();
    
    // Apply text edits
    const editedBlocks = pageData.textBlocks?.filter(b => b.isEdited && b.editedText !== undefined) || [];
    
    for (const block of editedBlocks) {
      // Get the best matching font
      const standardFont = getStandardFont(block.fontFamily);
      const font = await embedFont(standardFont);
      
      // Use the original transform if available for accurate positioning
      // Transform matrix: [scaleX, skewX, skewY, scaleY, x, y]
      // transform[4] = x position, transform[5] = y position (baseline in PDF coords)
      const originalX = block.transform ? block.transform[4] : block.x;
      const originalY = block.transform ? block.transform[5] : (height - block.y - block.height);
      
      // Calculate dimensions with padding for complete coverage
      const textHeight = block.height;
      const padding = 4;
      
      // 1. Draw white rectangle over original text (whiteout)
      // Position rectangle to cover from below baseline to above ascenders
      const rectX = originalX - padding;
      const rectY = originalY - (textHeight * 0.25) - padding; // Below baseline
      const rectWidth = block.width + (padding * 2) + 8;
      const rectHeight = textHeight + (padding * 2);
      
      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        color: rgb(1, 1, 1), // White
        borderWidth: 0,
      });
      
      // 2. Draw new text at the original baseline position
      page.drawText(block.editedText || '', {
        x: originalX,
        y: originalY,
        size: block.fontSize,
        font,
        color: rgb(0, 0, 0), // Black text
      });
    }
    
    // Apply fabric.js annotations if requested
    if (includeAnnotations && pageData.annotations.length > 0) {
      await applyAnnotationsToPage(pdfDoc, page, pageData.annotations, height);
    }
  }
  
  return pdfDoc.save();
}

/**
 * Apply fabric.js annotations to a PDF page
 */
async function applyAnnotationsToPage(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[0],
  annotations: AnnotationData[],
  pageHeight: number
): Promise<void> {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  for (const annotation of annotations) {
    try {
      const fabricObj = JSON.parse(annotation.fabricObject);
      
      // Convert fabric coordinates to PDF coordinates
      const x = fabricObj.left || 0;
      const y = pageHeight - (fabricObj.top || 0);
      
      switch (annotation.type) {
        case 'rectangle':
        case 'whiteout': {
          const width = fabricObj.width * (fabricObj.scaleX || 1);
          const height = fabricObj.height * (fabricObj.scaleY || 1);
          const fillColor = fabricObj.fill ? hexToRgb(fabricObj.fill) : { r: 1, g: 1, b: 1 };
          
          page.drawRectangle({
            x,
            y: y - height,
            width,
            height,
            color: rgb(fillColor.r, fillColor.g, fillColor.b),
            borderColor: fabricObj.stroke ? rgb(...Object.values(hexToRgb(fabricObj.stroke)) as [number, number, number]) : undefined,
            borderWidth: fabricObj.strokeWidth || 0,
          });
          break;
        }
        
        case 'circle': {
          const radius = fabricObj.radius * Math.max(fabricObj.scaleX || 1, fabricObj.scaleY || 1);
          const fillColor = fabricObj.fill ? hexToRgb(fabricObj.fill) : null;
          const strokeColor = fabricObj.stroke ? hexToRgb(fabricObj.stroke) : { r: 0, g: 0, b: 0 };
          
          page.drawCircle({
            x: x + radius,
            y: y - radius,
            size: radius,
            color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
            borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
            borderWidth: fabricObj.strokeWidth || 1,
          });
          break;
        }
        
        case 'text': {
          const textColor = fabricObj.fill ? hexToRgb(fabricObj.fill) : { r: 0, g: 0, b: 0 };
          const fontSize = fabricObj.fontSize || 16;
          
          page.drawText(fabricObj.text || '', {
            x,
            y: y - fontSize,
            size: fontSize,
            font: helvetica,
            color: rgb(textColor.r, textColor.g, textColor.b),
          });
          break;
        }
        
        case 'line': {
          const strokeColor = fabricObj.stroke ? hexToRgb(fabricObj.stroke) : { r: 0, g: 0, b: 0 };
          
          // Fabric line uses x1, y1, x2, y2
          if (fabricObj.x1 !== undefined && fabricObj.y1 !== undefined) {
            page.drawLine({
              start: { x: x + fabricObj.x1, y: y - fabricObj.y1 },
              end: { x: x + fabricObj.x2, y: y - fabricObj.y2 },
              color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
              thickness: fabricObj.strokeWidth || 1,
            });
          }
          break;
        }
        
        case 'highlight': {
          const width = fabricObj.width * (fabricObj.scaleX || 1);
          const height = fabricObj.height * (fabricObj.scaleY || 1);
          const opacity = fabricObj.opacity || 0.3;
          
          page.drawRectangle({
            x,
            y: y - height,
            width,
            height,
            color: rgb(1, 1, 0), // Yellow
            opacity,
          });
          break;
        }
        
        // Note: Complex paths (draw tool) are harder to convert to PDF
        // They would require converting fabric path data to PDF path operators
        case 'draw':
        default:
          // Skip unsupported annotation types for now
          console.log(`Skipping annotation type: ${annotation.type}`);
          break;
      }
    } catch (error) {
      console.error('Failed to apply annotation:', error);
    }
  }
}

/**
 * Check if any pages have text edits
 */
export function hasTextEdits(pages: PdfPage[]): boolean {
  return pages.some(page => 
    page.textBlocks?.some(block => block.isEdited && block.editedText !== undefined)
  );
}

/**
 * Get count of edited text blocks across all pages
 */
export function getEditedBlockCount(pages: PdfPage[]): number {
  return pages.reduce((count, page) => {
    const editedCount = page.textBlocks?.filter(b => b.isEdited && b.editedText !== undefined).length || 0;
    return count + editedCount;
  }, 0);
}

/**
 * Check if text fits within original bounds
 * Returns ratio: < 1 means text fits, > 1 means overflow
 */
export function checkTextFit(
  newText: string,
  originalWidth: number,
  fontSize: number,
  _fontFamily: string // Reserved for future font-specific width calculations
): number {
  // Approximate character width (varies by font, this is a rough estimate)
  const avgCharWidth = fontSize * 0.6;
  const newTextWidth = newText.length * avgCharWidth;
  
  return newTextWidth / originalWidth;
}

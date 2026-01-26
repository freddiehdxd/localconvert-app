import { useState, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, TextItem } from "pdfjs-dist/types/src/display/api";
import type { PdfPage, TextBlock, FormField } from "../types";
import { getPdfFormFields } from "../services/pdfSaveService";

// Use the local worker file from public folder
// In production, this will be bundled with the app
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface UsePdfDocumentReturn {
  pdfDoc: PDFDocumentProxy | null;
  pages: PdfPage[];
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  /** Original PDF bytes for saving with modifications */
  originalPdfBytes: ArrayBuffer | null;
  /** All form fields across all pages */
  formFields: FormField[];
  /** Whether the PDF has form fields */
  hasFormFields: boolean;
  loadPdf: (data: ArrayBuffer, filePath?: string) => Promise<void>;
  getPageCanvas: (pageNumber: number, scale: number) => Promise<HTMLCanvasElement | null>;
  renderPageToCanvas: (pageNumber: number, canvas: HTMLCanvasElement, scale: number) => Promise<void>;
  generateThumbnail: (pageNumber: number) => Promise<string>;
  extractTextBlocks: (pageNumber: number) => Promise<TextBlock[]>;
  updateTextBlock: (pageNumber: number, blockId: string, newText: string) => void;
  /** Update a form field value */
  updateFormField: (fieldName: string, newValue: string) => void;
  /** Get all edited form fields */
  getEditedFormFields: () => Array<{ name: string; value: string }>;
  rotatePage: (pageNumber: number, degrees: number) => void;
  deletePage: (pageNumber: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  addBlankPage: (afterPage: number) => void;
  /** Check if any text blocks have been edited */
  hasTextEdits: () => boolean;
  /** Get count of edited text blocks */
  getEditedCount: () => number;
  /** Check if any form fields have been edited */
  hasFormEdits: () => boolean;
}

export function usePdfDocument(): UsePdfDocumentReturn {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  
  // Store original PDF bytes for saving with modifications
  const originalBytesRef = useRef<ArrayBuffer | null>(null);
  // Store file path for form field extraction
  const filePathRef = useRef<string | null>(null);

  const loadPdf = useCallback(async (data: ArrayBuffer, filePath?: string) => {
    setIsLoading(true);
    setError(null);
    pageCache.current.clear();
    setFormFields([]);
    
    // Store original bytes for later saving
    originalBytesRef.current = data.slice(0); // Create a copy
    filePathRef.current = filePath || null;

    try {
      // Use getDocument with options for better compatibility
      const loadingTask = pdfjsLib.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      console.log("PDF document loaded, pages:", doc.numPages);
      setPdfDoc(doc);

      // Initialize pages array
      const pagesData: PdfPage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        pagesData.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          rotation: 0,
          annotations: [],
        });
      }
      setPages(pagesData);

      // Extract form fields if file path is provided
      if (filePath) {
        try {
          console.log("[Form Fields] Extracting form fields from:", filePath);
          const result = await getPdfFormFields(filePath);
          if (result.success && result.fields.length > 0) {
            console.log("[Form Fields] Found", result.fields.length, "form fields");
            // Convert to internal FormField format
            const fields: FormField[] = result.fields.map((f) => ({
              name: f.name,
              type: f.type as FormField['type'],
              value: f.value,
              page: f.page,
              x: f.rect[0],
              y: f.rect[1],
              width: f.rect[2] - f.rect[0],
              height: f.rect[3] - f.rect[1],
              isReadOnly: f.is_read_only,
              options: f.options,
              isChecked: f.is_checked,
              isEdited: false,
            }));
            setFormFields(fields);
          }
        } catch (formErr) {
          console.warn("[Form Fields] Failed to extract form fields:", formErr);
          // Don't fail the whole load if form field extraction fails
        }
      }
    } catch (err) {
      console.error("Failed to load PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF");
      originalBytesRef.current = null; // Clear on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPageCanvas = useCallback(async (
    pageNumber: number,
    scale: number
  ): Promise<HTMLCanvasElement | null> => {
    if (!pdfDoc) return null;

    const cacheKey = `${pageNumber}-${scale}`;
    if (pageCache.current.has(cacheKey)) {
      return pageCache.current.get(cacheKey)!;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const pageData = pages.find((p) => p.pageNumber === pageNumber);
      const rotation = pageData?.rotation || 0;
      
      const viewport = page.getViewport({ scale, rotation });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // @ts-expect-error - pdfjs-dist types may require canvas property in some versions
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      pageCache.current.set(cacheKey, canvas);
      return canvas;
    } catch (err) {
      console.error(`Failed to render page ${pageNumber}:`, err);
      return null;
    }
  }, [pdfDoc, pages]);

  const renderPageToCanvas = useCallback(async (
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number
  ): Promise<void> => {
    if (!pdfDoc) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const pageData = pages.find((p) => p.pageNumber === pageNumber);
      const rotation = pageData?.rotation || 0;
      
      const viewport = page.getViewport({ scale, rotation });
      
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // @ts-expect-error - pdfjs-dist types may require canvas property in some versions
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    } catch (err) {
      console.error(`Failed to render page ${pageNumber}:`, err);
    }
  }, [pdfDoc, pages]);

  const generateThumbnail = useCallback(async (pageNumber: number): Promise<string> => {
    const canvas = await getPageCanvas(pageNumber, 0.2);
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  }, [getPageCanvas]);

  // Extract text blocks from a PDF page
  const extractTextBlocks = useCallback(async (pageNumber: number): Promise<TextBlock[]> => {
    if (!pdfDoc) return [];

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      
      const textBlocks: TextBlock[] = [];
      let blockId = 0;

      textContent.items.forEach((item) => {
        // Type guard for TextItem (has 'str' property)
        if (!('str' in item) || !item.str.trim()) return;
        
        const textItem = item as TextItem;
        const transform = textItem.transform;
        
        // Transform matrix: [scaleX, skewX, skewY, scaleY, x, y]
        // Extract position and font size from transform
        const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
        const x = transform[4];
        // PDF coordinates have origin at bottom-left, convert to top-left
        const y = viewport.height - transform[5];
        
        // Approximate width and height
        const width = textItem.width || (textItem.str.length * fontSize * 0.6);
        const height = textItem.height || fontSize * 1.2;

        textBlocks.push({
          id: `text-${pageNumber}-${blockId++}`,
          pageNumber,
          text: textItem.str,
          x,
          y: y - height, // Adjust for top-left origin
          width,
          height,
          fontSize,
          fontFamily: textItem.fontName || 'sans-serif',
          transform,
          isEdited: false,
        });
      });

      // Update the page data with text blocks
      setPages((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, textBlocks }
            : p
        )
      );

      return textBlocks;
    } catch (err) {
      console.error(`Failed to extract text from page ${pageNumber}:`, err);
      return [];
    }
  }, [pdfDoc]);

  // Update a text block when user edits it
  const updateTextBlock = useCallback((pageNumber: number, blockId: string, newText: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber !== pageNumber) return p;
        
        const textBlocks = p.textBlocks?.map((block) =>
          block.id === blockId
            ? { ...block, isEdited: true, editedText: newText }
            : block
        );
        
        return { ...p, textBlocks };
      })
    );
  }, []);

  const rotatePage = useCallback((pageNumber: number, degrees: number) => {
    setPages((prev) =>
      prev.map((page) =>
        page.pageNumber === pageNumber
          ? { ...page, rotation: (page.rotation + degrees) % 360 }
          : page
      )
    );
    // Clear cache for this page
    pageCache.current.forEach((_, key) => {
      if (key.startsWith(`${pageNumber}-`)) {
        pageCache.current.delete(key);
      }
    });
  }, []);

  const deletePage = useCallback((pageNumber: number) => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.pageNumber !== pageNumber);
      // Renumber pages
      return filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  }, []);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages((prev) => {
      const newPages = [...prev];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      // Renumber pages
      return newPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  }, []);

  const addBlankPage = useCallback((afterPage: number) => {
    setPages((prev) => {
      const newPage: PdfPage = {
        pageNumber: afterPage + 1,
        width: 612, // Letter size in points
        height: 792,
        rotation: 0,
        annotations: [],
      };
      const newPages = [...prev];
      newPages.splice(afterPage, 0, newPage);
      // Renumber pages
      return newPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  }, []);

  // Check if any text blocks have been edited
  const hasTextEdits = useCallback((): boolean => {
    return pages.some(page => 
      page.textBlocks?.some(block => block.isEdited && block.editedText !== undefined)
    );
  }, [pages]);

  // Get count of edited text blocks
  const getEditedCount = useCallback((): number => {
    return pages.reduce((count, page) => {
      const editedCount = page.textBlocks?.filter(b => b.isEdited && b.editedText !== undefined).length || 0;
      return count + editedCount;
    }, 0);
  }, [pages]);

  // Update a form field value
  const updateFormField = useCallback((fieldName: string, newValue: string) => {
    setFormFields((prev) =>
      prev.map((field) =>
        field.name === fieldName
          ? { ...field, isEdited: true, editedValue: newValue }
          : field
      )
    );
  }, []);

  // Get all edited form fields for saving
  const getEditedFormFields = useCallback((): Array<{ name: string; value: string }> => {
    return formFields
      .filter((f) => f.isEdited && f.editedValue !== undefined)
      .map((f) => ({ name: f.name, value: f.editedValue! }));
  }, [formFields]);

  // Check if any form fields have been edited
  const hasFormEdits = useCallback((): boolean => {
    return formFields.some((f) => f.isEdited && f.editedValue !== undefined);
  }, [formFields]);

  return {
    pdfDoc,
    pages,
    totalPages: pages.length,
    isLoading,
    error,
    originalPdfBytes: originalBytesRef.current,
    formFields,
    hasFormFields: formFields.length > 0,
    loadPdf,
    getPageCanvas,
    renderPageToCanvas,
    generateThumbnail,
    extractTextBlocks,
    updateTextBlock,
    updateFormField,
    getEditedFormFields,
    rotatePage,
    deletePage,
    reorderPages,
    addBlankPage,
    hasTextEdits,
    getEditedCount,
    hasFormEdits,
  };
}

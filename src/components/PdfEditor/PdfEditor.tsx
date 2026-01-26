import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Loader2, AlertCircle, Type, FileText } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { PDFDocument, degrees } from "pdf-lib";
import toast from "react-hot-toast";

import { Toolbar } from "./Toolbar";
import { PageThumbnails } from "./PageThumbnails";
import { PdfViewer } from "./PdfViewer";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { savePdfWithTextEditsSmart } from "./services/pdfSaveService";
import type { ToolType, ToolOptions, AnnotationData, PdfPage, TextBlock } from "./types";
import { DEFAULT_TOOL_OPTIONS } from "./types";

interface PdfEditorProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
  isDark: boolean;
}

export function PdfEditor({ filePath, fileName, onClose, isDark }: PdfEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [toolOptions, setToolOptions] = useState<ToolOptions>(DEFAULT_TOOL_OPTIONS);
  const [annotations, setAnnotations] = useState<Map<number, AnnotationData[]>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const {
    pages,
    totalPages,
    formFields,
    hasFormFields,
    loadPdf,
    renderPageToCanvas,
    generateThumbnail,
    extractTextBlocks,
    updateTextBlock,
    updateFormField,
    getEditedFormFields,
    rotatePage,
    deletePage,
    addBlankPage,
    getEditedCount,
  } = usePdfDocument();

  // Text editing state
  const [textEditingEnabled, setTextEditingEnabled] = useState(true);
  const [currentTextBlocks, setCurrentTextBlocks] = useState<TextBlock[]>([]);
  // Form fields state
  const [formFieldsEnabled, setFormFieldsEnabled] = useState(true);

  // Load PDF on mount
  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true);
      setError(null);
      console.log("Loading PDF from:", filePath);
      try {
        const bytes = await readFile(filePath);
        console.log("Read bytes:", bytes.length);
        pdfBytesRef.current = new Uint8Array(bytes);
        // Create a fresh ArrayBuffer copy
        const arrayBuffer = new ArrayBuffer(pdfBytesRef.current.length);
        new Uint8Array(arrayBuffer).set(pdfBytesRef.current);
        console.log("ArrayBuffer size:", arrayBuffer.byteLength);
        // Pass filePath to enable form field extraction
        await loadPdf(arrayBuffer, filePath);
        console.log("PDF loaded successfully");
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF file");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath, loadPdf]);

  // Update undo/redo state
  useEffect(() => {
    const checkUndoRedo = () => {
      setCanUndo((window as any).__pdfEditorCanUndo?.() ?? false);
      setCanRedo((window as any).__pdfEditorCanRedo?.() ?? false);
    };

    const interval = setInterval(checkUndoRedo, 100);
    return () => clearInterval(interval);
  }, []);

  // Extract text blocks when page changes
  useEffect(() => {
    if (!isLoading && currentPage > 0 && pages.length > 0) {
      const pageData = pages.find((p) => p.pageNumber === currentPage);
      
      // If page already has text blocks cached, use those
      if (pageData?.textBlocks) {
        setCurrentTextBlocks(pageData.textBlocks);
      } else {
        // Otherwise extract them
        extractTextBlocks(currentPage).then((blocks) => {
          setCurrentTextBlocks(blocks);
        });
      }
    }
  }, [currentPage, isLoading, pages, extractTextBlocks]);

  // Handle text block edit
  const handleTextBlockEdit = useCallback((blockId: string, newText: string) => {
    updateTextBlock(currentPage, blockId, newText);
    setCurrentTextBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, isEdited: true, editedText: newText }
          : block
      )
    );
    setHasChanges(true);
  }, [currentPage, updateTextBlock]);

  // Handle text block revert to original
  const handleTextBlockRevert = useCallback((blockId: string) => {
    const block = currentTextBlocks.find(b => b.id === blockId);
    if (block) {
      updateTextBlock(currentPage, blockId, block.text);
      setCurrentTextBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, isEdited: false, editedText: undefined }
            : b
        )
      );
    }
  }, [currentPage, currentTextBlocks, updateTextBlock]);

  const handleAnnotationsChange = useCallback((pageNumber: number, pageAnnotations: AnnotationData[]) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      newMap.set(pageNumber, pageAnnotations);
      return newMap;
    });
    setHasChanges(true);
  }, []);

  // Handle form field value change
  const handleFormFieldChange = useCallback((fieldName: string, newValue: string) => {
    updateFormField(fieldName, newValue);
    setHasChanges(true);
  }, [updateFormField]);

  const handleToolOptionsChange = useCallback((options: Partial<ToolOptions>) => {
    setToolOptions((prev) => ({ ...prev, ...options }));
  }, []);

  const handlePagesReorder = useCallback((_newPages: PdfPage[]) => {
    // This is a simplified approach - in reality, you'd track the drag operation
    setHasChanges(true);
  }, []);

  const handleUndo = useCallback(() => {
    (window as any).__pdfEditorUndo?.();
  }, []);

  const handleRedo = useCallback(() => {
    (window as any).__pdfEditorRedo?.();
  }, []);

  const handleDelete = useCallback(() => {
    (window as any).__pdfEditorDelete?.();
  }, []);

  const handleSave = useCallback(async () => {
    if (!pdfBytesRef.current || pages.length === 0) return;

    setIsSaving(true);
    try {
      let currentBytes = pdfBytesRef.current;
      let formFieldsFilled = 0;
      
      // First, save form field changes if any (stub - not yet implemented in Rust)
      const editedFormFields = getEditedFormFields();
      if (editedFormFields.length > 0) {
        console.log("[Save] Form fields detected but fill not yet implemented in pure Rust");
        // TODO: Implement form field filling with lopdf
      }
      
      // Merge annotations into pages for saving
      const pagesWithAnnotations = pages.map(page => ({
        ...page,
        annotations: annotations.get(page.pageNumber) || page.annotations,
      }));

      // Use smart save - lopdf for true text editing, with whiteout fallback
      const { bytes: modifiedBytes, usedLopdf, editsApplied } = await savePdfWithTextEditsSmart(
        filePath,
        filePath, // Save to same file
        currentBytes.buffer as ArrayBuffer,
        pagesWithAnnotations,
        { includeAnnotations: true }
      );

      // Also apply page rotations (not handled by either save method)
      const pdfDoc = await PDFDocument.load(modifiedBytes);
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        if (index >= pdfDoc.getPageCount()) continue;
        
        const pdfPage = pdfDoc.getPage(index);
        if (page.rotation !== 0) {
          pdfPage.setRotation(degrees(page.rotation));
        }
      }
      
      const finalBytes = await pdfDoc.save();
      await writeFile(filePath, finalBytes);

      pdfBytesRef.current = new Uint8Array(finalBytes);
      setHasChanges(false);
      
      // Build success message
      const changes: string[] = [];
      if (editsApplied > 0) {
        const method = usedLopdf ? "(text replaced)" : "(whiteout)";
        changes.push(`${editsApplied} text edit${editsApplied > 1 ? 's' : ''} ${method}`);
      }
      if (formFieldsFilled > 0) {
        changes.push(`${formFieldsFilled} form field${formFieldsFilled > 1 ? 's' : ''}`);
      }
      
      if (changes.length > 0) {
        toast.success(`PDF saved with ${changes.join(', ')}!`);
      } else {
        toast.success("PDF saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save PDF:", err);
      toast.error("Failed to save PDF");
    } finally {
      setIsSaving(false);
    }
  }, [filePath, pages, annotations, getEditedFormFields]);

  const handleSaveAs = useCallback(async () => {
    if (!pdfBytesRef.current || pages.length === 0) return;

    try {
      const savePath = await save({
        defaultPath: fileName.replace(".pdf", "_edited.pdf"),
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!savePath) return;

      setIsSaving(true);
      
      // Merge annotations into pages for saving
      const pagesWithAnnotations = pages.map(page => ({
        ...page,
        annotations: annotations.get(page.pageNumber) || page.annotations,
      }));

      // Use smart save - lopdf for true text editing, with whiteout fallback
      const { bytes: modifiedBytes, usedLopdf, editsApplied } = await savePdfWithTextEditsSmart(
        filePath,
        savePath,
        pdfBytesRef.current.buffer as ArrayBuffer,
        pagesWithAnnotations,
        { includeAnnotations: true }
      );

      // Also apply page rotations
      const pdfDoc = await PDFDocument.load(modifiedBytes);
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        if (index >= pdfDoc.getPageCount()) continue;
        
        const pdfPage = pdfDoc.getPage(index);
        if (page.rotation !== 0) {
          pdfPage.setRotation(degrees(page.rotation));
        }
      }
      
      const finalBytes = await pdfDoc.save();
      await writeFile(savePath, finalBytes);

      if (editsApplied > 0) {
        const method = usedLopdf ? "(text replaced)" : "(whiteout)";
        toast.success(`PDF saved with ${editsApplied} text edit${editsApplied > 1 ? 's' : ''} ${method}!`);
      } else {
        toast.success("PDF saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save PDF:", err);
      toast.error("Failed to save PDF");
    } finally {
      setIsSaving(false);
    }
  }, [filePath, fileName, pages, annotations]);

  // Keyboard shortcuts for save operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl+Shift+S = Save As
          handleSaveAs();
        } else {
          // Ctrl+S = Save
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveAs]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  const currentPageData = pages.find((p) => p.pageNumber === currentPage) || null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Editor container */}
      <motion.div
        className={`relative w-[95vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isDark ? "bg-dark-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "bg-dark-900 border-dark-700" : "bg-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              {fileName}
            </h2>
            {hasChanges && (
              <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">
                Unsaved changes
              </span>
            )}
            
            {/* Text editing toggle */}
            <motion.button
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                textEditingEnabled
                  ? isDark
                    ? "bg-accent-600/20 text-accent-400 border border-accent-500/30"
                    : "bg-accent-100 text-accent-700 border border-accent-300"
                  : isDark
                    ? "bg-dark-700 text-dark-400 border border-dark-600"
                    : "bg-gray-100 text-gray-500 border border-gray-300"
              }`}
              onClick={() => setTextEditingEnabled(!textEditingEnabled)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={textEditingEnabled ? "Click to disable text editing" : "Click to enable text editing"}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Edit Text: {textEditingEnabled ? "On" : "Off"}</span>
            </motion.button>
            
            {/* Form fields toggle - only show if PDF has form fields */}
            {hasFormFields && (
              <motion.button
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  formFieldsEnabled
                    ? isDark
                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                      : "bg-green-100 text-green-700 border border-green-300"
                    : isDark
                      ? "bg-dark-700 text-dark-400 border border-dark-600"
                      : "bg-gray-100 text-gray-500 border border-gray-300"
                }`}
                onClick={() => setFormFieldsEnabled(!formFieldsEnabled)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={formFieldsEnabled ? "Click to hide form fields" : "Click to show form fields"}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Forms: {formFieldsEnabled ? "On" : "Off"} ({formFields.length})</span>
              </motion.button>
            )}
          </div>

          <motion.button
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-dark-700 text-dark-400 hover:text-white"
                : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
            }`}
            onClick={handleClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${
                isDark ? "text-accent-500" : "text-accent-600"
              }`} />
              <p className={isDark ? "text-dark-300" : "text-gray-600"}>
                Loading PDF...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-error-500" />
              <p className="text-error-500 mb-4">{error}</p>
              <motion.button
                className="px-4 py-2 bg-accent-600 text-white rounded-lg"
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </div>
          </div>
        )}

        {/* Editor content */}
        {!isLoading && !error && (
          <>
            {/* Toolbar */}
            <Toolbar
              activeTool={activeTool}
              toolOptions={toolOptions}
              zoom={zoom}
              onToolChange={setActiveTool}
              onToolOptionsChange={handleToolOptionsChange}
              onZoomChange={setZoom}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDelete={handleDelete}
              onRotatePage={(degrees) => {
                rotatePage(currentPage, degrees);
                setHasChanges(true);
              }}
              onAddBlankPage={() => {
                addBlankPage(currentPage);
                setHasChanges(true);
              }}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              canUndo={canUndo}
              canRedo={canRedo}
              isDark={isDark}
              hasChanges={hasChanges}
              isSaving={isSaving}
              editedTextCount={getEditedCount()}
            />

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Page thumbnails sidebar */}
              <PageThumbnails
                pages={pages}
                currentPage={currentPage}
                onPageSelect={setCurrentPage}
                onPageDelete={(pageNumber) => {
                  deletePage(pageNumber);
                  if (currentPage > pages.length - 1) {
                    setCurrentPage(Math.max(1, pages.length - 1));
                  }
                  setHasChanges(true);
                }}
                onPageRotate={(pageNumber, degrees) => {
                  rotatePage(pageNumber, degrees);
                  setHasChanges(true);
                }}
                onPagesReorder={handlePagesReorder}
                onAddBlankPage={(afterPage) => {
                  addBlankPage(afterPage);
                  setHasChanges(true);
                }}
                generateThumbnail={generateThumbnail}
                isDark={isDark}
              />

              {/* PDF viewer with annotations */}
              <div className="flex-1 overflow-auto">
                <PdfViewer
                  page={currentPageData}
                  zoom={zoom}
                  activeTool={activeTool}
                  toolOptions={toolOptions}
                  annotations={annotations}
                  onAnnotationsChange={handleAnnotationsChange}
                  renderPageToCanvas={renderPageToCanvas}
                  textBlocks={currentTextBlocks}
                  onTextBlockEdit={handleTextBlockEdit}
                  onTextBlockRevert={handleTextBlockRevert}
                  textEditingEnabled={textEditingEnabled}
                  formFields={formFields}
                  onFormFieldChange={handleFormFieldChange}
                  formFieldsEnabled={formFieldsEnabled}
                  isDark={isDark}
                />
              </div>
            </div>

            {/* Footer with page navigation */}
            <div className={`flex items-center justify-center gap-4 px-4 py-2 border-t ${
              isDark ? "bg-dark-900 border-dark-700" : "bg-gray-50 border-gray-200"
            }`}>
              <button
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage > 1
                    ? isDark
                      ? "hover:bg-dark-700 text-dark-300"
                      : "hover:bg-gray-200 text-gray-600"
                    : isDark
                      ? "text-dark-600 cursor-not-allowed"
                      : "text-gray-300 cursor-not-allowed"
                }`}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              
              <span className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                Page{" "}
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = Math.min(Math.max(1, Number(e.target.value)), totalPages);
                    setCurrentPage(page);
                  }}
                  className={`w-12 px-2 py-0.5 text-center rounded border ${
                    isDark
                      ? "bg-dark-700 border-dark-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />{" "}
                of {totalPages}
              </span>

              <button
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage < totalPages
                    ? isDark
                      ? "hover:bg-dark-700 text-dark-300"
                      : "hover:bg-gray-200 text-gray-600"
                    : isDark
                      ? "text-dark-600 cursor-not-allowed"
                      : "text-gray-300 cursor-not-allowed"
                }`}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Saving overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`px-6 py-4 rounded-xl ${isDark ? "bg-dark-800" : "bg-white"}`}>
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-accent-500" />
              <p className={isDark ? "text-white" : "text-gray-900"}>Saving PDF...</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

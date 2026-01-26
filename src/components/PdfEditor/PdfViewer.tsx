import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import type { ToolType, ToolOptions, PdfPage, AnnotationData, TextBlock, FormField } from "./types";
import { TextOverlay } from "./TextOverlay";
import { FormFieldsOverlay } from "./FormFieldsOverlay";

// Text input modal for whiteout & replace
interface TextInputModalProps {
  isOpen: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  suggestedFontSize: number;
  isDark: boolean;
}

function TextInputModal({ isOpen, onSubmit, onCancel, suggestedFontSize, isDark }: TextInputModalProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className={`relative z-10 p-4 rounded-xl shadow-2xl min-w-[300px] ${
          isDark ? "bg-dark-800 border border-dark-600" : "bg-white border border-gray-200"
        }`}
      >
        <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
          Enter replacement text
        </h3>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your text here..."
          className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${
            isDark
              ? "bg-dark-700 border-dark-600 text-white placeholder-dark-400"
              : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
          }`}
          autoFocus
        />
        <p className={`text-xs mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Suggested font size: {suggestedFontSize}px (based on area height)
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isDark
                ? "hover:bg-dark-700 text-dark-300"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded-lg bg-accent-600 text-white hover:bg-accent-700 transition-colors"
          >
            Replace
          </button>
        </div>
      </form>
    </div>
  );
}

interface PdfViewerProps {
  page: PdfPage | null;
  zoom: number;
  activeTool: ToolType;
  toolOptions: ToolOptions;
  annotations: Map<number, AnnotationData[]>;
  onAnnotationsChange: (pageNumber: number, annotations: AnnotationData[]) => void;
  renderPageToCanvas: (pageNumber: number, canvas: HTMLCanvasElement, scale: number) => Promise<void>;
  textBlocks: TextBlock[];
  onTextBlockEdit: (blockId: string, newText: string) => void;
  onTextBlockRevert?: (blockId: string) => void;
  textEditingEnabled: boolean;
  // Form fields
  formFields?: FormField[];
  onFormFieldChange?: (fieldName: string, newValue: string) => void;
  formFieldsEnabled?: boolean;
  isDark: boolean;
}

export function PdfViewer({
  page,
  zoom,
  activeTool,
  toolOptions,
  annotations,
  onAnnotationsChange,
  renderPageToCanvas,
  textBlocks,
  onTextBlockEdit,
  onTextBlockRevert,
  textEditingEnabled,
  formFields = [],
  onFormFieldChange,
  formFieldsEnabled = true,
  isDark,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricContainerRef = useRef<HTMLDivElement>(null); // Container for fabric canvas
  const fabricInstanceRef = useRef<fabric.Canvas | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [canvasReady, setCanvasReady] = useState(0); // Increments when canvas is initialized
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  
  // Whiteout & Replace state
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingWhiteoutRect, setPendingWhiteoutRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewRectRef = useRef<fabric.Rect | null>(null);

  // Initialize or update Fabric canvas
  const initFabricCanvas = useCallback((width: number, height: number) => {
    const container = fabricContainerRef.current;
    if (!container) return;

    // Dispose existing canvas and clear container
    if (fabricInstanceRef.current) {
      fabricInstanceRef.current.dispose();
      fabricInstanceRef.current = null;
    }
    
    // Clear the container (remove any previous fabric elements)
    container.innerHTML = "";
    
    // Set container size to match canvas
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    
    // Create a new canvas element programmatically
    const canvasEl = document.createElement("canvas");
    container.appendChild(canvasEl);

    const canvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set up history
    const saveHistory = () => {
      const json = JSON.stringify(canvas.toJSON());
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(json);
      historyIndexRef.current = historyRef.current.length - 1;
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    };

    canvas.on("object:added", saveHistory);
    canvas.on("object:modified", saveHistory);
    canvas.on("object:removed", saveHistory);

    fabricInstanceRef.current = canvas;
    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory();

    console.log("[PdfViewer] Fabric canvas initialized, dimensions:", width, "x", height);

    // Signal that canvas is ready so tool effects re-run
    setCanvasReady((prev) => prev + 1);

    return canvas;
  }, []);

  // Track render-triggering properties to avoid re-rendering when other page properties change
  const lastRenderRef = useRef<{ pageNumber: number; zoom: number; rotation: number } | null>(null);

  // Render PDF page - only when page number, zoom, or rotation actually changes
  useEffect(() => {
    if (!page || !pdfCanvasRef.current) return;
    
    const currentRender = { pageNumber: page.pageNumber, zoom, rotation: page.rotation };
    
    // Skip re-render if nothing relevant has changed
    if (lastRenderRef.current &&
        lastRenderRef.current.pageNumber === currentRender.pageNumber &&
        lastRenderRef.current.zoom === currentRender.zoom &&
        lastRenderRef.current.rotation === currentRender.rotation) {
      return;
    }
    
    lastRenderRef.current = currentRender;

    setIsRendering(true);
    
    const renderPage = async () => {
      try {
        await renderPageToCanvas(page.pageNumber, pdfCanvasRef.current!, zoom);
        
        // Initialize fabric canvas with same dimensions
        if (pdfCanvasRef.current) {
          const width = pdfCanvasRef.current.width;
          const height = pdfCanvasRef.current.height;
          initFabricCanvas(width, height);

          // Load existing annotations for this page
          const pageAnnotations = annotations.get(page.pageNumber) || [];
          if (fabricInstanceRef.current && pageAnnotations.length > 0) {
            pageAnnotations.forEach((annotation) => {
              try {
                const objData = JSON.parse(annotation.fabricObject);
                fabric.util.enlivenObjects([objData]).then((objects) => {
                  objects.forEach((obj) => {
                    if (obj && typeof obj === "object" && "type" in obj) {
                      fabricInstanceRef.current?.add(obj as fabric.FabricObject);
                    }
                  });
                  fabricInstanceRef.current?.renderAll();
                });
              } catch (e) {
                console.error("Failed to load annotation:", e);
              }
            });
          }
        }
      } catch (error) {
        console.error("Failed to render page:", error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [page, zoom, renderPageToCanvas, initFabricCanvas, annotations]);

  // Control fabric canvas interaction based on mode
  // When text editing is enabled in select mode, fabric canvas goes behind TextOverlay
  // Otherwise, fabric canvas is on top for shape creation/manipulation
  useEffect(() => {
    const container = fabricContainerRef.current;
    if (!container) return;
    
    const isTextEditingMode = textEditingEnabled && activeTool === "select";
    
    // In text editing mode: fabric canvas goes to z-index 5 (below TextOverlay at z-index 10)
    // Otherwise: fabric canvas goes to z-index 20 (above TextOverlay)
    container.style.zIndex = isTextEditingMode ? "5" : "20";
    container.style.pointerEvents = "auto";
    
    console.log("[PdfViewer] Text editing mode:", isTextEditingMode, "z-index:", container.style.zIndex);
  }, [activeTool, textEditingEnabled, canvasReady]);

  // Update tool mode
  useEffect(() => {
    const canvas = fabricInstanceRef.current;
    if (!canvas) return;

    // Reset canvas mode
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = "default";

    switch (activeTool) {
      case "select":
        break;

      case "draw":
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = toolOptions.strokeColor;
          canvas.freeDrawingBrush.width = toolOptions.strokeWidth;
        }
        break;

      case "highlight":
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = "#FFFF00";
          canvas.freeDrawingBrush.width = 20;
        }
        break;

      case "text":
        canvas.defaultCursor = "text";
        // Keep selection enabled so users can select existing text objects
        break;

      case "whiteoutReplace":
        canvas.defaultCursor = "crosshair";
        canvas.selection = false;
        break;

      default:
        // Shape tools: use crosshair cursor but keep selection enabled
        // This allows clicking on existing objects to select them
        canvas.defaultCursor = "crosshair";
        // Keep canvas.selection = true (set at top) so users can select existing objects
    }
  }, [activeTool, toolOptions, canvasReady]);

  // Handle canvas clicks for adding elements
  useEffect(() => {
    const canvas = fabricInstanceRef.current;
    if (!canvas) {
      console.log("[PdfViewer] Canvas not ready for mouse handler");
      return;
    }

    console.log("[PdfViewer] Setting up mouse handler for tool:", activeTool);

    const handleMouseDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      console.log("[PdfViewer] Mouse down event fired, tool:", activeTool);
      
      // If clicking on an existing object, let fabric handle selection/manipulation
      // Don't create a new shape when clicking on existing objects
      if (e.target) {
        console.log("[PdfViewer] Clicked on existing object, selecting it");
        canvas.setActiveObject(e.target);
        canvas.renderAll();
        return;
      }
      
      // Try multiple ways to get pointer - Fabric.js 6 compatibility
      let x: number, y: number;
      
      if (e.scenePoint) {
        // Fabric.js 6 provides scenePoint directly
        x = e.scenePoint.x;
        y = e.scenePoint.y;
      } else {
        const pointer = canvas.getViewportPoint(e.e as MouseEvent);
        if (!pointer) {
          console.log("[PdfViewer] Could not get pointer");
          return;
        }
        x = pointer.x;
        y = pointer.y;
      }
      
      console.log("[PdfViewer] Pointer position:", x, y, "- creating new shape");

      switch (activeTool) {
        case "text": {
          const text = new fabric.IText("Type here...", {
            left: x,
            top: y,
            fontFamily: toolOptions.fontFamily,
            fontSize: toolOptions.fontSize,
            fill: toolOptions.strokeColor,
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          canvas.renderAll();
          break;
        }

        case "rectangle": {
          console.log("[PdfViewer] Creating rectangle at", x, y);
          const rect = new fabric.Rect({
            left: x,
            top: y,
            width: 100,
            height: 60,
            fill: toolOptions.fillColor === "transparent" ? "" : toolOptions.fillColor,
            stroke: toolOptions.strokeColor,
            strokeWidth: toolOptions.strokeWidth,
          });
          canvas.add(rect);
          console.log("[PdfViewer] Rectangle added, objects count:", canvas.getObjects().length);
          canvas.setActiveObject(rect);
          canvas.renderAll();
          break;
        }

        case "circle": {
          const circle = new fabric.Circle({
            left: x,
            top: y,
            radius: 40,
            fill: toolOptions.fillColor === "transparent" ? "" : toolOptions.fillColor,
            stroke: toolOptions.strokeColor,
            strokeWidth: toolOptions.strokeWidth,
          });
          canvas.add(circle);
          canvas.setActiveObject(circle);
          canvas.renderAll();
          break;
        }

        case "line": {
          const line = new fabric.Line([x, y, x + 100, y], {
            stroke: toolOptions.strokeColor,
            strokeWidth: toolOptions.strokeWidth,
          });
          canvas.add(line);
          canvas.setActiveObject(line);
          canvas.renderAll();
          break;
        }

        case "arrow": {
          const arrowLine = new fabric.Line([0, 15, 60, 15], {
            stroke: toolOptions.strokeColor,
            strokeWidth: toolOptions.strokeWidth,
          });
          const triangle = new fabric.Triangle({
            left: 60,
            top: 15,
            width: 12,
            height: 12,
            fill: toolOptions.strokeColor,
            angle: 90,
            originX: "center",
            originY: "center",
          });
          const arrow = new fabric.Group([arrowLine, triangle], {
            left: x,
            top: y,
          });
          canvas.add(arrow);
          canvas.setActiveObject(arrow);
          canvas.renderAll();
          break;
        }

        case "highlight": {
          if (!canvas.isDrawingMode) {
            const highlightRect = new fabric.Rect({
              left: x,
              top: y,
              width: 150,
              height: 20,
              fill: "#FFFF00",
              opacity: 0.3,
            });
            canvas.add(highlightRect);
            canvas.setActiveObject(highlightRect);
            canvas.renderAll();
          }
          break;
        }

        case "whiteout": {
          const whiteout = new fabric.Rect({
            left: x,
            top: y,
            width: 100,
            height: 25,
            fill: "#FFFFFF",
          });
          canvas.add(whiteout);
          canvas.setActiveObject(whiteout);
          canvas.renderAll();
          break;
        }
      }
    };

    canvas.on("mouse:down", handleMouseDown);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
    };
  }, [activeTool, toolOptions, canvasReady]);

  // Handle whiteoutReplace drag drawing
  useEffect(() => {
    const canvas = fabricInstanceRef.current;
    if (!canvas || activeTool !== "whiteoutReplace") return;

    const handleMouseDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      const pointer = canvas.getViewportPoint(e.e as MouseEvent);
      if (!pointer) return;
      
      isDrawingRef.current = true;
      drawStartRef.current = { x: pointer.x, y: pointer.y };
      
      // Create preview rectangle
      const rect = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: "rgba(255, 255, 255, 0.7)",
        stroke: "#3b82f6",
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      canvas.add(rect);
      previewRectRef.current = rect;
    };

    const handleMouseMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isDrawingRef.current || !drawStartRef.current || !previewRectRef.current) return;
      
      const pointer = canvas.getViewportPoint(e.e as MouseEvent);
      if (!pointer) return;
      
      const startX = drawStartRef.current.x;
      const startY = drawStartRef.current.y;
      const currentX = pointer.x;
      const currentY = pointer.y;
      
      // Calculate rectangle dimensions (handle negative drawing)
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      previewRectRef.current.set({
        left,
        top,
        width,
        height,
      });
      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !previewRectRef.current) return;
      
      const rect = previewRectRef.current;
      const width = rect.width || 0;
      const height = rect.height || 0;
      
      // Remove preview rectangle
      canvas.remove(rect);
      previewRectRef.current = null;
      isDrawingRef.current = false;
      drawStartRef.current = null;
      
      // Only show modal if rectangle is meaningful size (at least 10x10)
      if (width >= 10 && height >= 10) {
        setPendingWhiteoutRect({
          left: rect.left || 0,
          top: rect.top || 0,
          width,
          height,
        });
        setShowTextModal(true);
      }
      
      canvas.renderAll();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      
      // Clean up preview rect if tool changes mid-draw
      if (previewRectRef.current) {
        canvas.remove(previewRectRef.current);
        previewRectRef.current = null;
      }
      isDrawingRef.current = false;
      drawStartRef.current = null;
    };
  }, [activeTool, canvasReady]);

  // Save annotations when canvas changes
  useEffect(() => {
    const canvas = fabricInstanceRef.current;
    if (!canvas || !page) return;

    const saveAnnotations = () => {
      const objects = canvas.getObjects();
      const pageAnnotations: AnnotationData[] = objects.map((obj: fabric.FabricObject, index: number) => ({
        id: `annotation-${page.pageNumber}-${index}`,
        type: getAnnotationType(obj),
        fabricObject: JSON.stringify(obj.toJSON()),
        pageNumber: page.pageNumber,
      }));
      onAnnotationsChange(page.pageNumber, pageAnnotations);
    };

    canvas.on("object:added", saveAnnotations);
    canvas.on("object:modified", saveAnnotations);
    canvas.on("object:removed", saveAnnotations);

    return () => {
      canvas.off("object:added", saveAnnotations);
      canvas.off("object:modified", saveAnnotations);
      canvas.off("object:removed", saveAnnotations);
    };
  }, [page, onAnnotationsChange, canvasReady]);

  // Delete function that can be called from toolbar or keyboard
  const deleteSelectedObjects = useCallback(() => {
    const canvas = fabricInstanceRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    console.log("[PdfViewer] Delete called, active objects:", activeObjects.length);
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      console.log("[PdfViewer] Objects deleted");
    }
  }, []);

  // Expose undo/redo/delete methods
  // These functions access fabricInstanceRef.current directly to always get the current canvas
  useEffect(() => {
    (window as unknown as Record<string, () => void>).__pdfEditorUndo = () => {
      const canvas = fabricInstanceRef.current;
      if (!canvas || historyIndexRef.current <= 0) return;
      historyIndexRef.current--;
      const json = historyRef.current[historyIndexRef.current];
      canvas.loadFromJSON(json).then(() => canvas.renderAll());
    };

    (window as unknown as Record<string, () => void>).__pdfEditorRedo = () => {
      const canvas = fabricInstanceRef.current;
      if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
      historyIndexRef.current++;
      const json = historyRef.current[historyIndexRef.current];
      canvas.loadFromJSON(json).then(() => canvas.renderAll());
    };

    (window as unknown as Record<string, () => void>).__pdfEditorDelete = deleteSelectedObjects;

    (window as unknown as Record<string, () => boolean>).__pdfEditorCanUndo = () => historyIndexRef.current > 0;
    (window as unknown as Record<string, () => boolean>).__pdfEditorCanRedo = () => historyIndexRef.current < historyRef.current.length - 1;
  }, [deleteSelectedObjects]);

  // Keyboard shortcuts for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace to delete selected objects
      if ((e.key === "Delete" || e.key === "Backspace") && !e.target?.toString().includes("Input")) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        deleteSelectedObjects();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedObjects]);

  // Handle text submission for whiteout & replace
  const handleTextSubmit = useCallback((text: string) => {
    const canvas = fabricInstanceRef.current;
    if (!canvas || !pendingWhiteoutRect) return;

    const { left, top, width, height } = pendingWhiteoutRect;
    
    // Create white rectangle (solid, no stroke)
    const whiteoutRect = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: "#FFFFFF",
      stroke: undefined,
      strokeWidth: 0,
      selectable: true,
      evented: true,
    });
    
    // Calculate font size based on rectangle height (with padding)
    const padding = 4;
    const suggestedFontSize = Math.max(10, Math.min(72, Math.floor((height - padding * 2) * 0.8)));
    
    // Create text centered in rectangle
    const textObj = new fabric.IText(text, {
      left: left + width / 2,
      top: top + height / 2,
      fontFamily: toolOptions.fontFamily,
      fontSize: suggestedFontSize,
      fill: toolOptions.strokeColor,
      originX: "center",
      originY: "center",
    });
    
    // Group them together for easier manipulation
    canvas.add(whiteoutRect);
    canvas.add(textObj);
    
    // Select the text for immediate editing if needed
    canvas.setActiveObject(textObj);
    canvas.renderAll();
    
    // Clean up
    setShowTextModal(false);
    setPendingWhiteoutRect(null);
  }, [pendingWhiteoutRect, toolOptions.fontFamily, toolOptions.strokeColor]);

  const handleTextCancel = useCallback(() => {
    setShowTextModal(false);
    setPendingWhiteoutRect(null);
  }, []);

  // Calculate suggested font size for the modal
  const suggestedFontSize = pendingWhiteoutRect
    ? Math.max(10, Math.min(72, Math.floor((pendingWhiteoutRect.height - 8) * 0.8)))
    : 16;

  // Cleanup
  useEffect(() => {
    return () => {
      if (fabricInstanceRef.current) {
        fabricInstanceRef.current.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center p-4 overflow-auto ${
        isDark ? "bg-dark-900" : "bg-gray-200"
      }`}
      style={{ minHeight: "100%" }}
    >
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`px-4 py-2 rounded-lg ${isDark ? "bg-dark-700 text-white" : "bg-white text-gray-900"}`}>
            Loading page...
          </div>
        </div>
      )}

      <div className="relative shadow-2xl">
        {/* PDF Canvas (background) */}
        <canvas
          ref={pdfCanvasRef}
          className="block"
          style={{ display: page ? "block" : "none" }}
        />

        {/* Text block overlays for inline editing - z-index 10 */}
        {page && textEditingEnabled && activeTool === "select" && (
          <div className="absolute top-0 left-0 z-10" style={{ width: '100%', height: '100%' }}>
            <TextOverlay
              textBlocks={textBlocks}
              zoom={zoom}
              onEditBlock={onTextBlockEdit}
              onRevertBlock={onTextBlockRevert}
              isDark={isDark}
              enabled={textEditingEnabled && activeTool === "select"}
            />
          </div>
        )}

        {/* Form fields overlay - z-index 15 (above text, below annotations when active) */}
        {page && formFieldsEnabled && formFields.length > 0 && onFormFieldChange && (
          <div className="absolute top-0 left-0 z-[15]" style={{ width: '100%', height: '100%' }}>
            <FormFieldsOverlay
              formFields={formFields}
              pageNumber={page.pageNumber}
              scale={zoom}
              pageWidth={page.width}
              pageHeight={page.height}
              onFieldChange={onFormFieldChange}
              isDark={isDark}
            />
          </div>
        )}

        {/* Fabric.js Canvas container (overlay for annotations) - z-index controlled dynamically */}
        <div
          ref={fabricContainerRef}
          className="absolute top-0 left-0"
          style={{ display: page ? "block" : "none" }}
        />
      </div>

      {!page && (
        <div className={`text-center ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          No page selected
        </div>
      )}

      {/* Text input modal for whiteout & replace */}
      <TextInputModal
        isOpen={showTextModal}
        onSubmit={handleTextSubmit}
        onCancel={handleTextCancel}
        suggestedFontSize={suggestedFontSize}
        isDark={isDark}
      />
    </div>
  );
}

function getAnnotationType(obj: fabric.FabricObject): AnnotationData["type"] {
  if (obj instanceof fabric.IText || obj instanceof fabric.FabricText) return "text";
  if (obj instanceof fabric.Rect) {
    if ((obj.fill === "#FFFF00" || obj.fill === "yellow") && obj.opacity && obj.opacity < 0.5) {
      return "highlight";
    }
    if (obj.fill === "#FFFFFF" || obj.fill === "white") {
      return "whiteout";
    }
    return "rectangle";
  }
  if (obj instanceof fabric.Circle) return "circle";
  if (obj instanceof fabric.Line) return "line";
  if (obj instanceof fabric.Group) return "arrow";
  if (obj instanceof fabric.FabricImage) return "image";
  if (obj instanceof fabric.Path) return "draw";
  return "draw";
}

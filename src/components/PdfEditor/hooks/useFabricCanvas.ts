import { useState, useCallback, useRef, useEffect } from "react";
import * as fabric from "fabric";
import type { ToolType, ToolOptions, AnnotationData } from "../types";

interface UseFabricCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fabricCanvas: fabric.Canvas | null;
  initCanvas: (canvasElement: HTMLCanvasElement, width: number, height: number) => void;
  setBackgroundImage: (imageUrl: string) => Promise<void>;
  setActiveTool: (tool: ToolType, options: ToolOptions) => void;
  addText: (x: number, y: number, options: ToolOptions) => void;
  addShape: (type: "rectangle" | "circle" | "line" | "arrow", options: ToolOptions) => void;
  addImage: (imageUrl: string, x: number, y: number) => Promise<void>;
  addHighlight: (options: ToolOptions) => void;
  addWhiteout: (options: ToolOptions) => void;
  clearCanvas: () => void;
  getAnnotations: () => AnnotationData[];
  loadAnnotations: (annotations: AnnotationData[]) => void;
  exportAnnotations: () => string;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  dispose: () => void;
}

export function useFabricCanvas(pageNumber: number): UseFabricCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isDrawingRef = useRef(false);

  const saveHistory = useCallback(() => {
    if (!fabricCanvas) return;
    const json = JSON.stringify(fabricCanvas.toJSON());
    
    // Remove any future history if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [fabricCanvas]);

  const initCanvas = useCallback((canvasElement: HTMLCanvasElement, width: number, height: number) => {
    // Dispose existing canvas
    if (fabricCanvas) {
      fabricCanvas.dispose();
    }

    const canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set up event listeners
    canvas.on("object:added", () => {
      if (!isDrawingRef.current) saveHistory();
    });
    canvas.on("object:modified", () => saveHistory());
    canvas.on("object:removed", () => saveHistory());

    setFabricCanvas(canvas);
    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory();
  }, [fabricCanvas, saveHistory]);

  const setBackgroundImage = useCallback(async (imageUrl: string): Promise<void> => {
    if (!fabricCanvas) return;

    try {
      const img = await fabric.FabricImage.fromURL(imageUrl);
      img.scaleX = fabricCanvas.width! / img.width!;
      img.scaleY = fabricCanvas.height! / img.height!;
      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
    } catch (err) {
      console.error("Failed to set background image:", err);
    }
  }, [fabricCanvas]);

  const setActiveTool = useCallback((tool: ToolType, options: ToolOptions) => {
    if (!fabricCanvas) return;

    // Reset canvas mode
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.defaultCursor = "default";

    switch (tool) {
      case "select":
        // Default selection mode
        break;

      case "draw":
        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = options.strokeColor;
          fabricCanvas.freeDrawingBrush.width = options.strokeWidth;
        }
        break;

      case "text":
        fabricCanvas.defaultCursor = "text";
        fabricCanvas.selection = false;
        break;

      case "highlight":
        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = "#FFFF00";
          fabricCanvas.freeDrawingBrush.width = 20;
        }
        break;

      case "eraser":
        fabricCanvas.defaultCursor = "crosshair";
        break;

      default:
        fabricCanvas.defaultCursor = "crosshair";
        fabricCanvas.selection = false;
    }
  }, [fabricCanvas]);

  const addText = useCallback((x: number, y: number, options: ToolOptions) => {
    if (!fabricCanvas) return;

    const text = new fabric.IText("Type here...", {
      left: x,
      top: y,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      fill: options.strokeColor,
      opacity: options.opacity,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    text.enterEditing();
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const addShape = useCallback((
    type: "rectangle" | "circle" | "line" | "arrow",
    options: ToolOptions
  ) => {
    if (!fabricCanvas) return;

    let shape: fabric.FabricObject;
    const centerX = fabricCanvas.width! / 2;
    const centerY = fabricCanvas.height! / 2;

    switch (type) {
      case "rectangle":
        shape = new fabric.Rect({
          left: centerX - 50,
          top: centerY - 30,
          width: 100,
          height: 60,
          fill: options.fillColor === "transparent" ? "" : options.fillColor,
          stroke: options.strokeColor,
          strokeWidth: options.strokeWidth,
          opacity: options.opacity,
        });
        break;

      case "circle":
        shape = new fabric.Circle({
          left: centerX - 40,
          top: centerY - 40,
          radius: 40,
          fill: options.fillColor === "transparent" ? "" : options.fillColor,
          stroke: options.strokeColor,
          strokeWidth: options.strokeWidth,
          opacity: options.opacity,
        });
        break;

      case "line":
        shape = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
          stroke: options.strokeColor,
          strokeWidth: options.strokeWidth,
          opacity: options.opacity,
        });
        break;

      case "arrow": {
        // Create arrow as a group of line and triangle
        const line = new fabric.Line([0, 25, 80, 25], {
          stroke: options.strokeColor,
          strokeWidth: options.strokeWidth,
        });
        const triangle = new fabric.Triangle({
          left: 80,
          top: 25,
          width: 15,
          height: 15,
          fill: options.strokeColor,
          angle: 90,
          originX: "center",
          originY: "center",
        });
        shape = new fabric.Group([line, triangle], {
          left: centerX - 50,
          top: centerY - 25,
          opacity: options.opacity,
        });
        break;
      }

      default:
        return;
    }

    fabricCanvas.add(shape);
    fabricCanvas.setActiveObject(shape);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const addImage = useCallback(async (imageUrl: string, x: number, y: number): Promise<void> => {
    if (!fabricCanvas) return;

    const img = await fabric.FabricImage.fromURL(imageUrl);
    img.set({
      left: x,
      top: y,
      scaleX: 0.5,
      scaleY: 0.5,
    });
    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const addHighlight = useCallback((_options: ToolOptions) => {
    if (!fabricCanvas) return;

    const rect = new fabric.Rect({
      left: fabricCanvas.width! / 2 - 75,
      top: fabricCanvas.height! / 2 - 10,
      width: 150,
      height: 20,
      fill: "#FFFF00",
      opacity: 0.3,
      selectable: true,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const addWhiteout = useCallback((_options: ToolOptions) => {
    if (!fabricCanvas) return;

    const rect = new fabric.Rect({
      left: fabricCanvas.width! / 2 - 50,
      top: fabricCanvas.height! / 2 - 15,
      width: 100,
      height: 30,
      fill: "#FFFFFF",
      stroke: "#FFFFFF",
      strokeWidth: 0,
      selectable: true,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const clearCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    
    // Keep the background image
    const bgImage = fabricCanvas.backgroundImage;
    fabricCanvas.clear();
    if (bgImage) {
      fabricCanvas.backgroundImage = bgImage;
      fabricCanvas.renderAll();
    }
    saveHistory();
  }, [fabricCanvas, saveHistory]);

  const getAnnotations = useCallback((): AnnotationData[] => {
    if (!fabricCanvas) return [];

    const objects = fabricCanvas.getObjects();
    return objects.map((obj: fabric.FabricObject, index: number) => ({
      id: `annotation-${pageNumber}-${index}`,
      type: getAnnotationType(obj),
      fabricObject: JSON.stringify(obj.toJSON()),
      pageNumber,
    }));
  }, [fabricCanvas, pageNumber]);

  const loadAnnotations = useCallback((annotations: AnnotationData[]) => {
    if (!fabricCanvas) return;

    const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);
    
    pageAnnotations.forEach((annotation) => {
      try {
        const objData = JSON.parse(annotation.fabricObject);
        // Use fabric.util.enlivenObjects for Fabric.js 6.x
        fabric.util.enlivenObjects([objData]).then((objects) => {
          objects.forEach((obj) => {
            if (obj && typeof obj === "object" && "type" in obj) {
              fabricCanvas.add(obj as fabric.FabricObject);
            }
          });
          fabricCanvas.renderAll();
        });
      } catch (err) {
        console.error("Failed to load annotation:", err);
      }
    });
  }, [fabricCanvas, pageNumber]);

  const exportAnnotations = useCallback((): string => {
    if (!fabricCanvas) return "[]";
    return JSON.stringify(fabricCanvas.toJSON());
  }, [fabricCanvas]);

  const undo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const json = historyRef.current[historyIndexRef.current];
    fabricCanvas.loadFromJSON(json).then(() => {
      fabricCanvas.renderAll();
    });
  }, [fabricCanvas]);

  const redo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const json = historyRef.current[historyIndexRef.current];
    fabricCanvas.loadFromJSON(json).then(() => {
      fabricCanvas.renderAll();
    });
  }, [fabricCanvas]);

  const deleteSelected = useCallback(() => {
    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        fabricCanvas.remove(obj);
      });
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  const dispose = useCallback(() => {
    if (fabricCanvas) {
      fabricCanvas.dispose();
      setFabricCanvas(null);
    }
  }, [fabricCanvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, []);

  return {
    canvasRef,
    fabricCanvas,
    initCanvas,
    setBackgroundImage,
    setActiveTool,
    addText,
    addShape,
    addImage,
    addHighlight,
    addWhiteout,
    clearCanvas,
    getAnnotations,
    loadAnnotations,
    exportAnnotations,
    undo,
    redo,
    deleteSelected,
    dispose,
  };
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

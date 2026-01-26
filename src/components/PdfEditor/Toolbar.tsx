import { motion } from "framer-motion";
import {
  MousePointer2,
  Type,
  Pencil,
  Square,
  Circle,
  Minus,
  MoveRight,
  ImageIcon,
  PenLine,
  Highlighter,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Save,
  Download,
  Plus,
  FileText,
  RectangleEllipsis,
} from "lucide-react";
import type { ToolType, ToolOptions } from "./types";

interface ToolbarProps {
  activeTool: ToolType;
  toolOptions: ToolOptions;
  zoom: number;
  onToolChange: (tool: ToolType) => void;
  onToolOptionsChange: (options: Partial<ToolOptions>) => void;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onRotatePage: (degrees: number) => void;
  onAddBlankPage: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDark: boolean;
  /** Whether there are unsaved changes */
  hasChanges?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Count of edited text blocks */
  editedTextCount?: number;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  isDark: boolean;
  disabled?: boolean;
}

function ToolButton({ icon, label, isActive, onClick, isDark, disabled }: ToolButtonProps) {
  return (
    <motion.button
      className={`p-2 rounded-lg transition-colors relative group ${
        isActive
          ? "bg-accent-600 text-white"
          : isDark
            ? "hover:bg-dark-700 text-dark-300 hover:text-white"
            : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      disabled={disabled}
      title={label}
    >
      {icon}
      <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
        isDark ? "bg-dark-700 text-white" : "bg-gray-800 text-white"
      }`}>
        {label}
      </span>
    </motion.button>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`w-px h-8 mx-1 ${isDark ? "bg-dark-600" : "bg-gray-300"}`} />;
}

export function Toolbar({
  activeTool,
  toolOptions,
  zoom,
  onToolChange,
  onToolOptionsChange,
  onZoomChange,
  onUndo,
  onRedo,
  onDelete,
  onRotatePage,
  onAddBlankPage,
  onSave,
  onSaveAs,
  canUndo,
  canRedo,
  isDark,
  hasChanges = false,
  isSaving = false,
  editedTextCount = 0,
}: ToolbarProps) {
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: "select", icon: <MousePointer2 className="w-5 h-5" />, label: "Select" },
    { type: "text", icon: <Type className="w-5 h-5" />, label: "Text" },
    { type: "draw", icon: <Pencil className="w-5 h-5" />, label: "Draw" },
    { type: "rectangle", icon: <Square className="w-5 h-5" />, label: "Rectangle" },
    { type: "circle", icon: <Circle className="w-5 h-5" />, label: "Circle" },
    { type: "line", icon: <Minus className="w-5 h-5" />, label: "Line" },
    { type: "arrow", icon: <MoveRight className="w-5 h-5" />, label: "Arrow" },
    { type: "image", icon: <ImageIcon className="w-5 h-5" />, label: "Image" },
    { type: "signature", icon: <PenLine className="w-5 h-5" />, label: "Signature" },
    { type: "highlight", icon: <Highlighter className="w-5 h-5" />, label: "Highlight" },
    { type: "whiteout", icon: <FileText className="w-5 h-5" />, label: "Whiteout" },
    { type: "whiteoutReplace", icon: <RectangleEllipsis className="w-5 h-5" />, label: "Whiteout & Replace" },
  ];

  const strokeColors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF",
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFFFFF",
  ];

  return (
    <div className={`flex flex-col border-b ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}`}>
      {/* Main toolbar */}
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        {/* File actions */}
        <div className="relative">
          <ToolButton
            icon={
              isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Save className="w-5 h-5" />
                </motion.div>
              ) : (
                <Save className="w-5 h-5" />
              )
            }
            label={isSaving ? "Saving..." : hasChanges ? "Save (Ctrl+S)" : "Save"}
            onClick={onSave}
            isDark={isDark}
            disabled={isSaving}
          />
          {hasChanges && !isSaving && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
          )}
          {editedTextCount > 0 && (
            <span className="absolute -bottom-1 -right-1 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center bg-accent-600 text-white rounded-full font-medium">
              {editedTextCount}
            </span>
          )}
        </div>
        <ToolButton
          icon={<Download className="w-5 h-5" />}
          label="Save As (Ctrl+Shift+S)"
          onClick={onSaveAs}
          isDark={isDark}
          disabled={isSaving}
        />

        <Divider isDark={isDark} />

        {/* Undo/Redo */}
        <ToolButton
          icon={<Undo2 className="w-5 h-5" />}
          label="Undo"
          onClick={onUndo}
          isDark={isDark}
          disabled={!canUndo}
        />
        <ToolButton
          icon={<Redo2 className="w-5 h-5" />}
          label="Redo"
          onClick={onRedo}
          isDark={isDark}
          disabled={!canRedo}
        />
        <ToolButton
          icon={<Trash2 className="w-5 h-5" />}
          label="Delete"
          onClick={onDelete}
          isDark={isDark}
        />

        <Divider isDark={isDark} />

        {/* Drawing tools */}
        {tools.map((tool) => (
          <ToolButton
            key={tool.type}
            icon={tool.icon}
            label={tool.label}
            isActive={activeTool === tool.type}
            onClick={() => onToolChange(tool.type)}
            isDark={isDark}
          />
        ))}

        <Divider isDark={isDark} />

        {/* Page operations */}
        <ToolButton
          icon={<RotateCcw className="w-5 h-5" />}
          label="Rotate Left"
          onClick={() => onRotatePage(-90)}
          isDark={isDark}
        />
        <ToolButton
          icon={<RotateCw className="w-5 h-5" />}
          label="Rotate Right"
          onClick={() => onRotatePage(90)}
          isDark={isDark}
        />
        <ToolButton
          icon={<Plus className="w-5 h-5" />}
          label="Add Blank Page"
          onClick={onAddBlankPage}
          isDark={isDark}
        />

        <Divider isDark={isDark} />

        {/* Zoom controls */}
        <ToolButton
          icon={<ZoomOut className="w-5 h-5" />}
          label="Zoom Out"
          onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
          isDark={isDark}
        />
        <span className={`px-3 text-sm font-medium min-w-[60px] text-center ${isDark ? "text-white" : "text-gray-900"}`}>
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton
          icon={<ZoomIn className="w-5 h-5" />}
          label="Zoom In"
          onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
          isDark={isDark}
        />
      </div>

      {/* Tool options bar */}
      {(activeTool === "draw" || activeTool === "text" || activeTool === "rectangle" || 
        activeTool === "circle" || activeTool === "line" || activeTool === "arrow" || activeTool === "whiteoutReplace") && (
        <div className={`flex items-center gap-4 px-4 py-2 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          {/* Stroke color */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Color:</span>
            <div className="flex gap-1">
              {strokeColors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-transform ${
                    toolOptions.strokeColor === color
                      ? "border-accent-500 scale-110"
                      : isDark
                        ? "border-dark-600"
                        : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onToolOptionsChange({ strokeColor: color })}
                />
              ))}
              <input
                type="color"
                value={toolOptions.strokeColor}
                onChange={(e) => onToolOptionsChange({ strokeColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Stroke width */}
          {activeTool !== "text" && activeTool !== "whiteoutReplace" && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Width:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={toolOptions.strokeWidth}
                onChange={(e) => onToolOptionsChange({ strokeWidth: Number(e.target.value) })}
                className="w-20 accent-accent-600"
              />
              <span className={`text-xs w-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                {toolOptions.strokeWidth}
              </span>
            </div>
          )}

          {/* Font size for text */}
          {activeTool === "text" && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Size:</span>
              <input
                type="number"
                min="8"
                max="72"
                value={toolOptions.fontSize}
                onChange={(e) => onToolOptionsChange({ fontSize: Number(e.target.value) })}
                className={`w-16 px-2 py-1 rounded text-sm ${
                  isDark
                    ? "bg-dark-700 text-white border-dark-600"
                    : "bg-gray-100 text-gray-900 border-gray-300"
                } border`}
              />
            </div>
          )}

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={toolOptions.opacity}
              onChange={(e) => onToolOptionsChange({ opacity: Number(e.target.value) })}
              className="w-20 accent-accent-600"
            />
            <span className={`text-xs w-8 ${isDark ? "text-white" : "text-gray-900"}`}>
              {Math.round(toolOptions.opacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

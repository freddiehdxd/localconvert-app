import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import type { TextBlock } from "./types";

interface TextBlockOverlayProps {
  block: TextBlock;
  zoom: number;
  onEdit: (blockId: string, newText: string) => void;
  onRevert?: (blockId: string) => void;
  isDark: boolean;
}

/**
 * Estimate if text will fit within the original bounds
 * Returns a ratio: < 1 means fits, > 1 means overflow
 */
function estimateTextFitRatio(
  newText: string,
  originalText: string,
  originalWidth: number,
  fontSize: number
): number {
  // Approximate character width based on font size
  // This is a rough estimate - actual width depends on font
  const avgCharWidth = fontSize * 0.6;
  
  const newTextWidth = newText.length * avgCharWidth;
  const originalTextWidth = Math.max(originalText.length * avgCharWidth, originalWidth);
  
  return newTextWidth / originalTextWidth;
}

function TextBlockOverlay({ block, zoom, onEdit, onRevert, isDark }: TextBlockOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.editedText ?? block.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit text when block changes
  useEffect(() => {
    setEditText(block.editedText ?? block.text);
  }, [block.editedText, block.text]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Calculate text fit ratio for current edit
  const textFitRatio = useMemo(() => {
    if (!block.isEdited && editText === block.text) return 1;
    return estimateTextFitRatio(editText, block.text, block.width, block.fontSize);
  }, [editText, block.text, block.width, block.fontSize, block.isEdited]);

  const isOverflowing = textFitRatio > 1.1; // 10% tolerance

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== block.text) {
      onEdit(block.id, editText);
    }
  }, [editText, block.id, block.text, onEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditText(block.editedText ?? block.text);
      setIsEditing(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  }, [block.editedText, block.text, handleBlur]);

  const handleRevert = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(block.text);
    onEdit(block.id, block.text);
    onRevert?.(block.id);
  }, [block.id, block.text, onEdit, onRevert]);

  // Calculate scaled position and size
  const scaledX = block.x * zoom;
  const scaledY = block.y * zoom;
  const scaledWidth = Math.max(block.width * zoom, 20);
  const scaledHeight = Math.max(block.height * zoom, 16);
  const scaledFontSize = Math.max(block.fontSize * zoom, 8);

  // Determine border color based on state
  const getBorderStyle = () => {
    if (isEditing) {
      return isOverflowing 
        ? "border-2 border-amber-500" 
        : "border-2 border-accent-500";
    }
    if (isHovered) {
      return isDark
        ? "border border-accent-500/50"
        : "border border-accent-500/40";
    }
    if (block.isEdited) {
      return isOverflowing
        ? "border border-amber-500/60"
        : "border border-green-500/60";
    }
    return "border border-transparent";
  };

  return (
    <div
      className="absolute transition-all duration-150"
      style={{
        left: `${scaledX}px`,
        top: `${scaledY}px`,
        minWidth: `${scaledWidth}px`,
        minHeight: `${scaledHeight}px`,
        zIndex: isEditing ? 50 : isHovered ? 10 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isEditing && setIsHovered(false)}
    >
      {isEditing ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`resize-none rounded px-1 outline-none shadow-lg ${getBorderStyle()}`}
            style={{
              fontSize: `${scaledFontSize}px`,
              lineHeight: 1.2,
              minWidth: `${scaledWidth + 20}px`,
              minHeight: `${scaledHeight + 8}px`,
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
              color: isDark ? '#ffffff' : '#111827',
              boxSizing: 'border-box',
            }}
          />
          {/* Overflow indicator while editing */}
          {isOverflowing && (
            <div className="absolute -bottom-6 left-0 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" />
              Text may overflow ({Math.round(textFitRatio * 100)}%)
            </div>
          )}
          {/* Character count */}
          <div 
            className={`absolute -bottom-6 right-0 px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap ${
              isDark ? 'bg-dark-700 text-dark-300' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {editText.length} chars
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`cursor-text rounded transition-all duration-150 ${getBorderStyle()} ${
            isHovered && !block.isEdited 
              ? (isDark ? "bg-accent-500/20 shadow-sm" : "bg-accent-500/10 shadow-sm")
              : ""
          }`}
          style={{
            minWidth: `${scaledWidth}px`,
            minHeight: `${scaledHeight}px`,
            padding: "1px 2px",
            backgroundColor: block.isEdited ? '#ffffff' : (isHovered ? undefined : 'transparent'),
          }}
          title={isHovered ? "Click to edit text" : undefined}
        >
          {/* Show edited text visibly, or invisible placeholder for unedited blocks */}
          <span
            className={`select-none whitespace-pre ${block.isEdited ? '' : 'opacity-0'}`}
            style={{
              fontSize: `${scaledFontSize}px`,
              lineHeight: 1.2,
              color: '#000000',
            }}
          >
            {block.editedText ?? block.text}
          </span>

          {/* Modified badge for edited blocks */}
          {block.isEdited && isHovered && (
            <div className="absolute -top-5 left-0 flex items-center gap-1">
              <span 
                className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded font-medium ${
                  isOverflowing 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}
              >
                {isOverflowing ? (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Overflow
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Modified
                  </>
                )}
              </span>
              <button
                onClick={handleRevert}
                className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                title="Revert to original"
              >
                Revert
              </button>
            </div>
          )}

          {/* Small edit indicator when not hovered */}
          {block.isEdited && !isHovered && (
            <div 
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center ${
                isOverflowing ? 'bg-amber-500' : 'bg-green-500'
              }`}
            >
              {isOverflowing ? (
                <AlertTriangle className="w-2 h-2 text-white" />
              ) : (
                <Check className="w-2 h-2 text-white" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TextOverlayProps {
  textBlocks: TextBlock[];
  zoom: number;
  onEditBlock: (blockId: string, newText: string) => void;
  onRevertBlock?: (blockId: string) => void;
  isDark: boolean;
  enabled: boolean;
}

export function TextOverlay({ 
  textBlocks, 
  zoom, 
  onEditBlock, 
  onRevertBlock,
  isDark, 
  enabled 
}: TextOverlayProps) {
  if (!enabled || textBlocks.length === 0) {
    return null;
  }

  // Count edited blocks for summary
  const editedCount = textBlocks.filter(b => b.isEdited).length;
  const overflowCount = textBlocks.filter(b => {
    if (!b.isEdited || !b.editedText) return false;
    const ratio = estimateTextFitRatio(b.editedText, b.text, b.width, b.fontSize);
    return ratio > 1.1;
  }).length;

  return (
    <div 
      className="absolute top-0 left-0 pointer-events-none"
      style={{ 
        width: '100%', 
        height: '100%',
        overflow: 'visible'
      }}
    >
      {/* Edit summary badge */}
      {editedCount > 0 && (
        <div 
          className={`fixed top-2 right-2 z-50 pointer-events-auto px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium ${
            isDark ? 'bg-dark-700 text-white' : 'bg-white text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-500" />
              {editedCount} text edit{editedCount !== 1 ? 's' : ''}
            </span>
            {overflowCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overflowCount} overflow
              </span>
            )}
          </div>
        </div>
      )}

      {textBlocks.map((block) => (
        <div key={block.id} className="pointer-events-auto">
          <TextBlockOverlay
            block={block}
            zoom={zoom}
            onEdit={onEditBlock}
            onRevert={onRevertBlock}
            isDark={isDark}
          />
        </div>
      ))}
    </div>
  );
}

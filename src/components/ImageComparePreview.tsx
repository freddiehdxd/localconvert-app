import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useStore } from "../store/useStore";

interface ImageComparePreviewProps {
  originalSrc: string;
  previewSrc: string;
  originalSize: number;
  estimatedSize: number;
  onClose: () => void;
}

export function ImageComparePreview({
  originalSrc,
  previewSrc,
  originalSize,
  estimatedSize,
  onClose,
}: ImageComparePreviewProps) {
  const { settings } = useStore();
  const isDark = settings.theme === "dark";
  
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const sizeDiff = originalSize - estimatedSize;
  const sizePercent = ((sizeDiff / originalSize) * 100).toFixed(1);

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl ${
          isDark ? "bg-dark-900" : "bg-gray-900"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-white">Compare Preview</h2>
            
            {/* Size Info */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-dark-400">Original: </span>
                <span className="text-white font-medium">{formatSize(originalSize)}</span>
              </div>
              <div>
                <span className="text-dark-400">Estimated: </span>
                <span className="text-white font-medium">{formatSize(estimatedSize)}</span>
              </div>
              {sizeDiff > 0 && (
                <div className="px-2 py-0.5 rounded bg-green-600/20 text-green-500 text-xs font-medium">
                  -{sizePercent}% smaller
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 mr-4">
              <motion.button
                className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ZoomOut className="w-4 h-4" />
              </motion.button>
              <span className="text-sm text-dark-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <motion.button
                className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ZoomIn className="w-4 h-4" />
              </motion.button>
            </div>
            
            <motion.button
              className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Compare Container */}
        <div
          ref={containerRef}
          className="relative aspect-video bg-[#1a1a1a] cursor-ew-resize overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragging ? "grabbing" : "ew-resize" }}
        >
          {/* Original Image (Full width, behind) */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={originalSrc}
              alt="Original"
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>

          {/* Preview Image (Clipped) */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={previewSrc}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>

          {/* Slider Line */}
          <div
            className="absolute inset-y-0 w-0.5 bg-white shadow-lg z-10"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Slider Handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
              <Move className="w-5 h-5 text-gray-700" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
            Original
          </div>
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
            Preview ({settings.defaultQuality}% quality)
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-dark-700">
          <p className="text-sm text-dark-400">
            Drag the slider to compare original and preview
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-32 h-2 rounded-lg appearance-none cursor-pointer accent-accent-600 bg-dark-600"
            />
            <motion.button
              className="px-4 py-2 rounded-xl bg-dark-700 text-dark-300 hover:text-white text-sm"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { formatFileSize } from "../types/formats";

export function ImagePreviewModal() {
  const { files, settings, previewImageId, setPreviewImageId } = useStore();
  const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = settings.theme === "dark";

  // Get all image files
  const imageFiles = files.filter(f => f.category === "image" && f.previewUrl);
  
  // Find current image index
  const currentIndex = imageFiles.findIndex(f => f.id === previewImageId);
  const currentFile = currentIndex >= 0 ? imageFiles[currentIndex] : null;

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setFullPreviewUrl(null);
      setPreviewImageId(imageFiles[currentIndex - 1].id);
    }
  }, [currentIndex, imageFiles, setPreviewImageId]);

  const goToNext = useCallback(() => {
    if (currentIndex < imageFiles.length - 1) {
      setFullPreviewUrl(null);
      setPreviewImageId(imageFiles[currentIndex + 1].id);
    }
  }, [currentIndex, imageFiles, setPreviewImageId]);

  const closeModal = useCallback(() => {
    setPreviewImageId(null);
    setFullPreviewUrl(null);
  }, [setPreviewImageId]);

  // Load full-size image when preview opens or changes
  useEffect(() => {
    if (currentFile && !fullPreviewUrl && !loading) {
      setLoading(true);
      invoke<string>("get_image_preview", { path: currentFile.path, maxSize: 1920 })
        .then((url) => {
          setFullPreviewUrl(url);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [currentFile, fullPreviewUrl, loading]);

  // Reset full preview URL when image changes
  useEffect(() => {
    setFullPreviewUrl(null);
  }, [previewImageId]);

  // Keyboard navigation
  useEffect(() => {
    if (!previewImageId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImageId, goToPrevious, goToNext, closeModal]);

  if (!currentFile) return null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < imageFiles.length - 1;

  return (
    <AnimatePresence>
      {previewImageId && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
        >
          {/* Previous Button */}
          {hasPrevious && (
            <motion.button
              className="absolute left-4 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
          )}

          {/* Next Button */}
          {hasNext && (
            <motion.button
              className="absolute right-4 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}

          {/* Image Container */}
          <motion.div
            className="relative max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-dark-900"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="flex items-center justify-center w-[400px] h-[300px]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-accent-500" />
                  <p className="text-dark-300 text-sm">Loading image...</p>
                </div>
              </div>
            ) : (
              <motion.img
                key={currentFile.id}
                src={fullPreviewUrl || currentFile.previewUrl || ""}
                alt={currentFile.name}
                className="max-w-[90vw] max-h-[85vh] object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}

            {/* Image Info */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t ${
              isDark ? "from-black/90 to-transparent" : "from-black/70 to-transparent"
            }`}>
              <p className="text-white font-medium truncate">{currentFile.name}</p>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <span>{currentFile.extension.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(currentFile.size)}</span>
                {imageFiles.length > 1 && (
                  <>
                    <span>•</span>
                    <span>{currentIndex + 1} / {imageFiles.length}</span>
                  </>
                )}
              </div>
            </div>

            {/* Close Button */}
            <motion.button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              onClick={closeModal}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

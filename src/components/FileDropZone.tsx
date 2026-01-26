import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileUp, Sparkles, FolderOpen, Video, Music, Image, FileText, Table, Presentation, BookOpen, Archive, PenTool, Type } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "../store/useStore";
import type { FileInfo } from "../store/useStore";
import { CATEGORIES } from "../types/formats";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Upload,
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
  spreadsheet: Table,
  presentation: Presentation,
  ebook: BookOpen,
  archive: Archive,
  vector: PenTool,
  font: Type,
};

const categoryColors: Record<string, string> = {
  all: "from-accent-600 to-accent-500",
  video: "from-red-600 to-red-500",
  audio: "from-amber-600 to-amber-500",
  image: "from-green-600 to-green-500",
  document: "from-blue-600 to-blue-500",
  spreadsheet: "from-emerald-600 to-emerald-500",
  presentation: "from-orange-600 to-orange-500",
  ebook: "from-violet-600 to-violet-500",
  archive: "from-gray-600 to-gray-500",
  vector: "from-pink-600 to-pink-500",
  font: "from-teal-600 to-teal-500",
};

export function FileDropZone() {
  const { addFiles, activeCategory, settings } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isDark = settings.theme === "dark";

  // Get category-specific info
  const categoryData = CATEGORIES[activeCategory as keyof typeof CATEGORIES];
  const CategoryIcon = categoryIcons[activeCategory] || Upload;
  const categoryColor = categoryColors[activeCategory] || categoryColors.all;
  const categoryName = categoryData?.name || "All Files";
  const categoryFormats = "formats" in categoryData ? (categoryData.formats as string[]) : null;

  // Listen for Tauri native drag events for visual feedback
  useEffect(() => {
    const unlistenEnter = listen("tauri://drag-enter", () => {
      setIsDragging(true);
    });
    
    const unlistenLeave = listen("tauri://drag-leave", () => {
      setIsDragging(false);
    });
    
    const unlistenDrop = listen("tauri://drag-drop", () => {
      setIsDragging(false);
      setIsProcessing(true);
      // Processing state will be reset when files are added
      setTimeout(() => setIsProcessing(false), 500);
    });

    return () => {
      unlistenEnter.then((unlisten) => unlisten());
      unlistenLeave.then((unlisten) => unlisten());
      unlistenDrop.then((unlisten) => unlisten());
    };
  }, []);

  // Process files selected via file dialog
  const processFiles = useCallback(
    async (filePaths: string[]) => {
      setIsProcessing(true);
      try {
        const fileInfos: FileInfo[] = [];
        for (const path of filePaths) {
          try {
            const info = await invoke<FileInfo>("get_file_info", { path });
            fileInfos.push(info);
          } catch (error) {
            console.error(`Failed to get info for ${path}:`, error);
          }
        }
        if (fileInfos.length > 0) {
          addFiles(fileInfos);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [addFiles]
  );

  // Also handle browser drag events for visual feedback (needed for drag-over state)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Actual file handling is done via Tauri events in App.tsx
  }, []);

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await processFiles(paths);
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  }, [processFiles]);

  const handleBrowseFolder = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === "string") {
        // TODO: Recursively get files from folder
        console.log("Selected folder:", selected);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  }, []);

  return (
    <motion.div
      className={`relative w-full max-w-2xl aspect-[4/3] rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? "border-accent-500 bg-accent-600/10"
          : isDark
            ? "border-dark-600 hover:border-dark-500 bg-dark-800/30"
            : "border-gray-300 hover:border-gray-400 bg-white/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        scale: isDragging ? 1.02 : 1,
        borderColor: isDragging ? "#6366f1" : isDark ? "#565869" : "#d1d5db",
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-transparent" />
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(99, 102, 241, ${isDark ? '0.15' : '0.1'}) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
          animate={{
            opacity: isDragging ? 0.6 : 0.2,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-accent-gradient flex items-center justify-center mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <p className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Processing files...</p>
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-accent-gradient flex items-center justify-center mb-6"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <FileUp className="w-10 h-10 text-white" />
              </motion.div>
              <p className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Drop files here</p>
              <p className={isDark ? "text-dark-400" : "text-gray-500"}>Release to add files</p>
            </motion.div>
          ) : (
            <motion.div
              key={`idle-${activeCategory}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${categoryColor} flex items-center justify-center mb-6 shadow-lg`}
                whileHover={{ scale: 1.05 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CategoryIcon className="w-10 h-10 text-white" />
              </motion.div>
              <p className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {activeCategory === "all" 
                  ? "Drop files here to convert"
                  : `Drop ${categoryName.toLowerCase()} files here`}
              </p>
              <p className={`mb-6 text-center max-w-md ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {activeCategory === "all" ? (
                  <>
                    Supports video, audio, images, documents, and more.
                    <br />
                    All conversions happen locally on your device.
                  </>
                ) : (
                  <>
                    {categoryFormats ? (
                      <>
                        Supported formats: {categoryFormats.slice(0, 6).map(f => f.toUpperCase()).join(", ")}
                        {categoryFormats.length > 6 && ` +${categoryFormats.length - 6} more`}
                      </>
                    ) : (
                      "All conversions happen locally on your device."
                    )}
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <motion.button
                  className={`px-6 py-3 bg-gradient-to-r ${categoryColor} rounded-xl text-white font-medium shadow-lg btn-glow`}
                  onClick={handleBrowse}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Browse {activeCategory === "all" ? "Files" : categoryName}
                  </span>
                </motion.button>
                <motion.button
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                    isDark
                      ? "bg-dark-700 hover:bg-dark-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                  onClick={handleBrowseFolder}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Browse Folder
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Supported Formats Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <motion.div 
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-4 py-2 rounded-full ${
            isDark ? "bg-dark-800/80 border border-dark-700" : "bg-white/90 border border-gray-200 shadow-sm"
          }`}
        >
          {activeCategory === "all" ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-[10px] text-red-500 font-bold">
                  MP4
                </span>
                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-[10px] text-green-500 font-bold">
                  PNG
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[10px] text-blue-500 font-bold">
                  PDF
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] text-amber-500 font-bold">
                  MP3
                </span>
              </div>
              <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>100+ formats supported</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {categoryFormats?.slice(0, 4).map((format) => (
                  <span 
                    key={format}
                    className={`px-2 py-0.5 rounded-md bg-gradient-to-br ${categoryColor} text-[10px] text-white font-bold`}
                  >
                    {format.toUpperCase()}
                  </span>
                ))}
              </div>
              <span className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {categoryFormats?.length || 0} {categoryName.toLowerCase()} formats
              </span>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

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
  all: "from-accent-600 to-accent-400",
  video: "from-rose-600 to-rose-400",
  audio: "from-amber-500 to-amber-300",
  image: "from-emerald-600 to-emerald-400",
  document: "from-blue-600 to-blue-400",
  spreadsheet: "from-emerald-600 to-emerald-500",
  presentation: "from-orange-600 to-orange-400",
  ebook: "from-violet-600 to-violet-400",
  archive: "from-zinc-600 to-zinc-400",
  vector: "from-pink-600 to-pink-400",
  font: "from-teal-600 to-teal-400",
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
      className={`relative w-full max-w-3xl aspect-[4/3] rounded-[32px] border-2 transition-all duration-300 isolate overflow-hidden glass-panel-heavy ${
        isDragging
          ? "border-brand bg-brand/10 shadow-glow-strong"
          : isDark
            ? "border-dark-700/50 hover:border-dark-600"
            : "border-dark-200/50 hover:border-brand"
      } ${!isDragging && !isProcessing ? "animate-pulse-border" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        scale: isDragging ? 1.02 : 1,
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-glass-gradient">
        <div className={`absolute inset-0 ${isDragging ? "opacity-100" : "opacity-0"} transition-opacity duration-500 bg-gradient-to-br from-brand/20 to-transparent`} />
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139, 92, 246, ${isDark ? '0.15' : '0.1'}) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
          animate={{
            opacity: isDragging ? 0.8 : 0.3,
            scale: isDragging ? 1.05 : 1,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-10">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-24 h-24 rounded-2xl bg-accent-gradient flex items-center justify-center mb-8 shadow-glow"
                animate={{ rotate: 360, borderRadius: ["16px", "24px", "16px"] }}
                transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, borderRadius: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
              <p className={`text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${categoryColor}`}>Processing files...</p>
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-24 h-24 rounded-2xl bg-accent-gradient flex items-center justify-center mb-8 shadow-glow-strong"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <FileUp className="w-12 h-12 text-white" />
              </motion.div>
              <p className={`text-3xl font-extrabold mb-3 tracking-tight ${isDark ? "text-white" : "text-dark-900"}`}>Drop files here</p>
              <p className={`text-lg font-medium ${isDark ? "text-dark-400" : "text-dark-500"}`}>Release space to initiate transfer</p>
            </motion.div>
          ) : (
            <motion.div
              key={`idle-${activeCategory}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${categoryColor} flex items-center justify-center mb-8 shadow-glow`}
                whileHover={{ scale: 1.05, rotate: 5 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CategoryIcon className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className={`text-3xl font-extrabold tracking-tight mb-4 ${isDark ? "text-white" : "text-dark-900"}`}>
                {activeCategory === "all" 
                  ? "Drag & Drop Files Here"
                  : `Drop ${categoryName} Files`}
              </h2>
              <p className={`mb-10 max-w-lg text-lg ${isDark ? "text-dark-400" : "text-dark-500"}`}>
                {activeCategory === "all" ? (
                  <>
                    Seamlessly convert video, audio, images, documents, and 100+ formats without ever leaving your device.
                  </>
                ) : (
                  <>
                    {categoryFormats ? (
                      <>
                        Hardware-accelerated local conversion for {categoryFormats.slice(0, 5).map(f => f.toUpperCase()).join(", ")}
                        {categoryFormats.length > 5 && ` +${categoryFormats.length - 5} more.`}
                      </>
                    ) : (
                      "Secure, local conversion specifically tuned for your files."
                    )}
                  </>
                )}
              </p>
              <div className="flex gap-4">
                <motion.button
                  className={`px-8 py-4 bg-gradient-to-r ${categoryColor} rounded-xl text-white font-semibold text-lg btn-glow flex items-center gap-3`}
                  onClick={handleBrowse}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Upload className="w-5 h-5" />
                  Browse {activeCategory === "all" ? "Files" : categoryName}
                </motion.button>
                <motion.button
                  className={`px-6 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-colors glass-panel border ${
                    isDark
                      ? "hover:bg-dark-800 text-dark-200"
                      : "hover:bg-white text-dark-700"
                  }`}
                  onClick={handleBrowseFolder}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FolderOpen className="w-5 h-5" />
                  Select Folder
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Supported Formats Badge */}
      <div className="absolute bottom-6 w-full flex justify-center pointer-events-none">
        <motion.div 
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-md shadow-lg border ${
            isDark ? "bg-dark-900/40 border-dark-700/50" : "bg-white/60 border-white/40"
          }`}
        >
          {activeCategory === "all" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                  Video
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  Image
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                  Doc
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                  Audio
                </span>
              </div>
              <span className={`text-[11px] font-semibold tracking-wide ${isDark ? "text-dark-400" : "text-dark-500"}`}>100+ PLATFORM FORMATS</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {categoryFormats?.slice(0, 4).map((format) => (
                  <span 
                    key={format}
                    className={`px-2 py-0.5 rounded-md bg-gradient-to-br ${categoryColor} text-[10px] text-white font-bold uppercase tracking-wider shadow-sm`}
                  >
                    {format}
                  </span>
                ))}
              </div>
              <span className={`text-[11px] font-semibold tracking-wide ${isDark ? "text-dark-400" : "text-dark-500"}`}>
                {categoryFormats?.length || 0} OPTIMIZED PRESETS
              </span>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

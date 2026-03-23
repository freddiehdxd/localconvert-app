import { useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Trash2, CheckSquare, Square, Upload, GripVertical, Layers } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { FileCard } from "./FileCard";
import type { FileInfo, ConversionFile } from "../store/useStore";

export function FileList() {
  const {
    files,
    activeCategory,
    selectedFiles,
    selectAllFiles,
    deselectAllFiles,
    clearFiles,
    addFiles,
    reorderFiles,
    settings,
  } = useStore();

  const isDark = settings.theme === "dark";

  // For reordering, we need to work with the full files array
  const filteredFiles = useMemo(() => 
    activeCategory === "all"
      ? files
      : files.filter((f) => f.category === activeCategory),
    [files, activeCategory]
  );

  const handleReorder = useCallback((reorderedFiltered: ConversionFile[]) => {
    if (activeCategory === "all") {
      // Direct reorder when showing all files
      reorderFiles(reorderedFiltered);
    } else {
      // When filtered, we need to merge back into the original array
      const filteredIds = new Set(reorderedFiltered.map(f => f.id));
      const otherFiles = files.filter(f => !filteredIds.has(f.id));
      
      // Insert filtered files in their new order at the start
      reorderFiles([...reorderedFiltered, ...otherFiles]);
    }
  }, [activeCategory, files, reorderFiles]);

  const allSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((f) => selectedFiles.includes(f.id));

  const handleAddMore = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const fileInfos: FileInfo[] = [];
        
        for (const path of paths) {
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
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  }, [addFiles]);

  return (
    <div className="h-full flex flex-col relative z-10 glass-panel-heavy rounded-2xl overflow-hidden shadow-lg border-0 w-full">
      {/* Header */}
      <div className={`p-5 flex items-center justify-between border-b ${isDark ? "border-dark-700/50" : "border-dark-100/50"}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <h2 className={`text-[15px] font-bold tracking-wide uppercase ${isDark ? "text-white" : "text-dark-900"}`}>
            {activeCategory === "all" ? "All Queue" : `${activeCategory} Queue`}
          </h2>
          <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest ${
            isDark ? "bg-dark-800 text-dark-400 border border-dark-700" : "bg-white text-dark-500 border border-dark-100 shadow-sm"
          }`}>
            {filteredFiles.length} ITEM{filteredFiles.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDark
                ? "bg-dark-800/40 border-dark-700 hover:border-dark-600 text-dark-300 hover:text-white"
                : "bg-white/60 border-dark-100 hover:border-dark-200 text-dark-600 hover:text-dark-900"
            }`}
            onClick={() => (allSelected ? deselectAllFiles() : selectAllFiles())}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={filteredFiles.length === 0}
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-brand" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {allSelected ? "DESELECT" : "SELECT ALL"}
          </motion.button>
          
          <div className={`w-px h-6 mx-1 ${isDark ? "bg-dark-700/50" : "bg-dark-200/50"}`}></div>

          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDark
                ? "bg-brand/10 border-brand/20 hover:border-brand/40 text-brand hover:bg-brand/20"
                : "bg-brand/5 border-brand/20 hover:border-brand/40 text-brand hover:bg-brand/10"
            }`}
            onClick={handleAddMore}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-3.5 h-3.5" />
            ADD
          </motion.button>
          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDark
                ? "bg-error-500/10 border-error-500/20 hover:border-error-500/40 text-error-500 hover:bg-error-500/20"
                : "bg-error-500/5 border-error-500/20 hover:border-error-500/40 text-error-500 hover:bg-error-500/10"
            }`}
            onClick={clearFiles}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={filteredFiles.length === 0}
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </motion.button>
        </div>
      </div>

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-70">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2 border-dashed ${
              isDark ? "bg-dark-800/50 border-dark-700" : "bg-white/50 border-dark-200"
            }`}>
              <Upload className={`w-10 h-10 ${isDark ? "text-dark-500" : "text-dark-400"}`} />
            </div>
            <p className={`text-lg font-bold tracking-wide ${isDark ? "text-dark-400" : "text-dark-500"}`}>Queue is empty</p>
            <p className={`text-sm mt-2 ${isDark ? "text-dark-500" : "text-dark-400"}`}>
              {activeCategory === "all" ? "Add files to start converting" : `Add ${activeCategory} files to begin`}
            </p>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={filteredFiles} 
            onReorder={handleReorder}
            className="grid gap-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((file, index) => (
                <Reorder.Item
                  key={file.id}
                  value={file}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, overflow: 'hidden' }}
                  transition={{ delay: index * 0.02, type: 'spring', stiffness: 400, damping: 30 }}
                  className="relative group outline-none"
                  whileDrag={{ 
                    scale: 1.02, 
                    boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
                    zIndex: 10 
                  }}
                >
                  {/* Drag Handle Indicator */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 opacity-0 group-hover:opacity-100 transition-all z-10 p-1 cursor-grab active:cursor-grabbing ${
                    isDark ? "text-dark-500 hover:text-white" : "text-dark-300 hover:text-dark-900"
                  }`}>
                    <GripVertical className="w-5 h-5 drop-shadow-sm" />
                  </div>
                  <FileCard file={file} />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Drag hint */}
      <AnimatePresence>
        {filteredFiles.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`py-2 px-4 text-center border-t backdrop-blur-md ${
              isDark ? "bg-dark-800/40 border-dark-700/50 text-dark-500" : "bg-white/40 border-dark-100 text-dark-400"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <GripVertical className="w-3 h-3" />
              Drag files to reorder priority
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

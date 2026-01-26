import { useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Trash2, CheckSquare, Square, Upload, GripVertical } from "lucide-react";
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {activeCategory === "all" ? "All Files" : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Files`}
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-sm ${
            isDark ? "bg-dark-700 text-dark-300" : "bg-gray-200 text-gray-600"
          }`}>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDark
                ? "bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => (allSelected ? deselectAllFiles() : selectAllFiles())}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allSelected ? "Deselect All" : "Select All"}
          </motion.button>
          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDark
                ? "bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
            }`}
            onClick={handleAddMore}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Add More
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error-600/20 hover:bg-error-600/30 text-error-500 text-sm transition-colors"
            onClick={clearFiles}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </motion.button>
        </div>
      </div>

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
        {filteredFiles.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center ${isDark ? "text-dark-400" : "text-gray-400"}`}>
            <Upload className="w-12 h-12 mb-4 opacity-50" />
            <p>No {activeCategory === "all" ? "" : activeCategory + " "}files added yet</p>
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative group"
                  whileDrag={{ 
                    scale: 1.02, 
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    zIndex: 10 
                  }}
                >
                  {/* Drag Handle Indicator */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDark ? "text-dark-500" : "text-gray-400"
                  }`}>
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <FileCard file={file} />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Drag hint */}
      {filteredFiles.length > 1 && (
        <p className={`text-xs text-center mt-2 ${isDark ? "text-dark-500" : "text-gray-400"}`}>
          Drag files to reorder conversion queue
        </p>
      )}
    </div>
  );
}

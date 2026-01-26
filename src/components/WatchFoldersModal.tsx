import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  FolderSearch,
  Plus,
  Trash2,
  Play,
  Pause,
  Folder,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";

interface WatchFolder {
  path: string;
  outputFormat: string;
  outputDir: string;
  active: boolean;
}

interface WatchFoldersModalProps {
  onClose: () => void;
}

export function WatchFoldersModal({ onClose }: WatchFoldersModalProps) {
  const { settings } = useStore();
  const isDark = settings.theme === "dark";
  
  const [watchFolders, setWatchFolders] = useState<WatchFolder[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select folder to watch",
      });

      if (selected && typeof selected === "string") {
        // Check if already watching this folder
        if (watchFolders.some((f) => f.path === selected)) {
          toast.error("Already watching this folder");
          return;
        }

        setWatchFolders([
          ...watchFolders,
          {
            path: selected,
            outputFormat: "mp4",
            outputDir: settings.outputDirectory || selected,
            active: true,
          },
        ]);
        toast.success("Folder added to watch list");
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const handleRemoveFolder = (path: string) => {
    setWatchFolders(watchFolders.filter((f) => f.path !== path));
  };

  const handleToggleActive = (path: string) => {
    setWatchFolders(
      watchFolders.map((f) =>
        f.path === path ? { ...f, active: !f.active } : f
      )
    );
  };

  const handleStartWatching = () => {
    if (watchFolders.filter((f) => f.active).length === 0) {
      toast.error("No active folders to watch");
      return;
    }
    setIsWatching(true);
    toast.success("Started watching folders");
  };

  const handleStopWatching = () => {
    setIsWatching(false);
    toast.success("Stopped watching folders");
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-2xl border w-full max-w-lg overflow-hidden shadow-2xl ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isWatching ? "bg-green-600/20" : isDark ? "bg-dark-700" : "bg-gray-100"
            }`}>
              <FolderSearch className={`w-5 h-5 ${isWatching ? "text-green-500" : isDark ? "text-dark-400" : "text-gray-500"}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Watch Folders</h2>
              <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Auto-convert files dropped into folders
              </p>
            </div>
          </div>
          <motion.button
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Status Banner */}
          {isWatching && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-600/10 border border-green-600/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-500">
                Watching {watchFolders.filter((f) => f.active).length} folder(s) for new files
              </span>
            </div>
          )}

          {/* Add Folder Button */}
          <motion.button
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors ${
              isDark
                ? "border-dark-600 text-dark-400 hover:border-accent-500 hover:text-accent-500"
                : "border-gray-300 text-gray-500 hover:border-accent-500 hover:text-accent-500"
            }`}
            onClick={handleAddFolder}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            Add Watch Folder
          </motion.button>

          {/* Folder List */}
          {watchFolders.length > 0 ? (
            <div className="space-y-2">
              {watchFolders.map((folder) => (
                <motion.div
                  key={folder.path}
                  className={`rounded-xl p-4 ${
                    isDark ? "bg-dark-700/50" : "bg-gray-100"
                  } ${!folder.active ? "opacity-50" : ""}`}
                  layout
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? "bg-dark-600" : "bg-gray-200"
                    }`}>
                      <Folder className={`w-5 h-5 ${isDark ? "text-dark-300" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {folder.path.split(/[/\\]/).pop()}
                      </p>
                      <p className={`text-xs truncate ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        {folder.path}
                      </p>
                      <div className={`flex items-center gap-2 mt-2 text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        <span>Convert to:</span>
                        <span className="uppercase font-medium text-accent-500">{folder.outputFormat}</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="truncate">{folder.outputDir.split(/[/\\]/).pop()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        className={`p-2 rounded-lg transition-colors ${
                          folder.active
                            ? "bg-green-600/20 text-green-500"
                            : isDark
                              ? "bg-dark-600 text-dark-400"
                              : "bg-gray-200 text-gray-500"
                        }`}
                        onClick={() => handleToggleActive(folder.path)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={folder.active ? "Disable" : "Enable"}
                      >
                        {folder.active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </motion.button>
                      <motion.button
                        className={`p-2 rounded-lg transition-colors ${
                          isDark ? "hover:bg-dark-600 text-dark-400 hover:text-error-500" : "hover:bg-gray-200 text-gray-500 hover:text-error-500"
                        }`}
                        onClick={() => handleRemoveFolder(folder.path)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              <FolderSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No watch folders configured</p>
              <p className="text-xs">Add a folder to automatically convert files</p>
            </div>
          )}

          {/* Info */}
          <div className={`flex items-start gap-2 p-3 rounded-lg ${isDark ? "bg-dark-700/30" : "bg-gray-50"}`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? "text-dark-400" : "text-gray-400"}`} />
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Watch folders monitor for new files and automatically convert them using your selected format and settings. 
              Files are converted in the background.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-between items-center p-4 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <span className={`text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}>
            {watchFolders.filter((f) => f.active).length} active folder(s)
          </span>
          <div className="flex gap-2">
            <motion.button
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                isDark ? "bg-dark-700 text-dark-300 hover:text-white" : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
            {isWatching ? (
              <motion.button
                className="px-4 py-2 rounded-xl bg-error-600/20 text-error-500 text-sm font-medium flex items-center gap-2"
                onClick={handleStopWatching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Pause className="w-4 h-4" />
                Stop Watching
              </motion.button>
            ) : (
              <motion.button
                className="px-4 py-2 rounded-xl bg-green-600/20 text-green-500 text-sm font-medium flex items-center gap-2"
                onClick={handleStartWatching}
                disabled={watchFolders.filter((f) => f.active).length === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="w-4 h-4" />
                Start Watching
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import {
  X,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FolderOpen,
  FileText,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";

interface HistoryModalProps {
  onClose: () => void;
}

export function HistoryModal({ onClose }: HistoryModalProps) {
  const { history, clearHistory, settings } = useStore();
  const isDark = settings.theme === "dark";

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-2xl border w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Conversion History</h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <motion.button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error-600/20 text-error-500 text-sm"
                onClick={clearHistory}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </motion.button>
            )}
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className={`h-full flex flex-col items-center justify-center py-12 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No conversion history</p>
              <p className="text-sm">Your conversions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  className={`rounded-xl p-4 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        item.success
                          ? "bg-success-600/20 text-success-500"
                          : "bg-error-600/20 text-error-500"
                      }`}
                    >
                      {item.success ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {item.inputName}
                        </span>
                        <span className={isDark ? "text-dark-400" : "text-gray-500"}>→</span>
                        <span className="uppercase text-accent-500 font-medium">
                          {item.outputFormat}
                        </span>
                      </div>
                      {item.success && item.outputPath && (
                        <p className={`text-sm truncate mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                          {item.outputPath}
                        </p>
                      )}
                      <div className={`flex items-center gap-4 mt-2 text-xs ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(item.timestamp)}
                        </span>
                        <span>{formatDuration(item.durationMs)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {item.success && item.outputPath && (
                      <motion.button
                        className={`p-2 rounded-lg transition-colors hover:text-accent-500 ${
                          isDark ? "hover:bg-dark-600 text-dark-400" : "hover:bg-gray-200 text-gray-500"
                        }`}
                        onClick={async () => {
                          try {
                            await invoke("open_file_location", { path: item.outputPath });
                          } catch (error) {
                            toast.error("Failed to open file location");
                          }
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Open location"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

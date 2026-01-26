import { motion } from "framer-motion";
import {
  Video,
  Music,
  Image,
  FileText,
  Table,
  Presentation,
  BookOpen,
  Archive,
  PenTool,
  Type,
  File,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  FolderOpen,
  Clock,
  Zap,
  Maximize2,
  TrendingDown,
  TrendingUp,
  Edit3,
  Scissors,
} from "lucide-react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { useStore, ConversionFile } from "../store/useStore";
import { formatFileSize, getOutputFormats } from "../types/formats";

// Format time in seconds to a human-readable string
function formatETA(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// Format speed multiplier
function formatSpeed(speed: number | null): string {
  if (speed === null || speed <= 0) return "";
  return `${speed.toFixed(2)}x`;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

const colorMap: Record<string, string> = {
  video: "text-red-500 bg-red-500/10",
  audio: "text-amber-500 bg-amber-500/10",
  image: "text-green-500 bg-green-500/10",
  document: "text-blue-500 bg-blue-500/10",
  spreadsheet: "text-emerald-500 bg-emerald-500/10",
  presentation: "text-orange-500 bg-orange-500/10",
  ebook: "text-violet-500 bg-violet-500/10",
  archive: "text-gray-500 bg-gray-500/10",
  vector: "text-pink-500 bg-pink-500/10",
  font: "text-teal-500 bg-teal-500/10",
};

interface FileCardProps {
  file: ConversionFile;
}

export function FileCard({ file }: FileCardProps) {
  const {
    removeFile,
    selectFile,
    deselectFile,
    selectedFiles,
    setFileOutputFormat,
    globalOutputFormat,
    settings,
    setPreviewImageId,
    openPdfEditor,
    openVideoTrimmer,
  } = useStore();
  const [showFormats, setShowFormats] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const isDark = settings.theme === "dark";

  // Fetch size estimate when output format changes
  const currentFormat = file.outputFormat || globalOutputFormat;
  useEffect(() => {
    if (currentFormat && file.status === "pending") {
      invoke<number>("get_file_size_estimate", {
        inputPath: file.path,
        outputFormat: currentFormat,
        quality: settings.defaultQuality,
      })
        .then(setEstimatedSize)
        .catch(() => setEstimatedSize(null));
    } else {
      setEstimatedSize(null);
    }
  }, [currentFormat, file.path, file.status, settings.defaultQuality]);

  const handleOpenFileLocation = async (path: string) => {
    try {
      await invoke("open_file_location", { path });
    } catch (error) {
      toast.error("Failed to open file location");
      console.error(error);
    }
  };

  const Icon = iconMap[file.category] || File;
  const colorClass = colorMap[file.category] || "text-dark-400 bg-dark-700";
  const isSelected = selectedFiles.includes(file.id);
  const outputFormats = getOutputFormats(file.extension);

  const handleToggleSelect = () => {
    if (isSelected) {
      deselectFile(file.id);
    } else {
      selectFile(file.id);
    }
  };

  const handleSelectFormat = (format: string) => {
    setFileOutputFormat(file.id, format);
    setShowFormats(false);
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case "converting":
        return <Loader2 className="w-4 h-4 animate-spin text-accent-400" />;
      case "completed":
        return <Check className="w-4 h-4 text-success-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-error-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case "converting":
        return "border-accent-500/50";
      case "completed":
        return "border-success-500/50";
      case "error":
        return "border-error-500/50";
      default:
        return isSelected ? "border-accent-500/50" : "border-transparent";
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 ${getStatusColor()} transition-colors ${
        isDark ? "bg-dark-800/50 hover:bg-dark-800/70" : "bg-white shadow-sm hover:shadow-md"
      }`}
    >
      {/* Progress Bar */}
      {file.status === "converting" && (
        <div className="absolute top-0 left-0 right-0">
          <div className={`h-1 rounded-t-xl overflow-hidden ${isDark ? "bg-dark-700" : "bg-gray-200"}`}>
            <motion.div
              className="h-full progress-shimmer"
              initial={{ width: 0 }}
              animate={{ width: `${file.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Progress Info Bar */}
          <div className={`absolute top-1 right-2 flex items-center gap-3 text-xs ${isDark ? "text-dark-300" : "text-gray-500"}`}>
            <span className="font-medium text-accent-500">
              {Math.round(file.progress)}%
            </span>
            {file.speed !== null && file.speed > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatSpeed(file.speed)}
              </span>
            )}
            {file.etaSecs !== null && file.etaSecs > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatETA(file.etaSecs)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4 flex items-center gap-4">
        {/* Checkbox */}
        <motion.button
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-accent-600 border-accent-600"
              : isDark
                ? "border-dark-500 hover:border-accent-500"
                : "border-gray-300 hover:border-accent-500"
          }`}
          onClick={handleToggleSelect}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </motion.button>

        {/* Icon / Image Preview */}
        {file.previewLoading ? (
          <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : file.previewUrl && !imageError ? (
          <div 
            className="relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer group flex-shrink-0"
            onClick={() => setPreviewImageId(file.id)}
          >
            <img
              src={file.previewUrl}
              alt={file.name}
              className="w-12 h-12 object-cover rounded-xl"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
        )}

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`} title={file.name}>
            {file.name}
          </h3>
          <div className={`flex items-center gap-3 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
            <span className="uppercase">{file.extension}</span>
            <span>•</span>
            <span>{formatFileSize(file.size)}</span>
            {file.status === "completed" && file.outputPath && (
              <>
                <span>•</span>
                <motion.button
                  className="flex items-center gap-1 text-accent-500 hover:text-accent-400"
                  onClick={() => handleOpenFileLocation(file.outputPath!)}
                  whileHover={{ scale: 1.05 }}
                >
                  <FolderOpen className="w-3 h-3" />
                  Open
                </motion.button>
              </>
            )}
            {estimatedSize !== null && file.status === "pending" && (
              <>
                <span>•</span>
                <span className={`flex items-center gap-1 ${
                  estimatedSize < file.size ? "text-green-500" : "text-amber-500"
                }`}>
                  {estimatedSize < file.size ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  ~{formatFileSize(estimatedSize)}
                </span>
              </>
            )}
          </div>
          {file.error && (
            <p className="text-xs text-error-500 mt-1 truncate" title={file.error}>
              {file.error}
            </p>
          )}
        </div>

        {/* Format Selector with Edit/Trim buttons */}
        <div className="relative flex items-center gap-2">
          {/* Edit button for PDF files */}
          {file.extension.toLowerCase() === "pdf" && file.status === "pending" && (
            <motion.button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                isDark
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
              onClick={() => openPdfEditor(file.path, file.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Edit PDF"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </motion.button>
          )}

          {/* Trim button for video files */}
          {file.category === "video" && file.status === "pending" && (
            <motion.button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                isDark
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
              onClick={() => openVideoTrimmer(file.path, file.name, file.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Trim Video"
            >
              <Scissors className="w-4 h-4" />
              <span className="text-sm font-medium">Trim</span>
            </motion.button>
          )}

          <motion.button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentFormat
                ? "bg-accent-600/20 text-accent-600"
                : isDark
                  ? "bg-dark-700 text-dark-300 hover:text-white"
                  : "bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setShowFormats(!showFormats)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={file.status === "converting" || file.status === "completed"}
          >
            <span className="uppercase font-medium min-w-[40px]">
              {currentFormat || "Format"}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFormats ? "rotate-180" : ""}`}
            />
          </motion.button>

          {/* Format Dropdown */}
          {showFormats && (
            <motion.div
              className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden ${
                isDark ? "bg-dark-800 border border-dark-600" : "bg-white border border-gray-200"
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-2 max-h-64 overflow-y-auto dropdown-content">
                {outputFormats.length > 0 ? (
                  outputFormats.map((format) => (
                    <motion.button
                      key={format}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentFormat === format
                          ? "bg-accent-600/20 text-accent-600"
                          : isDark
                            ? "text-dark-300 hover:bg-dark-700 hover:text-white"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      onClick={() => handleSelectFormat(format)}
                      whileHover={{ x: 4 }}
                    >
                      <span className="uppercase font-medium">{format}</span>
                    </motion.button>
                  ))
                ) : (
                  <p className={`px-3 py-2 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    No conversions available
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Status Icon */}
        <div className="w-8 flex justify-center">{getStatusIcon()}</div>

        {/* Remove Button */}
        <motion.button
          className={`w-8 h-8 rounded-lg flex items-center justify-center hover:text-error-500 transition-colors ${
            isDark ? "hover:bg-dark-700 text-dark-400" : "hover:bg-gray-100 text-gray-400"
          }`}
          onClick={() => removeFile(file.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={file.status === "converting"}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Click outside to close dropdown */}
      {showFormats && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowFormats(false)}
        />
      )}
    </div>
  );
}

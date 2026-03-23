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

// Format video duration HH:MM:SS or MM:SS
function formatVideoDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  video: "text-rose-500 bg-rose-500/10 shadow-rose-500/20",
  audio: "text-amber-500 bg-amber-500/10 shadow-amber-500/20",
  image: "text-emerald-500 bg-emerald-500/10 shadow-emerald-500/20",
  document: "text-blue-500 bg-blue-500/10 shadow-blue-500/20",
  spreadsheet: "text-emerald-500 bg-emerald-500/10 shadow-emerald-500/20",
  presentation: "text-orange-500 bg-orange-500/10 shadow-orange-500/20",
  ebook: "text-violet-500 bg-violet-500/10 shadow-violet-500/20",
  archive: "text-zinc-500 bg-zinc-500/10 shadow-zinc-500/20",
  vector: "text-pink-500 bg-pink-500/10 shadow-pink-500/20",
  font: "text-teal-500 bg-teal-500/10 shadow-teal-500/20",
};

const borderHoverColorMap: Record<string, string> = {
  video: "group-hover:border-rose-500/50",
  audio: "group-hover:border-amber-500/50",
  image: "group-hover:border-emerald-500/50",
  document: "group-hover:border-blue-500/50",
  spreadsheet: "group-hover:border-emerald-500/50",
  presentation: "group-hover:border-orange-500/50",
  ebook: "group-hover:border-violet-500/50",
  archive: "group-hover:border-zinc-500/50",
  vector: "group-hover:border-pink-500/50",
  font: "group-hover:border-teal-500/50",
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
  const colorClass = colorMap[file.category] || "text-dark-400 bg-dark-700/50";
  const borderHoverClass = borderHoverColorMap[file.category] || "group-hover:border-dark-500";
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
        return <Loader2 className="w-5 h-5 animate-spin text-brand drop-shadow-sm" />;
      case "completed":
        return <div className="p-1 rounded-full bg-success-500/20"><Check className="w-4 h-4 text-success-500" /></div>;
      case "error":
        return <div className="p-1 rounded-full bg-error-500/20"><AlertCircle className="w-4 h-4 text-error-500" /></div>;
      default:
        return null;
    }
  };

  const getStatusBorderColor = () => {
    switch (file.status) {
      case "converting":
        return "border-brand shadow-[0_0_15px_rgba(139,92,246,0.2)]";
      case "completed":
        return "border-success-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]";
      case "error":
        return "border-error-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
      default:
        return isSelected 
          ? "border-brand shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
          : isDark 
            ? `border-dark-700 ${borderHoverClass}` 
            : `border-dark-100 ${borderHoverClass}`;
    }
  };

  return (
    <div
      className={`relative rounded-[20px] border-[1.5px] transition-all duration-300 isolate group ${getStatusBorderColor()} ${
        isDark ? "bg-dark-800/80 backdrop-blur-xl" : "bg-white/80 backdrop-blur-xl shadow-sm hover:shadow-md"
      }`}
    >
      {/* Selection Background Highlight */}
      <div className={`absolute inset-0 -z-10 transition-opacity duration-300 rounded-[20px] overflow-hidden ${
        isSelected ? "opacity-100" : "opacity-0"
      }`}>
        <div className={`absolute inset-0 ${isDark ? "bg-brand/5" : "bg-brand/5"}`}></div>
        <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
      </div>

      {/* Progress Bar */}
      {file.status === "converting" && (
        <div className="absolute top-0 left-0 right-0 z-20 rounded-t-[20px] overflow-hidden">
          <div className="h-1.5 w-full bg-dark-800/20 overflow-hidden">
            <motion.div
              className="h-full bg-accent-gradient progress-shimmer"
              initial={{ width: 0 }}
              animate={{ width: `${file.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Progress Info Bar */}
          <div className={`absolute top-2 right-3 flex items-center gap-3 text-[10px] font-bold tracking-wider rounded-md px-2 py-1 backdrop-blur-md shadow-sm border ${
            isDark ? "bg-dark-900/60 text-dark-300 border-dark-700/50" : "bg-white/80 text-dark-600 border-dark-100"
          }`}>
            <span className="text-brand flex items-center gap-1">
              {Math.round(file.progress)}%
            </span>
            {file.speed !== null && file.speed > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                {formatSpeed(file.speed)}
              </span>
            )}
            {file.etaSecs !== null && file.etaSecs > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                {formatETA(file.etaSecs)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4 flex items-center gap-4">
        {/* Checkbox */}
        <motion.button
          className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
            isSelected
              ? "bg-brand border-brand shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              : isDark
                ? "border-dark-500 hover:border-brand bg-dark-900/50"
                : "border-dark-300 hover:border-brand bg-white"
          }`}
          onClick={handleToggleSelect}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </motion.button>

        {/* Icon / Image Preview */}
        {file.previewLoading ? (
          <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center shadow-lg shrink-0`}>
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (file.previewUrl || file.thumbnail) && !imageError ? (
          <div 
            className="relative w-14 h-14 rounded-2xl overflow-hidden cursor-pointer preview-group shrink-0 shadow-lg border border-dark-100/10"
            onClick={() => {
              if (file.category === "image" && file.previewUrl) {
                setPreviewImageId(file.id);
              } else if (file.category === "video") {
                openVideoTrimmer(file.path, file.name, file.id);
              }
            }}
          >
            <img
              src={file.previewUrl || file.thumbnail}
              alt={file.name}
              className="w-14 h-14 object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              {file.category === "video" ? (
                <Scissors className="w-5 h-5 text-white drop-shadow-md" />
              ) : (
                <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
              )}
            </div>
          </div>
        ) : (
          <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center shrink-0 shadow-sm border border-white/5`}>
            <Icon className="w-7 h-7 drop-shadow-sm" />
          </div>
        )}

        {/* File Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={`font-bold text-[15px] truncate mb-1 ${isDark ? "text-white" : "text-dark-900"}`} title={file.name}>
            {file.name}
          </h3>
          <div className={`flex items-center gap-2 text-xs font-medium tracking-wide ${isDark ? "text-dark-400" : "text-dark-500"}`}>
            <span className={`uppercase px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isDark ? "bg-dark-700/50 text-dark-300" : "bg-dark-100/50 text-dark-600"
            }`}>{file.extension}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
            <span>{formatFileSize(file.size)}</span>
            
            {file.duration !== undefined && file.duration !== null && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatVideoDuration(file.duration)}
                </span>
              </>
            )}
            
            {(file.resolution || file.codec) && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                <span>
                  {file.resolution} {file.codec ? `(${file.codec})` : ""}
                </span>
              </>
            )}
            
            {file.status === "completed" && file.outputPath && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                <motion.button
                  className="flex items-center gap-1 text-brand hover:text-brand-light transition-colors font-bold"
                  onClick={() => handleOpenFileLocation(file.outputPath!)}
                  whileHover={{ scale: 1.05 }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  OPEN
                </motion.button>
              </>
            )}
            
            {estimatedSize !== null && file.status === "pending" && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                <span className={`flex items-center gap-1 font-bold ${
                  estimatedSize < file.size ? "text-success-500" : "text-amber-500"
                }`}>
                  {estimatedSize < file.size ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5" />
                  )}
                  ~{formatFileSize(estimatedSize)}
                </span>
              </>
            )}
          </div>
          {file.error && (
            <p className="text-[11px] font-bold text-error-500 mt-1.5 truncate flex items-center gap-1 bg-error-500/10 px-2 py-0.5 rounded-md inline-flex w-fit max-w-full" title={file.error}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              {file.error}
            </p>
          )}
        </div>

        {/* Format Selector with Edit/Trim buttons */}
        <div className="relative flex items-center gap-2 shrink-0">
          {/* Edit button for PDF files */}
          {file.extension.toLowerCase() === "pdf" && file.status === "pending" && (
            <motion.button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border ${
                isDark
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:border-amber-500/30"
                  : "bg-amber-50 border-amber-200/50 text-amber-600 hover:bg-amber-100"
              }`}
              onClick={() => openPdfEditor(file.path, file.name)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              title="Edit PDF"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Edit</span>
            </motion.button>
          )}

          {/* Trim button for video files */}
          {file.category === "video" && file.status === "pending" && (
            <motion.button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border ${
                isDark
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30"
                  : "bg-rose-50 border-rose-200/50 text-rose-600 hover:bg-rose-100"
              }`}
              onClick={() => openVideoTrimmer(file.path, file.name, file.id)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              title="Trim Video"
            >
              <Scissors className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Trim</span>
            </motion.button>
          )}

          <motion.button
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
              currentFormat
                ? isDark ? "bg-brand/20 border-brand/30 text-brand shadow-glow" : "bg-brand/10 border-brand/20 text-brand shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                : isDark
                  ? "bg-dark-800 border-dark-600 text-dark-300 hover:text-white hover:border-dark-500"
                  : "bg-white border-dark-200 text-dark-600 hover:text-dark-900 shadow-sm"
            }`}
            onClick={() => setShowFormats(!showFormats)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            disabled={file.status === "converting" || file.status === "completed"}
          >
            <span className="uppercase text-xs font-bold tracking-widest min-w-[50px] text-center">
              {currentFormat || "FORMAT"}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFormats ? "rotate-180" : ""}`}
            />
          </motion.button>

          {/* Format Dropdown */}
          {showFormats && (
            <motion.div
              className={`absolute right-0 top-[calc(100%+8px)] w-48 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl border ${
                isDark ? "bg-dark-800/90 border-dark-600" : "bg-white/90 border-dark-200"
              }`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                {outputFormats.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {outputFormats.map((format) => (
                      <motion.button
                        key={format}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex justify-between items-center ${
                          currentFormat === format
                            ? "bg-brand/20 text-brand"
                            : isDark
                              ? "text-dark-300 hover:bg-dark-700/50 hover:text-white"
                              : "text-dark-600 hover:bg-dark-100 hover:text-dark-900"
                        }`}
                        onClick={() => handleSelectFormat(format)}
                        whileHover={{ x: 4 }}
                      >
                        {format}
                        {currentFormat === format && <Check className="w-3.5 h-3.5" />}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className={`px-3 py-2 text-xs font-bold text-center ${isDark ? "text-dark-500" : "text-dark-400"}`}>
                    No formats available
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Status Icon */}
        <div className="w-10 flex justify-center shrink-0">{getStatusIcon()}</div>

        {/* Remove Button */}
        <motion.button
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            isDark 
              ? "hover:bg-error-500/20 text-dark-500 hover:text-error-500" 
              : "hover:bg-error-500/10 text-dark-400 hover:text-error-500"
          }`}
          onClick={() => removeFile(file.id)}
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.85 }}
          disabled={file.status === "converting"}
          title="Remove File"
        >
          <X className="w-5 h-5" />
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

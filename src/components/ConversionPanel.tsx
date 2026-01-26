import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  ChevronDown,
  Folder,
  Sliders,
  Zap,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { useStore, ConversionPreset } from "../store/useStore";
import { getOutputFormats } from "../types/formats";
import { PresetsSelector } from "./PresetsSelector";

export function ConversionPanel() {
  const {
    files,
    selectedFiles,
    convertFiles,
    cancelConversion,
    settings,
    updateSettings,
    globalOutputFormat,
    setGlobalOutputFormat,
  } = useStore();

  const isDark = settings.theme === "dark";
  const [showOptions, setShowOptions] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [quality, setQuality] = useState(settings.defaultQuality);
  const [preserveMetadata, setPreserveMetadata] = useState(settings.preserveMetadata);
  const [selectedPreset, setSelectedPreset] = useState<ConversionPreset | null>(null);

  const handleSelectPreset = (preset: ConversionPreset) => {
    setSelectedPreset(preset);
    setGlobalOutputFormat(preset.outputFormat);
    setQuality(preset.quality);
    if (preset.options) {
      // Apply preset options
      setShowOptions(true);
    }
  };

  const filesToConvert = selectedFiles.length > 0
    ? files.filter((f) => selectedFiles.includes(f.id) && f.status === "pending")
    : files.filter((f) => f.status === "pending");

  const convertingFiles = files.filter((f) => f.status === "converting");
  const completedFiles = files.filter((f) => f.status === "completed");
  const errorFiles = files.filter((f) => f.status === "error");

  // Get unique formats from selected files
  const uniqueExtensions = [
    ...new Set(filesToConvert.map((f) => f.extension.toLowerCase())),
  ];
  
  // Get common output formats
  const commonFormats = uniqueExtensions.length === 1
    ? getOutputFormats(uniqueExtensions[0])
    : [];

  const canConvert =
    filesToConvert.length > 0 &&
    filesToConvert.every((f) => f.outputFormat || globalOutputFormat);

  const handleSelectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        updateSettings({ outputDirectory: selected });
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const handleConvert = async () => {
    if (!canConvert) {
      toast.error("Please select an output format for all files");
      return;
    }

    try {
      await convertFiles({
        quality,
        preserveMetadata,
      });
      toast.success("Conversion completed!");
    } catch (error) {
      toast.error("Some conversions failed");
    }
  };

  return (
    <div className={`h-full flex flex-col rounded-2xl border overflow-hidden ${
      isDark ? "bg-dark-800/50 border-dark-700" : "bg-white border-gray-200 shadow-sm"
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}>
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          <Zap className="w-5 h-5 text-accent-500" />
          Convert
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className={`rounded-xl p-3 text-center ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
            <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{filesToConvert.length}</p>
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Pending</p>
          </div>
          <div className="bg-accent-600/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-accent-500">{convertingFiles.length}</p>
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Active</p>
          </div>
          <div className="bg-success-600/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-success-500">{completedFiles.length}</p>
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Done</p>
          </div>
          <div className="bg-error-600/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-error-500">{errorFiles.length}</p>
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>Failed</p>
          </div>
        </div>

        {/* Global Format Selector */}
        {uniqueExtensions.length === 1 && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-600"}`}>Output Format</label>
            <div className="relative">
              <motion.button
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
                onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className={globalOutputFormat 
                  ? `${isDark ? "text-white" : "text-gray-900"} uppercase font-medium` 
                  : isDark ? "text-dark-400" : "text-gray-500"
                }>
                  {globalOutputFormat || "Select format..."}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDark ? "text-dark-400" : "text-gray-500"} ${
                    showFormatDropdown ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {showFormatDropdown && (
                  <motion.div
                    className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-20 overflow-hidden ${
                      isDark ? "bg-dark-800 border border-dark-600" : "bg-white border border-gray-200"
                    }`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="p-2 max-h-48 overflow-y-auto">
                      {commonFormats.map((format) => (
                        <motion.button
                          key={format}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            globalOutputFormat === format
                              ? "bg-accent-600/20 text-accent-500"
                              : isDark
                                ? "text-dark-300 hover:bg-dark-700 hover:text-white"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                          onClick={() => {
                            setGlobalOutputFormat(format);
                            setShowFormatDropdown(false);
                          }}
                          whileHover={{ x: 4 }}
                        >
                          <span className="uppercase font-medium">{format}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        {uniqueExtensions.length === 1 && (
          <PresetsSelector
            category={filesToConvert[0]?.category || "all"}
            onSelectPreset={handleSelectPreset}
          />
        )}

        {/* Selected Preset Indicator */}
        {selectedPreset && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
            isDark ? "bg-amber-900/20 border border-amber-700/30" : "bg-amber-50 border border-amber-200"
          }`}>
            <span className={`text-xs ${isDark ? "text-amber-400" : "text-amber-700"}`}>
              Using preset: <strong>{selectedPreset.name}</strong>
            </span>
            <button
              className={`text-xs ${isDark ? "text-amber-500 hover:text-amber-400" : "text-amber-600 hover:text-amber-700"}`}
              onClick={() => setSelectedPreset(null)}
            >
              Clear
            </button>
          </div>
        )}

        {/* Output Directory */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-600"}`}>Output Directory</label>
          <motion.button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left group ${
              isDark ? "bg-dark-700" : "bg-gray-100"
            }`}
            onClick={handleSelectOutputDir}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Folder className={`w-5 h-5 group-hover:text-accent-500 transition-colors ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`} />
            <span className={`flex-1 text-sm truncate ${isDark ? "text-dark-300" : "text-gray-600"}`}>
              {settings.outputDirectory || "Select folder..."}
            </span>
          </motion.button>
        </div>

        {/* Advanced Options Toggle */}
        <motion.button
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${
            isDark ? "bg-dark-700/50" : "bg-gray-50"
          }`}
          onClick={() => setShowOptions(!showOptions)}
          whileHover={{ scale: 1.01 }}
        >
          <span className={`flex items-center gap-2 text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
            <Sliders className="w-4 h-4" />
            Advanced Options
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isDark ? "text-dark-400" : "text-gray-500"} ${
              showOptions ? "rotate-180" : ""
            }`}
          />
        </motion.button>

        {/* Advanced Options */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className={`text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-600"}`}>Quality</label>
                  <span className="text-sm text-accent-500">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent-600 ${
                    isDark ? "bg-dark-700" : "bg-gray-200"
                  }`}
                />
                <div className={`flex justify-between text-xs ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                  <span>Smaller</span>
                  <span>Better</span>
                </div>
              </div>

              {/* Preserve Metadata */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    preserveMetadata ? "bg-accent-600" : isDark ? "bg-dark-600" : "bg-gray-300"
                  }`}
                  onClick={() => setPreserveMetadata(!preserveMetadata)}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ left: preserveMetadata ? 20 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
                <span className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>Preserve metadata</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className={`p-4 border-t space-y-2 ${isDark ? "border-dark-700" : "border-gray-200"}`}>
        {/* Convert Button - always show if there are pending files with formats */}
        {filesToConvert.length > 0 && (
          <motion.button
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              canConvert
                ? "bg-accent-gradient text-white shadow-lg shadow-accent-600/25 btn-glow"
                : isDark
                  ? "bg-dark-700 text-dark-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            onClick={handleConvert}
            disabled={!canConvert}
            whileHover={canConvert ? { scale: 1.02 } : {}}
            whileTap={canConvert ? { scale: 0.98 } : {}}
          >
            <Play className="w-5 h-5" />
            Convert {filesToConvert.length} File{filesToConvert.length !== 1 ? "s" : ""}
          </motion.button>
        )}

        {/* Cancel Button - show when there are active conversions */}
        {convertingFiles.length > 0 && (
          <motion.button
            className="w-full py-3 bg-error-600/20 hover:bg-error-600/30 border border-error-600/50 rounded-xl text-error-500 font-semibold flex items-center justify-center gap-2 transition-colors"
            onClick={() => cancelConversion()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Pause className="w-5 h-5" />
            Cancel {convertingFiles.length} Converting
          </motion.button>
        )}

        {/* Show message when no pending files but conversions are running */}
        {filesToConvert.length === 0 && convertingFiles.length === 0 && files.length > 0 && (
          <div className={`text-center py-4 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
            {completedFiles.length > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-500" />
                All conversions completed
              </span>
            ) : (
              "Add files to convert"
            )}
          </div>
        )}

        {/* Warnings */}
        {!canConvert && filesToConvert.length > 0 && (
          <motion.p
            className="text-xs text-amber-500 flex items-center gap-1 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertTriangle className="w-3 h-3" />
            Select output format for all files
          </motion.p>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showFormatDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowFormatDropdown(false)}
        />
      )}
    </div>
  );
}

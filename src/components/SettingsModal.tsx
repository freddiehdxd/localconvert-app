import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Folder,
  Sun,
  Moon,
  Save,
  Cpu,
  Zap,
  Image,
  Video,
  FileText,
  Settings2,
  ChevronDown,
  Sliders,
  HardDrive,
  Palette,
  Shield,
  Layers,
  Gauge,
  Volume2,
  VolumeX,
  FileType,
  Terminal,
  MousePointer,
  Eye,
  EyeOff,
  Code,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";
import { playCompletionSound } from "../utils/sounds";

interface SettingsModalProps {
  onClose: () => void;
}

type CategoryId = "general" | "images" | "video" | "documents" | "processing" | "advanced";

interface Category {
  id: CategoryId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const categories: Category[] = [
  {
    id: "general",
    label: "General",
    icon: Settings2,
    description: "Output folder, theme, and app preferences",
  },
  {
    id: "images",
    label: "Images",
    icon: Image,
    description: "Quality and compression settings for images",
  },
  {
    id: "video",
    label: "Video & Audio",
    icon: Video,
    description: "GPU acceleration and encoding options",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    description: "PDF, Office, and document conversion settings",
  },
  {
    id: "processing",
    label: "Performance",
    icon: Gauge,
    description: "Batch processing and resource management",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Code,
    description: "Custom commands, context menu, and power user features",
  },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings, gpuInfo } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>("general");
  const isDark = settings.theme === "dark";

  const handleSelectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setLocalSettings((s) => ({ ...s, outputDirectory: selected }));
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success("Settings saved");
    onClose();
  };

  const toggleCategory = (id: CategoryId) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  // Toggle Switch Component
  const Toggle = ({
    enabled,
    onChange,
    color = "accent",
  }: {
    enabled: boolean;
    onChange: () => void;
    color?: "accent" | "green";
  }) => (
    <div
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
        enabled
          ? color === "green"
            ? "bg-green-600"
            : "bg-accent-600"
          : isDark ? "bg-dark-600" : "bg-gray-300"
      }`}
      onClick={onChange}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ left: enabled ? 22 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  );

  // Setting Row Component
  const SettingRow = ({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon?: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className={`flex items-start justify-between gap-4 py-4 border-b last:border-0 ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
      <div className="flex gap-3 flex-1 min-w-0">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
            <Icon className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h4>
          {description && (
            <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? "text-dark-400" : "text-gray-500"}`}>{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  // Category Accordion Component
  const CategoryAccordion = ({ category }: { category: Category }) => {
    const isExpanded = expandedCategory === category.id;
    const Icon = category.icon;

    return (
      <div className={`border-b last:border-0 ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
        <motion.button
          className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
            isExpanded 
              ? isDark ? "bg-dark-750" : "bg-gray-50" 
              : isDark ? "hover:bg-dark-750/50" : "hover:bg-gray-50/50"
          }`}
          onClick={() => toggleCategory(category.id)}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isExpanded
                ? "bg-accent-600/20 text-accent-500"
                : isDark
                  ? "bg-dark-700 text-dark-400"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{category.label}</h3>
            <p className={`text-xs truncate ${isDark ? "text-dark-400" : "text-gray-500"}`}>{category.description}</p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={isDark ? "text-dark-400" : "text-gray-500"}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <div className={`rounded-xl p-4 ${isDark ? "bg-dark-700/30" : "bg-gray-50"}`}>
                  {renderCategoryContent(category.id)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCategoryContent = (categoryId: CategoryId) => {
    switch (categoryId) {
      case "general":
        return (
          <div className="space-y-1">
            {/* Output Directory */}
            <SettingRow
              icon={HardDrive}
              title="Output Directory"
              description="Where converted files will be saved by default"
            >
              <motion.button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors max-w-[200px] ${
                  isDark 
                    ? "bg-dark-600 hover:bg-dark-500 text-dark-300 hover:text-white" 
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
                }`}
                onClick={handleSelectOutputDir}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {localSettings.outputDirectory
                    ? localSettings.outputDirectory.split(/[/\\]/).pop()
                    : "Choose..."}
                </span>
              </motion.button>
            </SettingRow>

            {/* Theme */}
            <SettingRow
              icon={Palette}
              title="Theme"
              description="Choose between dark and light mode"
            >
              <div className={`flex gap-1 rounded-lg p-1 ${isDark ? "bg-dark-600" : "bg-gray-200"}`}>
                <motion.button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    localSettings.theme === "dark"
                      ? isDark ? "bg-dark-500 text-white" : "bg-white text-gray-900 shadow-sm"
                      : isDark ? "text-dark-400 hover:text-dark-300" : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setLocalSettings((s) => ({ ...s, theme: "dark" }))}
                  whileTap={{ scale: 0.95 }}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </motion.button>
                <motion.button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    localSettings.theme === "light"
                      ? isDark ? "bg-dark-500 text-white" : "bg-white text-gray-900 shadow-sm"
                      : isDark ? "text-dark-400 hover:text-dark-300" : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setLocalSettings((s) => ({ ...s, theme: "light" }))}
                  whileTap={{ scale: 0.95 }}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </motion.button>
              </div>
            </SettingRow>

            {/* Preserve Metadata */}
            <SettingRow
              icon={Shield}
              title="Preserve Metadata"
              description="Keep EXIF data, dates, and other file information"
            >
              <Toggle
                enabled={localSettings.preserveMetadata}
                onChange={() =>
                  setLocalSettings((s) => ({
                    ...s,
                    preserveMetadata: !s.preserveMetadata,
                  }))
                }
              />
            </SettingRow>

            {/* Completion Sound */}
            <SettingRow
              icon={localSettings.playCompletionSound ? Volume2 : VolumeX}
              title="Completion Sound"
              description="Play a sound when conversions finish"
            >
              <div className="flex items-center gap-2">
                <Toggle
                  enabled={localSettings.playCompletionSound}
                  onChange={() =>
                    setLocalSettings((s) => ({
                      ...s,
                      playCompletionSound: !s.playCompletionSound,
                    }))
                  }
                />
                {localSettings.playCompletionSound && (
                  <motion.button
                    className={`text-xs px-2 py-1 rounded ${isDark ? "bg-dark-600 text-dark-300 hover:text-white" : "bg-gray-200 text-gray-600 hover:text-gray-900"}`}
                    onClick={() => playCompletionSound()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Test
                  </motion.button>
                )}
              </div>
            </SettingRow>

            {/* Privacy Badge */}
            <SettingRow
              icon={localSettings.showPrivacyBadge ? Eye : EyeOff}
              title="Privacy Badge"
              description="Show '100% Local' indicator in header"
            >
              <Toggle
                enabled={localSettings.showPrivacyBadge}
                onChange={() =>
                  setLocalSettings((s) => ({
                    ...s,
                    showPrivacyBadge: !s.showPrivacyBadge,
                  }))
                }
              />
            </SettingRow>

            {/* Output Filename Template */}
            <div className={`py-4 border-b last:border-0 ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <FileType className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Output Filename</h4>
                  <p className={`text-xs mt-0.5 mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    Template for output files. Variables: {"{name}"}, {"{date}"}, {"{time}"}, {"{quality}"}
                  </p>
                  <input
                    type="text"
                    value={localSettings.outputFilenameTemplate}
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        outputFilenameTemplate: e.target.value,
                      }))
                    }
                    placeholder="{name}"
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${
                      isDark 
                        ? "bg-dark-600 border-dark-500 text-white placeholder-dark-400" 
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                  <p className={`text-xs mt-1.5 ${isDark ? "text-dark-500" : "text-gray-400"}`}>
                    Preview: {localSettings.outputFilenameTemplate
                      .replace("{name}", "example")
                      .replace("{date}", new Date().toISOString().split("T")[0])
                      .replace("{time}", new Date().toTimeString().split(" ")[0].replace(/:/g, "-"))
                      .replace("{quality}", String(localSettings.defaultQuality))
                    }.mp4
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "images":
        return (
          <div className="space-y-1">
            {/* Default Quality */}
            <div className={`py-4 border-b ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <Sliders className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Default Quality</h4>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        Balance between file size and image quality
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-accent-500 bg-accent-600/10 px-2.5 py-1 rounded-lg">
                      {localSettings.defaultQuality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={localSettings.defaultQuality}
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        defaultQuality: Number(e.target.value),
                      }))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent-600 ${isDark ? "bg-dark-600" : "bg-gray-200"}`}
                  />
                  <div className={`flex justify-between text-xs mt-2 ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                    <span>Smaller size</span>
                    <span>Higher quality</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Image format info */}
            <div className="py-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <Image className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Supported Formats</h4>
                  <p className={`text-xs mt-0.5 mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    Available input and output formats for images
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["JPG", "PNG", "WebP", "GIF", "BMP", "TIFF", "ICO", "AVIF"].map(
                      (format) => (
                        <span
                          key={format}
                          className={`px-2 py-1 rounded text-xs ${isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"}`}
                        >
                          {format}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-1">
            {/* GPU Acceleration */}
            <SettingRow
              icon={Cpu}
              title="GPU Acceleration"
              description={
                gpuInfo?.available
                  ? "Use hardware encoding for faster conversions"
                  : "No compatible GPU detected"
              }
            >
              {gpuInfo?.available ? (
                <Toggle
                  enabled={localSettings.useGpu}
                  onChange={() =>
                    setLocalSettings((s) => ({
                      ...s,
                      useGpu: !s.useGpu,
                    }))
                  }
                  color="green"
                />
              ) : (
                <span className={`text-xs px-2 py-1 rounded ${isDark ? "text-dark-500 bg-dark-600" : "text-gray-500 bg-gray-200"}`}>
                  Unavailable
                </span>
              )}
            </SettingRow>

            {/* GPU Encoder Selection */}
            {localSettings.useGpu && gpuInfo?.available && gpuInfo.encoders.length > 0 && (
              <div className={`py-4 border-b ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>GPU Encoder</h4>
                    <p className={`text-xs mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                      Select your preferred hardware encoder
                    </p>
                    <div className="space-y-2">
                      {gpuInfo.encoders
                        .filter((e) => e.codec === "h264")
                        .map((encoder) => (
                          <motion.button
                            key={encoder.name}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                              localSettings.gpuEncoder === encoder.name
                                ? "bg-green-600/20 border border-green-600/50"
                                : isDark 
                                  ? "bg-dark-600 hover:bg-dark-500" 
                                  : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={() =>
                              setLocalSettings((s) => ({
                                ...s,
                                gpuEncoder: encoder.name,
                              }))
                            }
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div
                              className={`w-3 h-3 rounded-full border-2 ${
                                localSettings.gpuEncoder === encoder.name
                                  ? "border-green-500 bg-green-500"
                                  : isDark ? "border-dark-400" : "border-gray-400"
                              }`}
                            />
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {encoder.vendor}
                              </div>
                              <div className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                                {encoder.description}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No GPU available info */}
            {!gpuInfo?.available && (
              <div className="py-4">
                <div className={`rounded-lg p-3 ${isDark ? "bg-dark-600/50" : "bg-gray-100"}`}>
                  <p className={`text-xs mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    Hardware acceleration requires one of:
                  </p>
                  <ul className={`text-xs space-y-1 ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                    <li className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-500" : "bg-gray-400"}`} />
                      NVIDIA GPU with NVENC
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-500" : "bg-gray-400"}`} />
                      AMD GPU with AMF
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-500" : "bg-gray-400"}`} />
                      Intel with Quick Sync
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        );

      case "documents":
        return (
          <div className="space-y-1">
            <div className="py-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <FileText className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Document Conversion</h4>
                  <p className={`text-xs mt-0.5 mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    Powered by LibreOffice, Pandoc, and Ghostscript
                  </p>
                  <div className="space-y-3">
                    <div>
                      <span className={`text-xs uppercase tracking-wide ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                        Office Documents
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {["DOCX", "DOC", "XLSX", "XLS", "PPTX", "PPT", "ODT"].map(
                          (format) => (
                            <span
                              key={format}
                              className={`px-2 py-1 rounded text-xs ${isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"}`}
                            >
                              {format}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs uppercase tracking-wide ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                        Other Formats
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {["PDF", "TXT", "RTF", "MD", "HTML", "EPUB"].map((format) => (
                          <span
                            key={format}
                            className={`px-2 py-1 rounded text-xs ${isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"}`}
                          >
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="space-y-1">
            {/* Parallel Processing Toggle */}
            <SettingRow
              icon={Layers}
              title="Parallel Processing"
              description="Convert multiple files simultaneously"
            >
              <Toggle
                enabled={localSettings.parallelProcessing}
                onChange={() =>
                  setLocalSettings((s) => ({
                    ...s,
                    parallelProcessing: !s.parallelProcessing,
                  }))
                }
              />
            </SettingRow>

            {/* Max Parallel Conversions */}
            {localSettings.parallelProcessing && (
              <div className={`py-4 border-b ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                    <Gauge className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          Concurrent Files
                        </h4>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                          Maximum files to process at once
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-accent-500 bg-accent-600/10 px-2.5 py-1 rounded-lg">
                        {localSettings.maxParallelConversions}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={localSettings.maxParallelConversions}
                      onChange={(e) =>
                        setLocalSettings((s) => ({
                          ...s,
                          maxParallelConversions: Number(e.target.value),
                        }))
                      }
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent-600 ${isDark ? "bg-dark-600" : "bg-gray-200"}`}
                    />
                    <div className={`flex justify-between text-xs mt-2 ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                      <span>Less CPU usage</span>
                      <span>Faster processing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance note */}
            <div className="py-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-500">
                  <strong>Note:</strong> Video files are always processed one at a time
                  due to high resource requirements.
                </p>
              </div>
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-1">
            {/* Context Menu Integration */}
            <div className={`py-4 border-b ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <MousePointer className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Context Menu</h4>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        Add "Convert with LocalConvert" to right-click menu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-green-600/20 text-green-500 hover:bg-green-600/30" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                      onClick={async () => {
                        try {
                          const exePath = await invoke<string>("register_context_menu");
                          toast.success("Context menu registered!");
                          console.log("Registered with exe:", exePath);
                        } catch (error) {
                          toast.error("Failed to register context menu");
                          console.error(error);
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Register
                    </motion.button>
                    <motion.button
                      className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-error-600/20 text-error-500 hover:bg-error-600/30" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                      onClick={async () => {
                        try {
                          await invoke("unregister_context_menu");
                          toast.success("Context menu removed");
                        } catch (error) {
                          toast.error("Failed to remove context menu");
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Unregister
                    </motion.button>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? "text-amber-500/80" : "text-amber-600"}`}>
                    Note: Build the app first with <code className="px-1 py-0.5 rounded bg-dark-600 text-dark-200">npm run tauri build</code> for context menu to work properly.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom FFmpeg Parameters */}
            <div className={`py-4 border-b last:border-0 ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <Terminal className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Custom FFmpeg Parameters</h4>
                  <p className={`text-xs mt-0.5 mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                    Additional FFmpeg arguments for video/audio conversions
                  </p>
                  <textarea
                    value={localSettings.customFfmpegParams}
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        customFfmpegParams: e.target.value,
                      }))
                    }
                    placeholder="-preset slow -tune film"
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-mono border resize-none ${
                      isDark 
                        ? "bg-dark-600 border-dark-500 text-white placeholder-dark-400" 
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                  <div className={`text-xs mt-1.5 space-y-0.5 ${isDark ? "text-dark-500" : "text-gray-400"}`}>
                    <p>Examples:</p>
                    <p className="font-mono">-preset veryslow (better quality, slower)</p>
                    <p className="font-mono">-tune animation (for cartoons)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className={`py-4 border-b last:border-0 ${isDark ? "border-dark-700/50" : "border-gray-200/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-dark-700/50" : "bg-gray-100"}`}>
                  <Code className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Keyboard Shortcuts</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { keys: "Ctrl+O", action: "Open files" },
                      { keys: "Ctrl+A", action: "Select all" },
                      { keys: "Delete", action: "Remove selected" },
                      { keys: "Enter", action: "Start conversion" },
                      { keys: "Escape", action: "Cancel/Deselect" },
                      { keys: "Ctrl+Shift+A", action: "Deselect all" },
                    ].map((shortcut) => (
                      <div key={shortcut.keys} className="flex items-center justify-between">
                        <span className={isDark ? "text-dark-400" : "text-gray-500"}>{shortcut.action}</span>
                        <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                          isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"
                        }`}>
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="py-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-500">
                  <strong>Warning:</strong> Custom FFmpeg parameters may cause conversion failures 
                  if invalid. Only use if you know what you're doing.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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
        className={`rounded-2xl border w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Settings</h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Configure your conversion preferences
            </p>
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {categories.map((category) => (
            <CategoryAccordion key={category.id} category={category} />
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end gap-3 flex-shrink-0 ${
          isDark ? "border-dark-700 bg-dark-800" : "border-gray-200 bg-white"
        }`}>
          <motion.button
            className={`px-5 py-2 rounded-xl transition-colors text-sm ${
              isDark ? "bg-dark-700 text-dark-300 hover:text-white" : "bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            className="px-5 py-2 rounded-xl bg-accent-gradient text-white font-medium flex items-center gap-2 text-sm"
            onClick={handleSave}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

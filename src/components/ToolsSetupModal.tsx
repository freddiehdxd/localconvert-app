import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Check,
  AlertCircle,
  Download,
  RefreshCw,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";

interface ToolsSetupModalProps {
  onClose: () => void;
}

const TOOL_INFO: Record<
  string,
  { name: string; description: string; required: boolean }
> = {
  ffmpeg: {
    name: "FFmpeg",
    description: "Video and audio conversion",
    required: true,
  },
  magick: {
    name: "ImageMagick",
    description: "Image conversion and manipulation",
    required: true,
  },
  soffice: {
    name: "LibreOffice",
    description: "Document conversion (Office formats)",
    required: false,
  },
  pandoc: {
    name: "Pandoc",
    description: "Document conversion (Markdown, HTML, etc.)",
    required: false,
  },
  gswin64c: {
    name: "Ghostscript",
    description: "PDF operations",
    required: false,
  },
  tesseract: {
    name: "Tesseract OCR",
    description: "Text recognition in images/PDFs",
    required: false,
  },
  "7z": {
    name: "7-Zip",
    description: "Archive operations",
    required: false,
  },
};

export function ToolsSetupModal({ onClose }: ToolsSetupModalProps) {
  const { tools, checkTools, downloadTool, toolsChecked, settings } = useStore();
  const isDark = settings.theme === "dark";

  useEffect(() => {
    if (!toolsChecked) {
      checkTools();
    }
  }, [checkTools, toolsChecked]);

  const handleDownload = async (toolName: string) => {
    try {
      toast.loading(`Opening download page for ${TOOL_INFO[toolName]?.name || toolName}...`, {
        id: `download-${toolName}`,
      });
      await downloadTool(toolName);
      toast.success(
        `Download page opened. Install ${TOOL_INFO[toolName]?.name || toolName} and restart the app.`,
        { id: `download-${toolName}`, duration: 5000 }
      );
    } catch (error) {
      toast.error(`Failed to open download page`, { id: `download-${toolName}` });
    }
  };

  const handleRefresh = async () => {
    toast.loading("Checking tools...", { id: "refresh-tools" });
    await checkTools();
    toast.success("Tools checked", { id: "refresh-tools" });
  };

  const installedCount = tools.filter((t) => t.installed).length;
  const requiredTools = Object.entries(TOOL_INFO)
    .filter(([, info]) => info.required)
    .map(([key]) => key);
  const requiredInstalled = tools.filter(
    (t) => t.installed && requiredTools.includes(t.name)
  ).length;

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Conversion Tools</h2>
              <p className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {installedCount} of {tools.length} tools installed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                isDark ? "bg-dark-700 text-dark-300 hover:text-white" : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
              onClick={handleRefresh}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </motion.button>
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

        {/* Status Banner */}
        {requiredInstalled < requiredTools.length && (
          <div className="mx-6 mt-6 p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-warning-500 font-medium">Required tools missing</p>
                <p className="text-sm text-warning-500/80 mt-1">
                  Install FFmpeg and ImageMagick for basic functionality.
                  Other tools are optional but enable additional conversions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {tools.map((tool, index) => {
              const info = TOOL_INFO[tool.name] || {
                name: tool.name,
                description: "Conversion tool",
                required: false,
              };

              return (
                <motion.div
                  key={tool.name}
                  className={`rounded-xl p-4 border ${
                    isDark ? "bg-dark-700/50" : "bg-gray-50"
                  } ${
                    tool.installed
                      ? "border-success-500/20"
                      : info.required
                      ? "border-warning-500/20"
                      : "border-transparent"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tool.installed
                          ? "bg-success-600/20 text-success-500"
                          : isDark
                            ? "bg-dark-600 text-dark-400"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {tool.installed ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{info.name}</span>
                        {info.required && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-500 text-xs">
                            Required
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>{info.description}</p>
                      {tool.installed && tool.version && (
                        <p className={`text-xs mt-1 truncate ${isDark ? "text-dark-500" : "text-gray-500"}`}>
                          {tool.version}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    {!tool.installed && (
                      <motion.button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600/20 text-accent-500 hover:bg-accent-600/30 transition-colors"
                        onClick={() => handleDownload(tool.name)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Download className="w-4 h-4" />
                        Install
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Tools are downloaded from official sources and installed on your system.
            </p>
            <motion.button
              className="px-6 py-2.5 rounded-xl bg-accent-gradient text-white font-medium"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Done
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

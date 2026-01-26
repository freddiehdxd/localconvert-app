import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  Video,
  Music,
  Image,
  FileText,
  Smartphone,
  Monitor,
  Tv,
  Gamepad2,
  Youtube,
  Instagram,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { useStore, CONVERSION_PRESETS, DEVICE_PRESETS, ConversionPreset } from "../store/useStore";

interface PresetsSelectorProps {
  category: string;
  onSelectPreset: (preset: ConversionPreset) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
};

const presetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "youtube": Youtube,
  "instagram-story": Instagram,
  "twitter-video": Twitter,
  "discord-8mb": MessageCircle,
  "iphone-video": Smartphone,
  "android-video": Smartphone,
  "ps5-video": Gamepad2,
  "xbox-video": Gamepad2,
  "roku-video": Tv,
  "chromecast-video": Monitor,
};

export function PresetsSelector({ category, onSelectPreset }: PresetsSelectorProps) {
  const { settings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"presets" | "devices">("presets");
  const isDark = settings.theme === "dark";

  // Filter presets by category
  const filteredPresets = CONVERSION_PRESETS.filter(
    (p) => p.category === category || category === "all"
  );
  const filteredDevices = DEVICE_PRESETS.filter(
    (p) => p.category === category || category === "all"
  );

  if (filteredPresets.length === 0 && filteredDevices.length === 0) {
    return null;
  }

  const handleSelectPreset = (preset: ConversionPreset) => {
    onSelectPreset(preset);
    setIsOpen(false);
  };


  return (
    <div className="relative">
      <motion.button
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${
          isDark ? "bg-dark-700/50 hover:bg-dark-700" : "bg-gray-100 hover:bg-gray-200"
        }`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`flex items-center gap-2 text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
          <Sparkles className="w-4 h-4 text-amber-500" />
          Quick Presets
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isDark ? "text-dark-400" : "text-gray-500"} ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-20 overflow-hidden ${
                isDark ? "bg-dark-800 border border-dark-600" : "bg-white border border-gray-200"
              }`}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              {/* Tabs */}
              <div className={`flex border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}>
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "presets"
                      ? isDark
                        ? "text-accent-500 border-b-2 border-accent-500"
                        : "text-accent-600 border-b-2 border-accent-600"
                      : isDark
                        ? "text-dark-400 hover:text-dark-200"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("presets")}
                >
                  Presets
                </button>
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "devices"
                      ? isDark
                        ? "text-accent-500 border-b-2 border-accent-500"
                        : "text-accent-600 border-b-2 border-accent-600"
                      : isDark
                        ? "text-dark-400 hover:text-dark-200"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("devices")}
                >
                  Devices
                </button>
              </div>

              {/* Content */}
              <div className="p-2 max-h-64 overflow-y-auto">
                {activeTab === "presets" ? (
                  filteredPresets.length > 0 ? (
                    <div className="space-y-1">
                      {filteredPresets.map((preset) => {
                        const PresetIcon = presetIcons[preset.id] || categoryIcons[preset.category] || Sparkles;
                        return (
                          <motion.button
                            key={preset.id}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                              isDark
                                ? "hover:bg-dark-700 text-dark-200"
                                : "hover:bg-gray-100 text-gray-700"
                            }`}
                            onClick={() => handleSelectPreset(preset)}
                            whileHover={{ x: 4 }}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isDark ? "bg-dark-600" : "bg-gray-200"
                            }`}>
                              <PresetIcon className="w-4 h-4 text-accent-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {preset.name}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                                {preset.description}
                              </p>
                            </div>
                            <span className={`text-xs uppercase px-2 py-0.5 rounded ${
                              isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"
                            }`}>
                              {preset.outputFormat}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                      No presets for this file type
                    </p>
                  )
                ) : (
                  filteredDevices.length > 0 ? (
                    <div className="space-y-1">
                      {filteredDevices.map((preset) => {
                        const PresetIcon = presetIcons[preset.id] || Smartphone;
                        return (
                          <motion.button
                            key={preset.id}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                              isDark
                                ? "hover:bg-dark-700 text-dark-200"
                                : "hover:bg-gray-100 text-gray-700"
                            }`}
                            onClick={() => handleSelectPreset(preset)}
                            whileHover={{ x: 4 }}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isDark ? "bg-dark-600" : "bg-gray-200"
                            }`}>
                              <PresetIcon className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {preset.name}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                                {preset.description}
                              </p>
                            </div>
                            <span className={`text-xs uppercase px-2 py-0.5 rounded ${
                              isDark ? "bg-dark-600 text-dark-300" : "bg-gray-200 text-gray-600"
                            }`}>
                              {preset.outputFormat}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                      No device presets for this file type
                    </p>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

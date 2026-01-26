import { motion } from "framer-motion";
import { Settings, History, Wrench, Zap, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStore } from "../store/useStore";
import { PrivacyBadge } from "./PrivacyBadge";

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onToolsClick: () => void;
  onHelpClick?: () => void;
}

export function Header({ onSettingsClick, onHistoryClick, onToolsClick, onHelpClick }: HeaderProps) {
  const appWindow = getCurrentWindow();
  const { settings } = useStore();
  const isDark = settings.theme === "dark";

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <header className={`h-10 flex items-center justify-between select-none transition-colors ${
      isDark ? "bg-dark-900" : "bg-white border-b border-gray-200"
    }`}>
      {/* Draggable region - Logo area */}
      <div 
        className="flex items-center gap-2 px-4 h-full flex-1"
        data-tauri-drag-region
      >
        <div className="w-6 h-6 rounded-md bg-accent-gradient flex items-center justify-center pointer-events-none">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className={`text-sm font-medium pointer-events-none ${isDark ? "text-white" : "text-gray-900"}`}>LocalConvert</span>
        
        {/* Privacy Badge */}
        <div className="ml-3">
          <PrivacyBadge />
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center h-full">
        {/* Action buttons */}
        <div className="flex items-center gap-0.5 px-2">
          <motion.button
            className={`p-2 rounded transition-colors ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToolsClick}
            title="Conversion Tools"
          >
            <Wrench className="w-4 h-4" />
          </motion.button>
          <motion.button
            className={`p-2 rounded transition-colors ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onHistoryClick}
            title="History"
          >
            <History className="w-4 h-4" />
          </motion.button>
          <motion.button
            className={`p-2 rounded transition-colors ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Separator */}
        <div className={`w-px h-4 mx-1 ${isDark ? "bg-dark-600" : "bg-gray-200"}`} />

        {/* Help button */}
        <motion.button
          className="px-3 py-1 text-sm text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onHelpClick}
          title="Help"
        >
          Help
        </motion.button>

        {/* Separator */}
        <div className={`w-px h-4 mx-1 ${isDark ? "bg-dark-600" : "bg-gray-200"}`} />

        {/* Window controls */}
        <div className="flex items-center h-full">
          <button
            className={`h-full px-4 transition-colors flex items-center justify-center ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            className={`h-full px-4 transition-colors flex items-center justify-center ${
              isDark ? "hover:bg-dark-700 text-dark-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
            onClick={handleMaximize}
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            className={`h-full px-4 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
            onClick={handleClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

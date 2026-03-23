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
    <header className={`relative z-50 h-12 flex items-center justify-between select-none transition-all duration-300 rounded-xl glass-panel ${
      isDark ? "shadow-lg shadow-black/20" : "shadow-md shadow-indigo-900/5"
    }`}>
      {/* Draggable region - Logo area */}
      <div 
        className="flex items-center gap-3 px-4 h-full flex-1 rounded-l-xl"
        data-tauri-drag-region
      >
        <div className="w-7 h-7 rounded-lg bg-accent-gradient flex items-center justify-center pointer-events-none shadow-glow">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className={`text-sm font-semibold tracking-wide pointer-events-none ${isDark ? "text-white" : "text-dark-900"}`}>
          Local<span className="text-brand">Convert</span>
        </span>
        
        {/* Privacy Badge */}
        <div className="ml-4">
          <PrivacyBadge />
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center h-full px-2">
        {/* Action buttons */}
        <div className="flex items-center gap-1 px-3">
          <motion.button
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark ? "hover:bg-dark-700/50 text-dark-400 hover:text-white" : "hover:bg-dark-100/50 text-dark-500 hover:text-brand"
            }`}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToolsClick}
            title="Conversion Tools"
          >
            <Wrench className="w-4 h-4" />
          </motion.button>
          <motion.button
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark ? "hover:bg-dark-700/50 text-dark-400 hover:text-white" : "hover:bg-dark-100/50 text-dark-500 hover:text-brand"
            }`}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onHistoryClick}
            title="History"
          >
            <History className="w-4 h-4" />
          </motion.button>
          <motion.button
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark ? "hover:bg-dark-700/50 text-dark-400 hover:text-white" : "hover:bg-dark-100/50 text-dark-500 hover:text-brand"
            }`}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Separator */}
        <div className={`w-px h-5 mx-1 ${isDark ? "bg-dark-700/50" : "bg-dark-200/50"}`} />

        {/* Help button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <button
            className="px-4 py-1.5 mx-2 text-xs font-medium text-warning-500 hover:text-warning-400 bg-warning-500/10 hover:bg-warning-500/20 rounded-lg transition-colors flex items-center gap-1"
            onClick={onHelpClick}
            title="Help"
          >
            Help
          </button>
        </motion.div>

        {/* Separator */}
        <div className={`w-px h-5 mx-1 ${isDark ? "bg-dark-700/50" : "bg-dark-200/50"}`} />

        {/* Window controls */}
        <div className="flex items-center h-full ml-1">
          <button
            className={`h-full px-3 rounded-md transition-colors flex items-center justify-center ${
              isDark ? "hover:bg-dark-700/50 text-dark-400 hover:text-white" : "hover:bg-dark-100/50 text-dark-500 hover:text-dark-900"
            }`}
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            className={`h-full px-3 rounded-md transition-colors flex items-center justify-center ${
              isDark ? "hover:bg-dark-700/50 text-dark-400 hover:text-white" : "hover:bg-dark-100/50 text-dark-500 hover:text-dark-900"
            }`}
            onClick={handleMaximize}
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            className={`h-full px-3 rounded-md hover:bg-error-500 hover:text-white transition-colors flex items-center justify-center ${
              isDark ? "text-dark-400" : "text-dark-500"
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

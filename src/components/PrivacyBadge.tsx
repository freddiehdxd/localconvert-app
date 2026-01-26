import { motion } from "framer-motion";
import { Shield, WifiOff } from "lucide-react";
import { useState } from "react";
import { useStore } from "../store/useStore";

export function PrivacyBadge() {
  const { settings } = useStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const isDark = settings.theme === "dark";

  if (!settings.showPrivacyBadge) return null;

  return (
    <div className="relative">
      <motion.div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${
          isDark
            ? "bg-green-900/30 text-green-400 border border-green-800/50"
            : "bg-green-100 text-green-700 border border-green-200"
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={{ scale: 1.05 }}
      >
        <Shield className="w-3 h-3" />
        <span>100% Local</span>
        <WifiOff className="w-3 h-3 opacity-60" />
      </motion.div>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl shadow-xl z-50 ${
            isDark
              ? "bg-dark-800 border border-dark-600 text-dark-200"
              : "bg-white border border-gray-200 text-gray-700"
          }`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                Privacy First
              </h4>
              <p className="text-xs leading-relaxed">
                All file conversions happen on your device. No data is ever sent to external servers.
              </p>
            </div>
          </div>
          
          <div className={`border-t pt-2 mt-2 ${isDark ? "border-dark-600" : "border-gray-200"}`}>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-green-500">
                <WifiOff className="w-3 h-3" />
                <span>Network: Off</span>
              </div>
              <span className={isDark ? "text-dark-500" : "text-gray-400"}>|</span>
              <span className={isDark ? "text-dark-400" : "text-gray-500"}>
                0 bytes uploaded
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
              isDark ? "bg-dark-800 border-l border-t border-dark-600" : "bg-white border-l border-t border-gray-200"
            }`}
          />
        </motion.div>
      )}
    </div>
  );
}

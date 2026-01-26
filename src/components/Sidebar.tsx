import { motion } from "framer-motion";
import {
  Files,
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
} from "lucide-react";
import { useStore, Category } from "../store/useStore";
import { CATEGORIES } from "../types/formats";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Files,
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
};

export function Sidebar() {
  const { activeCategory, setActiveCategory, files, settings } = useStore();
  const isDark = settings.theme === "dark";

  const categories = Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[keyof typeof CATEGORIES]][];

  const getCategoryCount = (category: Category) => {
    if (category === "all") return files.length;
    return files.filter((f) => f.category === category).length;
  };

  return (
    <aside className={`w-56 border-r flex flex-col transition-colors ${
      isDark ? "border-dark-700 bg-dark-900/30" : "border-gray-200 bg-white/50"
    }`}>
      <div className="p-4">
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}>
          Categories
        </h2>
        <nav className="space-y-1">
          {categories.map(([key, data]) => {
            const Icon = iconMap[data.icon] || Files;
            const count = getCategoryCount(key);
            const isActive = activeCategory === key;

            return (
              <motion.button
                key={key}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-600/20 text-accent-600"
                    : isDark
                      ? "text-dark-300 hover:text-white hover:bg-dark-700/50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setActiveCategory(key)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-accent-500" : data.color}`} />
                <span className="flex-1 text-left">{data.name}</span>
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive
                        ? "bg-accent-600/30 text-accent-600"
                        : isDark
                          ? "bg-dark-700 text-dark-400"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Quick Stats */}
      <div className={`mt-auto p-4 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
        <div className={`rounded-lg p-3 ${isDark ? "bg-dark-800/50" : "bg-gray-100"}`}>
          <p className={`text-xs mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>Session Stats</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={isDark ? "text-dark-400" : "text-gray-500"}>Files</span>
              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{files.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDark ? "text-dark-400" : "text-gray-500"}>Completed</span>
              <span className="text-success-500 font-medium">
                {files.filter((f) => f.status === "completed").length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDark ? "text-dark-400" : "text-gray-500"}>Errors</span>
              <span className="text-error-500 font-medium">
                {files.filter((f) => f.status === "error").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

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
    <aside className="w-64 h-full flex flex-col glass-panel rounded-2xl border-0 shadow-lg overflow-hidden z-10 relative">
      <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
        <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 pl-2 ${
          isDark ? "text-dark-500" : "text-dark-400"
        }`}>
          Categories
        </h2>
        <nav className="space-y-1.5 relative">
          {categories.map(([key, data]) => {
            const Icon = iconMap[data.icon] || Files;
            const count = getCategoryCount(key);
            const isActive = activeCategory === key;

            return (
              <motion.button
                key={key}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? "text-white"
                    : isDark
                      ? "text-dark-300 hover:text-white"
                      : "text-dark-600 hover:text-dark-900 hover:bg-white/50"
                }`}
                onClick={() => setActiveCategory(key)}
                whileHover={!isActive ? { x: 4, backgroundColor: isDark ? "rgba(39, 39, 42, 0.4)" : "rgba(255, 255, 255, 0.7)" } : undefined}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryBg"
                    className="absolute inset-0 bg-accent-gradient opacity-90 backdrop-blur-sm -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                
                <Icon className={`w-4 h-4 z-10 ${isActive ? "text-white" : data.color}`} />
                <span className="flex-1 text-left z-10">{data.name}</span>
                
                {count > 0 && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold z-10 transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isDark
                          ? "bg-dark-800 text-dark-400"
                          : "bg-dark-100 text-dark-500"
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
      <div className="p-4 shrink-0">
        <div className={`rounded-xl p-4 backdrop-blur-md border ${
          isDark ? "bg-dark-800/40 border-dark-700/50" : "bg-white/40 border-dark-100"
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-dark-500" : "text-dark-400"}`}>Session Stats</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className={isDark ? "text-dark-400" : "text-dark-500"}>Files</span>
              <span className={`font-semibold bg-dark-100/50 dark:bg-dark-800/50 px-2 py-0.5 rounded-md ${isDark ? "text-white" : "text-dark-900"}`}>{files.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className={isDark ? "text-dark-400" : "text-dark-500"}>Completed</span>
              <span className="text-success-500 font-semibold bg-success-500/10 px-2 py-0.5 rounded-md">
                {files.filter((f) => f.status === "completed").length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className={isDark ? "text-dark-400" : "text-dark-500"}>Errors</span>
              <span className="text-error-500 font-semibold bg-error-500/10 px-2 py-0.5 rounded-md">
                {files.filter((f) => f.status === "error").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

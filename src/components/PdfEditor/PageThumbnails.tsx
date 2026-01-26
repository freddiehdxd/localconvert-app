import { useState, useEffect, useRef } from "react";
import { motion, Reorder } from "framer-motion";
import { RotateCw, Trash2, GripVertical, Plus } from "lucide-react";
import type { PdfPage } from "./types";

interface PageThumbnailsProps {
  pages: PdfPage[];
  currentPage: number;
  onPageSelect: (pageNumber: number) => void;
  onPageDelete: (pageNumber: number) => void;
  onPageRotate: (pageNumber: number, degrees: number) => void;
  onPagesReorder: (pages: PdfPage[]) => void;
  onAddBlankPage: (afterPage: number) => void;
  generateThumbnail: (pageNumber: number) => Promise<string>;
  isDark: boolean;
}

interface ThumbnailItemProps {
  page: PdfPage;
  isActive: boolean;
  thumbnailUrl: string | null;
  onSelect: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onAddAfter: () => void;
  isDark: boolean;
}

function ThumbnailItem({
  page,
  isActive,
  thumbnailUrl,
  onSelect,
  onDelete,
  onRotate,
  onAddAfter,
  isDark,
}: ThumbnailItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Reorder.Item
      value={page}
      className={`relative group cursor-pointer ${isActive ? "ring-2 ring-accent-500" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <motion.div
        className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
          isActive
            ? "border-accent-500"
            : isDark
              ? "border-dark-600 hover:border-dark-500"
              : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={onSelect}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Drag handle */}
        <div className={`absolute top-0 left-0 right-0 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
          isDark ? "bg-dark-700/80" : "bg-gray-200/80"
        }`}>
          <GripVertical className={`w-4 h-4 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
        </div>

        {/* Thumbnail image */}
        <div
          className={`aspect-[3/4] flex items-center justify-center ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
          style={{ transform: `rotate(${page.rotation}deg)` }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Page ${page.pageNumber}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Loading...
            </div>
          )}
        </div>

        {/* Page number */}
        <div className={`text-center py-1 text-xs font-medium ${
          isDark ? "bg-dark-700 text-dark-300" : "bg-gray-100 text-gray-600"
        }`}>
          {page.pageNumber}
        </div>

        {/* Action buttons */}
        {showActions && (
          <motion.div
            className={`absolute bottom-8 left-0 right-0 flex justify-center gap-1 p-1 ${
              isDark ? "bg-dark-800/90" : "bg-white/90"
            }`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              className={`p-1 rounded hover:bg-accent-500/20 ${isDark ? "text-dark-300" : "text-gray-600"}`}
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              title="Rotate"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              className={`p-1 rounded hover:bg-accent-500/20 ${isDark ? "text-dark-300" : "text-gray-600"}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddAfter();
              }}
              title="Add page after"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              className={`p-1 rounded hover:bg-red-500/20 text-red-500`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete page"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </Reorder.Item>
  );
}

export function PageThumbnails({
  pages,
  currentPage,
  onPageSelect,
  onPageDelete,
  onPageRotate,
  onPagesReorder,
  onAddBlankPage,
  generateThumbnail,
  isDark,
}: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());

  // Load thumbnails
  useEffect(() => {
    pages.forEach((page) => {
      if (!thumbnails.has(page.pageNumber) && !loadingRef.current.has(page.pageNumber)) {
        loadingRef.current.add(page.pageNumber);
        generateThumbnail(page.pageNumber).then((url) => {
          if (url) {
            setThumbnails((prev) => new Map(prev).set(page.pageNumber, url));
          }
          loadingRef.current.delete(page.pageNumber);
        });
      }
    });
  }, [pages, generateThumbnail]);

  // Regenerate thumbnails when rotation changes
  useEffect(() => {
    pages.forEach((page) => {
      if (page.rotation !== 0 && thumbnails.has(page.pageNumber)) {
        loadingRef.current.add(page.pageNumber);
        generateThumbnail(page.pageNumber).then((url) => {
          if (url) {
            setThumbnails((prev) => new Map(prev).set(page.pageNumber, url));
          }
          loadingRef.current.delete(page.pageNumber);
        });
      }
    });
  }, [pages.map((p) => p.rotation).join(",")]);

  return (
    <div className={`w-40 flex-shrink-0 border-r overflow-y-auto ${
      isDark ? "bg-dark-900 border-dark-700" : "bg-gray-50 border-gray-200"
    }`}>
      <div className={`sticky top-0 p-3 border-b font-medium text-sm ${
        isDark ? "bg-dark-900 border-dark-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
      }`}>
        Pages ({pages.length})
      </div>

      <Reorder.Group
        axis="y"
        values={pages}
        onReorder={onPagesReorder}
        className="p-2 space-y-2"
      >
        {pages.map((page) => (
          <ThumbnailItem
            key={page.pageNumber}
            page={page}
            isActive={page.pageNumber === currentPage}
            thumbnailUrl={thumbnails.get(page.pageNumber) || null}
            onSelect={() => onPageSelect(page.pageNumber)}
            onDelete={() => onPageDelete(page.pageNumber)}
            onRotate={() => onPageRotate(page.pageNumber, 90)}
            onAddAfter={() => onAddBlankPage(page.pageNumber)}
            isDark={isDark}
          />
        ))}
      </Reorder.Group>

      {/* Add page at end button */}
      <div className="p-2">
        <motion.button
          className={`w-full py-2 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-colors ${
            isDark
              ? "border-dark-600 text-dark-400 hover:border-accent-500 hover:text-accent-500"
              : "border-gray-300 text-gray-500 hover:border-accent-500 hover:text-accent-500"
          }`}
          onClick={() => onAddBlankPage(pages.length)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Page
        </motion.button>
      </div>
    </div>
  );
}

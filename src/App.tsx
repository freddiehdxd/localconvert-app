import { useEffect, useState, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { useStore } from "./store/useStore";
import type { FileInfo } from "./store/useStore";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { FileDropZone } from "./components/FileDropZone";
import { FileList } from "./components/FileList";
import { ConversionPanel } from "./components/ConversionPanel";
import { SettingsModal } from "./components/SettingsModal";
import { HistoryModal } from "./components/HistoryModal";
import { ToolsSetupModal } from "./components/ToolsSetupModal";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { PdfEditor } from "./components/PdfEditor";
import { VideoTrimmer } from "./components/VideoTrimmer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { playCompletionSound } from "./utils/sounds";

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

function App() {
  const { files, checkTools, settings, addFiles, isConverting, pdfEditorFile, closePdfEditor, videoTrimmerFile, closeVideoTrimmer } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const prevConvertingRef = useRef(isConverting);

  const { detectGpu } = useStore();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Play sound when conversions complete
  useEffect(() => {
    const wasConverting = prevConvertingRef.current;
    prevConvertingRef.current = isConverting;

    // If we just finished converting and sound is enabled
    if (wasConverting && !isConverting && settings.playCompletionSound) {
      const completedFiles = files.filter((f) => f.status === "completed");
      if (completedFiles.length > 0) {
        playCompletionSound();
      }
    }
  }, [isConverting, files, settings.playCompletionSound]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  // Listen for Tauri native drag-drop events
  useEffect(() => {
    const unlistenDrop = listen<DragDropPayload>("tauri://drag-drop", async (event) => {
      const paths = event.payload.paths;
      if (paths && paths.length > 0) {
        // Process dropped files
        const fileInfos: FileInfo[] = [];
        for (const path of paths) {
          try {
            const info = await invoke<FileInfo>("get_file_info", { path });
            fileInfos.push(info);
          } catch (error) {
            console.error(`Failed to get info for ${path}:`, error);
          }
        }
        if (fileInfos.length > 0) {
          addFiles(fileInfos);
        }
      }
    });

    return () => {
      unlistenDrop.then((unlisten) => unlisten());
    };
  }, [addFiles]);

  useEffect(() => {
    // Check tools on first load
    checkTools().then(() => {
      // After checking tools, determine if this is first run
      const hasRunBefore = localStorage.getItem("localconvert_has_run");
      if (!hasRunBefore) {
        setShowTools(true);
        localStorage.setItem("localconvert_has_run", "true");
      }
    });
    // Detect GPU encoders
    detectGpu();

    // Check for app updates
    const checkForUpdates = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (update) {
          console.log(`Update available: ${update.version}`);
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (error) {
        console.log("Update check skipped:", error);
      }
    };
    checkForUpdates();

    // Check for startup files (from context menu or drag-drop to app icon)
    const loadStartupFiles = async () => {
      try {
        const startupPaths = await invoke<string[]>("get_startup_files");
        if (startupPaths && startupPaths.length > 0) {
          const fileInfos: FileInfo[] = [];
          for (const path of startupPaths) {
            try {
              const info = await invoke<FileInfo>("get_file_info", { path });
              fileInfos.push(info);
            } catch (error) {
              console.error(`Failed to get info for ${path}:`, error);
            }
          }
          if (fileInfos.length > 0) {
            addFiles(fileInfos);
          }
        }
      } catch (error) {
        console.error("Failed to load startup files:", error);
      }
    };
    loadStartupFiles();
  }, [checkTools, detectGpu, addFiles]);

  const isDark = settings.theme === "dark";

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col transition-colors duration-200 ${
      isDark ? "bg-dark-gradient" : "bg-gradient-to-b from-gray-50 to-gray-100"
    }`}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: isDark 
            ? "!bg-dark-700 !text-white !border !border-dark-600"
            : "!bg-white !text-gray-900 !border !border-gray-200 !shadow-lg",
          duration: 4000,
          style: isDark ? {
            background: "#343541",
            color: "#fff",
            border: "1px solid #565869",
          } : {
            background: "#fff",
            color: "#111827",
            border: "1px solid #e5e7eb",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: isDark ? "#fff" : "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: isDark ? "#fff" : "#fff",
            },
          },
        }}
      />

      {/* Header */}
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onHistoryClick={() => setShowHistory(true)}
        onToolsClick={() => setShowTools(true)}
        onHelpClick={() => setShowTools(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden p-6">
          <AnimatePresence mode="wait">
            {files.length === 0 ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex items-center justify-center"
              >
                <FileDropZone />
              </motion.div>
            ) : (
              <motion.div
                key="filelist"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-hidden flex gap-6">
                  {/* File List */}
                  <div className="flex-1 overflow-hidden">
                    <FileList />
                  </div>

                  {/* Conversion Panel */}
                  <div className="w-80 flex-shrink-0">
                    <ConversionPanel />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
        {showTools && <ToolsSetupModal onClose={() => setShowTools(false)} />}
      </AnimatePresence>

      {/* Image Preview Modal - manages its own visibility via store */}
      <ImagePreviewModal />

      {/* PDF Editor Modal */}
      <AnimatePresence>
        {pdfEditorFile && (
          <PdfEditor
            filePath={pdfEditorFile.path}
            fileName={pdfEditorFile.name}
            onClose={closePdfEditor}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Video Trimmer Modal */}
      <AnimatePresence>
        {videoTrimmerFile && (
          <VideoTrimmer
            filePath={videoTrimmerFile.path}
            onClose={closeVideoTrimmer}
            onTrim={async (startTime, endTime, outputFormat) => {
              try {
                // Generate output path with _trimmed suffix and selected format
                const inputPath = videoTrimmerFile.path;
                const lastDot = inputPath.lastIndexOf(".");
                const basePath = lastDot > 0 ? inputPath.substring(0, lastDot) : inputPath;
                const outputPath = `${basePath}_trimmed.${outputFormat}`;

                // Format times as HH:MM:SS.mmm
                const formatTime = (secs: number) => {
                  const hours = Math.floor(secs / 3600);
                  const mins = Math.floor((secs % 3600) / 60);
                  const seconds = secs % 60;
                  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
                };

                const { toast } = await import("react-hot-toast");
                toast.loading("Trimming video...", { id: "trim-video" });

                await invoke("trim_video", {
                  inputPath,
                  outputPath,
                  startTime: formatTime(startTime),
                  endTime: formatTime(endTime),
                });

                toast.success("Video trimmed successfully!", { id: "trim-video" });
                closeVideoTrimmer();

                // Optionally add the trimmed file to the file list
                try {
                  const info = await invoke<FileInfo>("get_file_info", { path: outputPath });
                  addFiles([info]);
                } catch {
                  // File info failed, but trim was successful
                }
              } catch (error) {
                const { toast } = await import("react-hot-toast");
                toast.error(`Failed to trim video: ${error}`, { id: "trim-video" });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

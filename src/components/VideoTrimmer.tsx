import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Scissors,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";

// Video output formats
const VIDEO_OUTPUT_FORMATS = ["mp4", "mkv", "webm", "avi", "mov", "gif"];

interface VideoTrimmerProps {
  filePath: string;
  onClose: () => void;
  onTrim: (startTime: number, endTime: number, outputFormat: string) => void;
}

export function VideoTrimmer({ filePath, onClose, onTrim }: VideoTrimmerProps) {
  const { settings } = useStore();
  const isDark = settings.theme === "dark";
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  
  // Get the input file extension to use as default output format
  const inputExtension = filePath.split('.').pop()?.toLowerCase() || "mp4";
  const defaultFormat = VIDEO_OUTPUT_FORMATS.includes(inputExtension) ? inputExtension : "mp4";
  const [outputFormat, setOutputFormat] = useState(defaultFormat);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get video duration on mount
  useEffect(() => {
    const loadDuration = async () => {
      try {
        const dur = await invoke<number>("get_video_duration", { path: filePath });
        setDuration(dur);
        setEndTime(dur);
      } catch (error) {
        console.error("Failed to get video duration:", error);
      }
    };
    loadDuration();
  }, [filePath]);

  // Generate thumbnails
  useEffect(() => {
    const generateThumbnails = async () => {
      if (duration <= 0) return;
      
      const count = 10;
      const interval = duration / count;
      const thumbs: string[] = [];
      
      for (let i = 0; i < count; i++) {
        try {
          const time = i * interval;
          const thumb = await invoke<string>("get_video_thumbnail", {
            path: filePath,
            timeSecs: time,
            width: 120,
          });
          thumbs.push(thumb);
        } catch {
          thumbs.push("");
        }
      }
      
      setThumbnails(thumbs);
    };
    
    generateThumbnails();
  }, [duration, filePath]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleMarkerDrag = (
    e: React.MouseEvent,
    marker: "start" | "end"
  ) => {
    e.preventDefault();
    setIsDragging(marker);

    const handleMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const time = percent * duration;
      
      if (marker === "start") {
        setStartTime(Math.min(time, endTime - 0.1));
      } else {
        setEndTime(Math.max(time, startTime + 0.1));
      }
    };

    const handleUp = () => {
      setIsDragging(null);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleTrim = () => {
    if (endTime - startTime < 0.1) {
      toast.error("Selection too short");
      return;
    }
    onTrim(startTime, endTime, outputFormat);
  };

  const handleReset = () => {
    setStartTime(0);
    setEndTime(duration);
  };

  const selectedDuration = endTime - startTime;
  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl ${
          isDark ? "bg-dark-900" : "bg-gray-900"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <Scissors className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-semibold text-white">Trim Video</h2>
          </div>
          <motion.button
            className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Video Preview */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={convertFileSrc(filePath)}
            className="w-full h-full"
            muted={isMuted}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Playback Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <motion.button
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
              onClick={() => {
                if (videoRef.current) {
                  isPlaying ? videoRef.current.pause() : videoRef.current.play();
                }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </motion.button>
            <motion.button
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
              onClick={() => setIsMuted(!isMuted)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-4 space-y-4">
          {/* Thumbnail Timeline */}
          <div
            ref={timelineRef}
            className="relative h-16 rounded-lg overflow-hidden cursor-pointer"
            onClick={handleTimelineClick}
          >
            {/* Thumbnails */}
            <div className="absolute inset-0 flex">
              {thumbnails.length > 0
                ? thumbnails.map((thumb, i) => (
                    <div key={i} className="flex-1 h-full">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-dark-700" />
                      )}
                    </div>
                  ))
                : Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 h-full bg-dark-700" />
                  ))
              }
            </div>

            {/* Selection Overlay */}
            <div
              className="absolute inset-y-0 bg-black/60"
              style={{ left: 0, width: `${startPercent}%` }}
            />
            <div
              className="absolute inset-y-0 bg-black/60"
              style={{ right: 0, width: `${100 - endPercent}%` }}
            />

            {/* Selection Area */}
            <div
              className="absolute inset-y-0 border-2 border-accent-500"
              style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
            />

            {/* Start Marker */}
            <div
              className="absolute inset-y-0 w-4 -ml-2 cursor-ew-resize group"
              style={{ left: `${startPercent}%` }}
              onMouseDown={(e) => handleMarkerDrag(e, "start")}
            >
              <div className="absolute inset-y-0 left-1/2 w-1 -ml-0.5 bg-accent-500 group-hover:bg-accent-400" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent-500 rounded-b-lg" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent-500 rounded-t-lg" />
            </div>

            {/* End Marker */}
            <div
              className="absolute inset-y-0 w-4 -ml-2 cursor-ew-resize group"
              style={{ left: `${endPercent}%` }}
              onMouseDown={(e) => handleMarkerDrag(e, "end")}
            >
              <div className="absolute inset-y-0 left-1/2 w-1 -ml-0.5 bg-accent-500 group-hover:bg-accent-400" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent-500 rounded-b-lg" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent-500 rounded-t-lg" />
            </div>

            {/* Current Time Indicator */}
            <div
              className="absolute inset-y-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${currentPercent}%` }}
            />
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-dark-400">Start: </span>
                <span className="text-white font-mono">{formatTime(startTime)}</span>
              </div>
              <div>
                <span className="text-dark-400">End: </span>
                <span className="text-white font-mono">{formatTime(endTime)}</span>
              </div>
              <div>
                <span className="text-dark-400">Duration: </span>
                <span className="text-accent-500 font-mono">{formatTime(selectedDuration)}</span>
              </div>
            </div>
            <div className="text-dark-400">
              Total: {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-dark-700">
          <div className="flex items-center gap-3">
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white"
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>

            {/* Output Format Selector */}
            <div className="relative">
              <motion.button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600/20 text-accent-400 hover:bg-accent-600/30"
                onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-sm font-medium uppercase">{outputFormat}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFormatDropdown ? "rotate-180" : ""}`} />
              </motion.button>

              {showFormatDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFormatDropdown(false)}
                  />
                  <motion.div
                    className="absolute bottom-full left-0 mb-2 w-32 rounded-xl bg-dark-800 border border-dark-600 shadow-xl z-50 overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="p-2 max-h-48 overflow-y-auto">
                      {VIDEO_OUTPUT_FORMATS.map((format) => (
                        <motion.button
                          key={format}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            outputFormat === format
                              ? "bg-accent-600/20 text-accent-400"
                              : "text-dark-300 hover:bg-dark-700 hover:text-white"
                          }`}
                          onClick={() => {
                            setOutputFormat(format);
                            setShowFormatDropdown(false);
                          }}
                          whileHover={{ x: 4 }}
                        >
                          <span className="uppercase font-medium">{format}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              className="px-4 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-gradient text-white font-medium"
              onClick={handleTrim}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check className="w-4 h-4" />
              Apply Trim
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

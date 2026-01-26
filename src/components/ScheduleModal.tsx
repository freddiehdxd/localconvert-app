import { useState } from "react";
import { motion } from "framer-motion";
import { X, Clock, Calendar, Play, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../store/useStore";

interface ScheduleModalProps {
  onClose: () => void;
  onSchedule: (scheduledTime: Date) => void;
}

export function ScheduleModal({ onClose, onSchedule }: ScheduleModalProps) {
  const { settings, files } = useStore();
  const isDark = settings.theme === "dark";
  
  const [scheduleType, setScheduleType] = useState<"delay" | "time">("delay");
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)
  );

  const pendingCount = files.filter((f) => f.status === "pending").length;

  const handleSchedule = () => {
    let targetTime: Date;

    if (scheduleType === "delay") {
      targetTime = new Date(Date.now() + delayMinutes * 60000);
    } else {
      targetTime = new Date(scheduledDate);
      if (targetTime <= new Date()) {
        toast.error("Please select a future time");
        return;
      }
    }

    onSchedule(targetTime);
    toast.success(`Conversion scheduled for ${targetTime.toLocaleTimeString()}`);
    onClose();
  };

  const quickDelays = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
    { label: "Tonight", value: (() => {
      const tonight = new Date();
      tonight.setHours(22, 0, 0, 0);
      if (tonight <= new Date()) tonight.setDate(tonight.getDate() + 1);
      return Math.round((tonight.getTime() - Date.now()) / 60000);
    })() },
  ];

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-2xl border w-full max-w-md overflow-hidden shadow-2xl ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-dark-700" : "bg-gray-100"}`}>
              <Clock className={`w-5 h-5 ${isDark ? "text-dark-400" : "text-gray-500"}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Schedule Conversion</h2>
              <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {pendingCount} file(s) will be converted
              </p>
            </div>
          </div>
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Schedule Type Tabs */}
          <div className={`flex rounded-lg p-1 ${isDark ? "bg-dark-700" : "bg-gray-100"}`}>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                scheduleType === "delay"
                  ? isDark
                    ? "bg-dark-600 text-white"
                    : "bg-white text-gray-900 shadow-sm"
                  : isDark
                    ? "text-dark-400"
                    : "text-gray-500"
              }`}
              onClick={() => setScheduleType("delay")}
            >
              <Clock className="w-4 h-4" />
              Delay
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                scheduleType === "time"
                  ? isDark
                    ? "bg-dark-600 text-white"
                    : "bg-white text-gray-900 shadow-sm"
                  : isDark
                    ? "text-dark-400"
                    : "text-gray-500"
              }`}
              onClick={() => setScheduleType("time")}
            >
              <Calendar className="w-4 h-4" />
              Specific Time
            </button>
          </div>

          {scheduleType === "delay" ? (
            <>
              {/* Quick Delay Options */}
              <div className="grid grid-cols-3 gap-2">
                {quickDelays.map((delay) => (
                  <motion.button
                    key={delay.label}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      delayMinutes === delay.value
                        ? "bg-accent-600/20 text-accent-500 border border-accent-500/50"
                        : isDark
                          ? "bg-dark-700 text-dark-300 hover:text-white"
                          : "bg-gray-100 text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setDelayMinutes(delay.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {delay.label}
                  </motion.button>
                ))}
              </div>

              {/* Custom Delay */}
              <div className="space-y-2">
                <label className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                  Custom delay (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-dark-700 border-dark-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <p className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Will start at: <span className="font-medium text-accent-500">
                  {new Date(Date.now() + delayMinutes * 60000).toLocaleTimeString()}
                </span>
              </p>
            </>
          ) : (
            <>
              {/* Date/Time Picker */}
              <div className="space-y-2">
                <label className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                  Schedule for
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-dark-700 border-dark-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </>
          )}

          {/* Info */}
          <div className={`flex items-start gap-2 p-3 rounded-lg ${isDark ? "bg-dark-700/30" : "bg-gray-50"}`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? "text-dark-400" : "text-gray-400"}`} />
            <p className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Keep the app open for scheduled conversions to run. 
              Conversions will start automatically at the scheduled time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-2 p-4 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
          <motion.button
            className={`px-4 py-2 rounded-xl text-sm ${
              isDark ? "bg-dark-700 text-dark-300 hover:text-white" : "bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-gradient text-white text-sm font-medium"
            onClick={handleSchedule}
            disabled={pendingCount === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4" />
            Schedule
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

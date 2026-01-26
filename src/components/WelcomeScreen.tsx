import { motion } from "framer-motion";
import { Zap, Shield, Cpu, ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const features = [
    {
      icon: Shield,
      title: "100% Private",
      description: "All conversions happen locally. No uploads, no cloud.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Powered by industry-standard tools like FFmpeg and ImageMagick.",
    },
    {
      icon: Cpu,
      title: "100+ Formats",
      description: "Video, audio, images, documents, and more.",
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 bg-dark-gradient flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-2xl mx-auto px-8 text-center">
        {/* Logo */}
        <motion.div
          className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-accent-gradient flex items-center justify-center shadow-2xl shadow-accent-600/30"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Zap className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Welcome to{" "}
          <span className="gradient-text">LocalConvert</span>
        </motion.h1>

        <motion.p
          className="text-xl text-dark-300 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your privacy-first file converter that runs entirely on your device.
        </motion.p>

        {/* Features */}
        <motion.div
          className="grid grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent-600/20 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-dark-400">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          className="px-8 py-4 bg-accent-gradient rounded-2xl text-white font-semibold text-lg shadow-xl shadow-accent-600/30 btn-glow flex items-center gap-3 mx-auto"
          onClick={onGetStarted}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

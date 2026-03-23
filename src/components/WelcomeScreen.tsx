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
      description: "Powered by industry-standard tools for maximum performance.",
    },
    {
      icon: Cpu,
      title: "100+ Formats",
      description: "Video, audio, images, documents, and more.",
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 bg-dark-gradient flex items-center justify-center z-50 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Decorative Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
        {/* Logo */}
        <motion.div
          className="w-28 h-28 mx-auto mb-10 rounded-[32px] bg-accent-gradient flex items-center justify-center shadow-glow-strong border border-white/20"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Zap className="w-14 h-14 text-white" fill="currentColor" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light via-brand to-accent-400 drop-shadow-md">LocalConvert</span>
        </motion.h1>

        <motion.p
          className="text-2xl text-dark-300 mb-16 max-w-2xl mx-auto leading-relaxed font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your privacy-first, blazingly fast file converter that runs entirely on your device. Let's elevate your workflow.
        </motion.p>

        {/* Features */}
        <motion.div
          className="grid grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="glass-panel-heavy rounded-[32px] p-8 border border-white/5 hover:border-brand/40 transition-colors shadow-xl group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-brand/10 group-hover:bg-brand/20 transition-colors flex items-center justify-center mx-auto mb-6 shadow-glow">
                <feature.icon className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-[15px] text-dark-400 font-medium leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          className="px-10 py-5 bg-accent-gradient rounded-full text-white font-bold text-xl shadow-glow-strong hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow flex items-center gap-4 mx-auto btn-glow"
          onClick={onGetStarted}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          GET STARTED NOW
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
}

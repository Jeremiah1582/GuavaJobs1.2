"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const homeLabel = "Go to Dashboard";
  const homePath = "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 150 }}
          className="font-display text-[120px] font-bold leading-none text-primary/10 select-none mb-2"
        >
          404
        </motion.div>

        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mx-auto mb-5">
          <span className="font-display text-accent text-xl font-bold">!</span>
        </div>

        <h1 className="font-display text-2xl font-semibold mb-2">Page not found.</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(homePath)}
            className="btn-ink flex items-center justify-center gap-2 px-6 py-3"
          >
            <Home className="w-4 h-4" />
            {homeLabel}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
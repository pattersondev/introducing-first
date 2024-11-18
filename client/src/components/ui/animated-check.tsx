"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface AnimatedCheckProps {
  className?: string;
}

export function AnimatedCheck({ className }: AnimatedCheckProps) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className={className}
    >
      <Check className="h-4 w-4" />
    </motion.div>
  );
}

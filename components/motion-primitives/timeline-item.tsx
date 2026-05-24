"use client";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface TimelineItemProps {
  children: ReactNode;
  index: number;
}

/**
 * Client-side animated timeline item
 */
export function TimelineItem({ children, index }: TimelineItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      className="flex gap-6 items-start border-l-2 border-white/10 pl-6 py-2"
    >
      {children}
    </motion.div>
  );
}

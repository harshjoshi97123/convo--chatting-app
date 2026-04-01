import { motion } from 'motion/react';

interface TypingIndicatorProps {
  name?: string;
}

export function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex flex-col gap-1 max-w-[80%] items-start mb-4">
      <div className="px-4 py-3 rounded-2xl shadow-sm transition-all bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-bl-sm backdrop-blur-md">
        <div className="flex items-center gap-1">
          <motion.div
            className="w-2 h-2 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
      {name && (
        <span className="text-xs text-muted-foreground ml-1">
          {name} is typing...
        </span>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeedbackItem {
  id: string;
  category: 'REASONING' | 'ENGAGEMENT' | 'BONUS';
  points: number;
  explanation: string;
  timestamp: number;
}

interface ArgumentAnalyserProps {
  feedbackItems: FeedbackItem[];
  onCategoryAnimationComplete?: (category: string) => void;
}

export function ArgumentAnalyser({ 
  feedbackItems, 
  onCategoryAnimationComplete 
}: ArgumentAnalyserProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (containerRef.current && feedbackItems.length > 0) {
      const container = containerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [feedbackItems.length]);

  // Get only most recent 5 items if not expanded
  const visibleItems = expanded 
    ? feedbackItems 
    : feedbackItems.slice(-1);

  return (
    <div className={cn(
      "w-full bg-black bg-opacity-20 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300",
      expanded ? "max-h-96" : "max-h-24"
    )}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <h4 className="text-sm font-semibold text-white flex items-center">
          Argument Analyser
          <span className="ml-2 text-xs text-white/80">
            ({feedbackItems.length} total)
          </span>
        </h4>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      
      {/* Feedback items container */}
      <div 
        ref={containerRef}
        className={cn(
          "overflow-y-auto p-3 space-y-2 text-white",
          expanded ? "max-h-80" : "max-h-16"
        )}
      >
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <FeedbackItemComponent 
              key={item.id} 
              item={item}
              onAnimationComplete={() => {
                if (onCategoryAnimationComplete) {
                  onCategoryAnimationComplete(item.category);
                }
              }}
            />
          ))}
        </AnimatePresence>
        
        {!expanded && feedbackItems.length > 1 && (
          <div className="text-xs text-center text-white pt-1">
            <button 
              onClick={() => setExpanded(true)}
              className="underline hover:text-white font-medium"
            >
              Show all ({feedbackItems.length}) feedback items
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FeedbackItemComponentProps {
  item: FeedbackItem;
  onAnimationComplete?: () => void;
}

function FeedbackItemComponent({ item, onAnimationComplete }: FeedbackItemComponentProps) {
  // Style map for different categories
  const categoryStyles = {
    REASONING: {
      bg: 'bg-green-500/40',
      text: 'text-white',
      activeBg: 'bg-green-500/60',
      pulse: 'ring-green-400',
      glow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    },
    ENGAGEMENT: {
      bg: 'bg-blue-500/40',
      text: 'text-white',
      activeBg: 'bg-blue-500/60',
      pulse: 'ring-blue-400',
      glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    },
    BONUS: {
      bg: 'bg-purple-500/40',
      text: 'text-white',
      activeBg: 'bg-purple-500/60',
      pulse: 'ring-purple-400',
      glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    },
  };
  
  const style = categoryStyles[item.category];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-2"
      layout
    >
      {/* Category and points badge */}
      <motion.div
        initial={{ scale: 1.2, opacity: 0.5 }}
        animate={{ 
          scale: [1.2, 1],
          opacity: [0.5, 1]
        }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={onAnimationComplete}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-bold shrink-0 shadow-md",
          style.bg, style.text, style.glow
        )}
      >
        <span className="tracking-wide">{item.category}</span> <span className="font-extrabold">+{item.points}</span>
      </motion.div>
      
      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-sm text-white flex-1 font-medium"
      >
        {item.explanation}
      </motion.div>
    </motion.div>
  );
}
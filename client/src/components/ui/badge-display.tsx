import React, { useState, useEffect } from 'react';
import { Badge, BADGE_INFO } from '@/lib/badge-service';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Component to display a small badge icon in a list
interface BadgeIconProps {
  badge: Badge;
  onClick?: () => void;
  className?: string;
}

export function BadgeIcon({ badge, onClick, className }: BadgeIconProps) {
  // Convert snake_case badge name to readable format
  const readableName = badge.name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Get optimized thumbnail path
  const badgeName = badge.imageUrl.split('/').pop()?.replace('.png', '');
  const thumbnailUrl = `/badges/thumbnails/${badgeName}.webp`;
  const optimizedUrl = `/badges/optimized-${badgeName}.webp`;
    
  return (
    <div 
      className={cn(
        "relative group cursor-pointer rounded-lg overflow-visible border border-transparent hover:border-white/20",
        className
      )}
      onClick={onClick}
      title={readableName}
    >
      <div className={cn("w-16 h-16 flex items-center justify-center", className)}>
        <picture>
          {/* WebP version for browsers that support it */}
          <source type="image/webp" srcSet={thumbnailUrl} />
          {/* Fallback to original PNG if WebP not supported */}
          <img 
            src={badge.imageUrl} 
            alt={readableName} 
            className="w-full h-full object-contain" 
            loading="lazy"
            decoding="async"
            onError={(e) => {
              console.error(`Failed to load badge image: ${thumbnailUrl || badge.imageUrl}`);
              // Fallback to a generic icon if image fails to load
              (e.target as HTMLImageElement).src = "/badges/reason-giver-badge.png";
            }}
          />
        </picture>
      </div>
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200"></div>
      
      {/* Tooltip */}
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-black text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
        {readableName}
      </div>
    </div>
  );
}

// Component for badges collection display
interface BadgeCollectionProps {
  badges: Badge[];
  className?: string;
}

export function BadgeCollection({ badges, className }: BadgeCollectionProps) {
  return (
    <div className={cn("flex flex-wrap gap-3 items-center justify-center sm:justify-start p-2", className)}>
      {badges.map((badge) => (
        <motion.div
          key={badge.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.1 * (badge.id % 5) // Stagger the animations
          }}
        >
          <BadgeIcon badge={badge} />
        </motion.div>
      ))}
      {badges.length === 0 && (
        <div className="text-sm text-gray-400 italic py-3">No badges earned yet</div>
      )}
    </div>
  );
}

// Component for large notification when a badge is earned
interface BadgeAwardNotificationProps {
  badge: Badge | null;
  onComplete: () => void;
}

export function BadgeAwardNotification({ badge, onComplete }: BadgeAwardNotificationProps) {
  const [audio] = useState<HTMLAudioElement | null>(
    typeof Audio !== 'undefined' ? new Audio('/sounds/badge-earned.mp3') : null
  );
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  
  // Convert snake_case badge name to readable format
  const readableName = badge?.name
    ? badge.name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';
  
  // Get optimized image path
  const getOptimizedUrl = () => {
    if (!badge) return '';
    const badgeName = badge.imageUrl.split('/').pop()?.replace('.png', '');
    return `/badges/optimized-${badgeName}.webp`;
  };
  
  useEffect(() => {
    if (badge && audio) {
      audio.currentTime = 0;
      audio.play().catch(error => console.error('Error playing sound:', error));
    }
    
    // Auto-dismiss after delay
    const timer = setTimeout(() => {
      onComplete();
    }, 5000); // Increased to 5 seconds to give more time to see the badge
    
    return () => clearTimeout(timer);
  }, [badge, audio, onComplete]);
  
  if (!badge) return null;
  
  const optimizedUrl = getOptimizedUrl();
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex flex-col items-center bg-white bg-opacity-10 p-8 rounded-xl max-w-lg w-full mx-4 border border-white border-opacity-20"
          initial={{ scale: 0.8, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.div
            className="relative mb-4"
            initial={{ rotate: -5, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <div className="w-52 h-52 overflow-hidden rounded-lg relative">
              {/* Loading indicator shown until image loads */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                </div>
              )}
              <picture>
                {/* WebP version for browsers that support it */}
                <source type="image/webp" srcSet={optimizedUrl} />
                {/* Fallback to original PNG if WebP not supported */}
                <img 
                  src={badge.imageUrl} 
                  alt={readableName}
                  className={`w-full h-full object-contain filter drop-shadow-xl ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    console.error(`Failed to load badge image: ${optimizedUrl}`);
                    // Fallback to original image if optimized one fails
                    if ((e.target as HTMLImageElement).src !== badge.imageUrl) {
                      (e.target as HTMLImageElement).src = badge.imageUrl;
                    }
                    setImageLoaded(true);
                  }}
                />
              </picture>
            </div>
            
            {/* Animated glow effect */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              initial={{ opacity: 0, boxShadow: "0 0 0 rgba(255,255,255,0)" }}
              animate={{ 
                opacity: [0, 0.8, 0],
                boxShadow: [
                  "0 0 0 rgba(255,255,255,0)",
                  "0 0 20px rgba(255,255,255,0.8)",
                  "0 0 0 rgba(255,255,255,0)"
                ]
              }}
              transition={{ repeat: 2, duration: 1.5, delay: 0.5 }}
            />
          </motion.div>
          
          <motion.h3
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {readableName}
          </motion.h3>
          
          <motion.p
            className="text-lg text-center mt-1 text-white text-opacity-90 max-w-md px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {badge.description}
          </motion.p>
          
          <motion.p
            className="text-sm text-center mt-4 text-green-300 font-semibold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            +10 bonus points awarded!
          </motion.p>
          
          <motion.button
            className="mt-6 px-8 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={onComplete}
          >
            Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
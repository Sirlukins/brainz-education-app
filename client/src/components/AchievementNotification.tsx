import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface AchievementNotificationProps {
  id: number;
  type: "counter_a" | "counter_c" | "counter_u" | "civility" | "open_minded" | "new_argument" | "basic" | "clear" | "exceptional" | null;
  onComplete: () => void;
}

const achievementImages = {
  counter_a: "https://od.lk/s/NjBfMTY1NTk5ODQwXw/Counter-A.jpg",
  counter_c: "https://od.lk/s/NjBfMTY1NTk5OTI3Xw/Counter-C.jpg",
  counter_u: "https://od.lk/s/NjBfMTY1NjAwMDEwXw/Counter-U.jpg",
  civility: "https://od.lk/s/NjBfMTY2ODcyODk2Xw/Aura%20booster%20civility.png",
  open_minded: "https://od.lk/s/NjBfMTY2ODk4Njg2Xw/open-mindedness.jpeg",
  new_argument: "https://od.lk/s/NjBfMTY2ODcyODUzXw/New%20Argument.jpg",
  basic: "https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png",
  clear: "https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png",
  exceptional: "https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png"
};

export default function AchievementNotification({ id, type, onComplete }: AchievementNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (type) {
      console.log(`[${id}] Achievement notification triggered:`, type);
      setShouldShow(true);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          console.error("Failed to play notification sound:", err);
        });
      }

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        console.log(`[${id}] Auto-dismissing achievement`);
        setShouldShow(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [type, id]);

  const handleAnimationComplete = () => {
    if (!shouldShow) {
      console.log(`[${id}] Animation complete, calling onComplete`);
      onComplete();
    }
  };

  if (!type) return null;

  // Make sure the type exists in our images map
  const imageSrc = type in achievementImages 
    ? achievementImages[type as keyof typeof achievementImages]
    : "https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png";

  return (
    <>
      <audio 
        ref={audioRef}
        src="https://od.lk/s/NjBfMTY2MTI5MzkzXw/best-notification-1-286672.mp3"
        preload="auto"
      />
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
          >
            <motion.div
              className="relative w-[90vw] h-[90vh] flex items-center justify-center"
            >
              <img
                src={imageSrc}
                alt={`${type.replace('_', ' ')} achievement`}
                className="w-full h-full object-contain filter drop-shadow-lg"
                style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                onError={(e) => {
                  console.error(`[${id}] Failed to load achievement image:`, type, e);
                  onComplete();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
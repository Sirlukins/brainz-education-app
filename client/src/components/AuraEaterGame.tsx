import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TrainingPhase from "./TrainingPhase";

// List of intro screens with their content
const getIntroScreens = (displayName?: string) => [
  {
    id: 1,
    text: `Welcome, ${displayName || "young thinker"}!

Ever notice how sometimes we act like zombies? 
Just following our gut reactions... 
Not really thinking things through...`,
    video: "https://od.lk/s/NjBfMTY0NzQyNzE1Xw/zombie_kids_walk_together_like_zombies.mp4"
  },
  {
    id: 2,
    text: `But you can break free from zombie-like thinking!

Your 'aura' shows how fair, reasonable and open-minded your thinking is.
The stronger your aura grows, the less zombie-like you become.`,
    image: "https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
  },
  {
    id: 3,
    text: `Ready to level up your thinking?

Here's how we do it:

1. Share your view on a topic

2. Debate with me

3. Then try to convince other zombies you understand THEIR view

(Don't worry - I'll help you prepare!)`,
    image: "https://od.lk/s/NjBfMTY1MjYwNjY2Xw/Trainer%202.jpg"
  },
  {
    id: 4,
    text: `WARNING: Becoming a zombie is reeeallly easy!

Zombies aren't deep thinkers. They act on instinct and never have any doubt they are right. They don't change their minds, even when the evidence shows they should. They are even proud of it!

Zombies think they know it all, so they never look for reasons they might be wrong. This means they are wrong all the time!

Your mission: Avoid becoming one of the zombie horde!

Ready to start your training?`,
    image: "https://od.lk/s/NjBfMTY1MjUwNDk1Xw/Zombie%20high%20school%201%20with%20text_.png"
  }
];

export default function AuraEaterGame({ onClose }: { onClose: () => void }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showGem, setShowGem] = useState(false);
  const [startLevel, setStartLevel] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Get user from session - added to access the display name
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const introScreens = useMemo(() => getIntroScreens(user?.displayName), [user?.displayName]);

  useEffect(() => {
    if (currentScreen === 0 && videoRef.current) {
      videoRef.current.play().catch(e => {
        console.error("Video autoplay failed:", e);
      });
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === 1) {
      setShowGem(true);
    } else {
      setShowGem(false);
    }
  }, [currentScreen]);

  const handleClose = () => {
    onClose();
  };

  const handleContinue = () => {
    if (currentScreen === 0 && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    if (currentScreen < introScreens.length - 1) {
      setCurrentScreen(prev => prev + 1);
      setCurrentParagraph(0);
      setIsAnimating(true);
    } else {
      setStartLevel(true);
    }
  };

  const getTextSegments = (text: string) => {
    return text.split(/(\n)/).map(segment => {
      if (segment === '\n') return [segment];
      return segment.split(/(\s+)/).filter(Boolean);
    }).flat();
  };

  const paragraphs = introScreens[currentScreen].text.split('\n\n').filter((p: string) => p.trim());

  if (startLevel) {
    return <TrainingPhase onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900/90 to-black backdrop-blur-sm z-50">
      <div className="container flex items-center justify-center min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <Card className={`${currentScreen === 3 ? 'bg-transparent border-none' : 'bg-black/50 border-purple-500/50'}`}>
              <CardContent className="p-6">
                {currentScreen === 0 && introScreens[0].video && (
                  <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      src={introScreens[0].video}
                      className="absolute inset-0 w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                    />
                  </div>
                )}
                {currentScreen === 1 && showGem && (
                  <motion.div
                    className="relative w-full flex justify-center mb-6"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                      scale: [0.5, 2, 1.5],
                      opacity: [0, 1, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      times: [0, 0.7, 1],
                      ease: "easeInOut",
                    }}
                  >
                    <motion.img
                      src={introScreens[1].image}
                      alt="Aura Gem"
                      className="w-48 h-48 object-contain"
                      style={{ filter: "drop-shadow(0 0 20px rgba(147, 51, 234, 0.7))" }}
                    />
                  </motion.div>
                )}
                {currentScreen === 2 && introScreens[2].image && (
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <img
                      src={introScreens[2].image}
                      alt="Trainer"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
                {currentScreen === 3 && introScreens[3].image && (
                  <div className="fixed inset-0 -z-10">
                    <img 
                      src={introScreens[3].image}
                      alt="Zombie High School"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                )}
                <div className="prose prose-invert max-w-none">
                  {paragraphs.map((paragraph: string, paragraphIndex: number) => (
                    <motion.p
                      key={paragraphIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-4 text-lg leading-relaxed whitespace-pre-line"
                    >
                      {paragraphIndex <= currentParagraph && (
                        <motion.span
                          initial="hidden"
                          animate="visible"
                          onAnimationComplete={() => {
                            if (paragraphIndex === currentParagraph && isAnimating) {
                              if (paragraphIndex < paragraphs.length - 1) {
                                setCurrentParagraph((prev) => prev + 1);
                              } else {
                                setIsAnimating(false);
                              }
                            }
                          }}
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.1,
                              },
                            },
                          }}
                        >
                          {getTextSegments(paragraph).map((segment: string, segmentIndex: number) => (
                            <motion.span
                              key={segmentIndex}
                              variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1 }
                              }}
                              className="inline-block"
                              style={{
                                whiteSpace: segment === '\n' ? 'pre' : 'pre-wrap',
                                display: segment === '\n' ? 'block' : 'inline-block',
                                minHeight: segment === '\n' ? '1em' : 'auto'
                              }}
                            >
                              {segment}
                            </motion.span>
                          ))}
                        </motion.span>
                      )}
                    </motion.p>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="border-purple-500/50 hover:bg-purple-500/20"
                  >
                    Exit
                  </Button>
                  {!isAnimating && (
                    <Button
                      onClick={handleContinue}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {currentScreen === introScreens.length - 1 ? "Start Training" : "Continue"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitResponse } from "@/lib/ai-dialogue";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import AchievementNotification from "./AchievementNotification";
import { useUser } from "@/hooks/use-user";

type DialogueParticipant = "trainer" | "user";
type DialogueRole = "assistant" | "user";

interface DialogueEntry {
  content: string;
  speaker: DialogueParticipant;
}

interface TrainingPhaseProps {
  onClose: () => void;
}

interface Achievement {
  id: number;
  type: "counter_a" | "counter_c" | "counter_u" | "civility" | "open_minded" | "new_argument";
}

export default function TrainingPhase({ onClose }: TrainingPhaseProps) {
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [auraPoints, setAuraPoints] = useState(0);
  const [userResponse, setUserResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [randomQuestion, setRandomQuestion] = useState("");
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const { toast } = useToast();
  const { refreshUser } = useUser();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // State to store user's topic responses from the onboarding
  const [topicResponses, setTopicResponses] = useState<{
    questionId: number;
    response: number;
    question: string;
  }[]>([]);

  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  // Fallback questions in case user has no topic responses
  const fallbackQuestions = [
    "The Government should ban abortion",
    "You need to support LGBTQ+ people to be a good person",
    "Owning a gun is a fundamental right",
    "The feminist movement has gone too far",
    "Being overweight is a problem that should be addressed",
    "Cosmetic surgery should be treated as normal as makeup",
    "Police violence is exaggerated by the media",
    "Men and women have natural differences that make men better at certain things",
    "Prison sentences are too light",
    "TikTok is harmful and the world would be better without it",
    "Trans women have a competitive advantage that is unfair",
    "Eating animals is morally acceptable",
    "Sons and daughters should be raised differently",
    "Smacking children can be an acceptable form of discipline",
    "Polygamy (having more than one wife or husband at the same time) should be legalised",
    "The death penalty is a fair punishment for certain crimes",
    "The government should be allowed to force people to get vaccinated for serious diseases",
    "There are too many 'Welcome to country' ceremonies these days"
  ];

  // Fetch user's topic responses
  useEffect(() => {
    const fetchTopicResponses = async () => {
      try {
        console.log("Attempting to fetch topic responses...");
        const response = await fetch("/api/user-topic-responses", {
          credentials: "include"
        });
        
        console.log("Response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched topic responses successfully, count:", data.length);
          console.log("Response data:", data);
          
          if (data.length > 0) {
            setTopicResponses(data);
            console.log("Set topic responses to state:", data.length, "items");
          } else {
            console.log("No topic responses found, will use fallback questions.");
          }
        } else {
          console.error("Failed to fetch topic responses:", await response.text());
        }
      } catch (error) {
        console.error("Error fetching topic responses:", error);
      } finally {
        setIsLoadingTopics(false);
        console.log("Finished loading topics, isLoadingTopics set to false");
      }
    };

    fetchTopicResponses();
  }, []);

  // Select a random topic from responses or fallback to default questions
  useEffect(() => {
    if (isLoadingTopics) return;
    
    let selectedQuestion = "";
    
    if (topicResponses.length > 0) {
      // Select a random topic response
      const randomIndex = Math.floor(Math.random() * topicResponses.length);
      const randomTopic = topicResponses[randomIndex];
      
      // Get the user's position (agree/disagree) based on their response (1-6)
      const userAgreed = randomTopic.response >= 4; // 4, 5, 6 are agreement levels
      
      // Phrase the question to match the user's position
      selectedQuestion = `Why do you ${userAgreed ? 'agree' : 'disagree'} that "${randomTopic.question}"?`;
    } else {
      // Use fallback questions if no topic responses available
      selectedQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    }
    
    setRandomQuestion(selectedQuestion);
  }, [isLoadingTopics, topicResponses]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [dialogue]);

  const initialText = {
    content: `INFILTRATION TRAINING PHASE 1: Recognition\n\nWelcome to Aura Training. I'm Plato, your instructor. Your first challenge is to master the art of recognising different thought patterns. Remember - to blend in among the zombies, you'll need to understand their viewpoint as well as they do.\n\nLet's begin by practising the art of arguing for your opinion. Remember that giving reasons for your view is essential.\n\nWhat do you think:\n\n${randomQuestion}`,
    speaker: "trainer" as DialogueParticipant
  };

  const getTextSegments = (text: string) => {
    return text.split(/(\n)/).map(segment => {
      if (segment === '\n') return [segment];
      return segment.split(/(\s+)/).filter(Boolean);
    }).flat();
  };

  const handleSubmit = async () => {
    if (!userResponse.trim()) return;

    setIsSubmitting(true);
    try {
      const dialogueHistory = dialogue.map(entry => ({
        role: (entry.speaker === "trainer" ? "assistant" : "user") as DialogueRole,
        content: entry.content
      }));

      const result = await submitResponse(randomQuestion, userResponse, dialogueHistory);

      setDialogue(prev => [
        ...prev,
        { content: userResponse, speaker: "user" },
        { content: result.response, speaker: "trainer" }
      ]);

      if (result.points) {
        const pointsAmount = result.points.amount || 0;
        setAuraPoints(prev => prev + pointsAmount);
        console.log("Points awarded:", result.points);

        const pointsType = result.points.type || '';
        const counterType = pointsType.match(/^counter_(a|c|u)$/);
        if (counterType) {
          const newAchievement = {
            id: Date.now(),
            type: pointsType as "counter_a" | "counter_c" | "counter_u" | "civility" | "open_minded" | "new_argument"
          };
          console.log("Setting new achievement:", newAchievement);
          setCurrentAchievement(newAchievement);
        }

        // Update total score with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        const updateScore = async () => {
          try {
            const response = await fetch("/api/update-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ points: pointsAmount })
            });
            
            if (response.ok) {
              console.log("Training Phase: Score updated successfully:", pointsAmount, "points");
              // Force refresh the user data to ensure total score is updated in the UI
              await refreshUser();
              return true;
            } else {
              // Handle server errors
              const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
              throw new Error(errorData.message || `Server error: ${response.status}`);
            }
          } catch (error) {
            console.error(`Training Phase: Error updating score (attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              // Exponential backoff for retries (300ms, 900ms, 2700ms)
              const backoffTime = 300 * Math.pow(3, retryCount - 1);
              console.log(`Training Phase: Retrying in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              return updateScore(); // Retry recursively
            }
            
            toast({
              title: "Score Update Failed",
              description: "Your points were earned but couldn't be saved to your total. Please try again later.",
              variant: "destructive"
            });
            return false;
          }
        };
        
        await updateScore();

        const gem = document.querySelector('.aura-gem') as HTMLElement;
        if (gem) {
          gem.style.transform = 'scale(1.5)';
          setTimeout(() => {
            gem.style.transform = 'scale(1)';
          }, 300);
        }
      }

      if (result.isComplete) {
        setIsComplete(true);
        setShowCompletion(true);
        const completionBonus = 10;
        setAuraPoints(prev => prev + completionBonus);

        // Update completion bonus with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        const updateCompletionBonus = async () => {
          try {
            const response = await fetch("/api/update-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ points: completionBonus })
            });
            
            if (response.ok) {
              console.log("Training Phase: Completion bonus updated successfully:", completionBonus, "points");
              // Force refresh the user data to ensure total score is updated in the UI
              await refreshUser();
              return true;
            } else {
              // Handle server errors
              const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
              throw new Error(errorData.message || `Server error: ${response.status}`);
            }
          } catch (error) {
            console.error(`Training Phase: Error updating completion bonus (attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              // Exponential backoff for retries (300ms, 900ms, 2700ms)
              const backoffTime = 300 * Math.pow(3, retryCount - 1);
              console.log(`Training Phase: Retrying in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              return updateCompletionBonus(); // Retry recursively
            }
            
            toast({
              title: "Bonus Update Failed",
              description: "Your completion bonus couldn't be saved. Please try again later.",
              variant: "destructive"
            });
            return false;
          }
        };
        
        await updateCompletionBonus();
      }

      setUserResponse("");
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const paragraphs = initialText.content.split('\n\n').filter((p) => p.trim());

  if (showCompletion) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-purple-900/90 to-black backdrop-blur-sm z-50">
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="bg-black/50 border-purple-500/50 max-w-2xl">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="w-48 h-48 shrink-0">
                  <img
                    src="https://od.lk/s/NjBfMTY1MjYwNjY2Xw/Trainer%202.jpg"
                    alt="Trainer"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 text-white">
                  <h2 className="text-3xl font-bold mb-4">Well done! You have completed basic training</h2>
                  <p className="text-lg mb-6">Your aura has grown stronger. You earned {auraPoints} points!</p>
                  <Button
                    onClick={() => {/* TODO: Implement Level 2 */}}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Enter Level 2: Zombie Infiltration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900/90 to-black backdrop-blur-sm z-50">
      {currentAchievement && (
        <AchievementNotification
          key={currentAchievement.id}
          id={currentAchievement.id}
          type={currentAchievement.type}
          onComplete={() => {
            console.log("Achievement completed, clearing state");
            setCurrentAchievement(null);
          }}
        />
      )}
      <div className="container flex items-center justify-center min-h-screen">
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-purple-500/50">
          <motion.img
            src="https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
            alt="Aura Gem"
            className="w-8 h-8 object-contain aura-gem"
            style={{ filter: "drop-shadow(0 0 4px rgba(147, 51, 234, 0.5))" }}
            transition={{ duration: 0.3 }}
          />
          <motion.span
            className="text-white font-bold"
            key={auraPoints}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {auraPoints} pts
          </motion.span>
        </div>

        <div className="w-full max-w-4xl">
          <Card className="bg-black/50 border-purple-500/50">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                {dialogue.length === 0 && (
                  <div className="flex gap-6">
                    <div className="w-48 h-48 shrink-0">
                      <img
                        src="https://od.lk/s/NjBfMTY1MjYwNjY2Xw/Trainer%202.jpg"
                        alt="Trainer"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 prose prose-invert max-w-none text-white">
                      {paragraphs.map((paragraph, paragraphIndex) => (
                        <motion.p
                          key={paragraphIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`mb-4 text-lg leading-relaxed whitespace-pre-line text-white ${
                            paragraph === randomQuestion ? 'text-2xl font-bold' : ''
                          }`}
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
                              {getTextSegments(paragraph).map((segment, segmentIndex) => (
                                <motion.span
                                  key={segmentIndex}
                                  variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1 }
                                  }}
                                  className="inline-block text-white"
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
                  </div>
                )}

                {dialogue.length > 0 && (
                  <>
                    <div className="mb-4 p-4 rounded-lg bg-purple-900/30 border border-purple-500/30">
                      <h3 className="text-white text-lg font-semibold mb-2">Current Topic:</h3>
                      <p className="text-white text-xl">{randomQuestion}</p>
                    </div>
                    <ScrollArea className="h-[400px] pr-4" ref={scrollAreaRef}>
                      <div className="space-y-4">
                        {dialogue.map((entry, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-4 ${entry.speaker === "user" ? "flex-row-reverse" : ""}`}
                          >
                            <div className="w-12 h-12 shrink-0">
                              <img
                                src={entry.speaker === "trainer"
                                  ? "https://od.lk/s/NjBfMTY1MjYwNjY2Xw/Trainer%202.jpg"
                                  : "https://od.lk/s/NjBfMTY1MjYzMTgzXw/User%201.jpg"
                                }
                                alt={entry.speaker === "trainer" ? "Trainer" : "User"}
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                            <div
                              className={`flex-1 p-4 rounded-lg ${
                                entry.speaker === "trainer"
                                  ? "bg-purple-900/30 border border-purple-500/30"
                                  : "bg-gray-900/30 border border-gray-500/30"
                              }`}
                            >
                              <p className="text-lg whitespace-pre-wrap text-white">{entry.content}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {!isComplete && !isAnimating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6"
                  >
                    <Textarea
                      placeholder="Type your response here..."
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="min-h-[120px] bg-black/30 border-purple-500/50 text-white placeholder:text-gray-400 text-lg"
                    />
                    <div className="flex justify-between mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Refresh user data before closing
                          refreshUser().then(() => onClose());
                        }}
                        className="border-purple-500/50 hover:bg-purple-500/20"
                      >
                        Exit
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !userResponse.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Response"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
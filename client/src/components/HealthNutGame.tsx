import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ScrollArea } from "@/components/ui/scroll-area";
import AchievementNotification from "./AchievementNotification";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DialogueParticipant = "qaylee" | "user" | "plato";
type DialogueRole = "assistant" | "user" | "system";

interface DialogueEntry {
  content: string;
  speaker: DialogueParticipant;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

interface HealthNutGameProps {
  onClose: () => void;
}

interface Achievement {
  id: number;
  type: "basic" | "clear" | "exceptional" | null;
  points: number;
}

export default function HealthNutGame({ onClose }: HealthNutGameProps) {
  // State
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([{
    content: "Hi there! I'm Qaylee, and I'm SUPER excited to share all my amazing health discoveries with you! 🌟",
    speaker: "qaylee",
  }]);
  const [userResponse, setUserResponse] = useState("");
  const [auraPoints, setAuraPoints] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Refs
  const { toast } = useToast();
  const { refreshUser } = useUser();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Initialize game with first claim
  useEffect(() => {
    const getFirstClaim = async () => {
      if (initialized.current || dialogue.length > 1) return;
      initialized.current = true;

      try {
        const res = await fetch("/api/health-nut/dialogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            userResponse: '', 
            dialogueHistory: [{
              role: "assistant",
              content: dialogue[0].content
            }]
          })
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();

        // Add only the new messages from the response
        setDialogue(prev => [
          ...prev,
          ...data.messages.map((msg: any) => ({
            content: msg.content,
            speaker: msg.speaker as DialogueParticipant,
            table: msg.table
          }))
        ]);
      } catch (error) {
        console.error("Failed to get initial claim:", error);
        toast({
          title: "Error",
          description: "Failed to start the game. Please try again.",
          variant: "destructive",
        });
      }
    };

    getFirstClaim();
  }, []);

  // Auto-scroll effect
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

  // Handle user responses
  const handleSubmit = async () => {
    if (!userResponse.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const dialogueHistory = dialogue.slice(1).map(entry => ({
        role: (entry.speaker === "qaylee" ? "assistant" : 
              entry.speaker === "plato" ? "system" : "user") as DialogueRole,
        content: entry.content
      }));

      const res = await fetch("/api/health-nut/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userResponse,
          dialogueHistory
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setDialogue(prev => [
        ...prev,
        { content: userResponse, speaker: "user" as const },
        ...data.messages.map((msg: any) => ({
          content: msg.content,
          speaker: msg.speaker as DialogueParticipant,
          table: msg.table
        }))
      ]);

      if (data.points) {
        setAuraPoints(prev => prev + data.points.amount);
        const newAchievement: Achievement = {
          id: Date.now(),
          type: data.points.type as Achievement["type"],
          points: data.points.amount
        };
        setCurrentAchievement(newAchievement);

        // Update total score with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        const updateScore = async () => {
          try {
            const response = await fetch("/api/update-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ points: data.points.amount })
            });
            
            if (response.ok) {
              console.log("Health Nut: Score updated successfully:", data.points.amount, "points");
              // Force refresh the user data to ensure total score is updated in the UI
              const updatedUser = await refreshUser();
              console.log("Health Nut: User data refreshed, new total score:", updatedUser?.totalScore);
              return true;
            } else {
              // Handle server errors
              const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
              throw new Error(errorData.message || `Server error: ${response.status}`);
            }
          } catch (error) {
            console.error(`Health Nut: Error updating score (attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              // Exponential backoff for retries (300ms, 900ms, 2700ms)
              const backoffTime = 300 * Math.pow(3, retryCount - 1);
              console.log(`Health Nut: Retrying in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              return updateScore(); // Retry recursively
            }
            
            console.error("Health Nut: Failed to update score after all retries");
            return false;
          }
        };
        
        await updateScore().catch(err => console.error("Health Nut: Update score failed:", err));
      }

      if (data.isComplete) {
        setIsComplete(true);
        setTimeout(() => setShowCompletion(true), 1000);
      }

      setUserResponse("");
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your response",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-green-900/90 to-black backdrop-blur-sm z-50">
      {currentAchievement && (
        <AchievementNotification
          key={currentAchievement.id}
          id={currentAchievement.id}
          type={currentAchievement.type}
          onComplete={() => setCurrentAchievement(null)}
        />
      )}

      {showCompletion ? (
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="bg-black/50 border-green-500/50 max-w-2xl">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="w-48 h-48 shrink-0">
                  <img
                    src="https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png"
                    alt="Qaylee"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 text-white">
                  <h2 className="text-3xl font-bold mb-4">OMG! You're literally amazing at this!</h2>
                  <p className="text-lg mb-6">You've earned {auraPoints} aura points by helping me think more critically about health claims!</p>
                  <Button
                    onClick={() => {
                      // Final refresh of the user data before closing
                      refreshUser().then(() => onClose());
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Training
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="container flex items-center justify-center min-h-screen">
          <div className="fixed top-4 right-4 flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-green-500/50">
            <motion.img
              src="https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
              alt="Aura Gem"
              className="w-8 h-8 object-contain aura-gem"
              style={{ filter: "drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))" }}
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
            <Card className="bg-black/50 border-green-500/50">
              <CardContent className="p-6">
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
                            src={
                              entry.speaker === "qaylee"
                                ? "https://od.lk/s/NjBfMTcwODYyNzM0Xw/Qaylee%20headshot%20.png"
                                : entry.speaker === "plato"
                                ? "https://od.lk/s/NjBfMTY1MjYwNjY2Xw/Trainer%202.jpg"
                                : "https://od.lk/s/NjBfMTY1MjYzMTgzXw/User%201.jpg"
                            }
                            alt={entry.speaker}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        <div
                          className={`flex-1 p-4 rounded-lg ${
                            entry.speaker === "qaylee"
                              ? "bg-green-900/30 border border-green-500/30"
                              : entry.speaker === "plato"
                              ? "bg-purple-900/30 border border-purple-500/30"
                              : "bg-gray-900/30 border border-gray-500/30"
                          }`}
                        >
                          <p className="text-lg whitespace-pre-wrap text-white">{entry.content}</p>
                          {entry.table && (
                            <div className="mt-4 bg-black/20 rounded-lg p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {entry.table.headers.map((header, i) => (
                                      <TableHead key={i} className="text-white">{header}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {entry.table.rows.map((row, i) => (
                                    <TableRow key={i}>
                                      {row.map((cell, j) => (
                                        <TableCell key={j} className="text-white">{cell}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                {!isComplete && dialogue.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6"
                  >
                    <Textarea
                      placeholder="Type your response here..."
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="min-h-[120px] bg-black/30 border-green-500/50 text-white placeholder:text-gray-400 text-lg"
                    />
                    <div className="flex justify-between mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Refresh user data before closing
                          refreshUser().then(() => onClose());
                        }}
                        className="border-green-500/50 hover:bg-green-500/20"
                      >
                        Exit
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !userResponse.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Response"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
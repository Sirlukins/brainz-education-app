import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2, Info, X, BrainCircuit, Award } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { getGeminiResponse, extractScore } from "@/lib/gemini-ai";
import { Badge, extractBadgeAward, removeBadgeAwardSyntax } from "@/lib/badge-service";
import { BadgeIcon, BadgeCollection, BadgeAwardNotification } from "@/components/ui/badge-display";
import { ArgumentAnalyser, FeedbackItem } from "@/components/ui/argument-analyser";
import { useLocation } from "wouter";

interface ThoughtZombiesGameProps {
  // No props - this is now a standalone page component
}

// Type for topic responses from the API
interface TopicResponse {
  questionId: number;
  question: string;
  response: number;
}

// Type for dialogue entry in the game
interface DialogueEntry {
  content: string;
  speaker: "user" | "system" | "opponent" | "coach";
  isTyping?: boolean;
}

// Reason meter progress percentage (0-100)
type ReasonMeterProgress = number;

export default function ThoughtZombiesGame() {
  const [_, setLocation] = useLocation();
  // State for the intro screens
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [activeIntroScreen, setActiveIntroScreen] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  
  // Game state
  const [topicResponses, setTopicResponses] = useState<TopicResponse[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicResponse | null>(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [userPosition, setUserPosition] = useState<string>("");
  const [oppositePosition, setOppositePosition] = useState<string>("");
  const [gameStage, setGameStage] = useState<'intro' | 'argue-own' | 'results'>('intro');
  
  // Dialogue
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Scores and Meter
  const [reasoningScore, setReasoningScore] = useState(0); // Points for giving reasons
  const [engagementScore, setEngagementScore] = useState(0); // Points for engagement/dialogue
  const [bonusScore, setBonusScore] = useState(0); // Points for badges and special achievements
  const [totalScore, setTotalScore] = useState(0); // Combined score from all categories
  const [reasonProgress, setReasonProgress] = useState<ReasonMeterProgress>(0); // Progress percentage (0-100%)
  const [isGlowing, setIsGlowing] = useState(false); // For animation effect
  const [animatingScoreCategory, setAnimatingScoreCategory] = useState<'reasoning' | 'engagement' | 'bonus' | null>(null); // For category-specific animations
  
  // UI State
  const [showTips, setShowTips] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  
  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, refreshUser } = useUser(); // Get user to access total score

  // Fallback questions if user has no topic responses
  const fallbackQuestions = [
    { 
      questionId: 1, 
      question: "The Government should ban abortion", 
      response: Math.random() > 0.5 ? 5 : 2 // Randomly assign agreement or disagreement
    },
    { 
      questionId: 2, 
      question: "You need to support LGBTQ+ people to be a good person",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 3, 
      question: "Owning a gun is a fundamental right",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 4, 
      question: "The feminist movement has gone too far",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 5, 
      question: "Being overweight is a problem that should be addressed",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 6, 
      question: "Police violence is exaggerated by the media",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 7, 
      question: "The death penalty is a fair punishment for certain crimes",
      response: Math.random() > 0.5 ? 5 : 2
    },
    { 
      questionId: 8, 
      question: "The government should be allowed to force people to get vaccinated for serious diseases",
      response: Math.random() > 0.5 ? 5 : 2
    }
  ];

  // Intro screens content
  const introScreens = [
    `Welcome, ${localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").displayName || "Thinker" : "Thinker"}!`,
    "So glad you're here. The world needs clear thinkers, not mindless 'Thought Zombies'!",
    "This game tests your critical thinking power. You'll defend your view on a controversial topic.",
    "You'll need to make strong, well-reasoned arguments to convince your opponent.",
    "Strong arguments keep the zombies at bay. Weak arguments... well, you might start to feel a bit mindless yourself!"
  ];

  // Display text all at once for intro screens
  useEffect(() => {
    if (gameStage !== 'intro') return;
    
    const text = introScreens[activeIntroScreen];
    
    // Set the full text immediately
    setTypedText(text);
    // Just for a brief moment show isTyping true, then false
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 100);
    
  }, [activeIntroScreen, gameStage]);
  
  // Update header height on component render and window resize
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.getElementById('game-header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };
    
    // Update on initial render
    updateHeaderHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateHeaderHeight);
    
    // Update when header content changes (async)
    const observer = new MutationObserver(updateHeaderHeight);
    const header = document.getElementById('game-header');
    if (header) {
      observer.observe(header, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      });
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      observer.disconnect();
    };
  }, [selectedTopic, earnedBadges, feedbackItems.length, reasoningScore, engagementScore, bonusScore]);

  // Fetch user's topic responses from onboarding
  useEffect(() => {
    const fetchTopicResponses = async () => {
      try {
        console.log("Fetching topic responses for Thought Zombies game...");
        const response = await fetch("/api/user-topic-responses", {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched topic responses:", data);
          
          if (data.length > 0) {
            setTopicResponses(data);
          } else {
            console.log("No topic responses found, using fallbacks");
            setTopicResponses(fallbackQuestions);
          }
        } else {
          console.error("Failed to fetch topic responses:", await response.text());
          setTopicResponses(fallbackQuestions);
        }
      } catch (error) {
        console.error("Error fetching topic responses:", error);
        setTopicResponses(fallbackQuestions);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopicResponses();
  }, []);
  
  // Fetch user's earned badges
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch("/api/user-badges", {
          credentials: "include"
        });
        
        if (response.ok) {
          const badges = await response.json();
          console.log("Fetched user badges:", badges);
          setEarnedBadges(badges);
        } else {
          console.error("Failed to fetch user badges:", await response.text());
        }
      } catch (error) {
        console.error("Error fetching user badges:", error);
      }
    };
    
    fetchBadges();
  }, []);

  // Select a random topic when topics are loaded
  useEffect(() => {
    if (isLoadingTopics || topicResponses.length === 0 || selectedTopic) return;
    
    // Select a random topic
    const randomIndex = Math.floor(Math.random() * topicResponses.length);
    const topic = topicResponses[randomIndex];
    setSelectedTopic(topic);
    
    // Determine user's position (agree/disagree)
    const userAgreed = topic.response >= 4; // 4, 5, 6 are agreement levels
    setUserPosition(userAgreed ? 'agree' : 'disagree');
    setOppositePosition(userAgreed ? 'disagree' : 'agree');
    
  }, [isLoadingTopics, topicResponses, selectedTopic]);

  // Start the game when intro is complete
  useEffect(() => {
    if (isIntroComplete && selectedTopic && !isLoadingTopics) {
      setGameStage('argue-own');
      // Initialize the dialogue with instructions
      setDialogue([
        {
          content: `Let's discuss this topic: "${selectedTopic.question}"\n\nYou ${userPosition} with this statement. First, explain why you ${userPosition}. Give your best arguments.`,
          speaker: "system" as const
        }
      ]);
    }
  }, [isIntroComplete, selectedTopic, isLoadingTopics, userPosition]);

  // Auto-scroll to the latest dialogue
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [dialogue]);

  // Handler for proceeding through intro screens
  const handleNextIntroScreen = () => {
    if (isTyping) {
      // Skip typing and show full text immediately
      setTypedText(introScreens[activeIntroScreen]);
      setIsTyping(false);
      return;
    }
    
    if (activeIntroScreen < introScreens.length - 1) {
      setActiveIntroScreen(prev => prev + 1);
    } else {
      setIsIntroComplete(true);
    }
  };

  // Function to update reason meter progress
  const updateReasonMeter = () => {
    // Increase the reason meter by 20% each time this function is called
    // until it reaches 100%
    setReasonProgress(prev => {
      const newProgress = Math.min(100, prev + 20);
      
      // Trigger glow animation when progress increases
      if (newProgress > prev) {
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), 800); // Turn off glow after animation
      }
      
      return newProgress;
    });
  };
  
  // Handler for animation completion in Argument Analyser
  const handleCategoryAnimationComplete = (category: string) => {
    console.log(`Animation complete for category: ${category}`);
    
    // Check which category was animated and update the relevant state
    if (category === 'REASONING') {
      setAnimatingScoreCategory('reasoning');
      setTimeout(() => setAnimatingScoreCategory(null), 1000);
    } else if (category === 'ENGAGEMENT') {
      setAnimatingScoreCategory('engagement');
      setTimeout(() => setAnimatingScoreCategory(null), 1000);
    } else if (category === 'BONUS') {
      setAnimatingScoreCategory('bonus');
      setTimeout(() => setAnimatingScoreCategory(null), 1000);
    }
  };

  // Format the conversation history for the AI
  const formatConversationHistory = () => {
    // Skip the system prompt instructions
    const relevantDialogue = dialogue.filter(entry => 
      !entry.content.includes("Let's discuss this topic:")
    );
    
    let history = '';
    for (const entry of relevantDialogue) {
      // Map speakers to the format the AI expects
      const speaker = entry.speaker === 'user' 
        ? 'User' 
        : entry.speaker === 'system' || entry.speaker === 'coach'
          ? 'BrainZ Bot'
          : 'BrainZ Bot';
      
      history += `${speaker}: ${entry.content}\n\n`;
    }
    
    return history;
  };

  // Handler for submitting user responses
  const handleSubmitResponse = async () => {
    if (!userInput.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Add user's message to dialogue
    const updatedDialogue = [
      ...dialogue,
      { content: userInput, speaker: "user" as const }
    ];
    setDialogue(updatedDialogue);
    setUserInput("");
    
    try {
      // Add thinking indicator
      setDialogue([
        ...updatedDialogue,
        { content: "Thinking...", speaker: "opponent" as const, isTyping: true }
      ]);
      
      let nextStage = gameStage;
      
      // Prepare the AI request context
      const conversationHistory = formatConversationHistory();
      const aiStance = gameStage === 'argue-own' 
        ? oppositePosition 
        : userPosition;
      const userStance = gameStage === 'argue-own' 
        ? userPosition 
        : oppositePosition;
      
      // Send to Gemini AI
      const geminiResponse = await getGeminiResponse({
        conversationHistory,
        aiStance: `${aiStance} with "${selectedTopic?.question || ''}"`,
        userStance: `${userStance} with "${selectedTopic?.question || ''}"`,
        userArgument: userInput
      });
      
      // Extract the points awarded by the AI
      const pointsAwarded = geminiResponse.score;
      console.log(`Points awarded by AI: ${pointsAwarded}`);
      
      // Get message and check for badge award
      const message = geminiResponse.message;
      const badgeFromResponse = geminiResponse.badge;
      const badgeType = badgeFromResponse ? null : extractBadgeAward(message);
      
      // Clean the message by removing badge award syntax
      const cleanedMessage = removeBadgeAwardSyntax(message);
      
      // Categorize points based on AI response content/pattern
      let reasoningPoints = 0;
      let engagementPoints = 0;
      let bonusPoints = 0;
      
      // Create a copy of the message for cleaning
      let displayMessage = cleanedMessage;
      
      // === EXTRACT POINTS BASED ON NEW FORMAT ===
      // Extract REASONING points with explanation
      const reasoningRegex = /\[REASONING \+(\d+):\s*([^\]]*)\]/i;
      const reasoningMatch = displayMessage.match(reasoningRegex);
      if (reasoningMatch && reasoningMatch[1]) {
        const points = parseInt(reasoningMatch[1], 10);
        const explanation = reasoningMatch[2]?.trim() || 'Good reasoning';
        reasoningPoints = points;
        console.log('Extracted reasoning points:', reasoningPoints, 'Explanation:', explanation);
        
        // Animate reasoning score if points were awarded
        if (reasoningPoints > 0) {
          setTimeout(() => {
            setAnimatingScoreCategory('reasoning');
            setTimeout(() => setAnimatingScoreCategory(null), 1000);
          }, 100);
        }
        
        // Add feedback item for the Argument Analyser
        if (points > 0) {
          setFeedbackItems(prev => [...prev, {
            id: `reasoning-${Date.now()}`,
            category: 'REASONING',
            points: points,
            explanation: explanation,
            timestamp: Date.now()
          }]);
        }
      }
      
      // Extract ENGAGEMENT points with explanation
      const engagementRegex = /\[ENGAGEMENT \+(\d+):\s*([^\]]*)\]/i;
      const engagementMatch = displayMessage.match(engagementRegex);
      if (engagementMatch && engagementMatch[1]) {
        const points = parseInt(engagementMatch[1], 10);
        const explanation = engagementMatch[2]?.trim() || 'Good engagement';
        engagementPoints = points;
        console.log('Extracted engagement points:', engagementPoints, 'Explanation:', explanation);
        
        // Animate engagement score if points were awarded
        if (engagementPoints > 0) {
          setTimeout(() => {
            setAnimatingScoreCategory('engagement');
            setTimeout(() => setAnimatingScoreCategory(null), 1000);
          }, 200);
        }
        
        // Add feedback item for the Argument Analyser
        if (points > 0) {
          setFeedbackItems(prev => [...prev, {
            id: `engagement-${Date.now()}`,
            category: 'ENGAGEMENT',
            points: points,
            explanation: explanation,
            timestamp: Date.now()
          }]);
        }
      }
      
      // Extract BONUS points with explanation
      const bonusRegex = /\[BONUS \+(\d+):\s*([^\]]*)\]/i;
      const bonusMatch = displayMessage.match(bonusRegex);
      if (bonusMatch && bonusMatch[1]) {
        const points = parseInt(bonusMatch[1], 10);
        const explanation = bonusMatch[2]?.trim() || 'Bonus points';
        bonusPoints = points;
        console.log('Extracted bonus points:', bonusPoints, 'Explanation:', explanation);
        
        // Animate bonus score if points were awarded
        if (bonusPoints > 0) {
          setTimeout(() => {
            setAnimatingScoreCategory('bonus');
            setTimeout(() => setAnimatingScoreCategory(null), 1000);
          }, 300);
        }
        
        // Add feedback item for the Argument Analyser
        if (points > 0) {
          setFeedbackItems(prev => [...prev, {
            id: `bonus-${Date.now()}`,
            category: 'BONUS',
            points: points,
            explanation: explanation,
            timestamp: Date.now()
          }]);
        }
      }
      
      // Extract TOTAL
      const totalRegex = /\[TOTAL: \+(\d+)\]/i;
      const totalMatch = displayMessage.match(totalRegex);
      let totalFromMatch = 0;
      if (totalMatch && totalMatch[1]) {
        totalFromMatch = parseInt(totalMatch[1], 10);
        console.log('Extracted total points:', totalFromMatch);
      }
      
      // === CLEAN THE MESSAGE - REMOVE ALL SCORING NOTATION ===
      // Remove new format category markers
      displayMessage = displayMessage.replace(/\[REASONING \+\d+:[^\]]*\]/gi, '');
      displayMessage = displayMessage.replace(/\[ENGAGEMENT \+\d+:[^\]]*\]/gi, '');
      displayMessage = displayMessage.replace(/\[BONUS \+\d+:[^\]]*\]/gi, '');
      displayMessage = displayMessage.replace(/\[TOTAL: \+\d+\]/gi, '');
      
      // Remove badge syntax [badge: badge_name]
      const badgeSyntaxRegex = /\[badge:\s*[a-z_]+\]/gi;
      displayMessage = displayMessage.replace(badgeSyntaxRegex, '');
      
      // === FALLBACK TO OLD FORMATS ===
      // These are kept for backward compatibility
      // Extract point awarding text using regex to find patterns from old format 
      const oldPointsRegex = /\[\+(\d+)\s+points?\s+for\s+([^\]]+)\]/gi;
      const pointMatches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      while ((match = oldPointsRegex.exec(cleanedMessage)) !== null) {
        pointMatches.push(match);
        // Remove these matches from the display message
        displayMessage = displayMessage.replace(match[0], '');
      }
      
      // Clean old formats as well
      // This will handle any other scoring patterns that might appear
      const additionalPointsRegex = /\[\+\d+\s+(?:point|points)[^\]]*\]/gi;
      displayMessage = displayMessage.replace(additionalPointsRegex, '');
      
      // Remove all variations of score and point formats
      // This handles [Score: +X], [score: +X], and just [+X]
      displayMessage = displayMessage.replace(/\[(Score|score)?:?\s*\+\d+\s*(\])/gi, '');
      
      // Handle formats like [+15 for Intrinsic Quality - presenting a plausible argument]
      displayMessage = displayMessage.replace(/\[\+\d+\s+for\s+[^\]]+\]/gi, '');
      
      // Capture any format with 'points' in square brackets
      displayMessage = displayMessage.replace(/\[.*?points?.*?\]/gi, '');
      
      // Last chance catch-all for any remaining scoring notation with numbers
      displayMessage = displayMessage.replace(/\s*\[\+\d+.*?\]\s*/g, '');
      
      // In case old format is found, categorize those points too
      pointMatches.forEach(match => {
        const points = parseInt(match[1], 10);
        const reason = match[2].toLowerCase();
        
        if (reason.includes('reason') || reason.includes('evidence') || reason.includes('logic')) {
          reasoningPoints += points;
        } else if (reason.includes('question') || reason.includes('engage') || reason.includes('response')) {
          engagementPoints += points;
        } else {
          // Default for old format was engagement
          engagementPoints += points;
        }
      });
      
      // No longer adding bonus points for badges - we just display the badge notification
      // This makes the game progression slower and more engaging
      
      // Animate bonus score if we have bonus points (unrelated to badge)
      if (bonusPoints > 0) {
        setTimeout(() => {
          setAnimatingScoreCategory('bonus');
          setTimeout(() => setAnimatingScoreCategory(null), 1000);
        }, 300);
      }
      
      // Update the scores
      setReasoningScore(prev => prev + reasoningPoints);
      setEngagementScore(prev => prev + engagementPoints);
      setBonusScore(prev => prev + bonusPoints);
      
      // Calculate session score (for this game instance)
      const newTotalScore = totalScore + reasoningPoints + engagementPoints + bonusPoints;
      setTotalScore(newTotalScore);
      
      // Update reason meter based on total score
      const reasonMeterPercentage = Math.min(100, newTotalScore);
      setReasonProgress(reasonMeterPercentage);
      
      // Update user's total score in the database whenever points are earned
      if (reasoningPoints + engagementPoints + bonusPoints > 0) {
        try {
          const response = await fetch("/api/update-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ points: reasoningPoints + engagementPoints + bonusPoints })
          });
          
          if (response.ok) {
            // Refresh the user data to update the total score in the navbar
            await refreshUser();
          }
        } catch (error) {
          console.error("Error updating total score:", error);
        }
      }
      
      // Trigger glow animation if points were awarded
      if (reasoningPoints + engagementPoints + bonusPoints > 0) {
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), 1200);
      }
      
      // Create AI response without point awarding text
      const response: DialogueEntry = {
        content: displayMessage.trim(),
        speaker: "opponent" as const
      };
      
      // Determine if we should move to the next stage
      // User keeps arguing for their original position
      // Only move to results when score threshold is reached (100 points) or all 5 badges are earned
      const badgeCount = badgeFromResponse 
                          ? earnedBadges.length + (earnedBadges.some(b => b.id === badgeFromResponse.id) ? 0 : 1)
                          : earnedBadges.length;
      
      // Game ends when player reaches 100 points or earns all 5 badges
      if (newTotalScore >= 100 || badgeCount >= 5) {
        nextStage = 'results';
      }
      
      // Update dialogue with AI response (removing the "Thinking..." message)
      setDialogue([
        ...updatedDialogue,
        response
      ]);
      
      // Process badge if one was awarded
      if (badgeFromResponse || badgeType) {
        if (badgeFromResponse) {
          console.log(`Badge awarded directly from API: ${badgeFromResponse.name}`);
          
          // If we got the badge directly from the API, no need to award it
          // Just add it to earned badges and show notification
          const badgeExists = earnedBadges.some(b => b.id === badgeFromResponse.id);
          
          // Add to earned badges collection if not already there
          if (!badgeExists) {
            setEarnedBadges(prev => [...prev, badgeFromResponse]);
            
            // Only show notification and add points for newly earned badges
            // Show badge notification
            setCurrentBadge(badgeFromResponse);
            
            // No longer adding bonus points for badges
            // setBonusScore(prev => prev + 10);
            
            console.log('New badge earned (directly):', badgeFromResponse.name);
          } else {
            console.log('Badge already in collection (no points awarded):', badgeFromResponse.name);
          }
        } else if (badgeType) {
          console.log(`Badge type extracted from text: ${badgeType}`);
          
          // Make API call to award the badge
          try {
            const badgeResponse = await fetch('/api/award-badge', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                badgeType,
                gameType: 'thought_zombies'
              })
            });
            
            if (badgeResponse.ok) {
              const data = await badgeResponse.json();
              
              // Show badge award notification
              if (data.badge) {
                // Add to earned badges if not already there
                const badgeExists = earnedBadges.some(b => b.id === data.badge.id);
                if (!badgeExists) {
                  setEarnedBadges(prev => [...prev, data.badge]);
                }
                
                // Only show badge notification and add points if it's a newly awarded badge
                // (not one the user already had)
                if (data.message !== "Badge already awarded") {
                  // Show badge notification
                  setCurrentBadge(data.badge);
                  
                  // No longer adding bonus points for badges
                  // setBonusScore(prev => prev + 10);
                  
                  console.log('New badge earned:', data.badge.name);
                } else {
                  console.log('Badge already earned (no points awarded):', data.badge.name);
                }
              }
            } else {
              console.error('Failed to award badge:', await badgeResponse.text());
            }
          } catch (error) {
            console.error('Error awarding badge:', error);
          }
        }
      }
      
      // Handle stage transitions if needed
      if (nextStage !== gameStage) {
        setGameStage(nextStage);
        
        // If moving to results, add results message
        if (nextStage === 'results') {
          setTimeout(() => {
            setDialogue(prev => [
              ...prev,
              {
                content: `Congratulations! You've earned ${totalScore} points for your critical thinking abilities and collected ${badgeCount} out of 5 possible badges. Your total score is now ${user?.totalScore || 0} points. You've demonstrated that you can consider different perspectives and use effective argumentation strategies, which is essential for avoiding cognitive biases.`,
                speaker: "system" as const
              }
            ]);
          }, 1000);
          
          // Update user's score in the database with retry logic
          let retryCount = 0;
          const maxRetries = 3;
          
          const updateScore = async () => {
            try {
              const response = await fetch("/api/update-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ points: totalScore })
              });
              
              if (response.ok) {
                console.log("Score updated successfully:", totalScore, "points");
                // Force refresh the user data to ensure total score is updated in the UI
                const updatedUser = await refreshUser();
                console.log("User data refreshed, new total score:", updatedUser?.totalScore);
                return true;
              } else {
                // Handle server errors
                const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || `Server error: ${response.status}`);
              }
            } catch (error) {
              console.error(`Error updating score (attempt ${retryCount + 1}/${maxRetries}):`, error);
              
              if (retryCount < maxRetries - 1) {
                retryCount++;
                // Exponential backoff for retries (300ms, 900ms, 2700ms)
                const backoffTime = 300 * Math.pow(3, retryCount - 1);
                console.log(`Retrying in ${backoffTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                return updateScore(); // Retry recursively
              }
              
              // Show error to user after all retries failed
              toast({
                title: "Score Update Failed",
                description: "Your game points were earned but couldn't be saved to your total. Please try again later.",
                variant: "destructive"
              });
              return false;
            }
          };
          
          await updateScore();
        }
      }
      
    } catch (error) {
      console.error("Error processing response:", error);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive"
      });
      
      // Remove the last message if there was an error
      setDialogue(prevDialogue => prevDialogue.slice(0, prevDialogue.length - 1));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render score categories and progress meter
  const renderScoreDisplay = () => {
    return (
      <div className="flex flex-col space-y-1">
        {/* Main progress meter */}
        <div className="relative w-full max-w-md h-8 bg-white rounded-full border border-gray-200 overflow-hidden">
          {/* Base meter background */}
          <div className="absolute inset-0 bg-white" />
          
          {/* Multi-color progress bars */}
          <div className="absolute inset-0 flex h-full">
            {/* Reasoning score (green) */}
            <div 
              className={`h-full bg-green-400 transition-all duration-1000 ease-out ${animatingScoreCategory === 'reasoning' ? 'animate-pulse' : ''}`}
              style={{ 
                width: `${Math.min(reasoningScore, 100) * 100 / 100}%`,
              }}
            />
            
            {/* Engagement score (blue) */}
            <div 
              className={`h-full bg-blue-400 transition-all duration-1000 ease-out ${animatingScoreCategory === 'engagement' ? 'animate-pulse' : ''}`}
              style={{ 
                width: `${Math.min(engagementScore, 100) * 100 / 100}%`,
              }}
            />
            
            {/* Bonus score (purple) */}
            <div 
              className={`h-full bg-purple-400 transition-all duration-1000 ease-out ${animatingScoreCategory === 'bonus' ? 'animate-pulse' : ''}`}
              style={{ 
                width: `${Math.min(bonusScore, 100) * 100 / 100}%`,
              }}
            />
          </div>
          
          {/* Combined progress fill with potential glow effect */}
          <div 
            className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out 
                       ${isGlowing ? 'animate-pulse' : ''}`} 
            style={{ 
              width: `${reasonProgress}%`,
              boxShadow: isGlowing ? '0 0 15px rgba(74, 222, 128, 0.8)' : 'none',
              background: 'transparent'
            }}
          />
          
          {/* Label with icon */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <BrainCircuit className="w-4 h-4 text-gray-800 mr-2" />
            <span className="text-xs font-medium text-gray-800 flex-1">Thought Meter</span>
            <span className="text-xs font-bold text-gray-800">{Math.round(reasonProgress)}%</span>
          </div>
        </div>
        
        {/* Score categories legend */}
        <div className="flex justify-between text-sm px-1 font-medium">
          <div className="flex items-center">
            <div 
              className={`w-4 h-4 rounded-full bg-green-400 mr-2 shadow-sm 
                         ${animatingScoreCategory === 'reasoning' ? 'animate-ping-short' : ''}`}
            ></div>
            <span className={`text-gray-700 ${animatingScoreCategory === 'reasoning' ? 'animate-number-tick font-bold' : ''}`}>
              Reasoning: {reasoningScore}
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className={`w-4 h-4 rounded-full bg-blue-400 mr-2 shadow-sm
                         ${animatingScoreCategory === 'engagement' ? 'animate-ping-short' : ''}`}
            ></div>
            <span className={`text-gray-700 ${animatingScoreCategory === 'engagement' ? 'animate-number-tick font-bold' : ''}`}>
              Engagement: {engagementScore}
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className={`w-4 h-4 rounded-full bg-purple-400 mr-2 shadow-sm
                         ${animatingScoreCategory === 'bonus' ? 'animate-ping-short' : ''}`}
            ></div>
            <span className={`text-gray-700 ${animatingScoreCategory === 'bonus' ? 'animate-number-tick font-bold' : ''}`}>
              Bonus: {bonusScore}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (gameStage === 'intro') {
    return (
      // Intro screens with video background as an overlay on top of the home screen
      <div className="fixed inset-0 z-50 p-8 flex flex-col justify-center items-center">
        {/* Static image background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 z-0 flex justify-center items-center">
            <img 
              src="https://od.lk/s/NjBfMTc1Nzg1ODkzXw/Zombie%20horde%20approches%203c.jpg" 
              alt="Zombie horde approaching"
              className="absolute min-w-full min-h-full object-cover"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div>
        </div>
        
        <div className="relative z-20 text-center max-w-2xl">
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-8 font-mono">
            {typedText}
          </h1>
          
          <Button 
            onClick={handleNextIntroScreen} 
            className="mt-8 text-xl px-8 py-6"
            disabled={isLoadingTopics}
          >
            {isTyping ? "Skip" : activeIntroScreen < introScreens.length - 1 ? "Continue" : "Start Game"}
          </Button>

          <Button
            variant="outline"
            className="mt-4 text-white bg-transparent border-white hover:bg-white/10"
            onClick={() => setLocation('/')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Main game interface (full screen, not dialog)
  // Handler to dismiss the badge notification
  const handleBadgeDismiss = () => {
    setCurrentBadge(null);
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed header that stays at the top when scrolling */}
      <div 
        className="bg-white border-b fixed top-0 left-0 right-0 z-[9999] shadow-lg"
        id="game-header"
        style={{ position: 'fixed' }}
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Topic and Score Information */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-2">
            {/* Topic information */}
            <div className="flex-1 min-w-[200px]">
              {selectedTopic && (
                <h2 className="text-base md:text-lg font-bold text-gray-800 line-clamp-1">
                  Topic: "{selectedTopic.question}"
                </h2>
              )}
              <p className="text-xs md:text-sm text-gray-600 line-clamp-1">
                {gameStage === 'results'
                  ? 'Results'
                  : `You ${userPosition} with this statement. Defend your position.`}
              </p>
            </div>

            {/* Game points and badges - more compact layout */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Game score */}
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                <span className="font-semibold mr-1">
                  {reasoningScore + engagementScore + bonusScore}
                </span>
                <span className="text-xs">pts</span>
              </div>
              
              {/* Total score */}
              {user && (
                <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center">
                  <span className="font-semibold mr-1">
                    {user.totalScore || 0}
                  </span>
                  <span className="text-xs">total</span>
                </div>
              )}
              
              {/* Earned badges display - more compact */}
              {earnedBadges.length > 0 && (
                <div className="flex items-center">
                  <div className="flex space-x-1">
                    {earnedBadges.slice(0, 3).map((badge) => (
                      <BadgeIcon 
                        key={badge.id} 
                        badge={badge} 
                        className="w-8 h-8" 
                      />
                    ))}
                    {earnedBadges.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        +{earnedBadges.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Close button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  // Refresh user data before navigating home
                  refreshUser().then(() => setLocation('/'));
                }}
                className="text-gray-600 hover:text-gray-900 p-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Score display with reason meter - more compact */}
          <div className="px-4 pb-2">
            {renderScoreDisplay()}
          </div>
          
          {/* Argument Analyser - more compact */}
          {feedbackItems.length > 0 && (
            <div className="px-4 pb-2">
              <ArgumentAnalyser 
                feedbackItems={feedbackItems} 
                onCategoryAnimationComplete={handleCategoryAnimationComplete}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Badge award notification */}
      <BadgeAwardNotification
        badge={currentBadge}
        onComplete={handleBadgeDismiss}
      />

      {/* Main content area with proper spacing for fixed header */}
      <div className="pt-48 min-h-screen flex flex-col">
        {/* Chat area takes full width */}
        <div className="flex-1 flex flex-col">
          {/* Messages container */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 bg-white min-h-[calc(100vh-12rem)]"
          >
            {dialogue.map((entry, index) => (
              <div 
                key={index} 
                className={`mb-4 flex ${
                  entry.speaker === 'user' 
                    ? 'justify-end' 
                    : 'justify-start'
                }`}
              >
                {/* Avatar for non-user messages */}
                {entry.speaker !== 'user' && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mr-3">
                    <img 
                      src="https://od.lk/s/NjBfMTc1NzgyMTU4Xw/Trainer%20April.png" 
                      alt="Plato"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEcklEQVR4nO2ZW4hVVRjHf3PxMjVeUnupLB9CuhhBQpIPijigmC9SYD5pkGUPkUhJF4rCHsqXoCiSLpBCQlEPYSAaDJZUD3bRMLXUGctxdLzMOF5m5vQw34HFcOacvfba+5wJ5g8fHGb29ay11/rWtxbsp/8Lw4C1wAngQ2C4bUE5wCLgG6AVGDReTwGzJG5QYDpwXoIdAGYBLwJ/Sty/wHyLgmaJW6E1ugK4JNEtwIVOiLcl/F31fQV4XcK3BIhbZCnopHAV2KE+6mXxGcA5CX/aUSf9yvekiHq1bQqqZPG2KgkutRBUqqC+o3aBHYvvp+aOLmAQ+AWoA8Zmp4X5wEnNWB+w2ZKgkgLzNdG+RFHfqG49UEUBNtv2sZzgRbUCvirhizQJBdXPr5tYMQnYprZ7Jfw8sAvYG+mzXxO5TqJPuUDZ4nXK4rT67ZZwk/1BwpfogJtjwNH9mpWfNfLtkd8n+wkVcxWBrXrPJIBqULm9z0DQRr3XJHAfKQPq1TZdM5wV7imoDunZi9V/vZ5dL3GmvTDKRFCF2jzSfVp971DbYfWR2TdTQX+r7aHYuyv1fCQTQcbSDwE7VTJfSdi3JD8qFwKqE0qcl4FXEp6VK+RJ0Btqe1dtB/X6lNpKJshkwB8lvDXS3i7R5nVapvvFwK/AT+QBA4F+YA1wC9ihtrW6vwP8mMD9FPgeGFVE1HwJ6pLgwRJjNn+HEruxR7Vx91lgCGQrqFJuNsHin2/V9krkecm8G3iffMSRNbAkRtwS/ksg4hN4Tv/XSuyAYh58JGnlmYg3s/tIROASfY/F8Kzub5Iws1Y+j3n+d4XM9BJaLFTR79cHKtVn0sRvqW8S+4A7JN4kf6Mi5MQMjnmBuWomxDGfaZ0uYFyIP1pG0FrKzO7pBJEzJTLJ1ebKNbXqsMriGiVVFkd7kUTLH46V2rEe0rMo45HfVyN9DmXg0kzGbOCVJHt0LHX0U+Jp+VZw/sYCX8o3DzXsycplfizkOkwDx1VRJWZhpYQ9SJ4wFDgLvKa0sBCvyYWfKZB0kzBM9CnzLgRGWL5rgs9rEtuQQtAG1UNHbV/i4RaD1QZzIX5Obg83KaezM4VLmoTzKTCnRCbbVJbP9ehxQn4OrnGePFaZfadwPvQCM1WeVOiEzaJ026X2QLdMkfunVTy3yJ2DCUGbpBPi6ZHfZ/sJ5c18FYeXQV5vEXU3SWx0cDMd3gKOqW2aXjcSEX9M9yZ6FGxmfnWC/7qJqiLjbQs6pPbaEKFtOi9Mxi3KHMbHZGnQ43KXWsrQHPlO2q7v6WksrwQm0NF2DfihxFM6a26HPKM0vJ3C2CwKuF/6b9P3N1oRX6bD7X7FgbTx4SZrQWOBb1QitwIvMfQuJNLTdZL2Z+D2LLwPHwEPAtN1HO7S+XCZXhdpYptLHWKnAr/Jsj7/a98fOoRbCb9fwGjgI+AosFe/m3V97uv6/WMdoCcXIjnbw6q88m+Xbze/p/Rxo3ACFaxkAIYaAAAAAElFTkSuQmCC';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Message bubble */}
                <div 
                  className={`rounded-lg p-3 max-w-[75%] shadow-sm ${
                    entry.speaker === 'user' 
                      ? 'bg-blue-50 text-blue-800 border border-blue-100' 
                      : entry.speaker === 'system'
                      ? 'bg-gray-50 text-gray-800 border border-gray-200'
                      : entry.speaker === 'coach'
                      ? 'bg-green-50 text-green-800 border border-green-100'
                      : 'bg-red-50 text-red-800 border border-red-100'
                  }`}
                >
                  {entry.isTyping ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {entry.content}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{entry.content}</div>
                  )}
                </div>
                
                {/* Avatar for user messages */}
                {entry.speaker === 'user' && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ml-3">
                    <img 
                      src="https://od.lk/s/NjBfMTc1NzgyMTU2Xw/Thumbnail%20girl%20avatar.png" 
                      alt="You"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFP0lEQVR4nO2Za2xURRTHf91Coe1u37slECkQrdFAQBFQiDFqgkGjhkRjNBrji/ggGiGKISZ+UKOfFGJMkA+aKCpRCeIDCgaMIEbwERSQCBEwtqVdKIUuvbvb3R4zl7uXYXZn797dFRP/yWT33rlzzvw7Z86cMzOwhz3sxr+A8cBrQAtwHfgFqBvITg8G6oFOBTd/mweC/JPAT4EJu/n7I9B/IAZ/IdB5e6A/W4Bp/Tn4TKAT+A4YG1JvDLBEfpuVKS8H2oA2YM6ADN/AB0An0A4cT1FvbMCMYsWD/Tn4wYH0eQYYnqLe8P6agIFlwB8ByR18foB7NPNAifgtGxgANgM1OZpAjQYrZYC5AYkb5XtrgQ/ljDwBnJQydWJ3JGsTo4GzUuZ8IDpjgQ+7lC+3AfMkppkUnAOO6HBMRQ4ncA0Yb33Pk9/n5mqAVKiUiGqLxPcXRrYcWV9/DF7HXGCl7s50c2RVnhawVs7KDy6yFuBn4LXdJsClSZHO6QA1UtcdJTbVNF8qwcLuXtf1RPh1TwZoA5aLG3TDNTlb9wQ6M94xn23StyjD8dujQxbMqTKJY8KwQjLpfGWAdYFgZnr5SmM9vA4/AiUe9Gu1HqHkrxKNQHGW5HUxQY7FTGOEAb7qsJbA+iCfeNDONUErR33JIpyVCZR60B8FPOxR90SkP+1BOwzoMQYoDyjM9mhgBPCDrgGMAS4DZYFEvk0k00dAcR5sJHAWGOfRRjXQbQzwlY4lggb4ETgEDAXuE3c3ArjfasNz70/mO7t41g+8GKINLVwF7ogB3pbCZu0i1yNxC2A40CMRuUGdjhW6iVXSaVsNpQvldgNQJINvjkgwc0wITAF+SzEBN9kGHDT1IuIL12jI3Vo1vxnlc6/pPCIT6pQJZIvrKdrYLJHZRQwJdDZYBvi4QPq16JdN2Ug3qZsjGZhtEBgj2bRYJmcmbbDWYF0CmAxsATYA1/XLJm0X2TbgfXuSZ4G701yNT5Hruwku3pCIu9RrADY9lYsAe/WrJDsZvuIbuAhMy7Dx6SK/qEGzSc/SLwV0s7mJq7X+kGHDL4jsQ8c6OyT4nZRAucqx/krheuARBznnAvzWi3yVT8MRiVWTB+J65nCo80m7QAZpL8jbPusDmO0YvOFSM6ykNIJvKh6jbbzLM0zfNmmiNkx0DL5L5FOkbILwOWlnS5bna5PI95pAsczRHrWwvtJANsjJBEz9Wsc6I4FX5Sq9M+T5c8BKCWRpMVlkvSZQIwawQdnAQuDlkKT4YTnXrxLuek38otMAHSbsV0hnnO7CteCK6yK/GliXI3nTxn0hZONNgN0JnAF2+tRfbMlPpJE9JCflSx+dBUAbMAyolh1oFb1SWJvkKm2D48ALPjqXLJ0OIzsm7U1HZiDrOJdCodF/PrAi0Ih5iB0uGOUju8nS2exYd0Wa63NE2tsKjEx1PW6JZP8Oj8a+CGycJzJNjvWH+JCvcKi3OlB/nqNsqGOWrZXrt1Jc42gP2U5ZwL8yLDgaYOiWo5yz6K8Vfb8NMVvqPGvJNTnKV4jcTh+/PGe4pYbfHAkuzODX+5CfKL+9GZLwf4j+85Z8taS8YbbzLLlJnidgq4xtTLrLEbZGWfJdLrIhXrI2h5LZTZZMjzuNbkdw75dG3RLlrRHHzbxT+u623dcBgZQG1gBHHTZsrwQ2fyMsYxZSQY4GWAN87rDZDsnu46SnGI5c29uBd3uhuygwiZGShDT2l/y/wRDhMkzqFhTKAKflOt1z8G5YJu/vJvzVfI8GyZSbi/gAnO5+o3+CyXoAAAAASUVORK5CYII=';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Input area - only show if not at results stage */}
          {gameStage !== 'results' ? (
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 min-h-[100px] p-3 rounded border border-gray-200 resize-none focus:ring-2 focus:ring-green-100 focus:border-green-300 focus:outline-none"
                  disabled={isSubmitting}
                />
                <Button 
                  onClick={handleSubmitResponse} 
                  disabled={!userInput.trim() || isSubmitting}
                  className="self-end bg-green-500 hover:bg-green-600 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Results stage - show close button
            <div className="p-4 border-t flex justify-center bg-white">
              <Button 
                onClick={() => {
                  // Final refresh of user data before returning home
                  refreshUser().then(() => setLocation('/'));
                }} 
                className="px-8 py-6 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Finish Game
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Tips Dialog */}
      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className="max-w-md">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Tips for Effective Arguments</h3>
              <ul className="space-y-2">
                <li>• State your position clearly</li>
                <li>• Support with evidence</li>
                <li>• Consider counter-arguments</li>
                <li>• Use logical reasoning</li>
                <li>• Avoid personal attacks</li>
              </ul>
              <Button className="w-full mt-4" onClick={() => setShowTips(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      
      {/* Tips Button - Floating at the bottom right */}
      <div className="fixed bottom-4 right-4">
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-md rounded-full w-10 h-10 p-0"
          onClick={() => setShowTips(!showTips)}
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
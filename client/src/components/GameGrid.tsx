import { useState, useEffect } from "react";
import GameCard from "./GameCard";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import AuraEaterGame from "./AuraEaterGame";
import HealthNutGame from "./HealthNutGame";

// List of less sensitive topics (LSTs) moved to a separate constant
const lstQuestions = [
  "Should students have homework on weekends?",
  "Is it better to wake up early or stay up late to get things done?",
  "Should schools have longer lunch breaks?",
  "Should video games be considered a sport?",
  "Is it better to have fewer but longer school holidays or more frequent shorter breaks?",
  "Should students be allowed to grade their teachers?",
  "Is it better to live in a big city or a small town?",
  "Should uniforms be mandatory in schools?",
  "Should students be responsible for cleaning their classrooms?",
  "Would you rather have the ability to time travel to the past or the future?"
];

const games = [
  {
    id: 1,
    title: "Aura Eater",
    description: "Challenge your perspective by considering opposing viewpoints",
    image: "https://od.lk/s/NjBfMTY1NzA0NDg5Xw/Aura%20eater.png",
    buttonColor: "bg-purple-600 hover:bg-purple-700", // Purple to match Aura Eater's mystical theme
  },
  {
    id: 2,
    title: "Health Nut",
    description: "Learn to spot fake facts by debating your health-hype bestie!",
    image: "https://od.lk/s/NjBfMTcwNzQ4NzI5Xw/Health%20nut%20image.png",
    buttonColor: "bg-green-600 hover:bg-green-700", // Green to match Health Nut's health theme
  },
  {
    id: 3,
    title: "Thought Zombies",
    description: "Defeat mindless thinking by mastering both sides of controversial topics",
    image: "https://od.lk/s/NjBfMTc1NzYzNjQxXw/thought%20zombies2.png",
    buttonColor: "bg-red-600 hover:bg-red-700", // Red to match zombie apocalypse theme
  },
  {
    id: 4,
    title: "History Quest",
    description: "Travel through time and learn about historical events",
    image: "https://images.unsplash.com/photo-1640955011254-39734e60b16f",
    buttonColor: "bg-amber-600 hover:bg-amber-700", // Amber/golden for historical theme
  },
];

export default function GameGrid() {
  const { toast } = useToast();
  const [showAuraEater, setShowAuraEater] = useState(false);
  const [showHealthNut, setShowHealthNut] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images when component mounts
  useEffect(() => {
    const imagePromises = games.map((game) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = game.image;
        img.onload = resolve;
        img.onerror = reject;
      });
    });

    Promise.all(imagePromises)
      .then(() => {
        setImagesLoaded(true);
      })
      .catch((error) => {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Still set to true to show the grid even if some images fail
      });
  }, []);

  const [_, setLocation] = useLocation();
  
  const handleGameClick = (gameId: number) => {
    if (gameId === 1) {
      setShowAuraEater(true);
    } else if (gameId === 2) {
      setShowHealthNut(true);
    } else if (gameId === 3) {
      // Navigate to ThoughtZombiesGame page instead of showing overlay
      setLocation('/thought-zombies');
    } else {
      toast({
        title: "Coming Soon",
        description: "This game will be available in a future update!",
      });
    }
  };

  if (!imagesLoaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {games.map((game) => (
          <div key={game.id} className="h-[300px] bg-gray-100 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {games.map((game) => (
          <GameCard
            key={game.id}
            title={game.title}
            description={game.description}
            image={game.image}
            buttonColor={game.buttonColor}
            onClick={() => handleGameClick(game.id)}
          />
        ))}
      </div>

      {showAuraEater && (
        <AuraEaterGame onClose={() => setShowAuraEater(false)} />
      )}

      {showHealthNut && (
        <HealthNutGame onClose={() => setShowHealthNut(false)} />
      )}

      {/* ThoughtZombies is now a separate page */}
    </>
  );
}
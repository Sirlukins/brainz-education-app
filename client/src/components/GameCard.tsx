import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameCardProps {
  title: string;
  description: string;
  image: string;
  onClick: () => void;
  buttonColor?: string; // Optional prop for custom button color
}

export default function GameCard({ title, description, image, onClick, buttonColor }: GameCardProps) {
  // Generate button style based on the game title or provided buttonColor
  const getButtonClass = () => {
    const baseClass = "w-full text-lg py-6 text-white";
    
    if (buttonColor) {
      return `${baseClass} ${buttonColor}`;
    }
    
    // Default styling if no buttonColor provided
    return `${baseClass}`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all h-full bg-white/90 backdrop-blur-sm border-primary/20 hover:scale-105 duration-300">
      <div className="relative h-48 sm:h-64">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full"
        />
      </div>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-primary">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onClick} className={getButtonClass()} size="lg">
          Play Now
        </Button>
      </CardContent>
    </Card>
  );
}
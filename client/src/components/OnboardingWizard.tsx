import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GamepadIcon, Trophy, User, Brain, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@db/schema";
import QuestionnaireWizard from "./QuestionnaireWizard";

const introSteps = [
  {
    title: "Welcome to Brainz!",
    description: "Let's get you started on your learning journey.",
    icon: User,
    content: (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-semibold">Hello there!</h3>
        <p>
          Welcome to our educational gaming platform. We're excited to help you
          learn and grow through engaging games and challenges.
        </p>
      </div>
    ),
  },
  {
    title: "Discover Games",
    description: "Explore our collection of educational games.",
    icon: GamepadIcon,
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Learning Adventure Begins</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Math Challenge - Sharpen your mathematical skills</li>
          <li>Science Explorer - Discover the wonders of science</li>
          <li>Language Arts - Master reading and writing</li>
          <li>History Quest - Journey through time</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Track Progress",
    description: "Monitor your learning achievements.",
    icon: Trophy,
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Learning Journey</h3>
        <p>
          As you play and learn, you'll earn achievements and see your progress.
          Challenge yourself to unlock new levels and skills!
        </p>
      </div>
    ),
  },
  {
    title: "Quick Questionnaire",
    description: "Help us personalize your experience.",
    icon: Brain,
    content: (
      <div className="space-y-4">
        <p>
          Before we start building your Brainz by playing games, we need to ask you a few questions.
          The questionnaire has two parts:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>First, we'll ask about how you think and make decisions.</li>
          <li>Then, we'll ask your opinions on various topics.</li>
        </ol>
        <p>
          Choose the response that best describes your opinion. There are no right or wrong answers,
          so respond honestly with what you truly believe.
        </p>
      </div>
    ),
  },
];

interface OnboardingWizardProps {
  user: UserType;
  onComplete: () => Promise<void>;
}

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [section, setSection] = useState<'intro' | 'questionnaire'>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/complete-onboarding", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setSection('questionnaire');
    },
  });

  if (section === 'questionnaire') {
    return (
      <QuestionnaireWizard 
        onComplete={async () => {
          try {
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            await onComplete();
          } catch (error) {
            console.error('Failed to complete questionnaire:', error);
            toast({
              title: "Error",
              description: "Failed to complete onboarding. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />
    );
  }

  const progress = ((currentStep + 1) / introSteps.length) * 100;
  const step = introSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <Progress value={progress} className="mb-2" />
            <div className="flex items-center gap-2">
              <step.icon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>{step.content}</CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={currentStep === 0 || completeOnboarding.isPending}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (currentStep === introSteps.length - 1) {
                  completeOnboarding.mutate();
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
              disabled={completeOnboarding.isPending}
            >
              {completeOnboarding.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === introSteps.length - 1 ? (
                "Start Questionnaire"
              ) : (
                "Next"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
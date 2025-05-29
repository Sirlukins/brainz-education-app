import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Brain, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Question = {
  id: number;
  question: string;
  isReversed?: boolean;
  type: 'aot' | 'topic';
};

const likertOptions = [
  { value: "1", label: "Disagree Strongly" },
  { value: "2", label: "Disagree Moderately" },
  { value: "3", label: "Disagree Slightly" },
  { value: "4", label: "Agree Slightly" },
  { value: "5", label: "Agree Moderately" },
  { value: "6", label: "Agree Strongly" },
];

export default function QuestionnaireWizard({
  onComplete,
}: {
  onComplete: () => Promise<void>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number>>(new Map());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading: isLoadingQuestions, error: questionsError } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
    queryFn: async () => {
      const res = await fetch("/api/questions", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  const submitResponse = useMutation({
    mutationFn: async (data: { questionId: number; response: number; questionType: 'aot' | 'topic' }) => {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  const completeQuestionnaire = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/complete-questionnaire", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: async (data) => {
      // Update the user data in the cache
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsCompleted(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete questionnaire",
        variant: "destructive",
      });
    },
  });

  // Loading state
  if (isLoadingQuestions) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Loading questions...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (questionsError) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{questionsError instanceof Error ? questionsError.message : 'Failed to load questions'}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // No questions found
  if (!questions.length) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 justify-center">
                <Brain className="h-8 w-8 text-primary" />
                <CardTitle>No Questions Available</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Please try again later or contact support if the issue persists.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-8 w-8 text-primary" />
                <CardTitle>All Done!</CardTitle>
              </div>
              <CardDescription>
                Thank you for completing the questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Your responses have been recorded and will help personalize your experience.</p>
              <Button
                onClick={async () => {
                  setIsTransitioning(true);
                  try {
                    console.log("Completing the onboarding process...");
                    // Call the provided onComplete callback
                    await onComplete();
                    // Then redirect to home page
                    window.location.href = "/";
                  } catch (error) {
                    console.error('Failed to complete:', error);
                    toast({
                      title: "Error",
                      description: "Failed to complete questionnaire. Please try again.",
                      variant: "destructive",
                    });
                    setIsTransitioning(false);
                  }
                }}
                disabled={isTransitioning}
                className="w-full"
              >
                {isTransitioning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continue to App"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main questionnaire UI
  const currentQuestion = questions[currentIndex];
  const response = responses.get(currentQuestion?.id);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleResponse = async (value: string) => {
    try {
      const numericResponse = parseInt(value);
      
      const newResponses = new Map(responses);
      newResponses.set(currentQuestion.id, numericResponse);
      setResponses(newResponses);
      
      await submitResponse.mutateAsync({
        questionId: currentQuestion.id,
        response: numericResponse,
        questionType: currentQuestion.type,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit response",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (currentIndex === questions.length - 1) {
      try {
        await completeQuestionnaire.mutateAsync();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete questionnaire. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <Progress value={progress} className="mb-2" />
            <CardTitle>Question {currentIndex + 1} of {questions.length}</CardTitle>
            <CardDescription>{currentQuestion.question}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {likertOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors",
                    response === parseInt(option.value) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name="response"
                    value={option.value}
                    checked={response === parseInt(option.value)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setResponses(new Map(responses.set(currentQuestion.id, value)));
                      submitResponse.mutate({
                        questionId: currentQuestion.id,
                        response: value,
                        questionType: currentQuestion.type,
                      });
                    }}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </div>
            {responses.has(currentQuestion.id) && (
              <Button onClick={handleNext}>
                {currentIndex === questions.length - 1 ? "Complete" : "Next"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import ScoresPage from "@/pages/ScoresPage";
import ThoughtZombiesGame from "@/components/ThoughtZombiesGame";
import { useUser } from "@/hooks/use-user";
import NavBar from "@/components/NavBar";
import OnboardingWizard from "@/components/OnboardingWizard";
import { DisplayNameDialog } from "@/components/DisplayNameDialog";
import BadgePreloader from "@/components/BadgePreloader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { user, isLoading } = useUser();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const { toast } = useToast();

  // Check if we need to show the name dialog when a user completes onboarding
  useEffect(() => {
    if (user && user.hasCompletedOnboarding && user.hasCompletedQuestionnaire && !user.displayName) {
      setShowNameDialog(true);
    }
  }, [user]);

  // Function to save the display name
  const saveDisplayName = async (displayName: string) => {
    try {
      const response = await fetch('/api/update-display-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update display name');
      }

      const data = await response.json();
      
      // Update the local user data in localStorage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Error saving display name:', error);
      throw error;
    }
  };

  if (isLoading || isTransitioning) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          backgroundImage: 'url("/images/background.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg flex flex-col items-center">
          <img 
            src="/images/brainz-logo-transparent.png" 
            alt="Brainz" 
            className="h-24 mb-6"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}
          />
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 font-medium text-primary/80">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  // Show onboarding if either onboarding or questionnaire is not completed
  if (!user.hasCompletedOnboarding || !user.hasCompletedQuestionnaire) {
    return (
      <OnboardingWizard 
        user={user} 
        onComplete={async () => {
          setIsTransitioning(true);
          try {
            // Directly force a reload of the window to avoid complex refetching issues
            window.location.href = "/";
          } catch (error) {
            console.error('Failed to complete onboarding:', error);
            toast({
              title: "Error",
              description: "Failed to complete onboarding. Please try again.",
              variant: "destructive",
            });
            setIsTransitioning(false);
          }
        }}
      />
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url("/images/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay NavBar with higher z-index */}
      <div className="sticky top-0 z-40">
        <NavBar />
      </div>
      
      {/* Semi-transparent overlay for content */}
      <div className="min-h-screen bg-background/60 backdrop-blur-sm">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/scores" component={ScoresPage} />
          <Route path="/thought-zombies" component={ThoughtZombiesGame} />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
      
      {/* Display name input dialog */}
      <DisplayNameDialog 
        open={showNameDialog}
        onOpenChange={setShowNameDialog}
        onSave={saveDisplayName}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* BadgePreloader loads badge images in the background */}
      <BadgePreloader />
      <AppContent />
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-muted-foreground">
            The page you're looking for doesn't exist. Return to the <a href="/" className="text-primary font-medium hover:underline">home page</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
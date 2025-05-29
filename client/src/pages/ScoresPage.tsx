import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TopicResponse = {
  question_id: number;
  question_text: string;
  response: number;
};

type Score = {
  id: number;
  username: string;
  aotScore: number;
  hasCompletedQuestionnaire: boolean;
  topicResponses?: TopicResponse[];
};

type ScoresResponse = {
  timestamp: string;
  data: Score[];
}

type DashboardUser = {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  aotScore: number | null;
  totalScore: number;
  hasCompletedQuestionnaire: boolean;
  hasCompletedOnboarding: boolean;
  badgeCount: number;
  topicResponses: Array<{
    questionId: number;
    question: string;
    response: number;
    createdAt: string;
  }>;
}

type DashboardData = {
  timestamp: string;
  users: DashboardUser[];
  pointsOverTime: Array<{
    date: string;
    total: number;
  }>;
  totalUsers: number;
  totalActiveUsers: number;
  totalPoints: number;
}

async function fetchScores(): Promise<Score[]> {
  const response = await fetch('/api/aot-scores', {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data = await response.json();
  return data.data || [];
}

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch('/api/admin/dashboard', {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export default function ScoresPage() {
  const { data: scores, isLoading: scoresLoading, error: scoresError } = useQuery<Score[], Error>({
    queryKey: ['/api/aot-scores'],
    queryFn: fetchScores
  });
  
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery<DashboardData, Error>({
    queryKey: ['/api/admin/dashboard'],
    queryFn: fetchDashboard
  });
  
  const isLoading = scoresLoading || dashboardLoading;
  const error = scoresError || dashboardError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Handle unauthorized access
  if (error?.message?.includes("Admin access required")) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              Only administrators can view AOT scores.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Handle other errors
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription>
              {error.message || "An error occurred while fetching scores"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page header with exports */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            View and analyze user data, scores, and responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/api/aot-scores?format=csv";
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export AOT Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/api/admin/user-responses";
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Raw Responses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/api/admin/points-export?format=csv";
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Points
          </Button>
        </div>
      </div>
      
      {/* Dashboard Summary Stats */}
      {dashboardData && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.totalActiveUsers} active users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalPoints}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.users.length > 0 
                  ? Math.round(dashboardData.totalPoints / dashboardData.totalUsers) 
                  : 0} points per user avg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(dashboardData.timestamp).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(dashboardData.timestamp).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabbed Interface */}
      <Tabs defaultValue="aot">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aot">AOT Scores</TabsTrigger>
          <TabsTrigger value="topics">Topic Responses</TabsTrigger>
          <TabsTrigger value="users">User Points & Badges</TabsTrigger>
        </TabsList>
        
        {/* AOT Scores Tab */}
        <TabsContent value="aot">
          <Card>
            <CardHeader>
              <CardTitle>Actively Open-minded Thinking Scores</CardTitle>
              <CardDescription>
                View and export Actively Open-minded Thinking scores (Max score: 72)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">AOT Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores?.map((score) => (
                    <TableRow key={score.id}>
                      <TableCell className="font-medium">
                        {score.username}
                      </TableCell>
                      <TableCell>
                        {score.hasCompletedQuestionnaire
                          ? "Completed"
                          : "Not completed"}
                      </TableCell>
                      <TableCell className="text-right">
                        {score.hasCompletedQuestionnaire
                          ? score.aotScore
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Topic Responses Tab */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle>Controversial Topic Responses</CardTitle>
              <CardDescription>
                User responses to controversial topics (1-6 scale: 1=Strongly Disagree, 6=Strongly Agree)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Topic Responses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores?.map((score) => (
                    <TableRow key={`topic-${score.id}`}>
                      <TableCell className="font-medium">
                        {score.username}
                      </TableCell>
                      <TableCell className="w-2/3">
                        {score.topicResponses && score.topicResponses.length > 0 ? (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="topics">
                              <AccordionTrigger className="py-2">
                                <div className="flex items-center gap-2">
                                  <span>{score.topicResponses.length} topic responses</span>
                                  <Badge variant={score.topicResponses.length > 0 ? "default" : "outline"}>
                                    {score.topicResponses.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pt-2">
                                  {score.topicResponses.map((topic) => (
                                    <div key={topic.question_id} className="border rounded-md p-3">
                                      <div className="flex items-start gap-2">
                                        <div className="text-sm font-medium flex-1">{topic.question_text}</div>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="max-w-xs">1 = Strongly Disagree, 6 = Strongly Agree</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <div className="flex justify-between items-center mt-2">
                                        <div className="text-xs text-muted-foreground">User Response:</div>
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant={topic.response <= 3 ? "destructive" : "default"}
                                            className="text-xs"
                                          >
                                            {topic.response <= 3 ? 'Disagree' : 'Agree'}
                                          </Badge>
                                          <span className="font-bold">{topic.response}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : (
                          <span className="text-muted-foreground italic">No responses available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* User Points & Badges Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Points & Badges</CardTitle>
              <CardDescription>
                User engagement statistics and badge achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead className="text-right">Total Points</TableHead>
                      <TableHead className="text-right">Badges</TableHead>
                      <TableHead className="text-right">Onboarding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          {user.displayName || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.totalScore}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge>{user.badgeCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.hasCompletedOnboarding ? (
                            <Badge variant="outline" className="bg-green-50">Completed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Last updated: {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleString() : 'Unknown'}
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
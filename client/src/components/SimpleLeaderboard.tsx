import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Loader2 } from "lucide-react";

// Simple type for our leaderboard entries
type LeaderboardEntry = {
  id: number;
  username: string;
  totalScore: number;
  rank: number;
};

export default function SimpleLeaderboard() {
  // Using basic useState + useEffect instead of react-query
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchScores = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/scores/top');
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If data is not an array, handle the error
        if (!Array.isArray(data)) {
          throw new Error('Received invalid data format');
        }
        
        // Process data to ensure it matches our expected format
        const processedData = data.map((item, index) => ({
          id: item.id || index,
          username: item.username || 'Unknown',
          totalScore: item.totalScore || 0,
          rank: index + 1
        }));
        
        setScores(processedData);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err instanceof Error ? err.message : 'Failed to load scores');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(fetchScores, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <CardTitle>Top Scores</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <CardTitle>Top Scores</CardTitle>
              <CardDescription>Unable to load scores</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (scores.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <CardTitle>Top Scores</CardTitle>
              <CardDescription>No scores available</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Complete challenges to earn points and appear on the leaderboard!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-primary">Top Scores</CardTitle>
            <CardDescription>Leaderboard rankings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="w-16 text-primary">Rank</TableHead>
              <TableHead className="text-primary">Student</TableHead>
              <TableHead className="text-right text-primary">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((entry) => (
              <TableRow 
                key={entry.id}
                className={`border-b ${entry.rank <= 3 ? 'bg-primary/5' : ''}`}
              >
                <TableCell className="font-bold text-lg">
                  {entry.rank <= 3 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700">
                      {entry.rank}
                    </span>
                  ) : (
                    `#${entry.rank}`
                  )}
                </TableCell>
                <TableCell className="font-medium">{entry.username}</TableCell>
                <TableCell className="text-right font-bold text-primary">{entry.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
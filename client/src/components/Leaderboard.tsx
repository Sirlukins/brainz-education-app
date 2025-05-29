import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
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
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type LeaderboardEntry = {
  id: number;
  username: string;
  totalScore: number;
  rank: number;
};

export default function Leaderboard() {
  const { data: leaderboard, isLoading, error, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    staleTime: 5000, // Refetch after 5 seconds (more frequent updates)
    refetchInterval: 10000, // Also refetch every 10 seconds
    retry: 2 // Retry twice on error
  });
  
  // Set up effect to refetch when component mounts or becomes visible
  useEffect(() => {
    // Refetch on mount
    refetch();
    
    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // We no longer need this check since the leaderboard endpoint is now public

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Leaderboard</CardTitle>
          <CardDescription>Failed to fetch leaderboard data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-16 w-16">
              <img
                src="https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
                alt="Aura Gem"
                className="h-full w-full object-contain"
                style={{ filter: "drop-shadow(0 0 4px rgba(147, 51, 234, 0.5))" }}
              />
            </div>
            <div>
              <CardTitle>Aura Leaders</CardTitle>
              <CardDescription>Loading top students...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-16 w-16">
              <img
                src="https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
                alt="Aura Gem"
                className="h-full w-full object-contain"
                style={{ filter: "drop-shadow(0 0 4px rgba(147, 51, 234, 0.5))" }}
              />
            </div>
            <div>
              <CardTitle>Aura Leaders</CardTitle>
              <CardDescription>No scores yet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
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
          <div className="h-16 w-16">
            <img
              src="https://od.lk/s/NjBfMTY0NzYzNjg1Xw/gem%20transparent.png"
              alt="Aura Gem"
              className="h-full w-full object-contain"
              style={{ filter: "drop-shadow(0 0 6px rgba(147, 51, 234, 0.6))" }}
            />
          </div>
          <div>
            <CardTitle className="text-primary">Aura Leaders</CardTitle>
            <CardDescription>Top performing students</CardDescription>
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
            {leaderboard.map((entry, index) => (
              <motion.tr 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className={`border-b ${entry.rank <= 3 ? 'bg-primary/5' : ''}`}
              >
                <TableCell className="font-bold text-lg">
                  {entry.rank <= 3 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary">
                      {entry.rank}
                    </span>
                  ) : (
                    `#${entry.rank}`
                  )}
                </TableCell>
                <TableCell className="font-medium">{entry.username}</TableCell>
                <TableCell className="text-right font-bold text-primary">{entry.totalScore}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
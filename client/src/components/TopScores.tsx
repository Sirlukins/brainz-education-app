import { useQuery } from "@tanstack/react-query";
import React from "react";
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
import { Loader2, Trophy } from "lucide-react";

type TopScoreEntry = {
  id: number;
  username: string;
  totalScore: number;
  rank: number;
};

export default function TopScores() {
  // Use the new API endpoint for top scores
  const { data: scores, isLoading, error } = useQuery<TopScoreEntry[]>({
    queryKey: ["/api/scores/top"],
    staleTime: 5000, // Refetch after 5 seconds
    refetchInterval: 10000, // Also refetch every 10 seconds
    refetchOnWindowFocus: true, // Refresh when window gets focus
    retry: 3
  });

  if (isLoading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-14 w-14 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-amber-500" />
            </div>
            <div>
              <CardTitle>Top Scores</CardTitle>
              <CardDescription>Loading data...</CardDescription>
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
          <CardTitle>Error Loading Scores</CardTitle>
          <CardDescription>
            We couldn't fetch the leaderboard data. Try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-14 w-14 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-amber-500" />
            </div>
            <div>
              <CardTitle>Top Scores</CardTitle>
              <CardDescription>No scores recorded yet</CardDescription>
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
          <div className="h-14 w-14 flex items-center justify-center">
            <Trophy className="h-10 w-10 text-amber-500" />
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
            {scores.map((entry, index) => (
              <motion.tr 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
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
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
import GameGrid from "@/components/GameGrid";
import SimpleLeaderboard from "@/components/SimpleLeaderboard";

export default function HomePage() {
  return (
    <main className="container py-8">
      <div className="flex justify-center mb-12 mt-4">
        <img 
          src="/images/brainz-logo-transparent.png" 
          alt="Brainz Critical Thinking Games" 
          className="h-72 md:h-96 lg:h-[28rem]"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}
        />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <GameGrid />
        </div>
        <div className="w-full">
          <SimpleLeaderboard />
        </div>
      </div>
    </main>
  );
}
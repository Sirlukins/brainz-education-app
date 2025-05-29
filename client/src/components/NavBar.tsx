import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle } from "lucide-react";
import { Link } from "wouter";

export default function NavBar() {
  const { user, logout } = useUser();

  return (
    <nav className="bg-primary-foreground/50 backdrop-blur-md shadow-md">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center">
          <img 
            src="/images/brainz-logo-transparent.png" 
            alt="Brainz" 
            className="h-14 mr-2"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
          />
        </Link>

        <div className="flex items-center gap-4">
          {/* Points Display */}
          {user && (
            <div className="flex items-center mr-2">
              <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full flex items-center shadow-sm">
                <span className="font-bold mr-1 text-lg">
                  {user.totalScore || 0}
                </span>
                <span className="text-xs font-medium">points</span>
              </div>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/90 border-primary/20 shadow-sm hover:bg-primary/5">
                <UserCircle className="h-6 w-6 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="font-medium text-base">
                {user?.displayName || user?.username}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground text-sm">
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-primary font-semibold">
                Total Score: {user?.totalScore || 0} points
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="font-medium">
                <Link href="/scores">View AOT Scores</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
import { useQuery } from "@tanstack/react-query";
import type { User } from "@db/schema";

export function useUser() {
  const {
    data: user,
    isLoading,
    error,
    refetch
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  return {
    user: user || null,
    isLoading,
    error,
    refetch: async () => {
      const { data } = await refetch();
      return data;
    }
  };
}
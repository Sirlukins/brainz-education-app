import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, User } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

type ApiResponse<T = any> = {
  message: string;
  user?: T;
};

async function handleRequest<T>(
  url: string,
  method: string,
  body?: any
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({
    message: response.statusText
  }));

  if (!response.ok) {
    throw new Error(data.message || `${response.status}: ${response.statusText}`);
  }

  return data;
}

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({
        message: response.statusText
      }));
      throw new Error(data.message || `${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, error, isLoading, refetch } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: 1, // Allow one retry in case of temporary network issues
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute (reduced from 5)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  const loginMutation = useMutation<ApiResponse<User>, Error, { username: string; password: string }>({
    mutationFn: (credentials) => handleRequest('/api/login', 'POST', credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      // Also invalidate the query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<ApiResponse, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], null);
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<ApiResponse<User>, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshUser = async () => {
    // Invalidate the query cache first
    await queryClient.invalidateQueries({ queryKey: ['user'] });
    
    // Force a refetch to get fresh data from the server
    const result = await refetch();
    
    // Return the fresh data
    return result.data;
  };

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    refreshUser,
  };
}
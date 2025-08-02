import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";
import LoadingOverlay from "@/components/mobile/LoadingOverlay";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();

  // Check if user is already authenticated
  const { data: currentUser, isLoading: isCheckingAuth } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
  });

  // Redirect if already authenticated
  if (currentUser && !isCheckingAuth) {
    const defaultPage = currentUser.role === 'admin' ? '/admin' : '/dashboard';
    setLocation(defaultPage);
    return null;
  }

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setError("");
      const defaultPage = user.role === 'admin' ? '/admin' : '/dashboard';
      setLocation(defaultPage);
    },
    onError: (error: any) => {
      setError(error.message || "Login failed. Please check your credentials.");
    },
  });

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      await loginMutation.mutateAsync({ username, password });
      return true;
    } catch (error) {
      return false;
    }
  };

  if (isCheckingAuth) {
    return <LoadingOverlay isVisible={true} message="Checking authentication..." />;
  }

  return (
    <LoginForm
      onLogin={handleLogin}
      isLoading={loginMutation.isPending}
      error={error}
    />
  );
}

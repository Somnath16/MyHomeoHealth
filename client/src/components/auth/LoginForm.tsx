import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { MedicalLogo } from "@/components/ui/MedicalLogo";
import { useHapticFeedback } from "@/hooks/use-pwa";
// Import background image directly
import backgroundImageUrl from "@assets/background_1753640941516.jpg";

// Debug: log the image URL to console
console.log('Background image URL:', backgroundImageUrl);

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  error?: string;
}

export default function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { lightTap } = useHapticFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    lightTap();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    await onLogin(username.trim(), password);
  };

  const demoAccounts = [
    { username: "admin", password: "admin123", role: "Administrator" },
    { username: "doctor", password: "doctor123", role: "Doctor" },
    { username: "ranajit", password: "ranajit123", role: "Dr. Ranajit" },
  ];

  const fillDemo = (username: string, password: string) => {
    lightTap();
    setUsername(username);
    setPassword(password);
  };

  return (
    // Mobile-first responsive login layout
    <div className="login-background min-h-screen flex items-center justify-center md:justify-end p-4 md:pr-16 relative">
      {/* Background image with opacity */}
      <div 
        className="absolute inset-0 bg-blue-500"
        style={{
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.6
        }}
      ></div>
      {/* Overlay for better contrast - Updated styling */}
      <div className="absolute inset-0 from-white/60 via-primary/20 to-white/40 bg-[#2a2c3700] z-10"></div>
      <Card className="w-full max-w-md mx-auto md:mx-0 relative z-20 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <MedicalLogo showBackground={true} size={64} className="mr-4" />
            <div className="text-left">
              <h1 className="text-2xl font-bold">
                <span className="text-blue-600">My Homeo</span>{" "}
                <span className="text-teal-600">Health</span>
              </h1>
              <p className="text-gray-500 text-sm">Doctor Dashboard</p>
            </div>
          </div>
          <p className="text-neutral-600 mt-4">
            Sign in to access your dashboard
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="form-input touch-target"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input touch-target pr-10"
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-neutral-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full touch-target"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-500">Demo Accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.username}
                  variant="outline"
                  size="sm"
                  className="justify-start touch-target min-h-[48px] text-left p-3"
                  onClick={() => fillDemo(account.username, account.password)}
                  type="button"
                >
                  <div className="text-left w-full">
                    <div className="font-medium text-sm">{account.role}</div>
                    <div className="text-xs text-neutral-500">
                      {account.username} / {account.password}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

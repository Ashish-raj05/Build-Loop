import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useSignup, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const signup = useSignup();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const rules = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const allRulesMet = Object.values(rules).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!allRulesMet) {
      setError("Please meet all password requirements");
      return;
    }
    
    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    try {
      await signup.mutateAsync({ data: { fullName, email, password } });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/");
    } catch (err: any) {
      if (err?.status === 409) {
        setError("An account with this email already exists");
      } else {
        setError("An error occurred during signup");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-sm mx-auto w-full">
      <div className="w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium tracking-tight">Create account</h1>
          <p className="text-muted-foreground text-sm">Join Loop to manage your follow-ups</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
              />
              {password.length > 0 && (
                <div className="space-y-1 mt-2 text-xs">
                  <Rule satisfied={rules.length} text="At least 8 characters" />
                  <Rule satisfied={rules.uppercase} text="One uppercase letter" />
                  <Rule satisfied={rules.number} text="One number" />
                  <Rule satisfied={rules.special} text="One special character" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive-foreground bg-destructive px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={signup.isPending || !allRulesMet || !passwordsMatch}
          >
            {signup.isPending ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function Rule({ satisfied, text }: { satisfied: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {satisfied ? (
        <Check className="w-3 h-3 text-primary" />
      ) : (
        <X className="w-3 h-3 text-muted-foreground" />
      )}
      <span className={satisfied ? "text-foreground" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );
}

"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateApiKey } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApiKeyAuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const wallet = await validateApiKey(apiKey);
      
      if (!wallet) {
        setError("Invalid API Key. Please check and try again.");
        setLoading(false);
        return;
      }

      login(apiKey, wallet);
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to authenticate. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign in with API Key</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your LogLineOS API Key to access your account
          </p>
        </div>

        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="tok_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="font-mono text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Your API Key was sent to you via email
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <a
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              ← Back to magic link
            </a>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>
            Lost your API Key?{" "}
            <a
              href="/auth/login"
              className="underline hover:text-foreground"
            >
              Request a new magic link
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

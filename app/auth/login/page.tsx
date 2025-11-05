"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call LogLineOS magic link API
      // Expected backend behavior:
      // 1. Check if email exists in identity_registration spans
      // 2. New user → Create wallet, generate API key, send activation email
      // 3. Existing user → Generate temporary nonce, send magic link
      // 4. Email template should include callback URL with token
      const response = await fetch(`${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      // Expected response: { "ok": true, "email_sent": true }
      setSent(true);
    } catch (err) {
      setError("Failed to send magic link. Please try again.");
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a magic link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in your email to sign in. The link will expire in 15 minutes.
              </p>
              
              <div className="rounded-md bg-muted p-4 text-sm">
                <p className="font-medium mb-2">New user?</p>
                <p className="text-muted-foreground">
                  You&apos;ll receive your API key in the email. Save it securely!
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Use a different email
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              Didn&apos;t receive the email?{" "}
              <button
                onClick={handleSubmit}
                className="underline hover:text-foreground"
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to LogLineOS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email to sign in or create an account
          </p>
        </div>

        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll send you a magic link to sign in
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending magic link..." : "Continue with email"}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/auth/api-key">
              <Button variant="outline" className="w-full">
                Sign in with API Key
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

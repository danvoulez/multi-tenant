"use client";

import { useAuth } from "@/components/auth-provider";
import { validateApiKey } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MagicLinkCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const apiKey = searchParams.get("key");

    if (!token) {
      setStatus("error");
      setMessage("Invalid magic link. Please request a new one.");
      return;
    }

    async function verifyMagicLink() {
      try {
        // Verify magic link token with LogLineOS
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/auth/magic-link/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        if (!response.ok) {
          throw new Error("Invalid or expired link");
        }

        const data = await response.json();

        // If this is a new user, they'll have an API key in the URL
        const finalApiKey = apiKey || data.api_key;

        if (!finalApiKey) {
          throw new Error("No API key provided");
        }

        // Validate and get wallet context
        const wallet = await validateApiKey(finalApiKey);

        if (!wallet) {
          throw new Error("Failed to validate API key");
        }

        // Log the user in
        login(finalApiKey, wallet);
        setStatus("success");
        setMessage("Successfully authenticated! Redirecting...");

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Authentication failed. Please try again."
        );
      }
    }

    verifyMagicLink();
  }, [searchParams, login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <h1 className="text-2xl font-bold tracking-tight">
                Verifying your magic link...
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please wait while we sign you in
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                Success!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-6 w-6 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-destructive">
                Authentication Failed
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              <div className="mt-6">
                <a
                  href="/auth/login"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Request a new magic link
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

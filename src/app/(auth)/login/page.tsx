"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);
    setStatusMsg("Connecting to server...");

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Show warm-up message after 3 seconds (free tier cold start)
        const slowTimer = setTimeout(() => {
          setStatusMsg("Server is waking up, this may take up to 30 seconds...");
        }, 3000);

        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        clearTimeout(slowTimer);

        if (result?.error) {
          // Actual auth failure — wrong credentials
          if (result.error === "CredentialsSignin") {
            setError("Invalid email or password. Please try again.");
            setLoading(false);
            setStatusMsg("");
            return;
          }
          // Server error — retry
          if (attempt < maxRetries) {
            setStatusMsg(`Connection issue, retrying (${attempt}/${maxRetries})...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          setError("Unable to sign in. Please refresh the page and try again.");
          setLoading(false);
          setStatusMsg("");
          return;
        }

        setStatusMsg("Login successful! Redirecting...");
        // Use window.location for reliable redirect
        window.location.href = "/dashboard";
        return;
      } catch {
        if (attempt < maxRetries) {
          setStatusMsg(`Connection timed out, retrying (${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        setError("Connection failed after multiple attempts. Please refresh and try again.");
        setLoading(false);
        setStatusMsg("");
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="rounded-xl border border-white/10 bg-white/95 shadow-2xl p-8">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy shadow-md">
            <span className="text-xl font-bold text-white">B</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Barrana Accounting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="/forgot-password" className="text-xs text-brand-navy hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
          </Button>

          {statusMsg && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">{statusMsg}</p>
          )}
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Barrana Accounting Services
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Magic link sent! Check your email inbox to complete sign-in.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage("You have been signed out.");
  };

  return (
    <div className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col justify-center">
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 shadow-md text-center">
        <div className="w-12 h-12 bg-yellow/20 text-yellow rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✉️
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {user ? "Signed In" : "Email Sign-In"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Optional sign-in to associate reports with your identity. No password needed.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs">
            ✓ {message}
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-xs">
              <span className="text-muted-foreground">Signed in as: </span>
              <strong className="text-foreground">{user.email}</strong>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted transition-colors"
            >
              Sign Out
            </button>
            <div className="pt-2">
              <Link
                href="/map"
                className="text-xs text-yellow font-semibold hover:underline"
              >
                ← Return to Live Map
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full px-3 py-2 text-xs sm:text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 rounded-lg bg-yellow text-slate-950 font-bold text-xs sm:text-sm hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Sending Magic Link..." : "Send Magic Link"}
            </button>

            <p className="text-[11px] text-muted-foreground text-center">
              We will email you a one-click login link. No account creation or passwords required.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

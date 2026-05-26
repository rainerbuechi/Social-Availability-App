import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // ── PWA install banner ────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa_banner_dismissed")) return;

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const { outcome } = await (installPrompt as any).userChoice;
    if (outcome === "accepted") setShowBanner(false);
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_banner_dismissed", "1");
  };
  // ─────────────────────────────────────────────────────────────────────

  const acceptStoredInvite = async () => {
    const inviteCode = localStorage.getItem("pending_invite_code");
    if (!inviteCode) return;
    const { error } = await supabase.rpc("accept_invite", {
      invite_code_input: inviteCode,
    });
    if (error) { console.error(error); return; }
    localStorage.removeItem("pending_invite_code");
  };

  useEffect(() => {
    let isMounted = true;

    async function redirectIfLoggedIn() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session) {
        await acceptStoredInvite();
        navigate("/feed", { replace: true });
        return;
      }
      setIsCheckingSession(false);
    }

    redirectIfLoggedIn();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { toast.error("Email and password are required"); return; }
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) { setIsLoading(false); toast.error(error.message); return; }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setIsLoading(false);
      toast.error("Login worked, but the session was not saved. Please try again.");
      return;
    }

    await acceptStoredInvite();
    setIsLoading(false);
    toast.success("Welcome back!");
    navigate("/feed", { replace: true });
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanDisplayName || !cleanUsername || !cleanEmail || !password) {
      toast.error("All fields are required");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${
          (import.meta.env.VITE_PUBLIC_APP_URL || "https://down-app.ch").replace(/\/$/, "")
        }/feed`,
        data: { display_name: cleanDisplayName, username: cleanUsername },
      },
    });

    if (error) { setIsLoading(false); toast.error(error.message); return; }

    if (!data.session) {
      setIsLoading(false);
      toast.success("Account created! Please check your email to confirm your account.");
      setStep("login");
      setPassword("");
      return;
    }

    await acceptStoredInvite();
    setIsLoading(false);
    toast.success("Account created!");
    navigate("/feed", { replace: true });
  };

  // Early return AFTER all hooks
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200">
        <div className="text-sm font-medium text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-xl">
        <div className="no-scrollbar flex flex-1 flex-col justify-between overflow-y-auto p-6">
          <div className="pt-16">
            <h1 className="text-5xl font-bold tracking-tight">
              Down<span className="text-red-500">?</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              See who's free, right now. Just for your people.
            </p>
          </div>

          {step === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full text-base">
                {isLoading ? "Signing in..." : "Continue"}
              </Button>

              <button
                type="button"
                onClick={() => setStep("signup")}
                className="block w-full text-center text-sm text-muted-foreground"
              >
                New here?{" "}
                <span className="font-medium text-primary">Create account</span>
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <p className="text-sm font-medium text-muted-foreground">Create your account</p>

              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full text-base">
                {isLoading ? "Creating account..." : "Create account"}
              </Button>

              <button
                type="button"
                onClick={() => setStep("login")}
                className="block w-full text-center text-sm text-muted-foreground"
              >
                Already have an account?{" "}
                <span className="font-medium text-primary">Sign in</span>
              </button>
            </form>
          )}

          {showBanner && (
            <div className="mb-2 flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">Add to Home Screen</p>
                <p className="text-xs text-muted-foreground">
                  {isIOS
                    ? "Tap Share → Add to Home Screen for the best experience"
                    : "Install Down for quick access from your home screen"}
                </p>
              </div>

              {!isIOS && installPrompt && (
                <button
                  onClick={handleInstall}
                  className="shrink-0 rounded-full bg-[#DA2C43] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Install
                </button>
              )}

              <button onClick={dismissBanner} className="shrink-0 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="pt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
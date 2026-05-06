import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginLocal, emailExists, createLocalAccount } from "@/lib/api";

/**
 * Prototype login/signup page.
 * ⚠️ No real security — replace with Supabase Auth later.
 */
export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const user = await loginLocal(email.trim(), password);
    if (user) {
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/feed");
    } else {
      const exists = await emailExists(email.trim());
      if (exists) {
        toast.error("Wrong password");
      } else {
        toast.info("No account found — let's create one!");
        setStep("signup");
      }
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      toast.error("All fields are required");
      return;
    }
    const user = await createLocalAccount({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      password,
    });
    toast.success(`Account created! Welcome, ${user.name}`);
    navigate("/feed");
  };

  return (
    <div className="flex min-h-screen flex-col justify-between p-6">
      <div className="pt-16">
        <h1 className="text-5xl font-bold tracking-tight">
          Down<span className="text-primary">?</span>
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
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full text-base">
            Continue
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
          <p className="text-sm font-medium text-muted-foreground">
            Create your account
          </p>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} disabled type="password" className="opacity-60" />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full text-base">
            Create account
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

      <p className="pt-8 text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
}

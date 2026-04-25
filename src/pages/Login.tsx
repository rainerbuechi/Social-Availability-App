import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
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

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/feed");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email or phone</Label>
          <Input id="email" type="text" placeholder="you@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" className="h-12 w-full rounded-full text-base">
          Continue
        </Button>
        <button
          type="button"
          onClick={() => navigate("/feed")}
          className="block w-full text-center text-sm text-muted-foreground"
        >
          New here? <span className="text-primary font-medium">Create account</span>
        </button>
      </form>

      <p className="pt-8 text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
}

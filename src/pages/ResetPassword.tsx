import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands via the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated!");
    navigate("/feed", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-xl">
        <div className="no-scrollbar flex flex-1 flex-col justify-between overflow-y-auto p-6">
          <div className="pt-16">
            <h1 className="text-5xl font-bold tracking-tight">
              Down<span className="text-red-500">?</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground">Choose a new password.</p>
          </div>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Verifying link...</p>
          ) : (
            <form className="space-y-4" onSubmit={handleReset}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full text-base">
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
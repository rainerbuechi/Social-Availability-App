import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function InviteRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleInvite() {
      const cleanCode = code?.trim();

      if (!cleanCode) {
        navigate("/", { replace: true });
        return;
      }

      localStorage.setItem("pending_invite_code", cleanCode);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { error } = await supabase.rpc("accept_invite", {
          invite_code_input: cleanCode,
        });

        if (!error) {
          localStorage.removeItem("pending_invite_code");
          toast.success("Invite accepted");
        }

        navigate("/feed", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    }

    handleInvite();
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200">
      <div className="text-sm font-medium text-muted-foreground">
        Opening invite...
      </div>
    </div>
  );
}
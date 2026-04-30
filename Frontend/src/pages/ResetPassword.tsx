import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast({ title: "Enter your email", variant: "destructive" });
    setBusy(true);
    toast({ title: "Password reset", description: "Contact support to reset your password." });
    setBusy(false);
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center container">
      <Card className="w-full max-w-md p-8 bg-background/95">
        <div className="flex items-center gap-2 mb-6 font-display font-bold">
          <span className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-glow">
            <MinionRobotIcon className="w-4 h-4 text-accent-foreground" animate />
          </span>
          Reset password
        </div>
        <form onSubmit={submitRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request reset"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;

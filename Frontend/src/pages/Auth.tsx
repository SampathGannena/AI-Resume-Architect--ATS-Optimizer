import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MinionRobotIcon from "@/components/MinionRobotIcon";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Name required").max(80);

const Auth = () => {
  const { user, loading, login, register, completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const oauthToken = searchParams.get("oauth_token");
    const oauthError = searchParams.get("oauth_error");

    if (oauthError) {
      toast({ title: "Google sign-in failed", description: oauthError, variant: "destructive" });
      return;
    }

    if (!oauthToken) return;

    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        await completeOAuth(oauthToken);
        if (!cancelled) {
          toast({ title: "Signed in with Google" });
          navigate("/dashboard", { replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ title: "Google sign-in failed", description: err?.message || "Unable to complete OAuth", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, completeOAuth, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParse = emailSchema.safeParse(email);
    const pwParse = passwordSchema.safeParse(password);
    if (!emailParse.success) return toast({ title: "Email", description: emailParse.error.issues[0].message, variant: "destructive" });
    if (!pwParse.success) return toast({ title: "Password", description: pwParse.error.issues[0].message, variant: "destructive" });

    setBusy(true);
    try {
      if (tab === "signup") {
        const nameParse = nameSchema.safeParse(name);
        if (!nameParse.success) { setBusy(false); return toast({ title: "Name", description: nameParse.error.issues[0].message, variant: "destructive" }); }
        await register(emailParse.data, pwParse.data, nameParse.data);
        toast({ title: "Account created", description: "Welcome to CareerForge Pro." });
        navigate("/dashboard");
      } else {
        await login(emailParse.data, pwParse.data);
        toast({ title: "Welcome back" });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const parse = emailSchema.safeParse(email);
    if (!parse.success) return toast({ title: "Enter your email first", variant: "destructive" });
    toast({ title: "Password reset", description: "Contact support to reset your password." });
  };

  const signInWithGoogle = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground font-display font-bold">
          <span className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-glow">
            <MinionRobotIcon className="w-5 h-5" />
          </span>
          CareerForge <span className="text-primary-foreground/70 font-medium">Pro</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center container py-10">
        <Card className="w-full max-w-md p-8 bg-background/95 backdrop-blur-xl">
          <h1 className="font-display text-2xl font-bold mb-1">Welcome</h1>
          <p className="text-sm text-muted-foreground mb-6">Forge ATS-proof resumes in minutes.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 m-0">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required={tab === "signup"} />
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {tab === "login" && (
                    <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                      Forgot?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} required autoComplete={tab === "signup" ? "new-password" : "current-password"} />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : tab === "signup" ? "Create account" : "Sign in"}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={busy}>
                Continue with Google
              </Button>
            </form>
          </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default Auth;

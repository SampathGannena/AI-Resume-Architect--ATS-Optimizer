import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowUpRight, Check, Eye, EyeOff, FileText, Loader2, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import CareerForgeBrandIcon from "@/components/CareerForgeBrandIcon";

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
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setReadiness(94);
      return;
    }

    const cycleDuration = 5200;
    const fillDuration = 3200;
    const startedAt = performance.now();
    let frame = 0;

    const animateReadiness = (now: number) => {
      const elapsed = (now - startedAt) % cycleDuration;
      const progress = Math.min(elapsed / fillDuration, 1);
      setReadiness(Math.round(progress * 94));
      frame = window.requestAnimationFrame(animateReadiness);
    };

    frame = window.requestAnimationFrame(animateReadiness);
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    <div className="relative min-h-screen bg-background px-3 pt-3 text-foreground sm:px-5 sm:pt-5 lg:px-8 lg:pt-8">
      <div className="auth-resume-field" aria-hidden="true">
        <div className="auth-mini-resume auth-mini-resume-left auth-mini-resume-delay-a">
          <div className="auth-mini-resume-head">
            <span className="auth-mini-avatar" />
            <span className="auth-mini-name" />
          </div>
          <span className="auth-mini-line auth-mini-line-wide" />
          <span className="auth-mini-line" />
          <span className="auth-mini-line auth-mini-line-short" />
          <span className="auth-mini-tag">ATS READY</span>
        </div>
        <div className="auth-mini-resume auth-mini-resume-right auth-mini-resume-delay-b">
          <div className="auth-mini-score">94</div>
          <span className="auth-mini-line auth-mini-line-wide" />
          <span className="auth-mini-line" />
          <span className="auth-mini-line auth-mini-line-short" />
          <span className="auth-mini-tag">MATCHED</span>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-0.75rem)] max-w-7xl overflow-hidden rounded-tl-[2rem] rounded-tr-none rounded-b-none border border-b-0 border-border/70 bg-card shadow-2xl sm:min-h-[calc(100vh-1.25rem)] lg:min-h-[calc(100vh-2rem)]">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-1/3 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />

        <section className="relative hidden w-[48%] flex-col justify-between overflow-hidden bg-gradient-hero p-10 text-primary-foreground lg:flex xl:p-14">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(43_94%_58%_/_0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(43_94%_58%_/_0.12)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(circle_at_45%_45%,black,transparent_75%)]" />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3 font-display text-lg font-bold">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent p-1 shadow-glow">
                <CareerForgeBrandIcon />
              </span>
              CareerForge <span className="text-primary-foreground/50 font-medium">Pro</span>
            </Link>
            <div className="mt-24 max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Your unfair advantage
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
                Make your next move <span className="text-gradient-accent">obvious.</span>
              </h1>
              <p className="auth-copy mt-6 max-w-sm text-base leading-7 text-primary-foreground/65">
                Turn your experience into a resume that gets noticed, parsed, and remembered.
              </p>
            </div>
          </div>

          <div className="relative mt-12 max-w-md">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-500 hover:rotate-[-6deg] hover:scale-105">
                    <FileText className="h-5 w-5 animate-[pulse_3s_ease-in-out_infinite]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Resume readiness</p>
                    <p className="text-xs text-primary-foreground/45 transition-colors duration-500">
                      {readiness < 94 ? "Scanning your career story..." : "Optimized for your next role"}
                    </p>
                  </div>
                </div>
                <span className="font-display text-2xl font-bold tabular-nums text-accent">{readiness}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-accent transition-[width] duration-100 ease-out"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                {["Keywords", "Impact", "Clarity"].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-lg bg-white/5 px-2 py-2.5 text-primary-foreground/60 transition-all duration-500 hover:-translate-y-1 hover:bg-white/10"
                    style={{
                      opacity: readiness >= (index + 1) * 30 ? 1 : 0.35,
                      transform: readiness >= (index + 1) * 30 ? "translateY(0)" : "translateY(4px)",
                    }}
                  >
                    <Check className="mx-auto mb-1 h-3.5 w-3.5 text-accent" />{item}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-primary-foreground/45">
              <Target className="h-3.5 w-3.5 text-accent" /> Trusted by ambitious candidates worldwide
            </p>
          </div>
        </section>

        <main className="relative flex w-full flex-col justify-center px-6 py-8 sm:px-12 lg:w-[52%] lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-xs">
            <Link to="/" className="mb-9 inline-flex items-center gap-2 font-display font-bold lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent p-1 shadow-glow">
                <MinionRobotIcon className="h-5 w-5" />
              </span>
              CareerForge <span className="text-muted-foreground font-medium">Pro</span>
            </Link>
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{tab === "login" ? "Welcome back" : "Start building"}</p>
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{tab === "login" ? "Pick up where you left off." : "Build a career story that lands."}</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">Your next opportunity is closer than you think.</p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="mb-4 h-10 w-full rounded-xl bg-secondary/70 p-1 text-sm">
                <TabsTrigger value="login" className="h-full rounded-lg">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="h-full rounded-lg">Create account</TabsTrigger>
              </TabsList>

              <form onSubmit={submit} className="space-y-2.5">
              <TabsContent value="signup" className="m-0 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="name">Enter name</Label>
                  <Input id="name" className="h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required={tab === "signup"} />
                </div>
              </TabsContent>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="email">Email</Label>
                <Input id="email" className="h-9 text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs" htmlFor="password">Password</Label>
                  {tab === "login" && (
                    <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    className="h-9 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 animate-[pulse_2.4s_ease-in-out_infinite]" />
                    ) : (
                      <Eye className="h-4 w-4 animate-[pulse_2.4s_ease-in-out_infinite]" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="hero" className="h-10 w-full rounded-xl text-sm font-bold" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : tab === "signup" ? "Create account" : "Sign in"}
                {!busy && <ArrowUpRight className="ml-1 h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full google-button text-sm"
                onClick={signInWithGoogle}
                disabled={busy}
              >
                <span className="google-button-symbol google-button-symbol-left" aria-hidden="true">G</span>
                <span className="google-button-text">Continue with Google</span>
              </Button>
            </form>
          </Tabs>
          </div>
        </main>
      </div>
      <style>{`
        .auth-copy {
          animation: auth-copy 5.5s ease-in-out infinite;
          transform-origin: left center;
        }

        .auth-resume-field {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: min(100%, 1280px);
          transform: translateX(-50%);
          z-index: 20;
          pointer-events: none;
          overflow: visible;
        }

        .auth-mini-resume {
          position: absolute;
          width: 132px;
          padding: 12px;
          border: 1px solid hsl(43 60% 34% / 0.45);
          border-radius: 12px;
          background: linear-gradient(145deg, hsl(224 38% 13% / 0.94), hsl(224 38% 8% / 0.88));
          box-shadow: 0 16px 38px hsl(0 0% 0% / 0.25), 0 0 22px hsl(43 94% 58% / 0.08);
          opacity: 0.82;
          animation: auth-resume-drift 4.8s ease-in-out infinite;
        }

        .auth-mini-resume-left {
          left: -88px;
          top: 38%;
          transform: rotate(-8deg);
        }

        .auth-mini-resume-right {
          right: -88px;
          top: 28%;
          transform: rotate(8deg);
          animation-name: auth-resume-drift-reverse;
        }

        .auth-mini-resume-delay-a {
          animation-delay: -1.6s;
        }

        .auth-mini-resume-delay-b {
          animation-delay: -3.2s;
        }

        .auth-mini-resume-head {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 12px;
        }

        .auth-mini-avatar {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: hsl(43 94% 58%);
        }

        .auth-mini-name {
          width: 58px;
          height: 5px;
          border-radius: 999px;
          background: hsl(84 90% 60% / 0.7);
        }

        .auth-mini-line {
          display: block;
          width: 76%;
          height: 4px;
          margin-top: 8px;
          border-radius: 999px;
          background: hsl(44 48% 92% / 0.22);
        }

        .auth-mini-line-wide {
          width: 92%;
          background: hsl(44 48% 92% / 0.38);
        }

        .auth-mini-line-short {
          width: 55%;
        }

        .auth-mini-score {
          margin-bottom: 13px;
          color: hsl(43 94% 58%);
          font: 700 25px/1 ui-sans-serif, system-ui, sans-serif;
        }

        .auth-mini-tag {
          display: inline-block;
          margin-top: 13px;
          padding: 3px 6px;
          border-radius: 999px;
          color: hsl(43 94% 58%);
          background: hsl(43 94% 58% / 0.1);
          font: 700 7px/1 ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.12em;
        }

        @keyframes auth-resume-drift {
          0%, 100% {
            margin-left: 0;
            margin-top: 0;
            opacity: 0.18;
            transform: rotate(-12deg) translateY(0) scale(0.9);
          }
          50% {
            margin-left: 128px;
            margin-top: -14px;
            opacity: 0.9;
            transform: rotate(-3deg) translateY(-4px) scale(1);
          }
        }

        @keyframes auth-resume-drift-reverse {
          0%, 100% {
            margin-right: 0;
            margin-top: 0;
            opacity: 0.18;
            transform: rotate(12deg) translateY(0) scale(0.9);
          }
          50% {
            margin-right: 128px;
            margin-top: 15px;
            opacity: 0.9;
            transform: rotate(3deg) translateY(4px) scale(1);
          }
        }

        @keyframes auth-copy {
          0%, 100% {
            opacity: 0.65;
            transform: translateY(0);
            text-shadow: none;
          }
          42% {
            opacity: 1;
            transform: translateY(-2px);
            text-shadow: 0 0 22px hsl(43 94% 58% / 0.2);
          }
          58% {
            opacity: 0.9;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-copy,
          .auth-mini-resume {
            animation: none;
          }
        }

        @media (max-width: 1023px) {
          .auth-resume-field {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Auth;

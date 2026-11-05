import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CloudOff, Home, RefreshCw, ServerCrash, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import CareerForgeBrandIcon from "@/components/CareerForgeBrandIcon";

type ErrorState = {
  kind?: "offline" | "server";
  status?: number;
  message?: string;
  from?: string;
};

const ErrorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as ErrorState;
  const isOffline = state.kind === "offline";
  const isServerError = state.kind === "server";

  useEffect(() => {
    if (isOffline) {
      document.title = "Offline · CareerForge";
    } else if (isServerError) {
      document.title = `${state.status || 500} · CareerForge`;
    }

    return () => {
      document.title = "CareerForge Pro";
    };
  }, [isOffline, isServerError, state.status]);

  const title = isOffline
    ? "Your connection took a coffee break"
    : isServerError
      ? "The resume engine needs a moment"
      : "This page slipped out of the stack";
  const description = isOffline
    ? "CareerForge could not reach the network. Check your connection and try again."
    : isServerError
      ? state.message || "Our service returned an unexpected response. Your work is safe."
      : "The page you requested does not exist, but your next great application is still here.";
  const code = isOffline ? "OFFLINE" : isServerError ? String(state.status || 500) : "404";

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-[60vh] max-w-5xl items-center">
        <div className="grid w-full gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <section>
            <Link to="/" className="mb-12 inline-flex items-center gap-2 font-display font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
                <CareerForgeBrandIcon />
              </span>
              CareerForge <span className="font-medium text-muted-foreground">Pro</span>
            </Link>

            <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-accent">
              {isOffline ? <CloudOff className="h-4 w-4" /> : isServerError ? <ServerCrash className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              {code}
            </p>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
              <Button variant="outline" onClick={() => navigate(state.from || "/")}>
                <ArrowLeft className="h-4 w-4" /> Go back
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/"><Home className="h-4 w-4" /> Home</Link>
              </Button>
            </div>
          </section>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-5 rounded-[2rem] border border-accent/20 bg-accent/5 blur-sm" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-10 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">System pulse</span>
                <span className={`h-2.5 w-2.5 rounded-full ${isOffline ? "bg-amber-400" : "bg-accent"} shadow-[0_0_18px_currentColor]`} />
              </div>
              <div className="space-y-4">
                {[["01", "Resume workspace", isOffline ? "Waiting for network" : "Ready to recover"], ["02", "AI matching", isServerError ? "Retrying safely" : "Standing by"], ["03", "Your progress", "Protected locally"]].map(([number, label, status]) => (
                  <div key={number} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/50 p-4">
                    <span className="font-mono text-xs text-accent">{number}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-accent to-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;

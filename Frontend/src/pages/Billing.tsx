import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, Check, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, useSubscription, FREE_RESUME_LIMIT, FREE_COVER_LETTER_LIMIT } from "@/hooks/useAuth";
import { billingApi } from "@/lib/api/billing";
import { toast } from "@/hooks/use-toast";

const PRO_FEATURES = [
  "Unlimited ATS-optimized resumes",
  "Unlimited AI cover letters",
  "All premium templates (8+)",
  "Advanced ATS scoring & boost",
  "Priority AI processing",
  "Cancel anytime",
];

const Billing = () => {
  const { user } = useAuth();
  const { sub, refetch, loading } = useSubscription(user?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const status = params.get("billing");
    if (status === "success") {
      toast({ title: "Welcome to Pro! 🎉", description: "Your subscription is active." });
      refetch();
    } else if (status === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charges were made." });
    }
  }, [params, refetch]);

  const isPro = sub?.plan === "pro";

  const upgrade = async () => {
    setBusy("checkout");
    try {
      const res = await billingApi.checkout();
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.message || "Checkout unavailable");
      }
    } catch (e: any) {
      toast({ title: "Couldn't start checkout", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    try {
      const res = await billingApi.portal();
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.message || "Portal unavailable");
      }
    } catch (e: any) {
      toast({ title: "Couldn't open portal", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const res = await billingApi.cancel();
      if (res.success) {
        toast({ title: "Subscription cancelled", description: "You're back on the Free plan." });
        refetch();
      } else {
        throw new Error(res.message || "Cancel failed");
      }
    } catch (e: any) {
      toast({ title: "Couldn't cancel", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-glass-theme min-h-screen bg-transparent">
      <AppHeader />
      <main className="container py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your CareerForge Pro plan. Cancel anytime.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card className="p-6 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current plan</div>
                  <div className="flex items-center gap-2 font-display text-2xl font-bold">
                    {isPro ? <><Crown className="w-6 h-6 text-accent" /> Pro</> : "Free"}
                  </div>
                  {isPro ? (
                    <div className="text-sm text-muted-foreground mt-1">$19/month · Billed monthly</div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-1">$0 forever · Limited usage</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isPro ? (
                    <>
                      <Button variant="outline" onClick={openPortal} disabled={busy !== null}>
                        {busy === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Manage in Stripe
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={busy !== null}>Cancel subscription</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Pro subscription?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You'll be moved to the Free plan immediately and lose access to unlimited resumes, cover letters, and premium templates.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Pro</AlertDialogCancel>
                            <AlertDialogAction onClick={cancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {busy === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Yes, cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button variant="hero" onClick={upgrade} disabled={busy !== null} className="dashboard-upgrade-gold">
                      {busy === "checkout" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                      Upgrade to Pro — $19/mo
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Resumes used</div>
                  <div className="font-display text-2xl font-semibold mt-1">
                    {sub?.resumes_used ?? 0}
                    {!isPro && <span className="text-base text-muted-foreground"> / {FREE_RESUME_LIMIT}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Cover letters used</div>
                  <div className="font-display text-2xl font-semibold mt-1">
                    {sub?.cover_letters_used ?? 0}
                    {!isPro && <span className="text-base text-muted-foreground"> / {FREE_COVER_LETTER_LIMIT}</span>}
                  </div>
                </div>
              </div>
            </Card>

            {!isPro && (
              <Card className="p-6 border-accent/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-display font-bold text-xl flex items-center gap-2">
                      <Crown className="w-5 h-5 text-accent" /> CareerForge Pro
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Everything you need to land your dream job.</div>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">Most popular</Badge>
                </div>
                <div className="flex items-baseline gap-2 mb-5">
                  <div className="font-display text-4xl font-bold">$19</div>
                  <div className="text-sm text-muted-foreground">/ month</div>
                </div>
                <ul className="space-y-2 mb-6">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="hero" size="lg" className="w-full dashboard-upgrade-gold" onClick={upgrade} disabled={busy !== null}>
                  {busy === "checkout" ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : <><Crown className="w-4 h-4" /> Upgrade to Pro</>}
                </Button>
                <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Secure checkout by Stripe. Cancel any time from this page.
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Billing;

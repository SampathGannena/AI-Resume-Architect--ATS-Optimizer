import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Mail, Plus, Trash2, Crown, Loader2, ArrowRight, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReviewCards from "@/components/ReviewCards";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { useAuth, useSubscription, FREE_RESUME_LIMIT, FREE_COVER_LETTER_LIMIT } from "@/hooks/useAuth";
import { resumeApi } from "@/lib/api/resume";
import { coverLetterApi } from "@/lib/api/coverLetter";
import { toast } from "@/hooks/use-toast";

type Resume = { id: string; title: string; updatedAt: string; atsScore: number | null; optimizedScore: number | null; template: string };
type CoverLetter = { id: string; title: string; updatedAt: string };

const Dashboard = () => {
  const { user } = useAuth();
  const { sub, refetch } = useSubscription(user?.id);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resumeResponse, letterResponse] = await Promise.all([
        resumeApi.list(),
        coverLetterApi.list(),
      ]);

      if (resumeResponse.success && resumeResponse.data) {
        setResumes(resumeResponse.data.map(r => ({
          id: r._id,
          title: r.title,
          updatedAt: r.updatedAt,
          atsScore: r.atsScore,
          optimizedScore: r.optimizedScore,
          template: r.template,
        })));
      }

      if (letterResponse.success && letterResponse.data) {
        setLetters(letterResponse.data.map(l => ({
          id: l._id,
          title: l.title,
          updatedAt: l.updatedAt,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const deleteResume = async (id: string) => {
    try {
      const response = await resumeApi.delete(id);
      if (response.success) {
        toast({ title: "Resume deleted" });
        load();
        refetch();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteLetter = async (id: string) => {
    try {
      const response = await coverLetterApi.delete(id);
      if (response.success) {
        toast({ title: "Cover letter deleted" });
        load();
        refetch();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const goToBilling = () => navigate("/billing");

  const isPro = sub?.plan === "pro";
  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      desc: "Try the magic. Forge your first resume on us.",
      features: ["1 ATS-optimized resume", "Basic JD keyword analysis", "1 standard template", "PDF export"],
      cta: "Current plan",
      variant: "outline" as const,
      disabled: true,
    },
    {
      name: "Pro",
      price: "$19",
      period: "/ month",
      desc: "Unlimited everything. For serious job seekers.",
      features: ["Unlimited resume rewrites", "Unlimited cover letters", "Premium templates", "Advanced ATS insights"],
      cta: isPro ? "You are Pro" : "Upgrade to Pro",
      variant: "hero" as const,
      disabled: isPro,
    },
  ];

  return (
    <div className="dashboard-glass-theme min-h-screen bg-transparent">
      <AppHeader active="dashboard" />
      <main className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
              <MinionRobotIcon animate className="w-11 h-11 drop-shadow-[0_6px_20px_rgba(250,204,21,0.4)]" />
            </div>
            <p className="text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <Card className="px-4 py-3 flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Plan</div>
              <div className="flex items-center gap-2 font-semibold">
                {isPro ? <><Crown className="w-4 h-4 text-accent" /> Pro</> : "Free"}
              </div>
            </div>
            <div className="border-l border-border pl-4 text-xs text-muted-foreground">
              <div>Resumes: <span className="text-foreground font-medium">{sub?.resumes_used ?? 0}{!isPro && ` / ${FREE_RESUME_LIMIT}`}</span></div>
              <div>Cover letters: <span className="text-foreground font-medium">{sub?.cover_letters_used ?? 0}{!isPro && ` / ${FREE_COVER_LETTER_LIMIT}`}</span></div>
            </div>
            {!isPro && (
              <Button variant="hero" size="sm" onClick={goToBilling} className="dashboard-upgrade-gold">
                <Crown className="w-3.5 h-3.5" /> Upgrade
              </Button>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Link to="/builder">
            <Card
              className="p-6 hover:border-accent/40 hover:shadow-glow transition-all cursor-pointer h-full group"
              style={{
                background: 'linear-gradient(90deg, #4fb3fb 0%, #5be584 40%, #fbdb59 70%, #fb4229 100%)',
                boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)',
                border: 'none',
                color: '#222',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '18px',
                borderWidth: 0,
                opacity: 0.98,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/30 flex items-center justify-center shadow-glow">
                  <MinionRobotIcon animate className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 group-hover:text-white transition-all" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">AI Optimizer</h3>
              <p className="text-sm text-white/90">Paste your resume + JD. AI extracts keywords and rewrites bullets.</p>
            </Card>
          </Link>
          <Link to="/editor">
            <Card className="p-6 hover:border-accent/40 hover:shadow-glow transition-all cursor-pointer h-full group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-foreground" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">Resume Editor</h3>
              <p className="text-sm text-muted-foreground">Build a resume from scratch. Pick a template, export pixel-perfect PDF.</p>
            </Card>
          </Link>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">My resumes</h2>
            <Button size="sm" variant="outline" onClick={() => navigate("/builder")}>
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : resumes.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              No resumes yet. <Link to="/builder" className="text-foreground underline">Create your first one</Link>.
            </Card>
          ) : (
            <div className="grid gap-3">
              {resumes.map((r) => (
                <Card key={r.id} className="p-4 flex items-center gap-4 rounded-full dashboard-pill hover:border-accent/30 transition-colors">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <button onClick={() => navigate(`/editor/${r.id}`)} className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleString()} · {r.template}</div>
                  </button>
                  {r.optimizedScore != null && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      ATS {r.optimizedScore}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteResume(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Cover letters</h2>
            <Button size="sm" variant="outline" onClick={() => navigate("/cover-letter")}>
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
          {letters.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              No cover letters yet. <Link to="/cover-letter" className="text-foreground underline">Generate one</Link>.
            </Card>
          ) : (
            <div className="grid gap-3">
              {letters.map((l) => (
                <Card key={l.id} className="p-4 flex items-center gap-4 rounded-full dashboard-pill">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <button onClick={() => navigate(`/cover-letter/${l.id}`)} className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(l.updatedAt).toLocaleString()}</div>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => deleteLetter(l.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        <ReviewCards />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Pricing</h2>
            <span className="text-xs text-muted-foreground">Cancel anytime</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {pricingTiers.map((t) => (
              <Card key={t.name} className={`p-6 ${t.name === "Pro" ? "border-accent/30" : ""}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-display font-bold text-lg">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                  </div>
                  {t.name === "Pro" && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <div className="font-display text-3xl font-bold">{t.price}</div>
                  <div className="text-xs text-muted-foreground">{t.period}</div>
                </div>
                <Button
                  variant={t.variant}
                  className={t.name === "Pro" ? "w-full dashboard-upgrade-gold" : "w-full"}
                  size="lg"
                  disabled={t.disabled}
                  onClick={t.name === "Pro" ? goToBilling : undefined}
                >
                  {t.cta}
                </Button>
                <ul className="mt-5 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

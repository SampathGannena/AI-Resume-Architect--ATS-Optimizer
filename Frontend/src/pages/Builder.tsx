import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, Target, Upload, Crown } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { GenerationLoader } from "@/components/GenerationLoader";
import { useAuth, useSubscription, canCreateResume } from "@/hooks/useAuth";
import { resumeApi } from "@/lib/api/resume";
import { fileToText } from "@/lib/fileParser";
import type { AiResult } from "@/lib/resumeTypes";

const SAMPLE_RESUME = `Jane Doe — Senior Software Engineer
jane@example.com · +1 555 0100 · San Francisco, CA · linkedin.com/in/janedoe

Summary
Backend engineer with 7 years building distributed systems.

Experience
Acme Corp — Senior Software Engineer (2020–Present)
- Built backend services for payments platform
- Worked with team to ship new features
- Helped onboard junior engineers

Beta Inc — Software Engineer (2017–2020)
- Developed web app features
- Fixed bugs and improved performance

Education
B.S. Computer Science, State University (2017)

Skills
Python, JavaScript, SQL, Docker`;

const SAMPLE_JD = `Senior Backend Engineer at Stripe
We're hiring a Senior Backend Engineer with strong Python and AWS experience.
You will lead Agile teams, design distributed systems, and mentor engineers.
Required: Python, AWS, microservices, leadership, CI/CD, PostgreSQL, Kubernetes.`;

const Builder = () => {
  const { user } = useAuth();
  const { sub } = useSubscription(user?.id);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File) => {
    if (file.size > 5_000_000) return toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
    setParsing(true);
    try {
      const text = await fileToText(file);
      if (!text || text.length < 30) {
        toast({ title: "Couldn't extract text", description: "Try pasting it manually.", variant: "destructive" });
      } else {
        setResume(text);
        toast({ title: "Resume imported", description: `${file.name} parsed (${text.length.toLocaleString()} chars).` });
      }
    } catch (e: any) {
      toast({ title: "Parse error", description: e.message || "Failed to read file", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const optimize = async () => {
    if (!user) return;
    if (!canCreateResume(sub)) {
      return toast({ title: "Free limit reached", description: "Upgrade to Pro for unlimited resumes.", variant: "destructive" });
    }
    if (resume.trim().length < 80 || jd.trim().length < 80) {
      return toast({ title: "More detail needed", description: "Resume and JD must be at least 80 characters." });
    }

    setLoading(true);
    try {
      const response = await resumeApi.rewrite(resume, jd);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to rewrite resume");
      }

      const { aiResult } = response.data;
      const result = aiResult as AiResult;

      toast({ title: "Optimized!", description: `ATS score: ${result.optimizedScore}/100` });
      navigate(`/editor/${response.data.resume._id}`);
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      toast({
        title: msg.includes("Rate limit") ? "Rate limited" : msg.includes("credits") ? "Add AI credits" : "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const blocked = !canCreateResume(sub);

  return (
    <div className="builder-glass-theme min-h-screen bg-transparent">
      <GenerationLoader open={loading} title="Optimizing your resume" subtitle="Analyzing JD, extracting keywords, and rewriting bullets." />
      <AppHeader active="builder" />
      <main className="container py-10">
        <div className="max-w-3xl mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Forge an <span className="bg-gradient-accent bg-clip-text text-transparent">ATS-proof</span> resume
          </h1>
          <p className="text-muted-foreground">Upload or paste your resume + the target job description. AI does the rest.</p>
        </div>

        {blocked && (
          <Card className="p-4 mb-6 border-accent/40 bg-accent/5 flex items-center gap-3">
            <Crown className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium">You've used all 3 free resumes.</div>
              <div className="text-muted-foreground">Upgrade to Pro for unlimited optimizations, cover letters, and templates.</div>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/billing")}>Upgrade</Button>
          </Card>
        )}

        <div className="mb-6">
          <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Resume title (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stripe — Senior Backend Engineer" maxLength={120} className="mt-1.5" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold">
                <FileText className="w-5 h-5 text-accent" /> Your resume
              </div>
              <label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {parsing ? "Parsing..." : "Upload PDF / DOCX / TXT"}
                <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} disabled={parsing} />
              </label>
            </div>
            <Textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume text here, or upload a file above..." className="min-h-[340px] font-mono text-xs" />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setResume(SAMPLE_RESUME)}
                className="builder-sample-btn inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Use sample resume"
                title="Use sample resume"
              >
                <MinionRobotIcon className="builder-sample-icon w-4 h-4" animate />
              </button>
              <span>{resume.length.toLocaleString()} chars</span>
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 font-display font-semibold">
              <Target className="w-5 h-5 text-accent" /> Job description
            </div>
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full target job description..." className="min-h-[340px] font-mono text-xs" />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setJd(SAMPLE_JD)}
                className="builder-sample-btn inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Use sample job description"
                title="Use sample job description"
              >
                <MinionRobotIcon className="builder-sample-icon w-4 h-4" animate />
              </button>
              <span>{jd.length.toLocaleString()} chars</span>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button variant="hero" size="lg" onClick={optimize} disabled={loading || blocked} className="min-w-[280px]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing with AI...</> : <><MinionRobotIcon className="w-4 h-4" animate /> Optimize my resume</>}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Builder;

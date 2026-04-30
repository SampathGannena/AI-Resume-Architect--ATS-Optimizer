import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Download, Loader2, Mail, Save, Crown, FileText, FileType } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth, useSubscription, canCreateCoverLetter } from "@/hooks/useAuth";
import { resumeApi, coverLetterApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { GenerationLoader } from "@/components/GenerationLoader";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

const TONES = ["professional", "enthusiastic", "concise", "warm", "confident"];

const CoverLetter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { sub, refetch } = useSubscription(user?.id);

  const [letterId, setLetterId] = useState<string | undefined>(id);
  const [title, setTitle] = useState("Untitled cover letter");
  const [resumeText, setResumeText] = useState("");
  const [resumeId, setResumeId] = useState<string | undefined>((location.state as any)?.resumeId);
  const [jd, setJd] = useState("");
  const [company, setCompany] = useState("");
  const [tone, setTone] = useState("professional");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [savedResumes, setSavedResumes] = useState<{ id: string; _id: string; title: string; resumeData: any; jobDescription: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    resumeApi.list().then((response) => {
      if (response.success && response.data) {
        setSavedResumes(response.data.map(r => ({
          id: r._id,
          _id: r._id,
          title: r.title,
          resumeData: r.resumeData,
          jobDescription: r.jobDescription || '',
        })));
        if (resumeId && response.data) {
          const r = response.data.find((x) => x._id === resumeId);
          if (r) {
            setResumeText(JSON.stringify(r.resumeData));
            if (r.jobDescription) setJd(r.jobDescription);
          }
        }
      }
    });
  }, [user, resumeId]);

  useEffect(() => {
    if (!id || !user) { setLoading(false); return; }
    (async () => {
      const response = await coverLetterApi.get(id);
      if (response.success && response.data) {
        const row = response.data;
        setTitle(row.title);
        setContent(row.content);
        setTone(row.tone || "professional");
        setResumeId(row.resumeId || undefined);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const generate = async () => {
    if (!user) return;
    if (!canCreateCoverLetter(sub)) {
      return toast({ title: "Free limit reached", description: "Upgrade to Pro for unlimited cover letters.", variant: "destructive" });
    }
    if (!resumeText || resumeText.length < 50) return toast({ title: "Need a resume", description: "Pick one of your saved resumes.", variant: "destructive" });
    if (jd.length < 80) return toast({ title: "Need a job description", description: "Paste the JD (min 80 chars).", variant: "destructive" });

    setBusy(true);
    try {
      const response = await coverLetterApi.generate(resumeId || null, jd, tone);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to generate cover letter");
      }

      setContent(response.data.aiResult.content);
      toast({ title: "Cover letter ready" });
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      toast({ title: msg.includes("Rate limit") ? "Rate limited" : msg.includes("credits") ? "Add AI credits" : "Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!user || !content) return toast({ title: "Generate one first" });
    if (letterId) {
      const response = await coverLetterApi.update(letterId, { title, content, tone, resumeId });
      if (!response.success) return toast({ title: "Save failed", description: response.message, variant: "destructive" });
      toast({ title: "Saved" });
    } else {
      const response = await coverLetterApi.create({ title, content, tone, resumeId });
      if (!response.success) return toast({ title: "Save failed", description: response.message, variant: "destructive" });
      refetch();
      setLetterId(response.data!._id);
      navigate(`/cover-letter/${response.data!._id}`, { replace: true });
      toast({ title: "Saved" });
    }
  };

  const safeName = title.replace(/[^a-z0-9]/gi, "_") || "cover-letter";

  const downloadTxt = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    try {
      const pdf = new jsPDF({ unit: "pt", format: "letter" });
      const margin = 56;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const usableW = pageW - margin * 2;
      pdf.setFont("Times", "Normal");
      pdf.setFontSize(11);
      const paragraphs = content.replace(/\r/g, "").split(/\n\s*\n/);
      let y = margin;
      const lineHeight = 15;
      for (const para of paragraphs) {
        const lines = pdf.splitTextToSize(para.trim(), usableW);
        for (const ln of lines) {
          if (y + lineHeight > pageH - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(ln, margin, y);
          y += lineHeight;
        }
        y += lineHeight * 0.6;
      }
      pdf.save(`${safeName}.pdf`);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e?.message || "Try again", variant: "destructive" });
    }
  };

  const downloadDocx = async () => {
    try {
      const paragraphs = content.replace(/\r/g, "").split(/\n/).map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, font: "Calibri", size: 22 })] })
      );
      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Word document downloaded" });
    } catch (e: any) {
      toast({ title: "DOCX export failed", description: e?.message || "Try again", variant: "destructive" });
    }
  };

  const blocked = !canCreateCoverLetter(sub);

  if (loading) {
    return (
      <div className="cover-glass-theme min-h-screen bg-transparent">
        <AppHeader active="cover" />
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="cover-glass-theme min-h-screen bg-transparent">
      <GenerationLoader open={busy} title="Writing your cover letter" subtitle="Tailoring tone and matching the job description." />
      <AppHeader active="cover" />
      <main className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-accent" />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-display font-semibold max-w-md" maxLength={120} />
          </div>
          <div className="flex gap-2">
            {content && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline"><Download className="w-3.5 h-3.5" /> Download</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={downloadPdf}><FileText className="w-3.5 h-3.5 mr-2" /> PDF (.pdf)</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadDocx}><FileType className="w-3.5 h-3.5 mr-2" /> Word (.docx)</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTxt}><FileText className="w-3.5 h-3.5 mr-2" /> Plain text (.txt)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {content && <Button variant="hero" onClick={save}><Save className="w-3.5 h-3.5" /> Save</Button>}
          </div>
        </div>

        {blocked && (
          <Card className="p-4 mb-6 border-accent/40 bg-accent/5 flex items-center gap-3">
            <Crown className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium">You've used your free cover letter.</div>
              <div className="text-muted-foreground">Upgrade to Pro for unlimited cover letters.</div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5 space-y-4">
            <h2 className="font-display font-semibold">Inputs</h2>
            <div className="space-y-1.5">
              <Label>Use one of your resumes</Label>
              <Select value={resumeId} onValueChange={(v) => {
                setResumeId(v);
                const r = savedResumes.find((x) => x.id === v);
                if (r) {
                  setResumeText(JSON.stringify(r.resumeData));
                  if (r.jobDescription) setJd(r.jobDescription);
                }
              }}>
                <SelectTrigger><SelectValue placeholder={savedResumes.length ? "Pick a saved resume" : "No resumes yet"} /></SelectTrigger>
                <SelectContent>
                  {savedResumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target company (optional)</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="e.g. Stripe" />
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Job description</Label>
              <Textarea value={jd} onChange={(e) => setJd(e.target.value)} className="min-h-[180px] font-mono text-xs" placeholder="Paste the JD..." />
            </div>
            <Button variant="hero" className="w-full" onClick={generate} disabled={busy || blocked}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><MinionRobotIcon className="w-4 h-4" animate /> Generate cover letter</>}
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-semibold mb-3">Cover letter</h2>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[480px] leading-relaxed text-sm" placeholder="Your generated cover letter will appear here. You can edit it freely." />
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CoverLetter;

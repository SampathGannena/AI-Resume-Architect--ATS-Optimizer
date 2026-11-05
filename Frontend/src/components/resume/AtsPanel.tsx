import { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, Shield, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { computeAts, type AtsCheck } from "@/lib/atsScore";
import type { ResumeData, AiResult } from "@/lib/resumeTypes";
import { resumeApi } from "@/lib/api/resume";
import { toast } from "@/hooks/use-toast";

const CATEGORY_LABEL: Record<AtsCheck["category"], string> = {
  contact: "Contact info",
  structure: "Structure",
  content: "Content quality",
  keywords: "Keyword match",
  formatting: "ATS formatting",
};

const STATUS_ICON: Record<AtsCheck["status"], JSX.Element> = {
  pass: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  warn: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  fail: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
};

interface Props {
  data: ResumeData;
  jobDescription: string;
  aiResult: AiResult | null;
  onApplyBoost?: (next: ResumeData, applied: string[]) => void;
  onBoostingChange?: (boosting: boolean) => void;
}

export const AtsPanel = ({ data, jobDescription, aiResult, onApplyBoost, onBoostingChange }: Props) => {
  const [boosting, setBoosting] = useState(false);
  const report = useMemo(() => computeAts(data, jobDescription, aiResult), [data, jobDescription, aiResult]);

  const grouped = useMemo(() => {
    const map = new Map<AtsCheck["category"], AtsCheck[]>();
    report.checks.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return [...map.entries()];
  }, [report]);

  const ringColor =
    report.score >= 85 ? "text-emerald-500" :
    report.score >= 70 ? "text-lime-500" :
    report.score >= 55 ? "text-amber-500" :
    report.score >= 40 ? "text-orange-500" : "text-rose-500";

  const ShieldIcon = report.score >= 85 ? ShieldCheck : report.score >= 55 ? Shield : ShieldAlert;

  const failingChecks = report.checks.filter((c) => c.status !== "pass");
  const canBoost = !!onApplyBoost && (failingChecks.length > 0 || report.keywordCoverage.missing.length > 0);

  const runBoost = async () => {
    if (!onApplyBoost) return;
    setBoosting(true);
    onBoostingChange?.(true);
    try {
      const resumeText = JSON.stringify(data);
      const response = await resumeApi.boostAts(
        '',
        resumeText,
        report.keywordCoverage.missing,
        jobDescription
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to boost ATS");
      }

      const boostResult = response.data.boostResult as any;
      const next = (boostResult.resumeData as ResumeData) || (boostResult.fixedSections as ResumeData);
      const applied = boostResult.addedKeywords || [];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        throw new Error("AI returned an unexpected boost shape. Please retry.");
      }
      onApplyBoost(next, applied);
      toast({ title: "ATS Boost applied", description: `${applied.length} keyword(s) integrated. Score updated live.` });
    } catch (e: any) {
      toast({ title: "Boost failed", description: e?.message || "AI boost failed", variant: "destructive" });
    } finally {
      setBoosting(false);
      onBoostingChange?.(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-secondary/30 to-background border-accent/30">
        <div className="flex items-center gap-4">
          <div className={`relative w-20 h-20 shrink-0 ${ringColor}`}>
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${report.score}, 100`}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">{report.score}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground -mt-0.5">/ 100</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldIcon className={`w-4 h-4 ${ringColor}`} />
              <div className="font-display font-bold text-lg">Live ATS Score</div>
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${ringColor} border-current`}>
                Grade {report.grade}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{report.band}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1">
              Strict scoring · updates instantly as you edit · models Workday / Greenhouse / Taleo rubrics.
            </p>
          </div>
        </div>

        {onApplyBoost && (
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {canBoost
                ? `${failingChecks.length} issue(s) + ${report.keywordCoverage.missing.length} missing keyword(s) detected`
                : "No fixable issues right now — your resume is solid."}
            </div>
            <Button size="sm" variant="hero" onClick={runBoost} disabled={!canBoost || boosting}>
              {boosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MinionRobotIcon className="w-3.5 h-3.5" animate />}
              {boosting ? "Boosting..." : "AI Boost score"}
            </Button>
          </div>
        )}
      </Card>

      {jobDescription.trim().length >= 40 && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">JD keyword coverage</div>
            <Badge variant="outline" className="text-[10px]">{report.keywordCoverage.coveragePct}%</Badge>
          </div>
          <Progress value={report.keywordCoverage.coveragePct} className="mb-2" />
          {report.keywordCoverage.missing.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-rose-500 mb-1">Missing ({report.keywordCoverage.missing.length})</div>
              <div className="flex flex-wrap gap-1">
                {report.keywordCoverage.missing.slice(0, 12).map((k) => (
                  <Badge key={k} variant="outline" className="text-[10px] border-rose-300/50 text-rose-600">{k}</Badge>
                ))}
              </div>
            </div>
          )}
          {report.keywordCoverage.matched.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Matched ({report.keywordCoverage.matched.length})</div>
              <div className="flex flex-wrap gap-1">
                {report.keywordCoverage.matched.slice(0, 12).map((k) => (
                  <Badge key={k} variant="outline" className="text-[10px] border-emerald-300/50 text-emerald-700">{k}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {grouped.map(([cat, checks]) => {
        const earned = checks.reduce((s, c) => s + c.score, 0);
        const total = checks.reduce((s, c) => s + c.weight, 0);
        return (
          <Card key={cat} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </div>
              <Badge variant="outline" className="text-[10px]">{earned} / {total}</Badge>
            </div>
            <ul className="space-y-1.5">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium">{c.label}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{c.score}/{c.weight}</div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
};
